import "dotenv/config";
import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const AUDIT_PROMPT = (url) => `
You are an expert website auditor. Analyze: ${url}
Return ONLY valid JSON. No markdown. No backticks. Start with { end with }.
{
  "url": "${url}",
  "overallScore": <0-100>,
  "stack": "<WordPress|React|HTML|Shopify|etc>",
  "seo": { "score": <0-100>, "issues": [{ "title":"...", "severity":"critical|warning|info|good", "description":"...", "fix":{"code":"...","text":"..."} }] },
  "performance": { "score": <0-100>, "issues": [...] },
  "security": { "score": <0-100>, "issues": [...] },
  "conversion": { "score": <0-100>, "issues": [...] },
  "competitor": { "score": <0-100>, "competitors":["..."], "gaps":[{ "title":"...", "severity":"critical|warning|info", "description":"...", "fix":{"text":"..."} }], "keywords":["..."] }
}
Provide 4-6 issues per category. Be specific and realistic.
`;

// POST /api/audit
router.post("/", requireAuth, async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ message: "URL is required" });

  const supabase = getSupabase();

  try {
    // Check quota
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, audit_count")
      .eq("id", req.user.id)
      .single();

    const limits = { free: 3, starter: 20, pro: Infinity, agency: Infinity };
    const limit = limits[profile?.plan || "free"];

    if ((profile?.audit_count || 0) >= limit) {
      return res.status(403).json({ message: "Audit limit reached. Please upgrade." });
    }

    // Call Gemini
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: AUDIT_PROMPT(url) }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 6000,
          },
        }),
      }
    );

    const geminiData = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error("Gemini error:", geminiData);
      return res.status(500).json({ message: "AI API error: " + JSON.stringify(geminiData.error) });
    }

    const raw = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON safely
    let audit = null;
    const strategies = [
      () => JSON.parse(raw.trim()),
      () => JSON.parse(raw.replace(/```json|```/g, "").trim()),
      () => { const s = raw.indexOf("{"), e = raw.lastIndexOf("}"); return JSON.parse(raw.slice(s, e + 1)); },
    ];

    for (const fn of strategies) {
      try { audit = fn(); if (audit?.seo) break; } catch {}
    }

    if (!audit) {
      return res.status(500).json({ message: "Failed to parse AI response", raw });
    }

    // Increment quota
    await supabase
      .from("profiles")
      .update({ audit_count: (profile?.audit_count || 0) + 1 })
      .eq("id", req.user.id);

    res.json(audit);

  } catch (e) {
    console.error("Audit error:", e);
    res.status(500).json({ message: "Server error: " + e.message });
  }
});

// POST /api/audit/save
router.post("/save", requireAuth, async (req, res) => {
  const supabase = getSupabase();
  const audit = req.body;

  const { error } = await supabase.from("audits").insert({
    user_id: req.user.id,
    url: audit.url,
    overall_score: audit.overallScore,
    result: audit,
    created_at: new Date().toISOString(),
  });

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// GET /api/audit/history
router.get("/history", requireAuth, async (req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("audits")
    .select("id, url, overall_score, created_at")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

export default router;