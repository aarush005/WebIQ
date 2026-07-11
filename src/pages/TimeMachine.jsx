import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import { useNavigate } from "react-router";
import { main } from "framer-motion/client";
import {
  ResponsiveContainer,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";

const API_URL = import.meta.env.VITE_API_URL || "http:localhost:4000";

export default function TimeMachine() {
  const [sites, setSites] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [newUrl, setNewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const authHeader = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return { Authorization: `Bearer ${session?.access_token}` };
  };

  const loadSites = async () => {
    const header = await authHeader();
    const res = await fetch(`${API_URL}/api/watchlist`, { headers });
    const data = await res.json();
    setSites(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  useEffect(() => {
    if (user) loadSites();
  }, [user]);

  const handleAdd = async() =>{
    if (!newUrl.trim()) return;
    setAdding(true);
    setError("");
try{
    const headers = await authHeader();
    const res = await fetch(`${API_URL}/api/watchlist`, {
        method: "POST",
        headers: {...headers, "Content-Type": "application/json"},
        body:JSON.stringify({ url:newUrl.trim()})
    })
    const data = await res.json();
    if(!res.ok) throw new Error(data.message);
    setNewUrl("");
    loadSites();
}catch (e){
    setError(e.message)
}
setAdding(false);
  }

  const handleRemove = async (id) =>{
    const headers = await authHeader();
    await fetch(`${API_URL}/api/watchlist/${id}`, {
        method: "DELETE", headers
    });
    loadSites();
    if(selected === id)  setSelected(null);
  };

  const handleViewHistory = async (id) => {
    const headers = await authHeader();
    const res = await fetch(`${API_URL}/api/watchlist/${id}/history`, { headers});
    const data = await res.json();
    setHistory(Array.isArray(data) ? data.map(h => ({
        ...h,
        date: new Date(h.date).toLocaleDateString("en-IN", { day: "numeric", month: "short"}),
    })):[])
  };

  if(loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full"/>
    </div>
  );

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Website Time Machine
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Auto-tracked sites - re-audited every Monday, with email reports
          </p>
        </div>

        {/* Add sites  */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Track a new site
          </p>
          <div className="flex gap-2">
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="https://yourwebsite.com"
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outine-none focus:border-violet-400"
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50"
            >
              {adding ? "Adding..." : "+ Track"}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Tracked sites list  */}
        {sites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray100 p-12 text-center">
            <p className="text-4xl mb-3">🕰️</p>
            <p className="text-gray-500 font-medium">No sites tracked yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Add a site above to start getting weekly score reports
            </p>
          </div>
        ) : (
          <div className="grid gap-3 mb-6">
            {sites.map((site) => (
              <div
                key={site.id}
                className={`bg-white rounded-xl border p-4 flex items-center gap-4 cursor-pointer transition ${
                  selected === site.id
                    ? "border-violet-400 ring-1 ring-violet-400"
                    : "border-gray-100 hover:border-gray-400"
                }`}
                onClick={() => handleViewHistory(site.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {site.url}
                  </p>
                  <p className="text-xs text-gray-400 mt-0 5">
                    {site.last_checked_at
                      ? `Last checked ${new Date(site.last_checked_at).toLocaleDateString("en-IN")}`
                      : "Not checked yet - first check on Monday"}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(site.id);
                  }}
                  className="text-red-400 hover:text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Score history chart  */}
        {selected && history.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Score Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis domain="data" fontSize={12} stroke="#999" />
                <YAxis domain={[0]} fontSize={12} stroke="#999" />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="overall"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  name="Overall"
                />
                <Line
                  type="monotone"
                  dataKey="seo"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  name="SEO"
                />
                <Line
                  type="monotone"
                  dataKey="performance"
                  stroke="#16a34a"
                  strokeWidth={2}
                  name="Performance"
                />
                <Line
                  type="monotone"
                  dataKey="security"
                  stroke="#ea580c"
                  strokeWidth={2}
                  name="Security"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {selected && history.length === 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
                <div className="text-gray-400 text-sm">
                    No history yet - this site will be checked on the next scheduled run (Monday).
                </div>
            </div>
        )}
      </div>
    </main>
  );
}
