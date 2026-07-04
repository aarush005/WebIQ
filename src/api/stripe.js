const express = require("express");
const router = express.Router();
const Stripe = require("stripe");
const { createClient } = require("@supabase/supabase-js");
const { requireAuth } = require("../middleware/authMiddleware");

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PLANS = {
  starter: { priceId: "price_XXXX_starter", name: "Starter" },
  pro:     { priceId: "price_XXXX_pro",     name: "Pro" },
  agency:  { priceId: "price_XXXX_agency",  name: "Agency" },
};
// Replace price_XXXX with real Price IDs from Stripe Dashboard

// POST /api/stripe/checkout — create checkout session
router.post("/checkout", requireAuth, async (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) return res.status(400).json({ message: "Invalid plan" });

  // Get or create Stripe customer
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id, email")
    .eq("id", req.user.id)
    .single();

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: profile.email });
    customerId = customer.id;
    await supabase.from("profiles").update({ stripe_customer_id: customerId }).eq("id", req.user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
    success_url: `${process.env.FRONTEND_URL}/settings?upgraded=true`,
    cancel_url:  `${process.env.FRONTEND_URL}/pricing`,
    metadata: { userId: req.user.id, plan },
  });

  res.json({ url: session.url });
});

// POST /api/stripe/webhook — Stripe calls this after payment
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send("Webhook signature failed");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, plan } = session.metadata;

    // Upgrade user's plan + reset audit count
    await supabase.from("profiles").update({
      plan,
      audit_count: 0,
      stripe_customer_id: session.customer,
    }).eq("id", userId);
  }

  if (event.type === "customer.subscription.deleted") {
    // Downgrade to free when subscription cancelled
    const customerId = event.data.object.customer;
    await supabase.from("profiles").update({ plan: "free" }).eq("stripe_customer_id", customerId);
  }

  res.json({ received: true });
});

module.exports = router;