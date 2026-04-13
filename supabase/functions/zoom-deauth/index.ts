import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200 });
  }

  try {
    const body = await req.json();

    // Zoom sends: { event: "app_deauthorized", payload: { user_id, account_id, ... } }
    if (body.event !== "app_deauthorized") {
      return new Response(JSON.stringify({ message: "Event ignored" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const zoomUserId = body.payload?.user_id;
    if (!zoomUserId) {
      return new Response(JSON.stringify({ message: "No user_id in payload" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Find the user by Zoom provider_user_id
    const { data: tokenRow } = await supabaseAdmin
      .from("user_oauth_tokens")
      .select("user_id")
      .eq("provider", "zoom")
      .eq("provider_user_id", zoomUserId)
      .maybeSingle();

    if (tokenRow) {
      // Remove tokens and mark connection as disconnected
      await supabaseAdmin
        .from("user_oauth_tokens")
        .delete()
        .eq("user_id", tokenRow.user_id)
        .eq("provider", "zoom");

      await supabaseAdmin
        .from("user_connections")
        .update({ status: "disconnected" })
        .eq("user_id", tokenRow.user_id)
        .eq("provider", "zoom");
    }

    // Zoom also requires a compliance call to confirm data deletion
    const CLIENT_ID = Deno.env.get("ZOOM_CLIENT_ID");
    const CLIENT_SECRET = Deno.env.get("ZOOM_CLIENT_SECRET");
    if (CLIENT_ID && CLIENT_SECRET && body.payload?.deauthorization_event_received) {
      const compliancePayload = body.payload.deauthorization_event_received;
      await fetch("https://api.zoom.us/oauth/data/compliance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SECRET}`)}`,
        },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          user_id: zoomUserId,
          account_id: body.payload?.account_id || "",
          deauthorization_event_received: compliancePayload,
          compliance_completed: true,
        }),
      });
    }

    return new Response(JSON.stringify({ message: "Deauthorization processed" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("zoom-deauth error:", e);
    return new Response(JSON.stringify({ message: "OK" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
