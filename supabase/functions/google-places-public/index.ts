// Public Google Places Edge Function - No authentication required
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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

    const { type = 'textsearch', q, place_id, language = 'th', region = 'th' } = body || {};

    // ── Input guard
    if (!['textsearch', 'details', 'nearby'].includes(type)) {
      return json({
        error: 'type must be textsearch|details|nearby'
      }, 400);
    }

    if (type === 'textsearch' && !q) {
      return json({
        error: 'q is required for textsearch'
      }, 400);
    }

    if (type === 'details' && !place_id) {
      return json({
        error: 'place_id is required for details'
      }, 400);
    }

    // ── Secrets
    const KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!KEY) return json({
      error: 'Missing GOOGLE_MAPS_API_KEY'
    }, 500);

    // ── Build URL
    const base = 'https://maps.googleapis.com/maps/api/place';
    const qs = new URLSearchParams({
      key: KEY,
      language,
      region
    });

    let url = '';
    if (type === 'details') {
      qs.set('place_id', String(place_id));
      url = `${base}/details/json?${qs}`;
    } else if (type === 'textsearch') {
      qs.set('query', String(q).slice(0, 2000));
      url = `${base}/textsearch/json?${qs}`;
    } else {
      return json({
        error: 'nearby search not implemented yet'
      }, 400);
    }

    // ── Timeout to avoid hanging
    const abort = new AbortController();
    const t = setTimeout(()=>abort.abort('timeout'), 20_000);
    const r = await fetch(url, {
      signal: abort.signal
    });
    clearTimeout(t);
    const j = await r.json();

    return json({
      status: j?.status,
      next_page_token: j?.next_page_token,
      results: j?.results,
      result: j?.result,
      error_message: j?.error_message
    });
  } catch (e) {
    const isTimeout = /timeout/i.test(String(e));
    return json({
      error: String(e)
    }, isTimeout ? 504 : 400);
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
