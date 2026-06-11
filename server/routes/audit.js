import express from "express"

const router = express.Router();
const {requireAuth} = require("../middleware/authMiddleware");
const {createClient} = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const AUDIT_PROMT = (url) => `
You are an expert website auditor. Analyze: ${url}
Return ONLY valid JSON (no markdown, no backticks). Start with { end with }.
{
"url": "${url}",
"overallScore": <0-100>,
"stack": "<Wordpress|React|Shopiy|etc>",
"seo": {
"score"; <0-100>,
"issue": [
{
"title": "...",
"severity": "critical|warning|info|good",
"description": "...",
"fix": { "code": "...", "text": "..."}
}]
},
"peformance": {"score": <0-100>, "issue": [...] },
"security": {"score": <0-100>, "issue": [...] },
"conversion": {"score":<0-100>, "issue": [...] },
"competitor":{
"score": <0-100>,
"competitors": ["...","...","..."],
"gaps": [...],
"keywords": ["...","...","..."]
}
}
Provide 4-6 issues per category. Be specific and realistic for this actual site.
`;

//POST /api/audit

router.post("/", requireAuth, async (req, res)=>{
    const { url } = req.body;

    if (!url) return res.status(400).json({message: "URL is required"});

    //Check user's plan quota
    const {data: profile } = await supabase
    .from("profiles")
    .select("plan, audit_count")
    .eq("id", req.user.id)
    .single();

    const limits = {free: 3, starter: 20, pro: Infinity, agency: Infinity};
    const limit = limits[profile?.plan || "free"];

    if ((profile?.audit_count || 0) >= limit) {
        return res.status(403).json({ message: "Audit limit reached. Please upgrade your plan." });
    }

    try {
        // Call Anthropic API from backend (API key stays safe here)
        const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 6000,
                system: "You are a website auditor. Analyze the given URL and provide a detailed audit in JSON format. No markdown, no explanations, just JSON.",
                messages: [
                    { role: "user", content: AUDIT_PROMT(url) }
                ]
            }),
        });

        const data = await response.json();
        const raw = data.content.map(b => b.text || "").join("");

        // Parse the raw response as JSON
        let audit;
        try{
            const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
            audit = JSON.parse(raw.substring(start, end + 1));
        }catch{
            return res.status(500).json({ message: "Failed to parse audit result. The response was not valid JSON.", raw });
        }

        // Increment audit report
        await supabase
        .from("profiles")
        .update({ audit_count: (profile?.audit_count || 0) + 1 })
        .eq("id", req.user.id);

        res.json({ audit });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error: error.message });
    }
});

//POST /api/audit/save - save audit report to DB
router.post("/save", requireAuth, async (req, res)=>{
    const { url, audit } = req.body;

    if (!url || !audit) {
        return res.status(400).json({message: "URL and audit data are required"});
    }

    const {error} = await supabase.from("audits").insert({
        user_id: req.user.id,
        url,
        report: audit,
        created_at: new Date().toISOString(),
    });

    if (error) {
        return res.status(500).json({ message: "Failed to save audit", error: error.message });
    }

    res.status(201).json({ message: "Audit saved successfully" });
});

module.exports = router;
