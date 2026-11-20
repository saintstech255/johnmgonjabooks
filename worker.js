export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS headers kwa urahisi
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
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
      const auth = request.headers.get("Authorization") || "";
      const token = auth.replace("Bearer ", "").trim();

      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return Response.json(
          { error: "Unauthorized: Token ya admin si sahihi." },
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
      const auth = request.headers.get("Authorization") || "";
      const token = auth.replace("Bearer ", "").trim();

      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
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
