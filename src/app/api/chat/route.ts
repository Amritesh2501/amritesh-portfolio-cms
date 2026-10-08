import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { briefing } from "@/lib/assistant";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The portfolio chatbot. Streams plain text back to the widget.
 *
 * A public endpoint that spends money per call, so it is fenced three ways:
 * the input is small and validated, each IP gets a fixed number of questions
 * per window (in Postgres, like the contact form), and the answer is capped.
 * Without ANTHROPIC_API_KEY it answers 503 and the widget is not rendered.
 */

const MODEL = "claude-opus-5-5";
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

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null;

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export async function POST(req: Request) {
  if (!client) return text("The assistant is not switched on for this site.", 503);

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

  const stream = client.beta.messages.stream(
    {
      model: MODEL,
      max_tokens: 4096,
      // Chat: short factual answers from the briefing, so low effort is plenty.
      output_config: { effort: "low" },
      // If a safety classifier declines, the API retries on a fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      // The briefing is the same for every visitor until the CMS changes, so
      // it is cached; only the conversation is new on each question.
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: parsed.data.messages,
    },
    { signal: req.signal },
  );

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("I can't help with that one. Ask me about the work instead."));
        }
      } catch (error) {
        if (!req.signal.aborted) {
          const msg =
            error instanceof Anthropic.RateLimitError
              ? "The assistant is busy. Try again in a moment."
              : "Something went wrong answering that.";
          controller.enqueue(encoder.encode(`\n\n${msg}`));
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
