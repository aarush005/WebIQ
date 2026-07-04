import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { requireAuth } from "../middleware/authMiddleware.js";

// Temporary debug — remove after fixing
console.log("Razorpay Key ID:", process.env.RAZORPAY_KEY_ID ? "✅ Loaded" : "❌ MISSING");
console.log("Razorpay Secret:", process.env.RAZORPAY_KEY_SECRET ? "✅ Loaded" : "❌ MISSING");

const router = express.Router();

// Plans config — amounts in PAISE (₹1 = 100 paise)
const PLANS = {
  starter: { amount: 149900, name: "Starter Plan", audits: 20 },  // ₹1,499/mo
  pro:     { amount: 399900, name: "Pro Plan",     audits: -1 },  // ₹3,999/mo (-1 = unlimited)
  agency:  { amount: 999900, name: "Agency Plan",  audits: -1 },  // ₹9,999/mo
};

function getRazorpay() {
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

// ── POST /api/razorpay/create-order ─────────────────────────
// Creates a Razorpay order and returns order_id to frontend
router.post("/create-order", requireAuth, async (req, res) => {
  const { plan } = req.body;

  if (!PLANS[plan]) {
    return res.status(400).json({ message: "Invalid plan selected" });
  }

  try {
    const razorpay = getRazorpay();
    const planData = PLANS[plan];

const order = await razorpay.orders.create({
  amount:   planData.amount,
  currency: "INR",
  receipt:  `rcpt_${Date.now()}`,  // ← max 40 chars, this is only 18
  notes: {
    userId: req.user.id,
    plan:   plan,
  },
});

    console.log("✅ Razorpay order created:", order.id);

    res.json({
      orderId:   order.id,
      amount:    order.amount,
      currency:  order.currency,
      planName:  planData.name,
      keyId:     process.env.RAZORPAY_KEY_ID, // safe to send to frontend
    });

  } catch (e) {
    console.error("Razorpay create-order error:", e);
    res.status(500).json({ message: "Could not create order: " + e.message });
  }
});

// ── POST /api/razorpay/verify ────────────────────────────────
// Verifies payment signature — CRITICAL security step
// If someone fakes a payment, this catches it
router.post("/verify", requireAuth, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing payment verification data" });
  }

  try {
    // Step 1 — Generate expected signature
    // Razorpay signature = HMAC-SHA256 of "order_id|payment_id" using your key_secret
    const body      = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected  = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    // Step 2 — Compare signatures
    const isValid = expected === razorpay_signature;

    if (!isValid) {
      console.error("❌ Invalid Razorpay signature — possible fraud attempt");
      return res.status(400).json({ message: "Payment verification failed" });
    }

    console.log("✅ Payment verified:", razorpay_payment_id);

    // Step 3 — Update user plan in Supabase
    const supabase  = getSupabase();
    const planData  = PLANS[plan];

    const { error } = await supabase
      .from("profiles")
      .update({
        plan:                plan,
        audit_count:         0,            // reset monthly count
        razorpay_payment_id: razorpay_payment_id,
        plan_updated_at:     new Date().toISOString(),
      })
      .eq("id", req.user.id);

    if (error) {
      console.error("Supabase update error:", error);
      return res.status(500).json({ message: "Payment verified but plan update failed" });
    }

    res.json({
      success:  true,
      message:  `Successfully upgraded to ${planData.name}`,
      plan:     plan,
    });

  } catch (e) {
    console.error("Verify error:", e);
    res.status(500).json({ message: "Verification error: " + e.message });
  }
});

// ── POST /api/razorpay/webhook ───────────────────────────────
// Razorpay calls this automatically for subscription events
// Set this URL in Razorpay Dashboard → Webhooks
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const secret    = process.env.RAZORPAY_WEBHOOK_SECRET;

  // Verify webhook signature
  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.body)
    .digest("hex");

  if (expected !== signature) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const event = JSON.parse(req.body.toString());
  const supabase = getSupabase();

  console.log("📨 Razorpay webhook:", event.event);

  // Handle payment captured
  if (event.event === "payment.captured") {
    const payment = event.payload.payment.entity;
    const { userId, plan } = payment.notes || {};

    if (userId && plan) {
      await supabase
        .from("profiles")
        .update({ plan, audit_count: 0 })
        .eq("id", userId);
      console.log(`✅ Webhook: upgraded ${userId} to ${plan}`);
    }
  }

  // Handle payment failed
  if (event.event === "payment.failed") {
    const payment = event.payload.payment.entity;
    console.log("❌ Payment failed:", payment.id, payment.error_description);
    // Optionally email the user
  }

  res.json({ received: true });
});

// ── GET /api/razorpay/plans ──────────────────────────────────
// Returns available plans to frontend
router.get("/plans", (req, res) => {
  res.json({
    free: {
      name: "Free", price: 0, priceDisplay: "₹0",
      audits: 3, features: [
        "3 audits/month",
        "SEO + Performance audit",
        "Basic AI fixes",
        "PDF export",
      ],
    },
    starter: {
      name: "Starter", price: 1499, priceDisplay: "₹1,499",
      audits: 20, features: [
        "20 audits/month",
        "All 5 audit categories",
        "Detailed AI fixes with code",
        "PDF export",
        "Audit history",
        "Email support",
      ],
    },
    pro: {
      name: "Pro", price: 3999, priceDisplay: "₹3,999",
      audits: -1, features: [
        "Unlimited audits",
        "All Starter features",
        "Score trend charts",
        "Competitor tracking",
        "Priority support",
        "API access",
      ],
    },
    agency: {
      name: "Agency", price: 9999, priceDisplay: "₹9,999",
      audits: -1, features: [
        "Everything in Pro",
        "Up to 10 client accounts",
        "White-label PDF reports",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  });
});

export default router;

