import { useState, useEffect } from "react";
import ParticleBackground from "./ParticleBackground";
import {
  Mail,
  Lock,
  ShieldAlert,
  Sparkles,
  Loader2,
  MailCheck,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../supabaseClient";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Email confirmation state
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");
  const [userAlreadyExists, setUserAlreadyExists] = useState(false);

  useEffect(() => {
    let interval;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setError("");
      setUserAlreadyExists(false);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
      }
    } catch (err) {
      console.error("Google sign in error:", err);
      setError(err.message || "Failed to initialize Google Sign In");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;
    setResendLoading(true);
    setResendSuccess("");
    setError("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
      });

      if (error) {
        setError(error.message);
      } else {
        setResendSuccess("Verification email resent! Please check your inbox and spam folder.");
        setResendCooldown(60);
      }
    } catch (err) {
      setError(err.message || "Failed to resend confirmation email.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    if (!isLogin && password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setError("");
    setUserAlreadyExists(false);
    setResendSuccess("");
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          setError(error.message);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) {
          if (
            error.message.toLowerCase().includes("already") ||
            error.status === 422
          ) {
            setUserAlreadyExists(true);
            setError("An account with this email already exists.");
          } else {
            setError(error.message);
          }
          return;
        }

        // Supabase returns identities: [] if email is already registered and enumeration protection is on
        if (data?.user?.identities && data.user.identities.length === 0) {
          setUserAlreadyExists(true);
          setError("An account with this email already exists.");
          return;
        }

        // If a session was returned (auto-confirmed)
        if (data?.session) {
          return;
        }

        // Otherwise email confirmation was sent
        setConfirmationSent(true);
        setResendCooldown(60);
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
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-3 animate-pulse">
              <Sparkles className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent mb-1">
              Lore
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Your AI-powered memory
            </p>
          </div>

          {/* Dedicated Check Your Email Card View */}
          {confirmationSent ? (
            <div className="space-y-6 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center text-cyan-400">
                <MailCheck className="w-8 h-8" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white mb-2">
                  Check Your Email
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed">
                  We sent a confirmation link to:
                </p>
                <p className="text-sm font-semibold text-cyan-300 mt-1 break-all">
                  {email}
                </p>
                <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                  Click the link in your inbox to verify your account, then sign in to start using Lore.
                </p>
              </div>

              {resendSuccess && (
                <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-xl text-xs text-left">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{resendSuccess}</span>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-2.5 rounded-xl text-xs text-left">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resendLoading || resendCooldown > 0}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  {resendLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resending...</span>
                    </>
                  ) : resendCooldown > 0 ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend email in {resendCooldown}s</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmationSent(false);
                    setIsLogin(true);
                    setError("");
                  }}
                  className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Continue with Google (Primary OAuth Action) */}
              <div className="mb-6">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-white/25 text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 text-sm shadow-sm hover:shadow-md"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                      <span>Connecting to Google...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </>
                  )}
                </button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#0d121f] text-slate-400 font-medium rounded-full">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error Banner with contextual actions */}
                {error && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-sm transition-all duration-300">
                      <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
                      <span>{error}</span>
                    </div>

                    {userAlreadyExists && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true);
                          setError("");
                          setUserAlreadyExists(false);
                        }}
                        className="w-full py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-white/10 text-cyan-400 hover:text-cyan-300 rounded-lg border border-white/10 transition-colors cursor-pointer text-center"
                      >
                        Sign in with this email →
                      </button>
                    )}

                    {error.toLowerCase().includes("not confirmed") && (
                      <button
                        type="button"
                        onClick={handleResendEmail}
                        disabled={resendLoading || resendCooldown > 0}
                        className="w-full py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-white/10 text-purple-300 hover:text-purple-200 rounded-lg border border-white/10 transition-colors cursor-pointer text-center"
                      >
                        {resendCooldown > 0
                          ? `Resend confirmation link (${resendCooldown}s)`
                          : "Resend confirmation email"}
                      </button>
                    )}
                  </div>
                )}

                {resendSuccess && (
                  <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2.5 rounded-xl text-xs">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{resendSuccess}</span>
                  </div>
                )}

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Mail className="w-4 h-4 text-slate-500" />
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="glass-input w-full py-3 pl-10 pr-4 text-white placeholder-slate-500 rounded-xl text-sm"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                      Password
                    </label>
                    {!isLogin && (
                      <span className="text-[11px] text-slate-400">
                        Min. 6 characters
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4 text-slate-500" />
                    </span>
                    <input
                      type="password"
                      value={password}
                      minLength={6}
                      onChange={(e) => setPassword(e.target.value)}
                      className="glass-input w-full py-3 pl-10 pr-4 text-white placeholder-slate-500 rounded-xl text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full relative group overflow-hidden py-3.5 px-4 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:via-indigo-400 hover:to-purple-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-[0_0_15px_rgba(99,102,241,0.25)] hover:shadow-[0_0_25px_rgba(99,102,241,0.45)] cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{isLogin ? "Signing In..." : "Creating Account..."}</span>
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
                          setUserAlreadyExists(false);
                          setResendSuccess("");
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
                          setUserAlreadyExists(false);
                          setResendSuccess("");
                        }}
                        className="text-purple-400 hover:text-purple-300 font-semibold transition-colors duration-200 underline underline-offset-4 cursor-pointer"
                      >
                        Sign In
                      </button>
                    </p>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
