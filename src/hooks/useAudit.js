import { useAuditStore } from "../store/auditStore";
import { useAuthStore } from "../store/authStore";
import { runAuditAPI } from "../api/claude";
import { supabase } from "../api/supabase";

export function useAudit() {
  const { setLoading, setError, setCurrent, addToHistory } = useAuditStore();
  const { user } = useAuthStore();

  const analyze = async (url) => {
    setLoading(true);
    setError(null);

    try {
      // Get the user's auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const audit = await runAuditAPI(url, token);

      // Add metadata
      const withMeta = {
        ...audit,
        id: crypto.randomUUID(),
        auditedAt: new Date().toISOString(),
        userId: user?.id,
      };

      setCurrent(withMeta);
      addToHistory(withMeta);

      // Save to database
      await saveAuditToDB(withMeta);

    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return { analyze };
}

async function saveAuditToDB(audit) {
  try {
    await fetch(`${import.meta.env.VITE_API_URL}/api/audit/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(audit),
    });
  } catch (e) {
    console.warn("Could not save audit to DB:", e.message);
  }
}