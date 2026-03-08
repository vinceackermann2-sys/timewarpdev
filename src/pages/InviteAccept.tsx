import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionsCelebration } from "@/components/database/ActionsCelebration";

const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");
  const [showCelebration, setShowCelebration] = useState(false);
  const [targetRoute, setTargetRoute] = useState("/app");
  const token = searchParams.get("token");
  const refCode = searchParams.get("ref");

  useEffect(() => {
    if (!token && !refCode) {
      setStatus("error");
      setMessage("Invalid invite link.");
      return;
    }

    const accept = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setStatus("auth");
        setMessage("Please sign in to accept this invitation.");
        return;
      }

      let workspaceId: string | null = null;

      // Handle workspace invitation
      if (token) {
        const { data, error } = await supabase.rpc("accept_workspace_invitation", {
          _token: token,
        });

        if (error) {
          setStatus("error");
          setMessage(error.message);
          return;
        }

        const result = data as any;
        if (result?.error) {
          setStatus("error");
          setMessage(result.error);
          return;
        }
        
        if (result?.workspace_id) {
          workspaceId = result.workspace_id;
          localStorage.setItem("preferred_workspace_id", result.workspace_id);
        }
      }

      // Handle referral code
      if (refCode) {
        try {
          const { data: refResult } = await supabase.rpc("complete_referral", {
            _referral_code: refCode,
            _referred_user_id: session.user.id,
          });
          const rr = refResult as any;
          if (rr?.success) {
            // Show celebration — navigation happens on dismiss
            setTargetRoute("/app");
            setShowCelebration(true);
            if (token) {
              setStatus("success");
              setMessage("You've been added to the workspace and received 125 bonus Actions!");
            }
            return; // Don't navigate yet — celebration dialog handles it
          } else if (rr?.error && !token) {
            setStatus("error");
            setMessage(rr.error);
            return;
          }
        } catch {
          if (!token) {
            setStatus("error");
            setMessage("Failed to process referral.");
            return;
          }
        }
      }

      // No referral celebration — show success directly
      if (token) {
        setStatus("success");
        setMessage("You've been added to the workspace!");
      } else {
        // Edge case: ref code failed silently, nothing to show
        setStatus("success");
        setMessage("Welcome!");
      }
    };

    accept();
  }, [token, refCode]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "loading" && !showCelebration && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Processing...</p>
          </>
        )}
        {status === "success" && !showCelebration && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-semibold">{message}</h1>
            <Button onClick={() => navigate("/app")}>Go to Workspace</Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground">{message}</p>
            <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
          </>
        )}
        {status === "auth" && (
          <>
            <h1 className="text-xl font-semibold">{message}</h1>
            <Button onClick={() => {
              const params = new URLSearchParams();
              if (token) params.set("redirect", `/invite?token=${token}`);
              if (refCode) params.set("ref", refCode);
              navigate(`/auth?${params.toString()}`);
            }}>
              Sign In
            </Button>
          </>
        )}
      </div>
      <ActionsCelebration
        open={showCelebration}
        onOpenChange={(open) => {
          setShowCelebration(open);
          if (!open) navigate(targetRoute);
        }}
        actionsGranted={125}
        reason="referred"
      />
    </div>
  );
};

export default InviteAccept;
