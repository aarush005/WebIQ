import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useAuditStore } from "../store/auditStore";
import { supabase } from "../api/supabase";

function ScoreBadge({ score }) {
  const color = score >= 70 ? "bg-green-100 text-green-700"
              : score >= 50 ? "bg-amber-100 text-amber-700"
              : "bg-red-100 text-red-700";
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>
      {score}
    </span>
  );
}

export default function History() {
  const [audits, setAudits]   = useState([]);
  const [loading, setLoading] = useState(true);
  const { user }              = useAuthStore();
  const setCurrent            = useAuditStore(s => s.setCurrent);
  const localAudits           = useAuditStore(s => s.audits);
  const navigate              = useNavigate();

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    // Try to load from Supabase first
    supabase
      .from("audits")
      .select("id, url, overall_score, result, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (error || !data?.length) {
          // Fallback to local store if DB has nothing
          setAudits(localAudits || []);
        } else {
          setAudits(data.map(a => ({
            id:           a.id,
            url:          a.url,
            overallScore: a.overall_score,
            auditedAt:    a.created_at,
            ...a.result,
          })));
        }
        setLoading(false);
      });
  }, [user]);

  const handleView = (audit) => {
    setCurrent(audit);
    navigate("/dashboard");
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit History</h1>
            <p className="text-gray-500 text-sm mt-1">{audits.length} audits total</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="bg-violet-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
          >
            + New Audit
          </button>
        </div>

        {audits.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center">
            <p className="text-4xl mb-4">📊</p>
            <p className="text-gray-500 font-medium">No audits yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Run your first audit to see results here</p>
            <button
              onClick={() => navigate("/")}
              className="bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition"
            >
              Run First Audit →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {audits.map((audit, i) => (
              <div
                key={audit.id || i}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 hover:shadow-md transition cursor-pointer"
                onClick={() => handleView(audit)}
              >
                {/* Overall score ring */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                  audit.overallScore >= 70 ? "bg-green-500" :
                  audit.overallScore >= 50 ? "bg-amber-500" : "bg-red-500"
                }`}>
                  {audit.overallScore ?? "?"}
                </div>

                {/* URL + date */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{audit.url}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {audit.auditedAt
                      ? new Date(audit.auditedAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "Unknown date"}
                  </p>
                </div>

                {/* Category scores */}
                <div className="hidden sm:flex items-center gap-2">
                  {["seo","performance","security","conversion"].map(cat => (
                    audit[cat]?.score != null && (
                      <div key={cat} className="text-center">
                        <ScoreBadge score={audit[cat].score} />
                        <p className="text-xs text-gray-400 mt-0.5 capitalize">{cat}</p>
                      </div>
                    )
                  ))}
                </div>

                <span className="text-gray-300 text-lg shrink-0">→</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
