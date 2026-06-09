export function parseAudit(text) {
  const strategies = [
    () => JSON.parse(text.trim()),
    () => JSON.parse(text.replace(/```json|```/g, "").trim()),
    () => {
      const s = text.indexOf("{"), e = text.lastIndexOf("}");
      return JSON.parse(text.slice(s, e + 1));
    },
    () => {
      const clean = text.replace(/```json|```/g, "").replace(/[\x00-\x1F\x7F]/g, " ").trim();
      const s = clean.indexOf("{"), e = clean.lastIndexOf("}");
      return JSON.parse(clean.slice(s, e + 1));
    },
  ];

  for (const fn of strategies) {
    try {
      const result = fn();
      if (result && result.seo) return result; // validate it's actually an audit
    } catch {}
  }
  return null;
}