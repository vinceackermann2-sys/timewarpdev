import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock } from "lucide-react";
import authBg from "@/assets/auth-bg.png";
import { Checkbox } from "@/components/ui/checkbox";
import { Link as RouterLink } from "react-router-dom";
import { ActionsCelebration } from "@/components/database/ActionsCelebration";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSignUp, setIsSignUp] = useState(searchParams.get("mode") === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationReason, setCelebrationReason] = useState<"referral" | "referred">("referred");

  const quizDataFromNav = (location.state as any)?.quizData;
  const quizData =
    quizDataFromNav ??
    (() => {
      try {
        const raw = localStorage.getItem("quizData") || sessionStorage.getItem("quizData");
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    })();

  // Store referral code from URL
  const refCode = searchParams.get("ref");
  useEffect(() => {
    if (refCode) {
      localStorage.setItem("referral_code", refCode);
      setIsSignUp(true); // Default to sign up for referred users
    }
  }, [refCode]);

  useEffect(() => {
    if (quizData) {
      localStorage.setItem("quizData", JSON.stringify(quizData));
      sessionStorage.setItem("quizData", JSON.stringify(quizData));
    }

    const processReferral = async (userId: string): Promise<boolean> => {
      const storedRef = localStorage.getItem("referral_code");
      if (storedRef) {
        try {
          const { data } = await supabase.rpc("complete_referral", {
            _referral_code: storedRef,
            _referred_user_id: userId,
          });
          localStorage.removeItem("referral_code");
          if (data && (data as any).success) {
            setCelebrationReason("referred");
            setShowCelebration(true);
            return true;
          }
        } catch { /* ignore referral errors */ }
      }
      return false;
    };

    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const celebrated = await processReferral(session.user.id);
        if (celebrated) return; // navigation deferred to celebration dismiss
        const redirect = searchParams.get("redirect");
        if (redirect) { navigate(redirect); return; }
        if (!quizData) { navigateToDashboard(); return; }
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const celebrated = await processReferral(session.user.id);
        if (celebrated) return; // navigation deferred to celebration dismiss
        const redirect = searchParams.get("redirect");
        if (redirect) { navigate(redirect); return; }
        if (!quizData) { navigateToDashboard(); }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, quizData]);

  const navigateToDashboard = () => {
    const productUrl = searchParams.get("url");
    if (productUrl) {
      navigate(`/app?addProduct=true&url=${encodeURIComponent(productUrl)}`, { state: { quizData } });
    } else {
      navigate("/app", { state: { quizData } });
    }
  };

  const validateForm = () => {
    if (!email || !password) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return false;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return false;
    }
    if (isSignUp && password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure your passwords match.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user && quizData) {
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/auth` } });
        if (error) throw error;
        return;
      }
      if (!session?.user) {
        const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/` } });
        if (error) throw error;
        return;
      }
      
      const scopes = quizData ? [
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/forms.body.readonly",
        "openid", "email", "profile",
      ].join(" ") : "openid email profile";

      const response = await fetch(`${SUPABASE_URL}/functions/v1/initiate-google-oauth`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: session.user.id, scopes, origin: window.location.origin }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to initiate Google OAuth");
      }
      
      const { url } = await response.json();
      window.location.href = url;
    } catch (error: any) {
      toast({ title: "Google sign-in failed", description: error.message || "Could not connect to Google. Please try again.", variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/` } });
        if (error) {
          if (error.message.includes("already registered")) {
            toast({ title: "Account exists", description: "This email is already registered. Please log in instead.", variant: "destructive" });
          } else throw error;
        } else {
          toast({ title: "Account created!", description: "You're now signed in. Welcome to TimeWarp!" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({ title: "Invalid credentials", description: "Please check your email and password.", variant: "destructive" });
          } else throw error;
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen max-w-[1900px] mx-auto bg-background flex flex-col">
      <header className="p-4 sm:p-6 absolute top-0 left-0 z-10">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>
      </header>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl rounded-2xl border border-border/50 shadow-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 bg-card">
          {/* Left – Form */}
          <div className="p-8 sm:p-10 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-8">
              <img src="/favicon.png" alt="TimeWarp" className="h-9 w-9 rounded-lg object-cover" />
              <span className="font-semibold text-lg text-foreground">TimeWarp</span>
            </div>

            <h1 className="text-2xl font-bold text-foreground mb-1">
              {quizData ? "Connect your Google account" : isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="text-sm text-muted-foreground mb-6">
              {quizData
                ? "Sign in with Google to let TimeWarp access your Docs, Sheets, and Gmail"
                : isSignUp
                  ? "Get started with TimeWarp for free"
                  : "Log in to your TimeWarp account"}
            </p>

            {/* Google */}
            <Button
              type="button"
              variant={quizData ? "default" : "outline"}
              className="w-full gap-3 mb-4"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              Continue with Google
            </Button>

            {!quizData && (
              <>
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {isSignUp && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isLoading} required />
                    </div>
                  )}

                  <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isSignUp ? "Create Account" : "Log In"}
                  </Button>
                </form>

                <div className="text-center text-sm mt-4">
                  {isSignUp ? (
                    <>Already have an account?{" "}<button onClick={() => setIsSignUp(false)} className="text-primary hover:underline font-medium">Log in</button></>
                  ) : (
                    <>Don't have an account?{" "}<button onClick={() => setIsSignUp(true)} className="text-primary hover:underline font-medium">Sign up</button></>
                  )}
                </div>
              </>
            )}

            {quizData && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                By connecting, you allow TimeWarp to read your Google Workspace data to provide insights and generate content.
              </p>
            )}
          </div>

          {/* Right – Image */}
          <div className="hidden md:block relative">
            <img src={authBg} alt="" className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>
      </div>
      <ActionsCelebration
        open={showCelebration}
        onOpenChange={(open) => {
          setShowCelebration(open);
          if (!open) navigateToDashboard();
        }}
        actionsGranted={125}
        reason={celebrationReason}
      />
    </div>
  );
};

export default Auth;
