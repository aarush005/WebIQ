import { createClient } from "@supabase/supabase-js";

export async function requireAuth(req, res, next) {
  try {
    // Create client inside the function so env vars are already loaded
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    req.user = user;
    next();

  } catch (err) {
    res.status(500).json({ message: "Auth check failed: " + err.message });
  }
}