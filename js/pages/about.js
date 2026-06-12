import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar({ activeSection: "about" });
  await loadFooter();
  await initChatbot();
  initScrollReveal();
});

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) container.innerHTML = html;
}

function initScrollReveal() {
  const els = document.querySelectorAll(".believe-card, .team-card");
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
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(24px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}
