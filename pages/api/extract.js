// Server-side proxy to the Anthropic API. Keeps ANTHROPIC_API_KEY secret.
// Accepts either { text } (pasted CV text) or { pdfBase64 } (a PDF file).

export const config = { maxDuration: 60 };

const MODEL = "claude-sonnet-5"; // change here if you ever need a different model

const PROMPT = `You are a recruitment CV parser for rTriibe, a UAE education recruitment agency.
Read the CV and return ONE JSON object and nothing else — no preamble, no markdown fences.

Decide if this person is a TEACHER or an LSA (learning support assistant / SEN / shadow teacher / TA for a family placement). Use "type": "teacher" or "type": "lsa".

Return exactly these keys:
{
  "type": "teacher" | "lsa",
  "name": "",
  "email": "",
  "phone": "",
  "spec": "subject or role, e.g. Secondary Maths / EYFS / KS2 / LSA",
  "curriculum": "British / IB / American / etc, or empty",
  "qual": "headline qualifications, e.g. PGCE, QTS, BEd",
  "uae_years": 0,
  "out_years": 0,
  "cert": "for LSAs: ABAT / SEN diploma / Level 3 TA etc, else empty",
  "langs": "languages spoken, comma separated",
  "location": "current city/area if stated",
  "status": "New",
  "verbatim_experience": "the full work-experience section copied EXACTLY as written on the CV, roles, dates and bullet points, no summarising",
  "verbatim_qualifications": "the education/qualifications section copied EXACTLY as written on the CV"
}

Rules:
- uae_years and out_years: read each role's dates and location, then compute total years worked INSIDE the UAE vs OUTSIDE the UAE. Return numbers (decimals allowed). Do not guess a single number — add up the role durations.
- Copy verbatim_experience and verbatim_qualifications word-for-word from the CV. Do not paraphrase.
- If a field is unknown, use an empty string or 0.
Return only the JSON object.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set in Vercel." });

  const { text, pdfBase64, imageBase64, mediaType } = req.body || {};
  if (!text && !pdfBase64 && !imageBase64) return res.status(400).json({ error: "Send { text }, { pdfBase64 } or { imageBase64 }." });

  const content = [];
  if (pdfBase64) {
    content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } });
  }
  if (imageBase64) {
    content.push({ type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: imageBase64 } });
  }
  content.push({ type: "text", text: text ? PROMPT + "\n\nCV:\n" + text : PROMPT });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 3000,
        messages: [{ role: "user", content }],
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || "Anthropic error" });

    const raw = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : null;
    }
    if (!parsed) return res.status(502).json({ error: "Could not parse the model output." });

    return res.status(200).json({ result: parsed });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
