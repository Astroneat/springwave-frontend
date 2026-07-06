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
  initWordRotation();
  initHeroMockupParallax();
});

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) container.innerHTML = html;
}

function initNavbarScroll() {
  const nav = document.getElementById("navbar");
  const hint = document.getElementById("navbar-hint");
  if (!nav) return;

  let mouseNearTop = false;
  let hintDismissed = false;
  const HOVER_THRESHOLD = 100;

  const update = () => {
    const dropdownOpen = !!document.querySelector(".user-menu.active") || !!document.querySelector("#notif-dropdown.active");
    const navVisible = dropdownOpen || window.scrollY > 50 || mouseNearTop;
    if (navVisible) {
      nav.classList.remove("navbar-hidden");
      hintDismissed = true;
    } else {
      nav.classList.add("navbar-hidden");
    }
    if (hint) {
      hint.classList.toggle("visible", navVisible ? false : !hintDismissed);
    }
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("mousemove", (e) => {
    const near = e.clientY <= HOVER_THRESHOLD;
    if (near !== mouseNearTop) {
      mouseNearTop = near;
      update();
    }
  }, { passive: true });
  document.addEventListener("click", (e) => {
    const clickOutsideUserMenu = !e.target.closest(".user-menu");
    const clickOutsideNotifDropdown = !e.target.closest("#notif-dropdown");
    if (clickOutsideUserMenu && clickOutsideNotifDropdown) {
      mouseNearTop = e.clientY <= HOVER_THRESHOLD;
      update();
    }
  });
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

function initWordRotation() {
  const words = document.querySelectorAll(".rotating-word");
  if (!words.length) return;

  let currentIndex = 0;

  setInterval(() => {
    const currentWord = words[currentIndex];
    if (currentWord) {
      currentWord.classList.remove("active");
      currentWord.classList.add("exit");

      setTimeout(() => {
        currentWord.classList.remove("exit");
      }, 450);
    }

    currentIndex = (currentIndex + 1) % words.length;

    const nextWord = words[currentIndex];
    if (nextWord) {
      nextWord.classList.add("active");
    }
  }, 1500);
}

function initHeroMockupParallax() {
  const card = document.getElementById("hero-mockup");
  if (!card) return;

  const container = card.parentElement;
  if (!container) return;

  container.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = -(y - centerY) / 15;
    const rotateY = (x - centerX) / 15;

    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  container.addEventListener("mouseleave", () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
  });
}
