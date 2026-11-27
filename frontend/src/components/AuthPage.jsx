import { useState, useEffect } from "react";
import {
  AtSign,
  Lock,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  MailCheck,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Layers,
  MessageSquare,
  Zap,
} from "lucide-react";
import { supabase } from "../supabaseClient";

const FEATURE_HIGHLIGHTS = [
  {
    icon: Layers,
    title: "Everything you know. One place.",
    description:
      "Voice recordings, screenshots, text notes, and web bookmarks automatically indexed in real time.",
  },
  {
    icon: MessageSquare,
    title: "One conversation away.",
    description:
      "Ask your second brain questions in natural language and synthesize answers with accurate citations.",
  },
  {
    icon: Zap,
    title: "Think less about finding. More about creating.",
    description:
      "Instant AI auto-summaries, auto-generated relationship graphs, and lightning-fast semantic search.",
  },
];

/**
 * Split-screen authentication page for Sign In and Sign Up.
 * Displays the Lore product overview on the left (desktop lg+) and the
 * email/Google auth form on the right using the app's monochrome dark theme.
 */
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

  // Switch between Sign In and Sign Up modes while clearing transient form alerts.
  const switchAuthMode = (nextIsLogin) => {
    setIsLogin(nextIsLogin);
    setError("");
    setUserAlreadyExists(false);
    setResendSuccess("");
  };

  // Initiate Google OAuth login via Supabase.
  const handleGoogleSignIn = async () => {
    if (!navigator.onLine) {
      setError(
        "You are currently offline. Connect to the internet to sign in with Google.",
      );
      return;
    }

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

  // Resend Supabase signup verification email with a 60-second cooldown.
  const handleResendEmail = async () => {
    if (!email || resendCooldown > 0) return;
    if (!navigator.onLine) {
      setError(
        "You are currently offline. Connect to the internet to resend the email.",
      );
      return;
    }
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
        setResendSuccess(
          "Verification email resent! Please check your inbox and spam folder.",
        );
        setResendCooldown(60);
      }
    } catch (err) {
      setError(err.message || "Failed to resend confirmation email.");
    } finally {
      setResendLoading(false);
    }
  };

  // Validate credentials and submit either Sign In or Sign Up to Supabase.
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

    if (!navigator.onLine) {
      setError(
        `You are currently offline. Connect to the internet to ${isLogin ? "sign in" : "create an account"}.`,
      );
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
    <div className="min-h-screen w-full bg-[#121212] text-slate-100 grid grid-cols-1 lg:grid-cols-2 select-none">
      {/* Left Marketing / Brand Panel (Desktop lg+) */}
      <div className="hidden lg:flex flex-col justify-between bg-[#161616] border-r border-white/10 p-10 xl:p-14 relative overflow-hidden">
        {/* Top Brand Mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-bold tracking-tight text-white">
              Lore
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              BETA
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Your AI-powered memory</p>
        </div>

        {/* Center Value Proposition & Feature List */}
        <div className="relative z-10 max-w-lg my-auto py-12 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight text-white leading-[1.1]">
              Stop searching.
              <br />
              Start <span className="text-slate-400">knowing.</span>
            </h1>
            <p className="text-sm xl:text-base text-slate-400 leading-relaxed max-w-md">
              Your mind has enough to remember. Let Lore organize, connect, and
              synthesize everything you learn.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURE_HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-200 shrink-0 mt-0.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h2 className="text-sm font-semibold text-white">
                      {item.title}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-600">
          Lore Knowledge Base
        </div>
      </div>

      {/* Right Auth Panel */}
      <div className="flex flex-col min-h-screen bg-[#121212] p-6 sm:p-10">
        {/* Top Bar: Compact Brand on Mobile + Mode Toggle on Right */}
        <div className="flex items-center justify-between lg:justify-end gap-4">
          <div className="flex lg:hidden items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-white">
              Lore
            </span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-wider text-slate-300">
              BETA
            </span>
          </div>

          {!confirmationSent && (
            <div className="text-xs sm:text-sm text-slate-400">
              {isLogin ? (
                <span>
                  Don&apos;t have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchAuthMode(false)}
                    className="text-white hover:text-slate-300 font-semibold transition-colors cursor-pointer underline underline-offset-4"
                  >
                    Sign up
                  </button>
                </span>
              ) : (
                <span>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchAuthMode(true)}
                    className="text-white hover:text-slate-300 font-semibold transition-colors cursor-pointer underline underline-offset-4"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Centered Auth Container */}
        <div className="flex-1 flex items-center justify-center py-8">
          <div className="w-full max-w-sm space-y-6">
            {confirmationSent ? (
              <div className="space-y-6 text-center rounded-2xl bg-[#1a1a1a] border border-white/10 p-6 sm:p-7">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl w-16 h-16 mx-auto flex items-center justify-center text-white">
                  <MailCheck className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white mb-2">
                    Check Your Email
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    We sent a confirmation link to:
                  </p>
                  <p className="text-sm font-semibold text-white mt-1 break-all">
                    {email}
                  </p>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    Click the link in your inbox to verify your account, then
                    sign in to start using Lore.
                  </p>
                </div>

                {resendSuccess && (
                  <div className="flex items-center gap-2.5 bg-white/5 border border-white/15 text-slate-200 px-4 py-2.5 rounded-xl text-xs text-left">
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

                <div className="space-y-3 pt-1">
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
                      switchAuthMode(true);
                    }}
                    className="w-full py-3 px-4 bg-white hover:bg-slate-200 text-[#121212] rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Form Heading */}
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                    {isLogin ? "Welcome back" : "Let's get started"}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {isLogin
                      ? "Sign in to your Lore account and access your memories across every device."
                      : "Create your Lore account and sync your memories seamlessly across every device."}
                  </p>
                </div>

                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading || loading}
                  className="w-full py-3 px-4 bg-[#1a1a1a] hover:bg-[#222222] border border-white/10 hover:border-white/20 text-white font-semibold rounded-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 text-sm"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
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

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="px-3 bg-[#121212] text-slate-500 font-semibold">
                      or continue with email
                    </span>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Banner with contextual actions */}
                  {error && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-xs sm:text-sm">
                        <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{error}</span>
                      </div>

                      {userAlreadyExists && (
                        <button
                          type="button"
                          onClick={() => switchAuthMode(true)}
                          className="w-full py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-white/10 text-white rounded-lg border border-white/10 transition-colors cursor-pointer text-center"
                        >
                          Sign in with this email →
                        </button>
                      )}

                      {error.toLowerCase().includes("not confirmed") && (
                        <button
                          type="button"
                          onClick={handleResendEmail}
                          disabled={resendLoading || resendCooldown > 0}
                          className="w-full py-2 px-3 text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 rounded-lg border border-white/10 transition-colors cursor-pointer text-center"
                        >
                          {resendCooldown > 0
                            ? `Resend confirmation link (${resendCooldown}s)`
                            : "Resend confirmation email"}
                        </button>
                      )}
                    </div>
                  )}

                  {resendSuccess && (
                    <div className="flex items-center gap-2.5 bg-white/5 border border-white/15 text-slate-200 px-4 py-2.5 rounded-xl text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{resendSuccess}</span>
                    </div>
                  )}

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                      Email Address
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <AtSign className="w-4 h-4 text-slate-500" />
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="glass-input w-full py-3 pl-10 pr-4 text-white placeholder-slate-500 rounded-xl text-sm border border-white/10 focus:border-white/25"
                        placeholder="name@example.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                        Password
                      </label>
                      {!isLogin && (
                        <span className="text-[11px] text-slate-500">
                          Minimum 6 characters
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Lock className="w-4 h-4 text-slate-500" />
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        minLength={6}
                        onChange={(e) => setPassword(e.target.value)}
                        className="glass-input w-full py-3 pl-10 pr-10 text-white placeholder-slate-500 rounded-xl text-sm border border-white/10 focus:border-white/25"
                        placeholder={
                          isLogin
                            ? "Enter your password"
                            : "Create a strong password"
                        }
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={loading || googleLoading}
                    className="w-full py-3.5 px-4 bg-white hover:bg-slate-200 text-[#121212] font-semibold rounded-xl transition-all duration-200 shadow-[0_0_20px_rgba(255,255,255,0.08)] cursor-pointer flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>
                          {isLogin ? "Signing In..." : "Creating Account..."}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>{isLogin ? "Sign In" : "Create Account"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
