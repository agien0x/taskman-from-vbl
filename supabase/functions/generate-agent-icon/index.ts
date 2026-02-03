import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, name, prompt } = await req.json();
    console.log("Generating icon for agent:", { agentId, name });

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    // Create a prompt for icon generation based on agent's purpose
    const promptDescription = prompt ? prompt.slice(0, 200) : 'an AI assistant';
    const iconPrompt = `Create a simple, clean icon representing an AI agent with the following characteristics: ${name}. The agent's purpose: ${promptDescription}. Style: minimalist, flat design, professional, suitable for a 64x64px avatar. Single character or symbol on a solid background.`;

    console.log("Icon generation prompt:", iconPrompt);

    // Call X.AI Grok to generate image using the images endpoint
    const response = await fetch("https://api.x.ai/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${XAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-2-image-1212",
        prompt: iconPrompt,
        n: 1,
        size: "512x512",
        response_format: "url"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 402) {
        throw new Error("Недостаточно credits для генерации иконки. Пополните баланс в Settings → Workspace → Usage");
      }
      
      if (response.status === 429) {
        throw new Error("Превышен лимит запросов. Подождите немного и попробуйте снова");
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received:", data);

    const imageUrl = data.data?.[0]?.url;
    
    if (!imageUrl) {
      console.error("Unexpected response format:", data);
      throw new Error("No image URL in response");
    }

    // Update agent with the icon URL
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: updateError } = await supabase
      .from("agents")
      .update({ icon_url: imageUrl })
      .eq("id", agentId);

    if (updateError) {
      console.error("Error updating agent:", updateError);
      throw updateError;
    }

    console.log("Agent icon updated successfully");

    return new Response(
      JSON.stringify({ icon_url: imageUrl }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-agent-icon:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
