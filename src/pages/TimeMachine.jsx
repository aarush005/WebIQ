import { useEffect, useState } from "react";
import {useAuthStore} from "../store/authStore"
import { useNavigate } from "react-router";




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


}