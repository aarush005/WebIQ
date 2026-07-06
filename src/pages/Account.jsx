import React, { useEffect, useState } from "react";
import { supabase } from "../api/supabase";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router";
import { button, span } from "framer-motion/client";

const PLAN_DETAILS = {
  free: {
    label: "Free",
    color: "bg-gray-100 text-gray-600",
    audits: 3,
    price: "₹0",
  },
  starter: {
    label: "Starter",
    color: "bg-blue-100 text-blue-700",
    audits: 20,
    price: "₹1,499/mo",
  },
  pro: {
    label: "Pro",
    color: "bg-violet-100 text-violet-700",
    audits: Infinity,
    price: "₹3,999/mo",
  },
  agency: {
    label: "Agency",
    color: "bg-amber-100 text-amber-700",
    audits: Infinity,
    price: "₹9,999/mo",
  },
};

export default function Account() {
  const { user, signOut } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full"></div>
      </div>
    );

  const plan = profile?.plan || "free";
  const planInfo = PLAN_DETAILS[plan];
  const auditCount = profile?.audit_count || 0;
  const auditLimit = planInfo.audits === Infinity ? null : planInfo.audits;
  const usagePct = auditLimit
    ? Math.min((auditCount / auditLimit) * 100, 100)
    : 0;
  const remaining = auditLimit
    ? Math.max(auditLimit - auditCount, 0)
    : "Unlimited";

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your profile and subscription
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
              {user?.email?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">
                {profile?.full_name || user?.user_metadata?.full_name || "User"}
              </p>
              <p className="text-gray-500 text-sm">{user?.email}</p>
            </div>
            <span
              className={`ml-auto text-xs font-bold px-3 py-1.5 rounded-full ${planInfo.color}`}
            >
              {planInfo.label} Plan
            </span>
          </div>

          {/* Usage Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600 font-medium">
                Audits this month
              </span>
              <span className="text-gray-500">
                {auditCount} / {auditLimit ?? "∞"} used
              </span>
            </div>
            {auditLimit && (
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    usagePct >= 90
                      ? "bg-red-500"
                      : usagePct >= 70
                        ? "bg-amber-500"
                        : "bg-violet-500"
                  }`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              {remaining === "Unlimited"
                ? "✨ You have unlimited audits"
                : remaining === 0
                  ? "⚠️ You've used all your audits this month"
                  : `${remaining} audits remaining this month`}
            </p>
          </div>

          {/* Plan info */}
          <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-800">
                {planInfo.label} Plan
              </p>
              <p className="text-sm text-gray-500">{planInfo.price}</p>
            </div>
            {plan === "free" || plan === "starter" ? (
              <button
                onClick={() => navigate("/pricing")}
                className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
              >
                Upgrade Plan
              </button>
            ) : (
              <span className="text-green-600 text-sm font-semibold">
                ✓ Active
              </span>
            )}
          </div>
        </div>


        {/* Audit Stats */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Plan Details</h2>
            <div className="grid grid-colsgap-4">
                {[
              { label: "Current Plan",    value: planInfo.label },
              { label: "Monthly Price",   value: planInfo.price },
              { label: "Audits Limit",    value: auditLimit ? `${auditLimit}/mo` : "Unlimited" },
              { label: "Audits Used",     value: auditCount },
              { label: "Member Since",    value: new Date(user?.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) },
              { label: "Last Payment",    value: profile?.plan_updated_at ? new Date(profile.plan_updated_at).toLocaleDateString("en-IN") : "N/A" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="font-semibold text-gray-800 text-sm">{value}</p>
              </div>
            ))}
            </div>
        </div>
      </div>
    </main>
  );
}
