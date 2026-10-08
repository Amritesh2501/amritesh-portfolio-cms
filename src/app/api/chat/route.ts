import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { briefing } from "@/lib/assistant";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The portfolio chatbot, on Google Gemini. Streams plain text to the widget.
 *
 * A public endpoint that spends money per call, so it is fenced three ways:
 * the input is small and validated, each IP gets a fixed number of questions
 * per window (in Postgres, like the contact form), and the answer is capped.
 * Without GEMINI_API_KEY it answers 503 and the widget says it is offline.
 */

// The "latest Flash" alias, so the model keeps up without a code change. Pin a
// specific version with GEMINI_MODEL if answers ever need to stay identical.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// ponytail: 20 questions per 10 minutes per IP; raise if real visitors hit it.
const LIMIT = 20;
const WINDOW_S = 600;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(20)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "must start and end with the visitor"),
});

const ai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  if (!ai) return text("The assistant is not switched on for this site.", 503);

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return text("That message could not be read.", 400);

  // Fail closed: if the limiter cannot be checked, do not spend on the call.
  try {
    const gate = await rateLimit(`chat:${clientIp(req.headers)}`, LIMIT, WINDOW_S);
    if (!gate.ok) {
      return text(`That is a lot of questions. Try again in ${Math.ceil(gate.retryAfterSeconds / 60)} min.`, 429);
    }
  } catch {
    return text("The assistant is unavailable right now.", 503);
  }

  const { system } = await briefing();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await ai.models.generateContentStream({
          model: MODEL,
          // Gemini names the assistant's turns "model".
          contents: parsed.data.messages.map((m) => ({
            role: m.role === "assistant" ? "model" : "user",
            parts: [{ text: m.content }],
          })),
          config: {
            // The briefing is the same for every visitor until the CMS
            // changes, which is what Gemini's implicit caching rewards.
            systemInstruction: system,
            maxOutputTokens: 1024,
            temperature: 0.4,
            abortSignal: req.signal,
          },
        });
        let wrote = false;
        for await (const chunk of stream) {
          const t = chunk.text;
          if (t) {
            wrote = true;
            controller.enqueue(encoder.encode(t));
          }
        }
        // Blocked by a safety filter, or nothing came back.
        if (!wrote) controller.enqueue(encoder.encode("I can't help with that one. Ask me about the work instead."));
      } catch (error) {
        if (!req.signal.aborted) {
          const msg =
            error instanceof ApiError && error.status === 429
              ? "The assistant is busy. Try again in a moment."
              : "Something went wrong answering that.";
          controller.enqueue(encoder.encode(msg));
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
