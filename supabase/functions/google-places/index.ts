import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors(req) });

  const reqId = crypto.randomUUID().slice(0, 8);

  try {
    // parse
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON' }, 400, req, reqId);
    }

    const {
      type = 'textsearch',
      q,
      place_id,
      pagetoken,
      language = Deno.env.get('DEFAULT_LANGUAGE') || 'th',
      region = Deno.env.get('DEFAULT_GEO_REGION') || 'th',
      location,
      radius,
      // allow selected params but sanitize
      params = {}
    } = body || {};

    // input guard
    if (!['textsearch', 'details', 'nearby'].includes(type)) {
      return json({ error: 'type must be textsearch|details|nearby' }, 400, req, reqId);
    }
    if (type === 'textsearch' && !q && !pagetoken) {
      return json({ error: 'q is required for textsearch (unless using pagetoken)' }, 400, req, reqId);
    }
    if (type === 'details' && !place_id) {
      return json({ error: 'place_id is required for details' }, 400, req, reqId);
    }
    if (type === 'nearby' && (!location || typeof location?.lat !== 'number' || typeof location?.lng !== 'number' || typeof radius !== 'number')) {
      return json({ error: 'location {lat:number,lng:number} and radius:number are required for nearby' }, 400, req, reqId);
    }

    // secret
    const KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    if (!KEY) return json({ error: 'Missing GOOGLE_MAPS_API_KEY' }, 500, req, reqId);

    // build query
    const base = 'https://maps.googleapis.com/maps/api/place';
    const qs = new URLSearchParams({ key: KEY, language, region });

    // country bias (ลด noise)
    if (!('components' in params) && region.toLowerCase() === 'th') {
      qs.set('components', 'country:th');
    }

    // allowlist params บางตัวเท่านั้น
    const allowParams = new Set([
      'type','opennow','minprice','maxprice','keyword','rankby','pagetoken','query','fields'
    ]);
    Object.entries(params || {}).forEach(([k, v]) => {
      if (allowParams.has(k) && v !== undefined && v !== null) qs.set(k, String(v));
    });

    let url = '';
    if (type === 'details') {
      qs.set('place_id', String(place_id));
      // ถ้าไม่ส่ง fields มา จะกำหนด default fields ให้ประหยัดเครดิต
      if (!qs.get('fields')) {
        qs.set('fields', [
          'place_id','name','formatted_address','geometry/location',
          'types','rating','opening_hours','price_level','photos',
          'website','international_phone_number','url'
        ].join(','));
      }
      url = `${base}/details/json?${qs}`;
    } else if (type === 'textsearch') {
      if (pagetoken) qs.set('pagetoken', String(pagetoken));
      else qs.set('query', String(q).slice(0, 2000));
      url = `${base}/textsearch/json?${qs}`;
    } else {
      qs.set('location', `${location.lat},${location.lng}`);
      qs.set('radius', String(radius));
      url = `${base}/nearbysearch/json?${qs}`;
    }

    // handle pagetoken readiness (Google spec)
    let j: any;
    for (let attempt = 0; attempt < 3; attempt++) {
      const abort = new AbortController();
      const t = setTimeout(() => abort.abort('timeout'), 20_000);
      const r = await fetch(url, { signal: abort.signal });
      clearTimeout(t);
      j = await r.json();

      // ถ้าเป็น textsearch + pagetoken แล้วยัง INVALID_REQUEST ให้รอ 2s แล้วยิงใหม่
      if (type === 'textsearch' && pagetoken && j?.status === 'INVALID_REQUEST') {
        await sleep(2000);
        continue;
      }
      break;
    }

    // normalize โครงที่ใช้บ่อยไว้ให้เลย (ช่วย FE)
    const normalize = (p: any) => ({
      place_id: p?.place_id ?? null,
      name: p?.name ?? null,
      formatted_address: p?.formatted_address ?? p?.vicinity ?? null,
      lat: p?.geometry?.location?.lat ?? null,
      lng: p?.geometry?.location?.lng ?? null,
      types: p?.types ?? [],
      rating: p?.rating ?? null,
      user_ratings_total: p?.user_ratings_total ?? null,
      price_level: p?.price_level ?? null,
      open_now: p?.opening_hours?.open_now ?? null,
      // เก็บ raw minimal
      ref: { business_status: p?.business_status ?? null }
    });

    const canonical_places =
      Array.isArray(j?.results) ? j.results.map(normalize)
      : j?.result ? [normalize(j.result)]
      : [];

    return json({
      request_id: reqId,
      status: j?.status,
      next_page_token: j?.next_page_token,
      results: j?.results,
      result: j?.result,
      error_message: j?.error_message,
      canonical_places
    }, 200, req, reqId);

  } catch (e) {
    const isTimeout = /timeout/i.test(String(e));
    return json({ error: String(e) }, isTimeout ? 504 : 400, req, reqId);
  }
});

function cors(req: Request) {
  const allow = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);
  const origin = req.headers.get('Origin') || '*';
  const allowOrigin = allow.length ? (allow.includes(origin) ? origin : allow[0]) : '*';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin'
  };
}

function json(data: any, status = 200, req?: Request, reqId?: string) {
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(req ? cors(req) : {}),
    // cache เบาๆ ลด hit
    'Cache-Control': 'private, max-age=60'
  };
  if (reqId) headers['x-request-id'] = reqId;

  return new Response(JSON.stringify(data), { status, headers });
}