/* ===== EDIT THIS ===== */
const CONFIG = {
  whatsapp: "255741643130",   // international format, digits only
  email: "johnamani67@gmail.com"
};

/* ===== Preloader: light flows along the still infinity, then fades out ===== */
(function () {
  const pre = document.getElementById("preloader");
  const MIN_TIME = 2600;      // lets the light travel the full loop at least once
  const start = performance.now();
  let loaded = false;

  function finish() {
    const wait = Math.max(0, MIN_TIME - (performance.now() - start));
    setTimeout(function () {
      pre.classList.add("done");
      document.body.classList.remove("loading");
      setTimeout(function () { pre.remove(); }, 1000);
    }, wait);
  }

  function onReady() { if (!loaded) { loaded = true; finish(); } }

  if (document.readyState === "complete") onReady();
  else window.addEventListener("load", onReady);
  setTimeout(onReady, 6000);  // safety fallback
})();

/* ===== WhatsApp pre-filled order links (Only for your books) ===== */
function attachWhatsAppLinks(root) {
  const scope = root || document;
  scope.querySelectorAll("#books .book").forEach(function (card) {
    const title = card.dataset.title;
    const msg = 'Hello John, I would like to order the book "' + title + '". Please share the price and delivery details.';
    const link = card.querySelector("[data-wa]");
    if (link) link.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
  });
}
attachWhatsAppLinks(document);

/* ===== Email link from config ===== */
const mail = document.getElementById("mail");
if (mail) { mail.href = "mailto:" + CONFIG.email; mail.textContent = CONFIG.email; }

/* ===== Footer year ===== */
document.getElementById("yr").textContent = new Date().getFullYear();

/* ===== Header style on scroll ===== */
const header = document.querySelector("header");
window.addEventListener("scroll", function () {
  header.classList.toggle("scrolled", window.scrollY > 30);
}, { passive: true });

/* ===== Mobile menu ===== */
const links = document.getElementById("links");
const burger = document.getElementById("burger");
function setMenu(open) {
  links.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
  burger.innerHTML = open ? '<i class="fa-solid fa-xmark"></i>' : '<i class="fa-solid fa-bars"></i>';
}
burger.addEventListener("click", function () { setMenu(!links.classList.contains("open")); });
links.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

/* ===== Reveal on scroll ===== */
const io = new IntersectionObserver(function (entries) {
  entries.forEach(function (e) {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  });
}, { threshold: 0.12 });

function observeReveals(root) {
  const scope = root || document;
  scope.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
}
observeReveals(document);

// Fallback list ya vitabu vya waandishi wengine (Books by Other Authors)
const otherAuthorsBooks = [
  {
    title: "The Mountain Is You",
    author: "Briana Wiest",
    status: "I recomend this to you",
    cover: "images/the-mountain-is-you.jpg",
    note: "Transforming self-sabotage into self-mastery. A profound look at how we stand in our own way.",
    link: "https://selar.com/2918240969"
  },
  {
    title: "Neuro Mancer",
    author: "William Gibson",
    status: "Nimekisoma & Nakipendekeza",
    cover: "images/neuro-mancer.jpg",
    note: "Neuromancer is a landmark 1984 science fiction novel by William Gibson that defined the cyberpunk genre and popularized the concept of cyberspace.",
    link: "https://selar.com/133y910ka7"
  },
  {
    title: "Atomic Habits",
    author: "James Clear",
    status: "Nimekisoma & Nakipendekeza",
    cover: "images/atomic-habits.jpg",
    note: "Atomic Habits is a 2018 self-help bestseller by James Clear that breaks down how tiny, incremental daily changes compound into remarkable long-term results.",
    link: "https://selar.com/30790870n4"
  }
];

function renderOtherBooksList(booksList) {
  const grid = document.getElementById("recommended-books-grid");
  if (!grid) return;

  grid.innerHTML = booksList.map(book => {
    const cover = book.cover_url || book.cover;
    const note = book.description || book.note;
    const buyLink = book.buy_url || book.link || "#";
    const meta = book.author
      ? `<p><strong>By ${book.author}</strong>${book.status ? ` • <em>${book.status}</em>` : ""}<br><br>${note}</p>`
      : `<p>${note}</p>`;

    return `
      <article class="book reveal" data-title="${book.title}">
        <img src="${cover}" alt="Cover of ${book.title}" width="600" height="900" loading="lazy">
        <h3>${book.title}</h3>
        ${meta}
        ${buyLink && buyLink !== "#" ? `
          <div class="actions">
            <a class="btn btn-amz" href="${buyLink}" target="_blank" rel="noopener">
              <i class="fa-solid fa-bag-shopping"></i> Get Book
            </a>
          </div>
        ` : ""}
      </article>
    `;
  }).join("");

  observeReveals(grid);
}

function renderMyBooksFromD1(booksList) {
  const myBooksGrid = document.querySelector("#books .grid");
  if (!myBooksGrid || !booksList.length) return;

  myBooksGrid.innerHTML = booksList.map(book => {
    const meta = book.author
      ? `<p><strong>By ${book.author}</strong>${book.status ? ` • <em>${book.status}</em>` : ""}<br><br>${book.description}</p>`
      : `<p>${book.description}</p>`;

    return `
      <article class="book reveal" data-title="${book.title}">
        <img src="${book.cover_url}" alt="Cover of ${book.title}" width="600" height="900" loading="lazy">
        <h3>${book.title}</h3>
        ${meta}
        <div class="actions">
          <a class="btn btn-amz" href="${book.buy_url}" target="_blank" rel="noopener">
            <i class="fa-solid fa-bag-shopping"></i> Buy Here
          </a>
          <a class="btn btn-wa" data-wa href="#" target="_blank" rel="noopener">
            <i class="fa-brands fa-whatsapp"></i> Order via WhatsApp
          </a>
        </div>
      </article>
    `;
  }).join("");

  attachWhatsAppLinks(myBooksGrid);
  observeReveals(myBooksGrid);
}

async function initBooks() {
  // Kwanza onyesha list ya fallback ili ukurasa uwe tayari mara moja
  renderOtherBooksList(otherAuthorsBooks);

  try {
    const res = await fetch("/api/books");
    if (!res.ok) return;
    const data = await res.json();
    const books = data.books || [];
    if (!books.length) return;

    const myBooks = books.filter(b => b.section === "my_books");
    const otherBooks = books.filter(b => b.section === "other_authors");

    if (myBooks.length) {
      renderMyBooksFromD1(myBooks);
    }
    if (otherBooks.length) {
      renderOtherBooksList(otherBooks);
    }
  } catch (err) {
    // Ikiwa bado huja-deploy Worker/D1 au uko offline, fallback itaendelea kufanya kazi
    console.warn("Using fallback book list:", err);
  }
}

document.addEventListener("DOMContentLoaded", initBooks);
