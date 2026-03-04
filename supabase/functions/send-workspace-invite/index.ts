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

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, role, workspaceId } = await req.json();

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

    // Check if already invited
    const { data: existing } = await supabaseAdmin
      .from("workspace_invitations")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: "Already invited" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if already a member
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const targetUser = existingUsers?.users?.find(u => u.email === email);
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

    // Only use inviteUserByEmail for NEW users (not already registered)
    if (!targetUser) {
      const { error: emailError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: inviteUrl,
      });
      if (emailError) {
        console.error("Email invite error (non-blocking):", emailError.message);
      }
    } else {
      // User already exists — they can use the invite link directly
      console.log(`User ${email} already exists, skipping auth invite. Invite URL: ${inviteUrl}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
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
