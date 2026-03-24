import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Mail, Lock, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Link as RouterLink } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getSafeSession } from "@/lib/authSession";
import { lovable } from "@/integrations/lovable";

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "login" | "signup";
  productUrl?: string;
}

export function AuthDialog({ open, onOpenChange, defaultMode = "signup", productUrl }: AuthDialogProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [isSignUp, setIsSignUp] = useState(defaultMode === "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    if (open) {
      setIsSignUp(defaultMode === "signup");
    }
  }, [open, defaultMode]);

  const navigateToDashboard = (isNewUser = false) => {
    const params = new URLSearchParams();
    if (productUrl) {
      params.set("addProduct", "true");
      params.set("url", productUrl);
    }
    if (isNewUser) {
      params.set("onboarding", "business-dna");
    }
    const qs = params.toString();
    navigate(`/app${qs ? `?${qs}` : ""}`);
  };

  useEffect(() => {
    if (!open) return;
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted || !session) return;
      // Detect brand-new user (created within last 30s)
      const createdAt = new Date(session.user.created_at).getTime();
      const isNewUser = Date.now() - createdAt < 30000;
      onOpenChange(false);
      navigateToDashboard(isNewUser);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [open]);

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
    return true;
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const oauthRedirect = `${window.location.origin}/app`;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: oauthRedirect,
      });
      if (result.error) throw result.error;
    } catch (error: any) {
      toast({
        title: "Google sign-in failed",
        description: error.message || "Could not connect to Google. Please try again.",
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) {
          if (error.message.includes("already registered")) {
            toast({ title: "Account exists", description: "This email is already registered. Please log in instead.", variant: "destructive" });
          } else {
            throw error;
          }
        } else {
          sessionStorage.setItem("tw_show_onboarding", "true");
          toast({ title: "Account created!", description: "You're now signed in. Welcome to TimeWarp!" });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({ title: "Invalid credentials", description: "Please check your email and password.", variant: "destructive" });
          } else {
            throw error;
          }
        }
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0 border-border/50 bg-card overflow-hidden [&>button]:hidden">
        <div className="p-6 sm:p-8">
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 mb-6">
            <img src="/favicon.png" alt="TimeWarp" className="h-8 w-8 rounded-lg object-cover" />
            <span className="font-semibold text-lg text-foreground">TimeWarp</span>
          </div>

          <h2 className="text-xl font-bold text-foreground mb-1">
            {isSignUp ? "Create your TimeWarp account" : "Welcome back"}
          </h2>
          <p className="text-sm text-muted-foreground mb-5">
            {isSignUp ? "Sign up to get started with AI-powered business tools" : "Log in to your TimeWarp account"}
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-3 mb-4 h-11 rounded-xl border border-border bg-[hsl(30,20%,20%)] text-[hsl(40,30%,95%)] dark:bg-[hsl(40,30%,95%)] dark:text-[hsl(30,20%,20%)] hover:opacity-90"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            {isGoogleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">OR</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="dialog-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="dialog-email" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={isLoading} required className="pl-10 h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dialog-password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="dialog-password" type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isLoading} required className="pl-10 h-11 rounded-xl" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start gap-3">
                <Checkbox
                  id="dialog-terms"
                  checked={agreedToTerms}
                  onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
                  className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label htmlFor="dialog-terms" className="text-sm text-muted-foreground leading-snug">
                  I agree to our{" "}
                  <RouterLink to="/terms-of-purchase" className="text-primary hover:underline">Terms of Service</RouterLink>
                  {" "}and{" "}
                  <RouterLink to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</RouterLink>
                </label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading || (isSignUp && !agreedToTerms)}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Create your account" : "Log In"}
            </Button>
          </form>

          <div className="text-center text-sm mt-4">
            {isSignUp ? (
              <>Already have an account?{" "}<button onClick={() => setIsSignUp(false)} className="text-primary hover:underline font-medium">Sign in here</button></>
            ) : (
              <>Don't have an account?{" "}<button onClick={() => setIsSignUp(true)} className="text-primary hover:underline font-medium">Sign up</button></>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
