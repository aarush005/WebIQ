import { useEffect, useState } from "react";
import {useAuthStore} from "../store/authStore"
import { useNavigate } from "react-router";
import { main } from "framer-motion/client";




const API_URL = import.meta.env.VITE_API_URL || "http:localhost:4000";

export default function TimeMachine(){
    const [sites, setSites] = useState([])
    const [selected, setSelected] = useState(null)
    const [history, setHistory] = useState([])
    const [newUrl, setNewUrl] = useState("")
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [error, setError] = useState("")
    const {user} = useAuthStore();
    const navigate = useNavigate();

    const authHeader = async () => {
        const { data: { session }} = await supabase.auth.getSession();
        return { "Authorization": `Bearer ${session?.access_token}`};
    }

    const loadSites = async () =>{
        const header = await authHeader();
        const res = await fetch(`${API_URL}/api/watchlist`, { headers });
        const data = await res.json();
        setSites(Array.isArray(data) ? data : []);
        setLoading(false);
    }

    useEffect(() => { if (user) loadSites(); }, [user])



        return (
            <main className= "min-h-screen bg-gray-50 py-10 px-4">
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
                        <p className="text-sm font-medium text-gray-700 mb-3">Track a new site</p>
                        <div className="flex gap-2">
                            <input value={newUrl}
                            onChange={e => setNewUrl(e.target.value)}
                            onKeyDown={e =>e.key === "Enter" && handleAdd()}
                            placeholder="https://yourwebsite.com"
                            className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outine-none focus:border-violet-400"/>
                            <button
                            onClick= {handleAdd}
                            disabled={adding}
                            className="bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition disabled:opacity-50">
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
                    ):(
                        <div className="grid gap-3 mb-6">
                            {sites.map(site =>(
                                <div key={site.id}
                                className={`bg-white rounded-xl border p-4 flex items-center gap-4 cursor-pointer transition ${
                                    selected === site.id ? "border-violet-400 ring-1 ring-violet-400" : "border-gray-100 hover:border-gray-400"
                                }`}
                                onClick={() => handleViewHistory(site.id)}>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{site.url}</p>
                                    <p className="text-xs text-gray-400 mt-0 5">
                                        {site.last_checked_at ? `Last checked ${new Date(site.last_checked_at).toLocaleDateString("en-IN")}`
                                        : "Not checked yet - first check on Monday"}
                                    </p>
                                </div>
                                <button 
                                onClick={(e) => {e.stopPropagation(); handleRemove(site.id); }}
                                className="text-red-400 hover:text-red-600 text-sm px-3 py-1.5 rounded-lg hover:bg-red-50 transition">
                                    Remove
                                </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        )
}