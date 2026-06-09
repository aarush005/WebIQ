
// load environment variables from .env file
require("dotenv").config();

import express from "express";
import cors from "cors";

const auditRoutes = require("./routes/audit")
const stripeRoutes = require("./routes/stripe")

const app = expres()
const PORT = process.env.PORT || 4000;

// Middleware 

app.use(cors({
    origin: ["http://localhost:5173", "https://webiq.vercel.app"],
}))
app.use(express.json());

// Routes 

app.use("/api/audit", auditRoutes);
app.use("/api/stripe", stripeRoutes);


// Health check 

app.get("/health", (req,res)=>{
    res.json({
        status: "ok", time: new Date().toISOString()
    })
})

app.listen(PORT, () => {
    console.log(`Server running on http:localhost:${PORT}`);
})