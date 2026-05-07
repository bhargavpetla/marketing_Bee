import Anthropic from "@anthropic-ai/sdk";

// NSOffice.AI internal model selection — do not surface model names in UI.
export const CLAUDE_MODEL = "claude-sonnet-4-6";

let _client: Anthropic | null = null;
export function claude(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY missing — set it in .env.local");
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export async function askClaudeJSON<T = unknown>(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T> {
  const res = await claude().messages.create({
    model: CLAUDE_MODEL,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.4,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
  });
  const text = res.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("\n")
    .trim();
  return parseJsonLoose<T>(text);
}

/**
 * Robust JSON parser. Strips ``` fences, finds outermost { or [, balances brackets,
 * and best-effort *repairs* truncated output by closing dangling strings/objects/arrays
 * so a slightly-clipped model response still parses.
 */
export function parseJsonLoose<T = unknown>(text: string): T {
  let s = text.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const firstObj = s.indexOf("{");
  const firstArr = s.indexOf("[");
  let start = -1;
  if (firstObj === -1) start = firstArr;
  else if (firstArr === -1) start = firstObj;
  else start = Math.min(firstObj, firstArr);
  if (start < 0) throw new Error(`No JSON in response: ${s.slice(0, 200)}`);

  // Walk the string and track bracket depth + string state.
  const stack: string[] = [];
  let inStr = false;
  let esc = false;
  let end = -1;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === "{" || c === "[") stack.push(c);
    else if (c === "}" || c === "]") {
      stack.pop();
      if (stack.length === 0) { end = i; break; }
    }
  }

  let candidate: string;
  if (end >= 0) {
    candidate = s.slice(start, end + 1);
  } else {
    // ---- repair truncation ----
    let repair = s.slice(start);
    if (inStr) {
      // close the dangling string; drop any trailing partial escape
      if (repair.endsWith("\\")) repair = repair.slice(0, -1);
      repair += '"';
    }
    // strip trailing partial token (e.g. ", "key": "val", ") so we don't leave a hanging key
    repair = repair.replace(/,\s*"[^"]*"\s*:?\s*$/s, "").replace(/,\s*$/s, "");
    while (stack.length) {
      const open = stack.pop();
      repair += open === "{" ? "}" : "]";
    }
    candidate = repair;
  }

  try {
    return JSON.parse(candidate) as T;
  } catch (e: any) {
    throw new Error(`JSON parse failed: ${e?.message}; head=${candidate.slice(0, 200)} tail=${candidate.slice(-200)}`);
  }
}
