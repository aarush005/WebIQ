// We accept 'props' that customize this button
export default function Button({
  children,       // text/content inside button
  onClick,        // function to call on click
  variant = "primary",  // default is "primary"
  disabled = false,
  className = "",
  loading = false
}) {
  const base = "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center gap-2";
  
  const variants = {
    primary: "bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:opacity-90 shadow-md",
    secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600",
    ghost: "text-gray-500 hover:bg-gray-100",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${disabled || loading ? "opacity-50 cursor-not-allowed" : ""} ${className}`}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      )}
      {children}
    </button>
  );
}