import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { fetchContent } from "../lib/utils.js";
import { showNoticeBox } from "../components/noticeBox.js";
import { getUser, isAuthenticated } from "../lib/session.js";

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
  checkAutoVerificationNotice();
  initPreviewHubTabs();
  initFAQAccordion();
});

function checkAutoVerificationNotice() {
  const showFlag = sessionStorage.getItem("show_auto_verified_notice");
  const user = getUser();
  if (!user || !user.isStudentVerified) {
    sessionStorage.removeItem("show_auto_verified_notice");
    return;
  }

  if (showFlag === "true") {
    sessionStorage.removeItem("show_auto_verified_notice");
    showNoticeBox({
      id: `auto_school_verification_${user._id}`,
      message: 'verification.schoolEmailVerified',
      type: 'success',
      once: true
    });
  }
}

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

    card.style.transform = `translateZ(0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`;
  });

  container.addEventListener("mouseleave", () => {
    card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
  });
}

function initPreviewHubTabs() {
  const tabButtons = document.querySelectorAll(".preview-tab-btn");
  const tabPanels = document.querySelectorAll(".preview-tab-panel");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.tab;
      
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      tabPanels.forEach(panel => {
        if (panel.id === targetId) {
          panel.classList.add("active");
        } else {
          panel.classList.remove("active");
        }
      });
    });
  });
}

function initFAQAccordion() {
  const faqHeaders = document.querySelectorAll(".faq-header");

  faqHeaders.forEach(header => {
    header.addEventListener("click", () => {
      const item = header.closest(".faq-item");
      const content = header.nextElementSibling;
      const isActive = item.classList.contains("active");

      // Close all other FAQ items for accordian style
      document.querySelectorAll(".faq-item").forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove("active");
          const otherContent = otherItem.querySelector(".faq-content");
          if (otherContent) {
            otherContent.style.maxHeight = null;
          }
        }
      });

      if (isActive) {
        item.classList.remove("active");
        content.style.maxHeight = null;
      } else {
        item.classList.add("active");
        content.style.maxHeight = content.scrollHeight + "px";
      }
    });
  });
}
