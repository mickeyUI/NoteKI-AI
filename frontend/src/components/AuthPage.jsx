import React, { useState } from "react";
import { api } from "../services/api";
import ParticleBackground from "./ParticleBackground";
import { Mail, Lock, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "../supabaseClient";
import App from "../App";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("LOGIN ERROR:", error);
          return;
        }
        return <App />;

        console.log("LOGIN SUCCESS:", data);
      } else {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          console.error("SIGNUP ERROR:", error);
          return;
        }

        console.log("SIGNUP SUCCESS:", data);
        return <App />;

        if (data.session) {
          // User is already logged in
          console.log("Logged in:", data.session);
        } else {
          // Email confirmation is required
          console.log("Check your email");
        }
        // Automatically attempt login upon successful registration
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (error) {
            console.error("LOGIN ERROR:", error);
            return;
          }

          console.log("LOGIN SUCCESS:", data);
        } catch (error) {
          console.log("catch", error.message);
          setIsLogin(true);
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred during authentication.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 select-none">
      <ParticleBackground />

      {/* Main Glass Card container */}
      <div className="relative z-10 w-full max-w-md">
        {/* Ambient background blur blobs */}
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden border border-white/10">
          {/* Top gradient border highlight */}
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

          {/* Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4 animate-pulse">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Lore
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Your AI-powered memory
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm transition-all duration-300">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="w-5 h-5 text-slate-500" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full py-3.5 pl-10 pr-4 text-white placeholder-slate-500 rounded-xl text-sm"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-slate-500" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full py-3.5 pl-10 pr-4 text-white placeholder-slate-500 rounded-xl text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group overflow-hidden py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.45)] cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{isLogin ? "Signing In..." : "Registering..."}</span>
                </>
              ) : (
                <span>{isLogin ? "Sign In" : "Create Account"}</span>
              )}
            </button>

            {/* Toggle screen trigger */}
            <div className="text-center text-sm text-slate-400 pt-2">
              {isLogin ? (
                <p>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(false);
                      setError("");
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors duration-200 underline underline-offset-4 cursor-pointer"
                  >
                    Sign Up
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setIsLogin(true);
                      setError("");
                    }}
                    className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200 underline underline-offset-4 cursor-pointer"
                  >
                    Sign In
                  </button>
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
