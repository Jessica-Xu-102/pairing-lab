// Serverless function: runs on Vercel's servers, never in the visitor's browser.
// It keeps the Anthropic API key secret and limits how much each visitor can use.

const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-5-5";
const MAX_PER_HOUR = Number(process.env.AI_REQUESTS_PER_HOUR || 20);

const SYSTEM = `You power a food-pairing website for cooks and bartenders.
Only help with cooking, ingredients, flavor pairing, recipes, drinks and food culture.
If a request is about anything else, politely steer back to food in one sentence.`;

// Simple per-visitor limit. It resets when Vercel starts a fresh server instance,
// so it is a speed bump, not a wall. A shared store (e.g. Upstash Redis) makes it strict.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), hour = 3600_000;
  const list = (hits.get(ip) || []).filter(t => now - t < hour);
  if (list.length >= MAX_PER_HOUR) { hits.set(ip, list); return true; }
  list.push(now); hits.set(ip, list); return false;
}

function valid(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 24) return false;
  let total = 0;
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m.content !== "string") return false;
    if (m.role !== (i % 2 === 0 ? "user" : "assistant")) return false;
    total += m.content.length;
  }
  return total <= 20000 && messages[messages.length - 1].role === "user";
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "Server is missing ANTHROPIC_API_KEY" });

  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ error: "rate_limited" });

  const { messages, json } = req.body || {};
  if (!valid(messages)) return res.status(400).json({ error: "Bad request" });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 900,
        system: SYSTEM + (json ? "\nReply with valid JSON only, no other text." : ""),
        messages
      })
    });
    if (!r.ok) {
      console.error("Anthropic API error", r.status, await r.text());
      return res.status(r.status === 429 ? 429 : 502).json({ error: r.status === 429 ? "rate_limited" : "upstream" });
    }
    const data = await r.json();
    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    return res.status(200).json({ text });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "upstream" });
  }
}
