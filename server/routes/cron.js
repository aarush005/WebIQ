// This endpoint is called weekly by Github Actions - NOT by Users
// It re-audits every active watchlist entry and emails a report

import express from "express"
import { createClient } from "@supabase/supabase-js";
  
const router = express.Router();

function getSupabase() {
    return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE)
}


// Re-uses the same audit logic as the main audit Rotue

async function runAudit(url) {
    const parsed = new URL(url);
    const ssl = url.startsWith("https://")

  const prompt = `Analyze ${url}. SSL is ${ssl ? "present" : "absent"}.
Return ONLY JSON: { "overallScore": <0-100>, "seo": {"score":<0-100>}, "performance": {"score":<0-100>}, "security": {"score":<0-100>}, "conversion": {"score":<0-100>} }`;

const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringfy({
        model: "llama-3.3-70b-vesatile",
        max_token: 500,
        temperature: 0.2,
        message: [
            {role: "system", content: "Respond with valid JSON only."},
            {role: "user", content: prompt},
        ]
    })
})
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
    return JSON.parse(raw.slice(s, e + 1));
}

// Sends a weekly report email via Resend

async function sendReportEmail(toEmail, results) {
    const rows = results.map(r => `
        <tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${r.url}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">
        ${r.previousScore ?? "—"} → <strong>${r.newScore}</strong>
        ${r.change > 0 ? `<span style="color:#16a34a;">▲${r.change}</span>` :
          r.change < 0 ? `<span style="color:#dc2626;">▼${Math.abs(r.change)}</span>` :
          `<span style="color:#888;">–</span>`}
      </td>
    </tr>
  `).join("");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#7c3aed;">📊 Your Weekly WebIQ Report</h2>
      <p style="color:#666;">Here's how your tracked sites performed this week:</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0;">
        <tr style="background:#f8f8f8;">
          <th style="padding:8px;text-align:left;">Site</th>
          <th style="padding:8px;text-align:center;">Score Change</th>
        </tr>
        ${rows}
      </table>
      <p style="color:#888;font-size:13px;">
        Log in to WebIQ to see the full breakdown and AI-suggested fixes.
      </p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "WebIQ <onboarding@resend.dev>", // must verify domain in Resend
      to: toEmail,
      subject: "📊 Your Weekly Website Score Report",
      html,
    }),
  });
}

// POST /api/cron/weekly-audit — protected by secret key
router.post("/weekly-audit", async (req, res) => {
  // Security — only GitHub Actions (with the secret) can trigger this
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const supabase = getSupabase();

  // Get all active watchlist entries, grouped by user
  const { data: watchlist } = await supabase
    .from("watchlist")
    .select("id, url, user_id, profiles(email)")
    .eq("active", true);

  if (!watchlist?.length) {
    return res.json({ message: "No sites to check", count: 0 });
  }

  const byUser = {};
  for (const site of watchlist) {
    if (!byUser[site.user_id]) byUser[site.user_id] = [];
    byUser[site.user_id].push(site);
  }

  let totalProcessed = 0;

  for (const userId in byUser) {
    const sites = byUser[userId];
    const results = [];

    for (const site of sites) {
      try {
        // Get previous score for comparison
        const { data: lastAudit } = await supabase
          .from("audits")
          .select("overall_score")
          .eq("watchlist_id", site.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const previousScore = lastAudit?.overall_score ?? null;

        // Run new audit
        const audit = await runAudit(site.url);

        // Save to audits table
        await supabase.from("audits").insert({
          user_id: userId,
          watchlist_id: site.id,
          url: site.url,
          overall_score: audit.overallScore,
          result: audit,
          created_at: new Date().toISOString(),
        });

        // Update last_checked_at
        await supabase
          .from("watchlist")
          .update({ last_checked_at: new Date().toISOString() })
          .eq("id", site.id);

        results.push({
          url: site.url,
          previousScore,
          newScore: audit.overallScore,
          change: previousScore != null ? audit.overallScore - previousScore : 0,
        });

        totalProcessed++;

        // Small delay to respect Groq rate limits
        await new Promise(r => setTimeout(r, 1500));

      } catch (e) {
        console.error(`Failed to audit ${site.url}:`, e.message);
      }
    }

    // Send one email per user with all their sites
    const userEmail = sites[0]?.profiles?.email;
    if (userEmail && results.length > 0) {
      try {
        await sendReportEmail(userEmail, results);
      } catch (e) {
        console.error(`Failed to email ${userEmail}:`, e.message);
      }
    }
  }

  res.json({ message: "Weekly audit complete", count: totalProcessed });
});

export default router;