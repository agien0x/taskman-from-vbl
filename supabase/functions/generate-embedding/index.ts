import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return json(400, { error: 'Text is required' });
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      // Treat as configuration issue, but still return JSON.
      return json(503, {
        error: 'Embeddings provider is not configured',
        code: 'embeddings_not_configured',
      });
    }

    // Use OpenAI directly for embeddings (Lovable AI doesn't support embeddings endpoint)
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: 384,
      }),
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error('OpenAI API error:', response.status, raw);

      let parsed: any = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // ignore
      }

      const providerCode = parsed?.error?.code ?? parsed?.error?.type ?? null;
      const providerMessage = parsed?.error?.message ?? raw ?? 'Unknown provider error';

      // Preserve the upstream status (e.g. 429) so clients can handle it.
      // 429 here is often "insufficient_quota" (not a temporary rate limit).
      return json(response.status, {
        error: `Embedding provider error: ${providerMessage}`,
        provider: 'openai',
        provider_status: response.status,
        code: providerCode,
      });
    }

    const data = await response.json();
    const embedding = data.data[0].embedding;

    return json(200, { embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return json(500, { error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
