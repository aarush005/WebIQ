import { useAuditStore } from "../store/auditStore";

export function useAudit() {
  const setLoading = useAuditStore(s => s.setLoading);
  const setError   = useAuditStore(s => s.setError);
  const setCurrent = useAuditStore(s => s.setCurrent);
  const addToHistory = useAuditStore(s => s.addToHistory);


  const analyze = async (url) => {
    setLoading(true);
    setError(null);

    // Build the prompt
    const prompt = `You are an expert website auditor. Analyze the website: ${url}

Return ONLY a valid JSON object (no markdown, no explanation, no backticks).
Start your response with { and end with }.

{
  "url": "${url}",
  "overallScore": <number 0-100>,
  "stack": "<detected CMS or framework>",
  "seo": {
    "score": <0-100>,
    "issues": [
      { "title": "...", "severity": "critical|warning|info|good", "description": "...", "fix": { "code": "...", "text": "..." } }
    ]
  },
  "performance": {
    "score": <0-100>,
    "issues": [
      { "title": "...", "severity": "critical|warning|info|good", "description": "...", "fix": { "code": "...", "text": "..." } }
    ]
  },
  "security": {
    "score": <0-100>,
    "issues": [
      { "title": "...", "severity": "critical|warning|info|good", "description": "...", "fix": { "code": "...", "text": "..." } }
    ]
  },
  "conversion": {
    "score": <0-100>,
    "issues": [
      { "title": "...", "severity": "critical|warning|info|good", "description": "...", "fix": { "code": "...", "text": "..." } }
    ]
  },
  "competitor": {
    "score": <0-100>,
    "competitors": ["competitor1.com", "competitor2.com"],
    "gaps": [
      { "title": "...", "severity": "critical|warning|info", "description": "...", "fix": { "text": "..." } }
    ],
    "keywords": ["keyword1", "keyword2", "keyword3"]
  }
}

Provide 4-5 issues per category. Be specific and realistic for this actual website.`;

    try {
      // ── Calling Gemini API directly from frontend (no backend needed for now) ──
      const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 6000,
            },
          }),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Gemini API error");
      }

      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Parse JSON safely
      let audit = null;
      const strategies = [
        () => JSON.parse(raw.trim()),
        () => JSON.parse(raw.replace(/```json|```/g, "").trim()),
        () => {
          const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
          return JSON.parse(raw.slice(s, e + 1));
        },
        () => {
          const clean = raw.replace(/```json|```/g, "").trim();
          const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
          return JSON.parse(clean.slice(s, e + 1));
        },
      ];

      for (const fn of strategies) {
        try { audit = fn(); if (audit?.seo) break; } catch {}
      }

      if (!audit) throw new Error("Could not parse AI response. Please try again.");

      const withMeta = {
        ...audit,
        id: crypto.randomUUID(),
        auditedAt: new Date().toISOString(),
      };

      setCurrent(withMeta);
      addToHistory(withMeta);

    } catch (e) {
      console.error("Audit error:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { analyze };
}