const encoder = new TextEncoder();

async function signSession(secret, expMs) {
  const payload = btoa(JSON.stringify({ role: "admin", exp: expMs }));
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sigHex = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${payload}.${sigHex}`;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const body = await request.json();
    const password = (body.password || "").trim();

    if (!env.ADMIN_TOKEN) {
      return Response.json(
        { error: "ADMIN_TOKEN haijawekwa kwenye Cloudflare Pages." },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!password || password !== env.ADMIN_TOKEN) {
      return Response.json(
        { error: "Nenosiri si sahihi. Jaribu tena." },
        { status: 401, headers: corsHeaders }
      );
    }

    const expMs = Date.now() + 12 * 60 * 60 * 1000;
    const sessionToken = await signSession(env.ADMIN_TOKEN, expMs);

    return Response.json(
      { token: sessionToken, expiresAt: expMs },
      { headers: corsHeaders }
    );
  } catch {
    return Response.json(
      { error: "Ombi la login halijakamilika." },
      { status: 400, headers: corsHeaders }
    );
  }
}
