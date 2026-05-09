import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { runEmployeeHttpHandler } from "./http-handler.ts";

serve(async (req) => {
  return runEmployeeHttpHandler(req, { agentSurface: "run-employee", logTag: "run-employee" });
});
