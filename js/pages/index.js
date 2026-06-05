import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { fetchContent } from "../lib/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  const nav = await loadNavbar({ activeSection: "home" });
  await loadFooter();
  initNavbarScroll();
  initScrollReveal();
  initMatchBars();
  initSkillBars();
  initSmoothScroll();
});

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) container.innerHTML = html;
}

function initNavbarScroll() {
  const nav = document.getElementById("navbar");
  if (!nav) return;
  const inner = nav.querySelector(".nav-landing");
  if (!inner) return;

  const check = () => {
    if (window.scrollY > 60) {
      inner.classList.add("scrolled");
    } else {
      inner.classList.remove("scrolled");
    }
  };
  check();
  window.addEventListener("scroll", check, { passive: true });
}

function initScrollReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
  );

  els.forEach((el) => observer.observe(el));
}

function initMatchBars() {
  const bars = document.querySelectorAll(".match-bar-fill");
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          const w = bar.dataset.width;
          if (w) bar.style.width = w + "%";
          observer.unobserve(bar);
        }
      });
    },
    { threshold: 0.3 }
  );

  bars.forEach((bar) => observer.observe(bar));
}

function initSkillBars() {
  const fills = document.querySelectorAll(".skill-fill");
  if (!fills.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const fill = entry.target;
          const w = fill.dataset.width;
          if (w) fill.style.width = w + "%";
          observer.unobserve(fill);
        }
      });
    },
    { threshold: 0.3 }
  );

  fills.forEach((fill) => observer.observe(fill));
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
}
