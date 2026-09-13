const ORIGIN = 'https://script.google.com/macros/s/AKfycbw-uwGdrzohv57CtzPMu9ZteTCLRKL0cafBVEgxWBDkUNtVt8dpe_SAqURi_AjTzb54/exec';
const CACHE_PATH = '/api/verification';
const FOUND_TTL = 3600;
const NOT_FOUND_TTL = 60;

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (request.method !== 'GET') {
      return jsonResponse({ ok: false, code: 'METHOD_NOT_ALLOWED' }, 405);
    }

    const requestUrl = new URL(request.url);
    const id = (requestUrl.searchParams.get('id') || '').trim().toUpperCase();
    const kode = (requestUrl.searchParams.get('kode') || '').trim().toUpperCase();

    if (!id) {
      return jsonResponse({
        ok: false,
        ditemukan: false,
        terverifikasi: false,
        code: 'MISSING_ID',
        pesan: 'Nomor surat tidak diberikan.'
      }, 400);
    }

    const cacheUrl = new URL(request.url);
    cacheUrl.pathname = CACHE_PATH;
    cacheUrl.search = new URLSearchParams({ id, ...(kode ? { kode } : {}) }).toString();
    const cacheKey = new Request(cacheUrl.toString(), { method: 'GET' });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);

    if (cached) {
      return withHeader(cached, 'X-Verification-Cache', 'HIT');
    }

    const originUrl = new URL(ORIGIN);
    originUrl.searchParams.set('id', id);
    if (kode) originUrl.searchParams.set('kode', kode);

    let originResponse;
    try {
      originResponse = await fetch(originUrl, { method: 'GET' });
    } catch (error) {
      return jsonResponse({
        ok: false,
        ditemukan: false,
        terverifikasi: false,
        code: 'ORIGIN_UNAVAILABLE',
        pesan: 'Layanan verifikasi sedang tidak tersedia.'
      }, 502);
    }

    const body = await originResponse.text();
    let data;
    try {
      data = JSON.parse(body);
    } catch (error) {
      return jsonResponse({
        ok: false,
        ditemukan: false,
        terverifikasi: false,
        code: 'INVALID_ORIGIN_RESPONSE',
        pesan: 'Respons layanan verifikasi tidak valid.'
      }, 502);
    }

    const ttl = data.ditemukan ? FOUND_TTL : NOT_FOUND_TTL;
    const response = new Response(JSON.stringify(data), {
      status: originResponse.ok ? 200 : originResponse.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=0, s-maxage=${ttl}`,
        'X-Verification-Cache': 'MISS',
        ...corsHeaders()
      }
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  }
};

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders()
    }
  });
}

function withHeader(response, name, value) {
  const headers = new Headers(response.headers);
  headers.set(name, value);
  Object.entries(corsHeaders()).forEach(([headerName, headerValue]) => {
    headers.set(headerName, headerValue);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://vrai.sdislamiqrapetobo.sch.id',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
