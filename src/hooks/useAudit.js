import { useAuditStore } from "../store/auditStore";

export function useAudit() {
  const setLoading   = useAuditStore(s => s.setLoading);
  const setError     = useAuditStore(s => s.setError);
  const setCurrent   = useAuditStore(s => s.setCurrent);
  const addToHistory = useAuditStore(s => s.addToHistory);

  const analyze = async (url) => {
    setLoading(true);
    setError(null);

    const prompt = `You are an expert website auditor. Analyze the website: ${url}

Return ONLY a valid JSON object. No markdown, no backticks, no explanation.
Start with { and end with }.

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
      const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 6000,
          temperature: 0.7,
          messages: [
            {
              role: "system",
              content: "You are an expert website auditor. Respond ONLY with valid JSON. No markdown. No explanation. Start with { and end with }.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Groq API error");
      }

      const data = await response.json();
      const raw = data.choices?.[0]?.message?.content || "";

      // Parse JSON safely — try multiple strategies
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