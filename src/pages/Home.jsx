import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuditStore } from "../store/auditStore";
import { useAudit } from "../hooks/useAudit";

const PHASES = [
  "Analyzing URL structure…",
  "Checking SSL & security…",
  "Evaluating SEO signals…",
  "Auditing performance…",
  "Researching competitors…",
  "Generating AI fixes…",
];

export default function Home() {
  const [url, setUrl]           = useState("");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const tickerRef               = useRef(null);

  // ✅ All hooks at the TOP — never after a return
  const loading  = useAuditStore(s => s.loading);
  const error    = useAuditStore(s => s.error);
  const { analyze } = useAudit();
  const navigate    = useNavigate();

  const handleAudit = async () => {
    if (!url.trim() || loading) return;

    // Normalize URL
    let targetUrl = url.trim();
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }

    // Start phase ticker
    let i = 0;
    tickerRef.current = setInterval(() => {
      i = Math.min(i + 1, PHASES.length - 1);
      setPhaseIdx(i);
    }, 2500);

    await analyze(targetUrl);

    // Stop ticker
    clearInterval(tickerRef.current);
    setPhaseIdx(0);

    // ✅ Read store state directly after analyze — no useEffect needed
    const state = useAuditStore.getState();
    if (state.current && !state.error) {
      navigate("/dashboard");
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></span>
          <span className="text-violet-300 text-sm font-medium">AI-Powered Website Auditor</span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
          One URL.{" "}
          <span className="bg-linear-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Full Picture.
          </span>
        </h1>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
          SEO · Performance · Security · Conversion · Competitors<br />
          <span className="text-gray-500 text-base">Powered by AI — get actionable fixes in seconds</span>
        </p>

        {/* Input */}
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 mb-4">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAudit()}
            placeholder="flipkart.com or https://yoursite.com"
            disabled={loading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 outline-none text-base disabled:opacity-50"
          />
          <button
            onClick={handleAudit}
            disabled={loading || !url.trim()}
            className="bg-linear-to-r from-violet-600 to-blue-500 text-white px-5 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition flex items-center gap-2 min-w-[170px] justify-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <span className="text-xs truncate">{PHASES[phaseIdx]}</span>
              </>
            ) : (
              "Run Full Audit →"
            )}
          </button>
        </div>

        {/* Hint */}
        {!loading && !error && (
          <p className="text-gray-600 text-xs">
            Try: flipkart.com · zomato.com · yourwebsite.com
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-left">
            <p className="text-red-400 text-sm">❌ {error}</p>
          </div>
        )}

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-10">
          {[
            "🔍 SEO Audit",
            "⚡ Performance",
            "🔒 Security",
            "🎯 Conversion",
            "📊 Competitor Analysis",
            "🛠 AI Fix Generator",
            "📄 PDF Export",
          ].map(f => (
            <span
              key={f}
              className="bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full"
            >
              {f}
            </span>
          ))}
        </div>

      </div>
    </main>
  );
}