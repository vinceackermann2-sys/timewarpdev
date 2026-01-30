import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract text from different file types using AI
async function extractContentWithAI(
  base64Data: string,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<{ text: string; summary: string }> {
  const isImage = mimeType.startsWith("image/");
  const isPDF = mimeType === "application/pdf";
  
  // For images, use vision model directly
  if (isImage) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this image file "${fileName}" in detail. Extract ALL text content visible in the image. Also provide a business-relevant summary. Format your response as:

TEXT CONTENT:
[extracted text here]

SUMMARY:
[1-2 sentence summary of what this image contains and its business relevance]`
              },
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Data}` }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("Vision API error:", response.status);
      return { text: "", summary: "Could not analyze image" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const textMatch = content.match(/TEXT CONTENT:\s*([\s\S]*?)(?=SUMMARY:|$)/i);
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)$/i);
    
    return {
      text: textMatch?.[1]?.trim() || content,
      summary: summaryMatch?.[1]?.trim() || "Image analyzed"
    };
  }

  // For PDFs, use Gemini's document understanding
  if (isPDF) {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this PDF document "${fileName}" in detail. Extract ALL text content from the document. Identify key information, tables, and data. Format your response as:

TEXT CONTENT:
[all extracted text here, preserve structure where possible]

KEY INFORMATION:
[bullet points of important data, figures, names, dates]

SUMMARY:
[2-3 sentence summary of the document and its business relevance]`
              },
              {
                type: "image_url",
                image_url: { 
                  url: `data:${mimeType};base64,${base64Data}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      console.error("PDF API error:", response.status);
      return { text: "", summary: "Could not analyze PDF" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    const textMatch = content.match(/TEXT CONTENT:\s*([\s\S]*?)(?=KEY INFORMATION:|SUMMARY:|$)/i);
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)$/i);
    
    return {
      text: textMatch?.[1]?.trim() || content,
      summary: summaryMatch?.[1]?.trim() || "Document analyzed"
    };
  }

  // For other text-based files, try to decode and analyze
  try {
    const textContent = atob(base64Data);
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: `Analyze this file "${fileName}" (type: ${mimeType}). Extract key information and provide a summary.

FILE CONTENT:
${textContent.slice(0, 50000)}

Respond with:
KEY INFORMATION:
[important data points]

SUMMARY:
[1-2 sentence summary]`
          }
        ],
      }),
    });

    if (!response.ok) {
      return { text: textContent.slice(0, 10000), summary: "Text file content extracted" };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)$/i);
    
    return {
      text: textContent.slice(0, 10000),
      summary: summaryMatch?.[1]?.trim() || "File analyzed"
    };
  } catch {
    return { text: "", summary: "Could not read file content" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("File parse for user:", userId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileData, fileName, mimeType } = await req.json();

    if (!fileData || !fileName) {
      return new Response(
        JSON.stringify({ error: "File data and name required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Parsing file: ${fileName} (${mimeType}) for user: ${userId}`);

    // Extract content using AI
    const { text, summary } = await extractContentWithAI(
      fileData,
      mimeType,
      fileName,
      LOVABLE_API_KEY
    );

    // Save to storage bucket for later reference
    const supabaseServiceRole = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get existing uploaded files or create new array
    let uploadedFiles: any[] = [];
    const { data: existingData } = await supabaseServiceRole.storage
      .from("business-data")
      .download(`${userId}/uploaded-files.json`);

    if (existingData) {
      try {
        const text = await existingData.text();
        uploadedFiles = JSON.parse(text);
      } catch {
        uploadedFiles = [];
      }
    }

    // Add new file
    const fileEntry = {
      id: crypto.randomUUID(),
      fileName,
      mimeType,
      extractedText: text,
      summary,
      uploadedAt: new Date().toISOString(),
    };

    uploadedFiles.push(fileEntry);

    // Save updated files list
    await supabaseServiceRole.storage
      .from("business-data")
      .upload(
        `${userId}/uploaded-files.json`,
        JSON.stringify(uploadedFiles),
        { contentType: "application/json", upsert: true }
      );

    console.log(`File parsed and saved: ${fileName}`);

    return new Response(
      JSON.stringify({
        success: true,
        file: fileEntry,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("File parse error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
