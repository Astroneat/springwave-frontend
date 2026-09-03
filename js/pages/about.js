import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { initI18n, applyTranslation } from "../lib/i18n.js";
import { getUser, getToken } from "../lib/session.js";

document.addEventListener("DOMContentLoaded", async () => {
  await initI18n();
  await loadNavbar({ activeSection: "about" });
  await loadFooter();
  await initChatbot();
  initCtaButton();
  applyTranslation();
  initScrollReveal();
  initStatsCounter();

  window.addEventListener("language-changed", () => {
    initCtaButton();
    applyTranslation();
  });
});

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) {
    container.innerHTML = html;
    applyTranslation(container);
  }
}

function initCtaButton() {
  const user = getUser();
  const token = getToken();
  const isLoggedIn = !!(user || token);

  const ctaBtn = document.getElementById("about-cta-btn");
  const ctaBtnText = document.getElementById("about-cta-btn-text");

  if (!ctaBtn) return;

  if (isLoggedIn) {
    ctaBtn.href = "/index.html";
    if (ctaBtnText) {
      ctaBtnText.dataset.i18n = "about.cta_btn_logged_in";
    }
  } else {
    ctaBtn.href = "/register.html";
    if (ctaBtnText) {
      ctaBtnText.dataset.i18n = "about.cta_btn";
    }
  }
}

function initScrollReveal() {
  const els = document.querySelectorAll(".about-pillar-card, .about-team-card, #story, #values > div, #timeline > div");
  if (!els.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.05, rootMargin: "0px 0px -20px 0px" }
  );

  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(16px)";
    el.style.transition = "opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)";
    observer.observe(el);
  });
}

function initStatsCounter() {
  const nums = document.querySelectorAll(".about-stat-num");
  if (!nums.length) return;

  const animate = (el) => {
    const rawVal = el.dataset.val;
    const target = parseInt(rawVal, 10);
    if (isNaN(target)) return;

    const duration = 1200; // ms
    const isPlus = el.textContent.includes("+");
    const isPercent = el.textContent.includes("%");
    let startTime = null;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeProgress * target);

      if (progress < 1) {
        el.textContent = current + (isPlus ? "+" : "") + (isPercent ? "%" : "");
        requestAnimationFrame(step);
      } else {
        el.textContent = target + (isPlus ? "+" : "") + (isPercent ? "%" : "");
      }
    };

    requestAnimationFrame(step);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  nums.forEach((n) => observer.observe(n));
}
