// Public AI Chat Edge Function - No authentication required
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_URL = (key)=>`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response(null, {
    headers: cors()
  });

  try {
    // ── Parse body safely
    let body;
    try {
      body = await req.json();
    } catch {
      return json({
        error: 'Invalid JSON'
      }, 400);
    }

    const { message, provider = 'gemini', temperature = 0.7 } = body || {};

    if (!message || typeof message !== 'string') {
      return json({
        error: 'Missing "message"'
      }, 400);
    }

    // ── Trim & sanitize
    const trimmedMsg = message.slice(0, 4000);
    let reply = 'สวัสดีจาก TravelMate AI! มีอะไรให้ช่วยวางแผนทริปไหมครับ? 🌏';

    // ── Call provider (with timeout)
    const abort = new AbortController();
    const timeout = setTimeout(()=>abort.abort('timeout'), 25_000);

    try {
      if (provider === 'gemini') {
        const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
        if (!GEMINI_API_KEY) {
          return json({
            error: 'GEMINI_API_KEY not configured'
          }, 500);
        }

        const r = await fetch(GEMINI_URL(GEMINI_API_KEY), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `คุณเป็น AI ที่ช่วยวางแผนการเดินทาง ตอบเป็นภาษาไทยที่เข้าใจง่าย และเป็นมิตร

ผู้ใช้: ${trimmedMsg}`
                  }
                ]
              }
            ],
            generationConfig: {
              temperature
            }
          }),
          signal: abort.signal
        });

        if (!r.ok) {
          throw new Error(`Gemini API error: ${r.status}`);
        }

        const j = await r.json();
        reply = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? reply;
      } else {
        return json({
          error: 'Only Gemini provider is supported'
        }, 400);
      }
    } finally{
      clearTimeout(timeout);
    }

    return json({
      response: reply
    });
  } catch (e) {
    console.error('Error in ai-chat-public:', e);
    const status = /timeout/i.test(String(e)) ? 504 : 400;
    return json({
      error: String(e)
    }, status);
  }
});

// CORS Headers
function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
  };
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...cors()
    }
  });
}
