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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 0. Admin Login Endpoint
    if (url.pathname === "/api/login" && request.method === "POST") {
      try {
        const body = await request.json();
        const password = (body.password || "").trim();

        if (!env.ADMIN_TOKEN) {
          return Response.json(
            { error: "ADMIN_TOKEN haijawekwa kwenye Worker." },
            { status: 500, headers: corsHeaders }
          );
        }

        if (!password || password !== env.ADMIN_TOKEN) {
          return Response.json(
            { error: "Nenosiri si sahihi. Jaribu tena." },
            { status: 401, headers: corsHeaders }
          );
        }

        // Token inadumu kwa saa 12
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

    // Helper ya kukagua session token kwa njia salama
    async function isAuthorized() {
      const auth = request.headers.get("Authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      if (!token || !env.ADMIN_TOKEN) return false;

      // Inakubali signed session token kutoka /api/login, na pia fallback ya direct ADMIN_TOKEN ikihitajika
      const validSession = await verifySession(env.ADMIN_TOKEN, token);
      return validSession || token === env.ADMIN_TOKEN;
    }

    // 1. Pata vitabu vyote (Public)
    if (url.pathname === "/api/books" && request.method === "GET") {
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

    // 2. Ongeza kitabu kipya kupitia Admin Panel (Protected)
    if (url.pathname === "/api/books" && request.method === "POST") {
      if (!(await isAuthorized())) {
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

    // 3. Futa kitabu kwa ID (Protected)
    if (url.pathname.startsWith("/api/books/") && request.method === "DELETE") {
      if (!(await isAuthorized())) {
        return Response.json(
          { error: "Unauthorized" },
          { status: 401, headers: corsHeaders }
        );
      }

      const id = url.pathname.split("/").pop();
      await env.DB.prepare("DELETE FROM books WHERE id = ?").bind(id).run();

      return Response.json(
        { message: "Kitabu kimefutwa." },
        { headers: corsHeaders }
      );
    }

    // 4. Faili za kawaida za website (HTML, CSS, JS, images)
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};
