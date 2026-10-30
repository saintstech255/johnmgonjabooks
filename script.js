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

/* ===== WhatsApp pre-filled order links ===== */
document.querySelectorAll(".book").forEach(function (card) {
  const title = card.dataset.title;
  const msg = 'Hello John, I would like to order the book "' + title + '". Please share the price and delivery details.';
  const link = card.querySelector("[data-wa]");
  if (link) link.href = "https://wa.me/" + CONFIG.whatsapp + "?text=" + encodeURIComponent(msg);
});

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
document.querySelectorAll(".reveal").forEach(function (el) { io.observe(el); });
