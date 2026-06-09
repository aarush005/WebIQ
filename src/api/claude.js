// API calls 


// This file handles all communication with the AI backend
// We call OUR backend, not Anthropic directly (keeps API key safe)

const API_URL = import.meta.env.VITE_API_URL; // from .env

export async function runAuditAPI(url, token) {
  const response = await fetch(`${API_URL}/api/audit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,  // user's auth token
    },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Audit failed");
  }

  return response.json(); // returns the parsed audit object
}