import "dotenv/config";
import express from "express";
import cors from "cors";
import auditRoutes from "./routes/audit.js";
// import stripeRoutes from "./routes/stripe.js";
import razorpayRoutes from "./routes/razorpay.js";
import watchlistRoutes from "./routes/watchlist.js"
import cronRoutes from "./routes/cron.js"


const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: ["http://localhost:5173", "https://growthlens.vercel.app"],
}));
app.use(express.json());

app.use("/api/audit", auditRoutes);
app.use("/api/razorpay", razorpayRoutes);

app.use("/api/watchlist", watchlistRoutes);
app.use("/api/cron", cronRoutes);


app.get("/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});