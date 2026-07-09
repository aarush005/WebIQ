// Handles add/remove/list tracked sites

import express from "express";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

function getSupabase() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/watchlist — list user's tracked sites
router.get("/", requireAuth, async (req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("watchlist")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ message: error.message });
  res.json(data);
});

// POST /api/watchlist — add a site to track
router.post("/", requireAuth, async (req, res) => {
  const { url, nickname } = req.body;
  if (!url) return res.status(400).json({ message: "URL is required" });

  const supabase = getSupabase();

  // Check plan — only paid plans can use Time Machine
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", req.user.id)
    .single();

  if (profile?.plan === "free") {
    return res.status(403).json({
      message: "Website Time Machine is a Pro feature. Please upgrade to track sites.",
    });
  }

  // Check watchlist limit (Starter: 3, Pro: 15, Agency: unlimited)
  const limits = { starter: 3, pro: 15, agency: 100 };
  const { count } = await supabase
    .from("watchlist")
    .select("*", { count: "exact", head: true })
    .eq("user_id", req.user.id)
    .eq("active", true);

  if (count >= (limits[profile.plan] || 0)) {
    return res.status(403).json({
      message: `You've reached your tracking limit (${limits[profile.plan]} sites) for the ${profile.plan} plan.`,
    });
  }

  const { data, error } = await supabase
    .from("watchlist")
    .insert({ user_id: req.user.id, url, nickname: nickname || null })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return res.status(409).json({ message: "This site is already being tracked" });
    }
    return res.status(500).json({ message: error.message });
  }

  res.status(201).json(data);
});

// DELETE /api/watchlist/:id — stop tracking a site
router.delete("/:id", requireAuth, async (req, res) => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id); // security: can only delete own entries

  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

// GET /api/watchlist/:id/history — score history for one tracked site
router.get("/:id/history", requireAuth, async (req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("audits")
    .select("id, overall_score, result, created_at")
    .eq("watchlist_id", req.params.id)
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  const history = data.map(a => ({
    date: a.created_at,
    overall: a.overall_score,
    seo: a.result?.seo?.score,
    performance: a.result?.performance?.score,
    security: a.result?.security?.score,
    conversion: a.result?.conversion?.score,
  }));

  res.json(history);
});

export default router;
