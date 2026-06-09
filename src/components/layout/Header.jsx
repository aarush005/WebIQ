
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore"


export default function Header (){
  const { user, signOut} = useAuthStore();
  const navigate = useNavigate();
}

return (
  <header className="bg-[#0f0f1a] px-6 py-4 flex items-center justify-between sticky top-0 z-50">
{/* Logo */}
<Link to="/" className="flex items-center gap-3">
<div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-600 to-blue-500 flex items-center justify-center text-lg">
🔬
</div>

{/* Nav */}

<nav className="flex items-center gap-4">
   {user ? (
    <>
      <Link to="/history" className="text-gray-400 hover:text-white text-sm transition-colors">
      History
      </Link>
      <Link to="/settings" className="text-gray-400 hover:text-white text-sm transition-colors">
      Settings
      </Link>
      <Button variant="secondary" onClick={() => {signOut(); navigate("/")}}>Sign Out</Button>
    </>
   ): (
    <>
      <Link to="/pricing" className="text-gray-400 hover:text-white text-sm">Pricing</Link>
      <Button onClick={()=> navigate("/login")}>Sign In</Button>
    </>
   )}
</nav>
</Link>
  </header>
)