import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { supabase } from "../api/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Load Razorpay script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function Pricing() {
  const [plans, setPlans]       = useState(null);
  const [loading, setLoading]   = useState(null); // which plan is loading
  const [userPlan, setUserPlan] = useState("free");
  const { user }                = useAuthStore();
  const navigate                = useNavigate();

  // Fetch plans from backend
  useEffect(() => {
    fetch(`${API_URL}/api/razorpay/plans`)
      .then(r => r.json())
      .then(setPlans)
      .catch(() => {
        // Fallback hardcoded plans if backend is down
        setPlans({
          free:    { name: "Free",    priceDisplay: "₹0",      audits: 3,  features: ["3 audits/month", "SEO + Performance", "Basic AI fixes"] },
          starter: { name: "Starter", priceDisplay: "₹1,499",  audits: 20, features: ["20 audits/month", "All 5 categories", "Code fixes", "PDF export"] },
          pro:     { name: "Pro",     priceDisplay: "₹3,999",  audits: -1, features: ["Unlimited audits", "Competitor tracking", "Priority support"] },
          agency:  { name: "Agency",  priceDisplay: "₹9,999",  audits: -1, features: ["Everything in Pro", "10 client accounts", "White-label PDFs"] },
        });
      });

    // Get user's current plan
    if (user) {
      supabase
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single()
        .then(({ data }) => { if (data?.plan) setUserPlan(data.plan); });
    }
  }, [user]);

  const handleUpgrade = async (planId) => {
    if (!user) { navigate("/login"); return; }
    if (planId === "free") return;
    if (planId === userPlan) return;

    setLoading(planId);

    try {
      // 1. Load Razorpay checkout script
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load Razorpay. Check your internet connection.");

      // 2. Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/login"); return; }

      // 3. Create order on your backend
      const orderRes = await fetch(`${API_URL}/api/razorpay/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json();
        throw new Error(err.message || "Could not create order");
      }

      const { orderId, amount, currency, planName, keyId } = await orderRes.json();

      // 4. Open Razorpay checkout popup
      const options = {
        key:          keyId,
        amount:       amount,
        currency:     currency,
        name:         "GrowthLens",
        description:  planName,
        order_id:     orderId,
        image:        "/logo.png", // optional — your logo
        prefill: {
          email: user.email,
          name:  user.user_metadata?.full_name || "",
        },
        theme: { color: "#7c3aed" },

        // Called when payment is SUCCESSFUL
        handler: async (response) => {
          try {
            // 5. Verify payment on your backend
            const verifyRes = await fetch(`${API_URL}/api/razorpay/verify`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                plan:                planId,
              }),
            });

            const result = await verifyRes.json();

            if (result.success) {
              setUserPlan(planId);
              alert(`🎉 ${result.message}`);
              navigate("/dashboard");
            } else {
              throw new Error(result.message);
            }
          } catch (e) {
            alert("Payment verification failed: " + e.message);
          } finally {
            setLoading(null);
          }
        },

        // Called when user closes the popup
        modal: {
          ondismiss: () => {
            console.log("Payment cancelled by user");
            setLoading(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);

      // Handle payment failures inside the popup
      rzp.on("payment.failed", (response) => {
        console.error("Payment failed:", response.error);
        alert(`Payment failed: ${response.error.description}`);
        setLoading(null);
      });

      rzp.open();

    } catch (e) {
      alert("Error: " + e.message);
      setLoading(null);
    }
  };

  if (!plans) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const planOrder = ["free", "starter", "pro", "agency"];
  const highlights = { pro: true };

  return (
    <main className="min-h-screen bg-gray-50 py-20 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-14">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">
            Simple, Transparent Pricing
          </h1>
          <p className="text-gray-500 text-lg">
            Start free. Upgrade when you grow. Cancel anytime.
          </p>
          <p className="text-gray-400 text-sm mt-2">
            All prices in INR · UPI · Cards · Netbanking · Wallets accepted
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {planOrder.map(planId => {
            const plan       = plans[planId];
            const isCurrent  = userPlan === planId;
            const isHighlight = highlights[planId];
            const isLoading  = loading === planId;

            return (
              <div
                key={planId}
                className={`bg-white rounded-2xl border flex flex-col p-6 transition-all ${
                  isHighlight
                    ? "border-violet-400 shadow-xl shadow-violet-100 ring-1 ring-violet-400 scale-105"
                    : "border-gray-100 shadow-sm hover:shadow-md"
                }`}
              >
                {isHighlight && (
                  <div className="bg-violet-600 text-white text-xs font-bold px-3 py-1 rounded-full self-start mb-4 uppercase tracking-wide">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full self-start mb-4">
                    Current Plan
                  </div>
                )}

                <h2 className="font-bold text-xl text-gray-900 mb-1">{plan.name}</h2>
                <div className="mb-1">
                  <span className="text-3xl font-extrabold text-gray-900">{plan.priceDisplay}</span>
                  {planId !== "free" && <span className="text-gray-400 text-sm">/month</span>}
                </div>
                <p className="text-sm text-gray-400 mb-5">
                  {plan.audits === -1 ? "Unlimited audits" : `${plan.audits} audits/month`}
                </p>

                {/* Features */}
                <ul className="flex-1 space-y-2.5 mb-6">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleUpgrade(planId)}
                  disabled={planId === "free" || isCurrent || isLoading}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
                    isHighlight
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : planId === "free" || isCurrent
                        ? "bg-gray-100 text-gray-400 cursor-default"
                        : "bg-gray-900 text-white hover:bg-gray-700"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Processing…
                    </>
                  ) : isCurrent ? "Current Plan"
                    : planId === "free" ? "Free Forever"
                    : `Upgrade to ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Trust badges */}
        <div className="mt-14 text-center">
          <p className="text-gray-400 text-sm mb-4">Trusted payment methods</p>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {["UPI", "Visa", "Mastercard", "Netbanking", "Paytm", "PhonePe"].map(m => (
              <span key={m} className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm font-medium text-gray-500">
                {m}
              </span>
            ))}
          </div>
          <p className="text-gray-400 text-xs mt-4">
            🔒 Secured by Razorpay · PCI DSS Compliant · 256-bit SSL encryption
          </p>
        </div>

      </div>
    </main>
  );
}