/**
 * Shared between the chat widget and /api/chat: the suggested questions the
 * widget offers, and the key a question is cached under.
 *
 * The server answers these ahead of time, so the questions most visitors tap
 * come back instantly instead of waiting on the model.
 */
export const SUGGESTIONS = [
  "What do they work on now?",
  "Which project should I look at first?",
  "What is their tech stack?",
  "Are they open to work?",
] as const;

/** Case, spacing and trailing punctuation do not make a different question. */
export const questionKey = (q: string) =>
  q
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[?!.\s]+$/, "")
    .trim();
