import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuditStore } from "../store/auditStore";
import { exportAuditPDF } from "../utils/exprortAuditPDF";

// ── Score Ring ──────────────────────────────────────────────
function ScoreRing({ score, color, size = 72 }) {
  const r = 28,
    cx = 36,
    cy = 36;
  const circ = 2 * Math.PI * r;
  const dash = ((score || 0) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 72 72">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="#e8e8e8"
        strokeWidth="6"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 36 36)"
      />
      <text
        x={cx}
        y={cy + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="13"
        fontWeight="700"
        fill={color}
      >
        {score ?? "—"}
      </text>
    </svg>
  );
}

// ── Issue Card ──────────────────────────────────────────────
function IssueCard({ issue }) {
  const [open, setOpen] = useState(false);

  const styles = {
    critical: {
      bg: "bg-red-50",
      border: "border-red-200",
      badge: "bg-red-100 text-red-700",
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      badge: "bg-amber-100 text-amber-700",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      badge: "bg-blue-100 text-blue-700",
    },
    good: {
      bg: "bg-green-50",
      border: "border-green-200",
      badge: "bg-green-100 text-green-700",
    },
  };

  const s = styles[issue.severity] || styles.info;

  return (
    <div className={`border ${s.border} rounded-xl mb-3 overflow-hidden`}>
      <div
        className={`${s.bg} flex items-center gap-3 px-4 py-3 cursor-pointer`}
        onClick={() => setOpen((o) => !o)}
      >
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${s.badge}`}
        >
          {issue.severity}
        </span>
        <span className="flex-1 text-sm font-medium text-gray-800">
          {issue.title}
        </span>
        <span className="text-gray-400 text-sm">{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="bg-white px-4 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {issue.description}
          </p>
          {issue.fix && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                AI Fix
              </p>
              {issue.fix.code ? (
                <pre className="bg-gray-900 text-green-400 rounded-lg p-4 text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap">
                  {issue.fix.code}
                </pre>
              ) : (
                <p className="bg-green-50 text-green-800 rounded-lg p-3 text-sm">
                  {issue.fix.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Section Block ───────────────────────────────────────────
function SectionBlock({ title, score, color, issues = [] }) {
  const critical = issues.filter((i) => i.severity === "critical").length;
  const warnings = issues.filter((i) => i.severity === "warning").length;
  const good = issues.filter((i) => i.severity === "good").length;

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <ScoreRing score={score} color={color} />
        <div>
          <p className="font-semibold text-gray-900 text-base">{title}</p>
          <p className="text-sm text-gray-400">
            {critical} critical · {warnings} warnings · {good} passed
          </p>
        </div>
      </div>
      {issues.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No issues found.</p>
      ) : (
        issues.map((issue, i) => <IssueCard key={i} issue={issue} />)
      )}
    </div>
  );
}

// ── Tab Config ──────────────────────────────────────────────
const TABS = [
  { id: "seo", label: "SEO", icon: "🔍", color: "#7c3aed" },
  { id: "performance", label: "Performance", icon: "⚡", color: "#0ea5e9" },
  { id: "security", label: "Security", icon: "🔒", color: "#16a34a" },
  { id: "conversion", label: "Conversion", icon: "🎯", color: "#ea580c" },
  { id: "competitor", label: "Competitors", icon: "📊", color: "#db2777" },
];

// ── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("seo");
  const [exporting, setExporting] = useState(false);
  const current = useAuditStore((s) => s.current);
  const navigate = useNavigate();

  // No audit yet — redirect home
  if (!current) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-lg">No audit results yet.</p>
        <button
          onClick={() => navigate("/")}
          className="bg-violet-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-violet-700 transition"
        >
          ← Run an Audit
        </button>
      </div>
    );
  }

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      await exportAuditPDF(current);
    } catch (e) {
      alert("PDF export failed: " + e.message);
    }
    setExporting(false);
  };

  const overallColor =
    current.overallScore >= 70
      ? "#16a34a"
      : current.overallScore >= 50
        ? "#ea580c"
        : "#c0392b";

  const activeTabData = TABS.find((t) => t.id === activeTab);
  const clearCurrent = useAuditStore(s => s.clearCurrent);


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Top Bar ── */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <button
            onClick={() => {
              clearCurrent(); // ← clears the store first
              navigate("/");
            }}
            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition cursor-pointer"
          >
            ← New Audit
          </button>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-lg truncate">
              {current.url}
            </p>
            <p className="text-sm text-gray-400">
              Stack:{" "}
              <strong className="text-gray-600">
                {current.stack || "Unknown"}
              </strong>
              {current.auditedAt && (
                <>
                  {" "}
                  ·{" "}
                  {new Date(current.auditedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition disabled:opacity-50 flex items-center gap-2"
            >
              {exporting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Exporting…
                </>
              ) : (
                "📄 Export PDF"
              )}
            </button>

            <div className="text-center">
              <ScoreRing
                score={current.overallScore}
                color={overallColor}
                size={64}
              />
              <p className="text-xs text-gray-400 mt-1">Overall</p>
            </div>
          </div>
        </div>

        {/* ── Score Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
          {TABS.map((tab) => {
            const data = current[tab.id];
            const score = data?.score ?? 0;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-2xl p-4 text-center transition-all border ${
                  isActive
                    ? "text-white shadow-lg scale-105"
                    : "bg-white border-gray-100 hover:border-gray-300"
                }`}
                style={
                  isActive
                    ? { background: tab.color, borderColor: tab.color }
                    : {}
                }
              >
                <div className="text-2xl mb-1">{tab.icon}</div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: isActive ? "#fff" : tab.color }}
                >
                  {score}
                </div>
                <div
                  className="text-xs mt-0.5"
                  style={{
                    color: isActive ? "rgba(255,255,255,0.8)" : "#9ca3af",
                  }}
                >
                  {tab.label}
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Tab Content ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* SEO */}
          {activeTab === "seo" && current.seo && (
            <SectionBlock
              title="SEO Audit"
              score={current.seo.score}
              color="#7c3aed"
              issues={current.seo.issues}
            />
          )}

          {/* Performance */}
          {activeTab === "performance" && current.performance && (
            <SectionBlock
              title="Performance Audit"
              score={current.performance.score}
              color="#0ea5e9"
              issues={current.performance.issues}
            />
          )}

          {/* Security */}
          {activeTab === "security" && current.security && (
            <SectionBlock
              title="Security Audit"
              score={current.security.score}
              color="#16a34a"
              issues={current.security.issues}
            />
          )}

          {/* Conversion */}
          {activeTab === "conversion" && current.conversion && (
            <SectionBlock
              title="Conversion Audit"
              score={current.conversion.score}
              color="#ea580c"
              issues={current.conversion.issues}
            />
          )}

          {/* Competitors */}
          {activeTab === "competitor" && current.competitor && (
            <div>
              <div className="flex items-center gap-4 mb-5">
                <ScoreRing score={current.competitor.score} color="#db2777" />
                <div>
                  <p className="font-semibold text-gray-900 text-base">
                    Competitor Analysis
                  </p>
                  <p className="text-sm text-gray-400">
                    Tracking:{" "}
                    {current.competitor.competitors?.join(", ") || "N/A"}
                  </p>
                </div>
              </div>

              {/* Missing Keywords */}
              {current.competitor.keywords?.length > 0 && (
                <div className="mb-5">
                  <p className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                    Missing Keyword Opportunities
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {current.competitor.keywords.map((k, i) => (
                      <span
                        key={i}
                        className="bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-3 py-1 text-sm"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps */}
              {current.competitor.gaps?.map((gap, i) => (
                <IssueCard key={i} issue={gap} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
