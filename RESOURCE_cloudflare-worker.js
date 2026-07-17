// Cloudflare Worker helper for the L'Oréal chatbot.

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.OPENAI_API_KEY;
    const apiUrl = "prj-loreal-chatbot.patel7au.workers.dev";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "The worker is missing the OPENAI_API_KEY secret.",
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const userInput = await request.json();

    const requestBody = {
      model: "gpt-4.1",
      messages: userInput.messages,
      max_completion_tokens: 300,
    };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), { headers: corsHeaders });
  },
};
