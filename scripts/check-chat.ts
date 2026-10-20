/**
 * The chatbot's answer cache keys: retyped variants of a question share one
 * entry, different questions never do.
 *
 *   npx tsx scripts/check-chat.ts
 */
import assert from "node:assert/strict";
import { SUGGESTIONS, questionKey } from "../src/lib/chat";

assert.equal(questionKey("What is their tech stack?"), questionKey("  what is  their TECH stack "));
assert.equal(questionKey("Are they open to work?!"), questionKey("are they open to work"));
assert.notEqual(questionKey("What is their tech stack?"), questionKey("What is their stack?"));
assert.equal(new Set(SUGGESTIONS.map(questionKey)).size, SUGGESTIONS.length, "suggestions are distinct");
assert(SUGGESTIONS.every((s) => questionKey(s).length > 0));

console.log("check-chat: OK — question variants share a cache key.");
