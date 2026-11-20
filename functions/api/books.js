const encoder = new TextEncoder();

async function verifySession(secret, token) {
  if (!secret || !token || !token.includes(".")) return false;
  const [payload, sigHex] = token.split(".");
  if (!payload || !sigHex) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const sigBytes = new Uint8Array(
    (sigHex.match(/.{1,2}/g) || []).map((byte) => parseInt(byte, 16))
  );
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    sigBytes,
    encoder.encode(payload)
  );
  if (!valid) return false;

  try {
    const data = JSON.parse(atob(payload));
    return data.role === "admin" && typeof data.exp === "number" && Date.now() < data.exp;
  } catch {
    return false;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};

async function isAuthorized(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || !env.ADMIN_TOKEN) return false;
  const validSession = await verifySession(env.ADMIN_TOKEN, token);
  return validSession || token === env.ADMIN_TOKEN;
}

export async function onRequestOptions() {
  return new Response(null, { headers: corsHeaders });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const section = url.searchParams.get("section");

  let stmt;
  if (section) {
    stmt = env.DB.prepare(
      "SELECT * FROM books WHERE section = ? ORDER BY id DESC"
    ).bind(section);
  } else {
    stmt = env.DB.prepare("SELECT * FROM books ORDER BY id DESC");
  }

  const { results } = await stmt.all();
  return Response.json({ books: results }, { headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!(await isAuthorized(request, env))) {
    return Response.json(
      { error: "Tafadhali log in kwanza au hakiki session yako." },
      { status: 401, headers: corsHeaders }
    );
  }

  const body = await request.json();
  const {
    title,
    author,
    section = "my_books",
    status = "",
    description,
    cover_url,
    buy_url
  } = body;

  if (!title || !author || !description || !cover_url || !buy_url) {
    return Response.json(
      { error: "Tafadhali jaza sehemu zote muhimu." },
      { status: 400, headers: corsHeaders }
    );
  }

  const inserted = await env.DB.prepare(
    `INSERT INTO books (title, author, section, status, description, cover_url, buy_url)
     VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`
  )
    .bind(title, author, section, status, description, cover_url, buy_url)
    .first();

  return Response.json(
    { message: "Kitabu kimehifadhiwa!", book: inserted },
    { status: 201, headers: corsHeaders }
  );
}

export async function onRequestDelete(context) {
  const { request, env } = context;

  if (!(await isAuthorized(request, env))) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401, headers: corsHeaders }
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") || url.pathname.split("/").pop();
  await env.DB.prepare("DELETE FROM books WHERE id = ?").bind(id).run();

  return Response.json(
    { message: "Kitabu kimefutwa." },
    { headers: corsHeaders }
  );
}
