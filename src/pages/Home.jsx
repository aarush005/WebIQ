import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuditStore } from "../store/auditStore";
import { useAudit } from "../hooks/useAudit";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

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
  const { loading, error } = useAuditStore();
  const { analyze } = useAudit();
  const navigate = useNavigate();

  const handleAudit = async () => {
    if (!url.trim()) return;

    // Start phase ticker
    let i = 0;
    const ticker = setInterval(() => {
      i = Math.min(i + 1, PHASES.length - 1);
      setPhaseIdx(i);
    }, 2000);

    await analyze(url.trim());
    clearInterval(ticker);
    navigate("/dashboard");  // go to results page
  };

  return (
    <main className="min-h-screen bg-[#0f0f1a] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* Headline */}
        <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
          One URL.{" "}
          <span className="bg-linear-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
            Full Picture.
          </span>
        </h1>
        <p className="text-gray-400 text-lg mb-10">
          SEO · Performance · Security · Conversion · Competitors — all in one AI audit.
        </p>

        {/* Input */}
        <div className="flex gap-3 bg-white/5 border border-white/10 rounded-2xl p-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleAudit()}
            placeholder="https://yourwebsite.com"
            className="flex-1 bg-transparent text-white placeholder-gray-500 px-4 py-3 outline-none text-base"
          />
          <Button onClick={handleAudit} disabled={loading || !url.trim()} loading={loading}>
            {loading ? PHASES[phaseIdx] : "Run Full Audit →"}
          </Button>
        </div>

        {error && (
          <p className="text-red-400 text-sm mt-4">{error}</p>
        )}

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2 justify-center mt-12">
          {["🔍 SEO Audit","⚡ Performance","🔒 Security","🎯 Conversion","📊 Competitors","🛠 AI Fixes"].map(f => (
            <span key={f} className="bg-white/5 border border-white/10 text-gray-400 text-sm px-4 py-1.5 rounded-full">
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}