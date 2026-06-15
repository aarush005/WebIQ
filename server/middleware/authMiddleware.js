const {createClient} = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
);

// This function will be used in our backend to verify the user's session
async function requireAuth(req, res, next){
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer")){
        return res.status(401).json({message: "No token provided"})
    }

    const token = authHeader.split(" ")[1];

    const { data: { user}, error} = await supabase.auth.getUser(token);

    if (error || !user) {
        return res.status(401).json({ message: "Invalid token"})
    }

    req.user = user; // attach user to request
    next(); // move to actual route handler
}

module.export = { requireAuth}