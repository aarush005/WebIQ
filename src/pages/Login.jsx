import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import Button from "../components/ui/Button";
import { supabase } from "../api/supabase";


export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuthStore(s => s.setUser);



const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError("");
  setMessage("");


try {
  if (isSignUp) {
    const {data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.log("Signup error : ", error)
      throw error};
    setMessage("Sign up successful! Please check your email to confirm your account.");
  } else {
    const {data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.log("Signup error : ", error)
      throw error};
    setUser(data.user);
    navigate("/");
  }
}catch (error) {
    setError("An error occurred. Please try again.", error.message);
} finally {
  setLoading(false);
}
}


const handleGoogle = async () =>{
  await supabase.auth.signInWithOAuth({ provider: "google" ,
    options: {
      redirectTo: `${window.location.origin}/`
    }
  });

}


return (
  <main className="min-h-screen flex items-center justify-center px-4">
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
      <h1 className="text-2xl font-bold mb-6 text-center">{isSignUp ? "Create account" : "Welcome back"}</h1>
       <p className="text-gray-500 text-sm mb-6">{isSignUp ? "Start your free plan - 3 audits/month" : "Sign in to your WebIQ account"}</p>
      {/* Google OAuth */}
      <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors mb-4">
        <img src="https://www.google.com/favicon.ico" className="w-4 h-4" />
          Continue with Google
      </button>

      <div className="flex tems-center gap-3 mb-4">
        <hr className="flex-1 border-gray-200" />
        <span className="text-gray-400 text-xs">or</span>
        <hr className="flex-1 border-gray-200" />
      </div>

      {/* Email */}
      <input
      type="email"
      placeholder="Email"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none  focus:border-blue-400 mb-3"
      />


      <input
      type="password"
      placeholder="Password"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handleSubmit(e);
        }
      }}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none  focus:border-blue-400 mb-4"
      />

      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {message && <p className="text-green-500 text-sm mb-4">{message}</p>}

      <Button onClick={handleSubmit} loading={loading} className="w-full mb-4">
        {isSignUp ? "Create account" : "Sign in"}
      </Button>

      <p className="text-gray-500 text-sm text-center">
        {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
        <button
          onClick={() => setIsSignUp(s => !s)}
          className="text-violet-500 font-medium hover:underline"
        >
          {isSignUp ? "Sign in" : "Sign up free"}
            
        </button>
        </p>

    </div>

  </main>
)
}