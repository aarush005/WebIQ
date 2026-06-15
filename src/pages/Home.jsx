import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuditStore } from "../store/auditStore";
import { useAudit } from "../hooks/useAudit";

const PHASES = [
  "Fetching site metadata…",
  "Running SEO scan…",
  "Checking security headers…",
  "Analyzing conversion signals…",
  "Researching competitors…",
  "Generating AI fixes…",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [phaseIdx, setPhaseIdx] = useState(0);
  const loading = useAuditStore(s => s.loading);
  const error   = useAuditStore(s => s.error);
  const current = useAuditStore(s => s.current);
  const { analyze } = useAudit();
  const navigate = useNavigate();

  // When audit finishes successfully, go to dashboard
  useEffect(() => {
    if (current && !loading) {
      navigate("/dashboard");
    }
  }, [current, loading]);

  const handleAudit = async () => {
    if (!url.trim() || loading) return;

    // Start phase ticker
    let i = 0;
    const ticker = setInterval(() => {
      i = Math.min(i + 1, PHASES.length - 1);
      setPhaseIdx(i);
    }, 2200);

    await analyze(url.trim());
    clearInterval(ticker);
    setPhaseIdx(0);
  };

  return (
    <main className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">

        {/* Headline */}
        <div className="text-5xl font-extrabold text-white leading-tight mb-4">
          One URL.{" "}
          <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Full Picture.
          </span>
        </div>
        <p className="text-gray-400 text-lg mb-10 leading-relaxed">
          SEO · Performance · Security · Conversion · Competitors —
          all in one AI-powered audit.
        </p>

        {/* Input */}
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAudit()}
            placeholder="https://yourwebsite.com"
            disabled={loading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 outline-none text-base disabled:opacity-50"
          />
          <button
            onClick={handleAudit}
            disabled={loading || !url.trim()}
            className="bg-gradient-to-r from-violet-600 to-blue-500 text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition whitespace-nowrap flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                {PHASES[phaseIdx]}
              </>
            ) : "Run Full Audit →"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-12">
          {["🔍 SEO Audit", "⚡ Performance", "🔒 Security", "🎯 Conversion", "📊 Competitors", "🛠 AI Fix Generator"].map(f => (
            <span key={f} className="bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full">
              {f}
            </span>
          ))}
        </div>

      </div>
    </main>
  );
}
