// src/hooks/useAudit.js
// Complete file — quota check + AI audit + navigation

import { useAuditStore } from "../store/auditStore";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../api/supabase";

// ── Step 1: Check if user has audits remaining ─────────────
async function checkQuota(userId) {
  // If not logged in, skip quota check (backend will handle auth)
  if (!userId) return { allowed: true };

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("plan, audit_count")
    .eq("id", userId)
    .single();

  if (error || !profile) return { allowed: true };

  const limits = {
    free:    3,
    starter: 20,
    pro:     Infinity,
    agency:  Infinity,
  };

  const plan      = profile.plan || "free";
  const limit     = limits[plan];
  const count     = profile.audit_count || 0;
  const allowed   = count < limit;
  const remaining = limit === Infinity ? Infinity : Math.max(limit - count, 0);

  console.log(`📊 Quota: ${count}/${limit === Infinity ? "∞" : limit} used (${plan} plan)`);

  return { allowed, count, limit, plan, remaining };
}

// ── Step 2: Analyze URL to extract signals ─────────────────
function analyzeURL(url) {
  const parsed   = new URL(url);
  const hostname = parsed.hostname.toLowerCase();
  const ssl      = url.startsWith("https://");
  const domain   = hostname.replace("www.", "");

  let stack = "Unknown";
  if (hostname.includes("shopify"))          stack = "Shopify";
  else if (hostname.includes("wordpress"))   stack = "WordPress";
  else if (hostname.includes("wix"))         stack = "Wix";
  else if (hostname.includes("squarespace")) stack = "Squarespace";
  else if (hostname.includes("webflow"))     stack = "Webflow";
  else if (hostname.includes("flipkart"))    stack = "Custom (React/Node)";
  else if (hostname.includes("amazon"))      stack = "Custom (Java/React)";
  else if (hostname.includes("zomato"))      stack = "Custom (React/Python)";
  else if (hostname.includes("swiggy"))      stack = "Custom (React/Go)";
  else if (hostname.includes("myntra"))      stack = "Custom (React)";
  else if (hostname.includes("paytm"))       stack = "Custom (React/Java)";

  return { hostname, domain, ssl, stack };
}

// ── Step 3: Build AI prompt with real signals ──────────────
function buildPrompt(url, urlData) {
  return `You are a senior website performance and SEO auditor with 10+ years of experience.

Analyze this website in depth: ${url}

CONFIRMED FACTS (do not contradict these):
- Domain     : ${urlData.domain}
- SSL/HTTPS  : ${urlData.ssl ? "YES — HTTPS is confirmed. Do NOT say it lacks SSL." : "NO — HTTP only. This is a critical security issue."}
- Tech Stack : ${urlData.stack}

YOUR TASK:
Use your training knowledge about ${urlData.domain} to produce a realistic, accurate audit.

RULES:
1. SSL is ${urlData.ssl ? "CONFIRMED PRESENT — never flag it as missing" : "CONFIRMED ABSENT — flag as critical"}
2. Be SPECIFIC to this actual website — mention real pages, features, known patterns
3. Give REALISTIC scores based on your knowledge of this site
4. Include a MIX of severities — critical, warning, info, AND good items
5. "good" items = things the site does RIGHT — always include 1-2 per section
6. Every fix must be specific and actionable — no generic advice
7. For code fixes, write real code (HTML/CSS/JS) that applies to this site

SEVERITY RULES:
- critical : major problem hurting users or rankings RIGHT NOW
- warning  : should fix soon, moderate impact
- info     : nice to have, low impact
- good     : something working well — celebrate it

Provide 5-6 items per category including at least 1 "good" item.

Return ONLY valid JSON. No markdown. No backticks. Start with { end with }.

{
  "url": "${url}",
  "overallScore": <realistic 0-100 based on your knowledge of this site>,
  "stack": "${urlData.stack}",
  "seo": {
    "score": <realistic 0-100>,
    "issues": [
      {
        "title": "<specific SEO issue or win>",
        "severity": "critical|warning|info|good",
        "description": "<2-3 sentences specific to this site with real details>",
        "fix": {
          "code": "<actual code snippet if applicable, else empty string>",
          "text": "<specific actionable advice for this site>"
        }
      }
    ]
  },
  "performance": {
    "score": <realistic 0-100>,
    "issues": [
      {
        "title": "<specific performance issue or win>",
        "severity": "critical|warning|info|good",
        "description": "<mention specific metrics, pages, or patterns>",
        "fix": {
          "code": "<code fix if applicable>",
          "text": "<specific advice>"
        }
      }
    ]
  },
  "security": {
    "score": <realistic 0-100 — SSL is ${urlData.ssl ? "PRESENT so score should be 60+" : "ABSENT so score should be below 30"}>,
    "issues": [
      {
        "title": "<security issue or win>",
        "severity": "critical|warning|info|good",
        "description": "<specific security detail>",
        "fix": {
          "code": "<security header or config code if applicable>",
          "text": "<specific fix>"
        }
      }
    ]
  },
  "conversion": {
    "score": <realistic 0-100>,
    "issues": [
      {
        "title": "<conversion issue or win>",
        "severity": "critical|warning|info|good",
        "description": "<specific to this site's UX and conversion flow>",
        "fix": {
          "code": "",
          "text": "<specific CRO advice>"
        }
      }
    ]
  },
  "competitor": {
    "score": <realistic 0-100>,
    "competitors": ["<3 real direct competitors>"],
    "gaps": [
      {
        "title": "<specific competitive gap>",
        "severity": "critical|warning|info",
        "description": "<specific comparison with a named competitor>",
        "fix": { "text": "<how to close this gap>" }
      }
    ],
    "keywords": ["<6-8 real keywords this site targets or should target>"]
  }
}`;
}

// ── Main Hook ──────────────────────────────────────────────
export function useAudit() {
  const setLoading   = useAuditStore(s => s.setLoading);
  const setError     = useAuditStore(s => s.setError);
  const setCurrent   = useAuditStore(s => s.setCurrent);
  const addToHistory = useAuditStore(s => s.addToHistory);

  const analyze = async (url) => {
    setLoading(true);
    setError(null);

    try {
      // ── 1. Validate URL ──────────────────────────────────
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }
      try { new URL(url); } catch {
        throw new Error("Please enter a valid URL (e.g. https://example.com)");
      }

      // ── 2. Check quota BEFORE running audit ─────────────
      const user  = useAuthStore.getState().user;
      const quota = await checkQuota(user?.id);

      if (!quota.allowed) {
        // Special error signal — Home.jsx watches for this
        setError("QUOTA_EXCEEDED");
        return; // stop here — don't waste an API call
      }

      console.log(`✅ Quota OK — ${quota.remaining === Infinity ? "unlimited" : quota.remaining} audits remaining`);

      // ── 3. Analyze URL ───────────────────────────────────
      const urlData = analyzeURL(url);
      console.log("🔍 URL analysis:", urlData);

      // ── 4. Build prompt ──────────────────────────────────
      const prompt = buildPrompt(url, urlData);

      // ── 5. Call Groq AI ──────────────────────────────────
      const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY;
      if (!GROQ_KEY) throw new Error("VITE_GROQ_API_KEY is missing from .env");

      console.log("🤖 Calling Groq AI...");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 6000,
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: `You are an expert website auditor.
SSL status for this site: ${urlData.ssl ? "HTTPS is present — NEVER say it lacks SSL" : "HTTP only — flag as critical"}.
Respond with valid JSON only. No markdown. No backticks. Start with { end with }.`,
            },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Groq API error");
      }

      const data = await response.json();
      const raw  = data.choices?.[0]?.message?.content || "";
      console.log("📦 Raw AI response preview:", raw.slice(0, 150));

      // ── 6. Parse JSON safely ─────────────────────────────
      let audit = null;
      const tries = [
        () => JSON.parse(raw.trim()),
        () => JSON.parse(raw.replace(/```json|```/g, "").trim()),
        () => {
          const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
          if (s === -1 || e === -1) throw new Error("No JSON object found");
          return JSON.parse(raw.slice(s, e + 1));
        },
      ];

      for (const fn of tries) {
        try {
          const result = fn();
          if (result?.seo && result?.performance) { audit = result; break; }
        } catch {}
      }

      if (!audit) throw new Error("Could not parse AI response. Please try again.");

      // ── 7. Fix any wrong SSL flags from AI ──────────────
      if (urlData.ssl && audit.security?.issues) {
        audit.security.issues = audit.security.issues.map(issue => {
          const title = issue.title?.toLowerCase() || "";
          if (
            issue.severity === "critical" &&
            (title.includes("ssl") || title.includes("https") || title.includes("http"))
          ) {
            return {
              ...issue,
              title:       "HTTPS / SSL Enabled ✅",
              severity:    "good",
              description: "The site correctly uses HTTPS with SSL encryption, protecting all user data in transit.",
              fix: {
                code: "",
                text: "Great job! Keep your SSL certificate renewed. Consider adding HSTS headers for extra security.",
              },
            };
          }
          return issue;
        });

        // Fix wrongly zero security score
        if ((audit.security?.score || 0) < 30 && urlData.ssl) {
          audit.security.score = Math.max(audit.security.score || 0, 55);
        }
      }

      // ── 8. Save with metadata ────────────────────────────
      const withMeta = {
        ...audit,
        id:        crypto.randomUUID(),
        auditedAt: new Date().toISOString(),
        urlData,
      };

      setCurrent(withMeta);
      addToHistory(withMeta);
      console.log("✅ Audit complete! Overall score:", withMeta.overallScore);

    } catch (e) {
      console.error("❌ Audit error:", e.message);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { analyze };
}