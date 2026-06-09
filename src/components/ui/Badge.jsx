export default function Badge({ label, severity }) {
  const styles = {
    critical: "bg-red-100 text-red-700 border-red-200",
    warning:  "bg-amber-100 text-amber-700 border-amber-200",
    info:     "bg-blue-100 text-blue-700 border-blue-200",
    good:     "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${styles[severity] || styles.info}`}>
      {label}
    </span>
  );
}  