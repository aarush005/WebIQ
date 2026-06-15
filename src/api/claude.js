// API calls 


// This file handles all communication with the AI backend
// We call OUR backend, not Anthropic directly (keeps API key safe)

export async function runAuditAPI(url) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are an expert website auditor. Analyze: ${url}
            
Return ONLY valid JSON (no markdown, no backticks). Start with { end with }.

{
  "url": "${url}",
  "overallScore": <0-100>,
  "stack": "<WordPress|React|HTML|Shopify|etc>",
  "seo": { "score": <0-100>, "issues": [{ "title":"...", "severity":"critical|warning|info|good", "description":"...", "fix":{"code":"...","text":"..."} }] },
  "performance": { "score": <0-100>, "issues": [...] },
  "security": { "score": <0-100>, "issues": [...] },
  "conversion": { "score": <0-100>, "issues": [...] },
  "competitor": { "score": <0-100>, "competitors":["..."], "gaps":[...], "keywords":["..."] }
}
Provide 4-6 issues per category. Be specific and realistic.`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 6000,
        }
      })
    }
  );

  if (!response.ok) {
    const err = await response.json();
    throw new AppError("AI service error: " + JSON.stringify(err), 503);
  }

  const data = await response.json();

  // Gemini response structure is different from Claude
  const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    throw new AppError("Failed to parse AI response", 500);
  }
}

