import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const InviteAccept = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error" | "auth">("loading");
  const [message, setMessage] = useState("");
  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
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
      } else {
        setStatus("success");
        setMessage("You've been added to the workspace!");
      }
    };

    accept();
  }, [token]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Accepting invitation...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-semibold">{message}</h1>
            <Button onClick={() => navigate("/app")}>Go to Workspace</Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto" />
            <h1 className="text-xl font-semibold">Invitation Failed</h1>
            <p className="text-muted-foreground">{message}</p>
            <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
          </>
        )}
        {status === "auth" && (
          <>
            <h1 className="text-xl font-semibold">{message}</h1>
            <Button onClick={() => navigate(`/auth?redirect=/invite?token=${token}`)}>
              Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default InviteAccept;
