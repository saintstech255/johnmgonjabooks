CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'my_books', -- 'my_books' au 'other_authors'
  status TEXT DEFAULT '',                   -- mfano: 'Ninachokisoma Sasa'
  description TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  buy_url TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
