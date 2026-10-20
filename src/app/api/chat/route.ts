import { createHash } from "node:crypto";
import { ApiError, GoogleGenAI, type Content } from "@google/genai";
import { z } from "zod";
import { briefing } from "@/lib/assistant";
import { SUGGESTIONS, questionKey } from "@/lib/chat";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The portfolio chatbot, on Google Gemini. Streams plain text to the widget.
 *
 * Fast by construction, because a visitor will not wait:
 *  - thinking is off: measured on this briefing, default thinking took 12-56s
 *    before the first word and thinkingBudget 0 took about 5s, with answers
 *    that read the same (short facts lifted from the briefing);
 *  - single questions are cached against the briefing they were answered
 *    from, and the suggested questions are answered in the background, so
 *    the questions most people tap come back instantly;
 *  - a busy model gets one retry, and nothing waits more than FIRST_TOKEN_MS
 *    for the first word.
 *
 * A public endpoint that spends money per call, so it is also fenced: small
 * validated input, a per-IP question limit, a capped answer. Without
 * GEMINI_API_KEY it answers 503 and the widget says it is offline.
 */

// The "latest Flash" alias, so the model keeps up without a code change. Pin a
// specific version with GEMINI_MODEL if answers ever need to stay identical.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// ponytail: 20 questions per 10 minutes per IP; raise if real visitors hit it.
const LIMIT = 20;
const WINDOW_S = 600;
/** Give up on a silent model after this long and say so. */
const FIRST_TOKEN_MS = 15_000;
/** ponytail: in-memory, per instance; move to the DB if this ever runs on more than one. */
const CACHE_TTL_MS = 6 * 3600_000;
const CACHE_MAX = 300;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "must start and end with the visitor"),
});

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const cache = new Map<string, { text: string; at: number }>();
const warming = new Set<string>();

const cacheKey = (version: string, q: string) => `${version}:${questionKey(q)}`;

function cached(key: string): string | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.text;
}

function remember(key: string, text: string) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
  cache.set(key, { text, at: Date.now() });
}

const retryable = (e: unknown) =>
  (e instanceof ApiError && (e.status === 429 || e.status >= 500)) ||
  (e instanceof Error && /fetch failed|ECONNRESET|ETIMEDOUT|socket/i.test(e.message));

/**
 * Stream one answer, calling `onText` per chunk. Retries once when the model
 * is busy and nothing has been written yet; a retry after text has gone out
 * would repeat it.
 */
async function generate(system: string, contents: Content[], signal: AbortSignal, onText: (t: string) => void) {
  for (let attempt = 0; ; attempt++) {
    let wrote = false;
    try {
      const stream = await ai!.models.generateContentStream({
        model: MODEL,
        contents,
        config: {
          systemInstruction: system,
          maxOutputTokens: 600,
          temperature: 0.4,
          thinkingConfig: { thinkingBudget: 0 },
          abortSignal: signal,
        },
      });
      for await (const chunk of stream) {
        if (chunk.text) {
          wrote = true;
          onText(chunk.text);
        }
      }
      return;
    } catch (e) {
      if (wrote || attempt >= 1 || signal.aborted || !retryable(e)) throw e;
      await new Promise((r) => setTimeout(r, 400));
    }
  }
}

/** Answer the suggested questions for this briefing in the background. */
function warm(system: string, version: string) {
  if (warming.has(version)) return;
  warming.add(version);
  void (async () => {
    for (const q of SUGGESTIONS) {
      const key = cacheKey(version, q);
      if (cached(key)) continue;
      let text = "";
      try {
        await generate(system, [{ role: "user", parts: [{ text: q }] }], AbortSignal.timeout(30_000), (t) => (text += t));
        if (text.trim()) remember(key, text);
      } catch {
        /* the next real question will try again */
      }
    }
  })();
}

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  if (!ai) return text("The assistant is not switched on for this site.", 503);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return text("That message could not be read.", 400);

  // The limiter and the briefing are both database reads; neither needs the
  // other, so they run together.
  const [gate, brief] = await Promise.all([
    rateLimit(`chat:${clientIp(req.headers)}`, LIMIT, WINDOW_S).catch(() => null),
    briefing(),
  ]);
  // Fail closed: if the limiter cannot be checked, do not spend on the call.
  if (!gate) return text("The assistant is unavailable right now.", 503);
  if (!gate.ok) {
    return text(`That is a lot of questions. Try again in ${Math.ceil(gate.retryAfterSeconds / 60)} min.`, 429);
  }

  const { system } = brief;
  // The briefing changes whenever the CMS does; answers are only reused
  // against the briefing they were written from.
  const version = createHash("sha1").update(system).digest("hex").slice(0, 12);
  warm(system, version);

  const msgs = parsed.data.messages;
  const single = msgs.length === 1 ? cacheKey(version, msgs[0].content) : null;
  const hit = single ? cached(single) : null;
  if (hit) return new Response(hit, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      // Abort if the visitor leaves, or if the model says nothing for too long.
      const quiet = new AbortController();
      const timer = setTimeout(() => quiet.abort(), FIRST_TOKEN_MS);
      const signal = AbortSignal.any([req.signal, quiet.signal]);
      try {
        await generate(
          system,
          msgs.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          signal,
          (t) => {
            clearTimeout(timer);
            full += t;
            controller.enqueue(encoder.encode(t));
          },
        );
        // Blocked by a safety filter, or nothing came back.
        if (!full) controller.enqueue(encoder.encode("I can't help with that one. Ask me about the work instead."));
        else if (single) remember(single, full);
      } catch (error) {
        if (!req.signal.aborted) {
          const msg = quiet.signal.aborted
            ? "That is taking longer than usual. Please ask again in a moment."
            : error instanceof ApiError && (error.status === 429 || error.status === 503)
              ? "The assistant is busy right now. Try again in a moment."
              : "Something went wrong answering that.";
          controller.enqueue(encoder.encode(full ? `\n\n${msg}` : msg));
        }
      } finally {
        clearTimeout(timer);
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
