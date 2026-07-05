import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Header from "./components/layout/Header";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import History from "./pages/History";
import Pricing from "./pages/Pricing";
import Login from "./pages/Login";
import Settings from "./pages/Settings";
import { useAuthStore } from "./store/authStore";
import { supabase } from "./api/supabase";
import Account from "./pages/Account";

// Protected route — redirects to /login if not logged in
function ProtectedRoute({ children }) {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  if (loading) return <div className="text-white p-10">Loading...</div>;
  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  const init = useAuthStore((s) => s.init);
  const setUser = useAuthStore((s) => s.setUser);

  //Check auth status when app loads
  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    // Listen for login/logout events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/login" element={<Login />} />

          {/* Protected routes — must be logged in */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          {/* Catch-all — redirect unknown URLs to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
