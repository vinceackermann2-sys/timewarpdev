import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email: rawEmail, role, workspaceId } = await req.json();
    const email = String(rawEmail || "").trim().toLowerCase();

    if (!email || !role || !workspaceId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user is admin/owner of workspace
    const { data: isAdmin } = await supabaseAdmin.rpc("is_workspace_admin", {
      _user_id: user.id,
      _workspace_id: workspaceId,
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve user first so we can return consistent response shape
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find(
      (u) => (u.email || "").toLowerCase() === email
    );

    // If there is already a pending invitation, return it as success (idempotent)
    const { data: existing } = await supabaseAdmin
      .from("workspace_invitations")
      .select("id, token, role")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      const origin = req.headers.get("origin") || "https://digital-guide-genie.lovable.app";
      const inviteUrl = `${origin}/invite?token=${existing.token}`;

      // Re-send login email for existing users when invite is already pending
      if (targetUser) {
        const { error: otpError } = await supabaseAuthClient.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: inviteUrl,
            shouldCreateUser: false,
          },
        });
        if (otpError) {
          console.error("OTP resend for existing pending invite failed:", otpError.message);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          alreadyInvited: true,
          existingUser: Boolean(targetUser),
          invitation: { id: existing.id, email, role: existing.role, token: existing.token },
          inviteUrl,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already a member
    if (targetUser) {
      const { data: isMember } = await supabaseAdmin.rpc("is_workspace_member", {
        _user_id: targetUser.id,
        _workspace_id: workspaceId,
      });
      if (isMember) {
        return new Response(JSON.stringify({ error: "Already a member" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Create invitation
    const { data: invitation, error: invError } = await supabaseAdmin
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        invited_by: user.id,
        email,
        role,
      })
      .select()
      .single();

    if (invError) {
      return new Response(JSON.stringify({ error: invError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "https://digital-guide-genie.lovable.app";
    const inviteUrl = `${origin}/invite?token=${invitation.token}`;

    // Send invite email for both new and existing users
    if (!targetUser) {
      // New user: inviteUserByEmail creates user and triggers invite email template
      const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
      });
      if (emailError) {
        console.error("Email invite error (non-blocking):", emailError.message);
      } else {
        console.log(`Auth invite email sent to new user ${email}`);
      }
    } else {
      // Existing user: send login magic link email that redirects to invite acceptance
      const { error: otpError } = await supabaseAuthClient.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: inviteUrl,
          shouldCreateUser: false,
        },
      });

      if (otpError) {
        console.error("Existing user invite email error (non-blocking):", otpError.message);
      } else {
        console.log(`Magic link invite email sent to existing user ${email}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        existingUser: Boolean(targetUser),
        invitation: { id: invitation.id, email, role, token: invitation.token },
        inviteUrl,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
