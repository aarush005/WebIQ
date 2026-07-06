import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { supabase } from "../../api/supabase";

export default function Header() {
  const { user, signOut } = useAuthStore();
  const navigate          = useNavigate();
  const location          = useLocation();

  const isActive = (path) =>
    location.pathname === path
      ? "text-white"
      : "text-gray-400 hover:text-white";

  return (
    <header className="bg-[#0f0f1a] px-6 py-4 flex items-center justify-between sticky top-0 z-50 border-b border-white/5">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-blue-500 flex items-center justify-center text-lg">
          🔬
        </div>
        <span className="text-white font-bold text-xl tracking-tight">
          Web<span className="text-violet-400">IQ</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-5">
        <Link to="/pricing" className={`text-sm transition-colors ${isActive("/pricing")}`}>
          Pricing
        </Link>

        {user ? (
          <>
            <Link to="/history" className={`text-sm transition-colors ${isActive("/history")}`}>
              History
            </Link>
            <Link to="/account" className={`text-sm transition-colors ${isActive("/account")}`}>
              Account
            </Link>
            <button
              onClick={() => navigate("/")}
              className="bg-linear-to-r from-violet-600 to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
            >
              + New Audit
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="bg-linear-to-r from-violet-600 to-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition"
          >
            Sign In
          </button>
        )}
      </nav>
    </header>
  );
}