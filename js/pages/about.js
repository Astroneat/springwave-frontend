import "../../src/style.css";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar({ activeSection: "about" });
  await loadFooter();
  await initChatbot();
  initScrollReveal();
  initStatsCounter();
  initMissionMap();
  initJourneyTimeline();
});

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) container.innerHTML = html;
}

function initScrollReveal() {
  const els = document.querySelectorAll(".pain-flow-node, .bento-value-card, .tech-glass-card, .team-card-editorial");
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
    { threshold: 0.08, rootMargin: "0px 0px -10px 0px" }
  );

  els.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1), transform 0.7s cubic-bezier(0.16, 1, 0.3, 1)";
    observer.observe(el);
  });
}

function initStatsCounter() {
  const nums = document.querySelectorAll(".about-stat-num");
  if (!nums.length) return;

  const animate = (el) => {
    const valStr = el.dataset.val;
    const target = parseInt(valStr, 10);
    if (isNaN(target)) return;

    let current = 0;
    const duration = 1500; // ms
    const frameRate = 1000 / 60; // 60fps
    const totalFrames = duration / frameRate;
    const increment = target / totalFrames;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        clearInterval(timer);
        el.textContent = target === 9999 ? "∞" : target + (valStr.includes("+") ? "+" : "");
      } else {
        el.textContent = target === 9999 ? "∞" : Math.floor(current) + (valStr.includes("+") ? "+" : "");
      }
    }, frameRate);
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
    { threshold: 0.1 }
  );

  nums.forEach((n) => observer.observe(n));
}

function initMissionMap() {
  const nodes = document.querySelectorAll(".map-node");
  const infoTitle = document.getElementById("node-info-title");
  const infoText = document.getElementById("node-info-text");
  const innerDesc = document.getElementById("map-inner-desc");
  const svgLines = document.querySelectorAll(".map-line");

  if (!nodes.length) return;

  const details = {
    ai: {
      title: "AI Recommendation System",
      text: "Generates personalized student activities and workshops calculated based on user's major, interests, and profile details.",
      tag: "AI Matching"
    },
    comm: {
      title: "Community Network",
      text: "Connects cross-university clubs and volunteer groups to share insights, host events, and network dynamically.",
      tag: "Social Node"
    },
    events: {
      title: "Activities Roster",
      text: "Aggregates every hackathon, seminar, workshop, and club recruitment into a single, clean, searchable database.",
      tag: "Unified Events"
    },
    quiz: {
      title: "Personality Core Quiz",
      text: "Features an interactive questionnaire evaluating strengths and recommending specific learning pathways.",
      tag: "Strengths Profile"
    },
    growth: {
      title: "Growth Analytics",
      text: "Tracks completed extracurricular actions and milestones to visualize student development charts over semesters.",
      tag: "Milestones"
    }
  };

  const updateActiveNode = (nodeName) => {
    // Nodes
    nodes.forEach(n => n.classList.remove("active"));
    const activeNode = document.querySelector(`.node-${nodeName}`);
    if (activeNode) activeNode.classList.add("active");

    // SVG Lines
    svgLines.forEach(l => l.classList.remove("active"));
    const activeLine = document.querySelector(`.line-${nodeName}`);
    if (activeLine) activeLine.classList.add("active");

    // Text Card
    const info = details[nodeName];
    if (info && infoTitle && infoText && innerDesc) {
      infoTitle.textContent = info.title;
      infoText.textContent = info.text;
      innerDesc.textContent = info.tag;
    }
  };

  const updateLines = () => {
    const mapEl = document.getElementById("interactive-map");
    const centerEl = document.querySelector(".map-center");
    const svg = document.querySelector(".map-svg");
    if (!mapEl || !centerEl || !svg) return;

    const w = mapEl.clientWidth;
    const h = mapEl.clientHeight;
    svg.setAttribute("width", w);
    svg.setAttribute("height", h);
    svg.removeAttribute("viewBox");

    const mapRect = mapEl.getBoundingClientRect();
    const centerRect = centerEl.getBoundingClientRect();
    const centerX = (centerRect.left + centerRect.width / 2) - mapRect.left;
    const centerY = (centerRect.top + centerRect.height / 2) - mapRect.top;

    nodes.forEach(node => {
      const nodeName = node.dataset.node;
      const nodeRect = node.getBoundingClientRect();
      const nodeX = (nodeRect.left + nodeRect.width / 2) - mapRect.left;
      const nodeY = (nodeRect.top + nodeRect.height / 2) - mapRect.top;

      const line = document.querySelector(`.line-${nodeName}`);
      if (line) {
        line.setAttribute("x1", centerX);
        line.setAttribute("y1", centerY);
        line.setAttribute("x2", nodeX);
        line.setAttribute("y2", nodeY);
      }
    });
  };

  nodes.forEach(n => {
    n.addEventListener("mouseenter", () => {
      const nodeName = n.dataset.node;
      updateActiveNode(nodeName);
    });
    n.addEventListener("click", () => {
      const nodeName = n.dataset.node;
      updateActiveNode(nodeName);
    });
  });

  window.addEventListener("resize", updateLines);
  window.addEventListener("load", updateLines);

  // Default to AI
  updateActiveNode("ai");
  
  // Trigger initial line rendering
  updateLines();
  setTimeout(updateLines, 100);
  setTimeout(updateLines, 500);
  setTimeout(updateLines, 1500);
}

function initJourneyTimeline() {
  const steps = document.querySelectorAll(".journey-step");
  const progressLine = document.getElementById("timeline-progress");
  if (!steps.length || !progressLine) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("active");
        } else {
          // Keep steps active once revealed for a nicer scrolling fill experience
        }
        updateProgressBar();
      });
    },
    { threshold: 0.5, rootMargin: "0px 0px -100px 0px" }
  );

  steps.forEach(s => observer.observe(s));

  const updateProgressBar = () => {
    let activeCount = 0;
    steps.forEach(s => {
      if (s.classList.contains("active")) activeCount++;
    });
    const percentage = ((activeCount - 1) / (steps.length - 1)) * 100;
    progressLine.style.height = `${Math.max(0, Math.min(percentage, 100))}%`;
  };
}
