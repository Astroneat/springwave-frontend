/**
 * Global Gamification FX & Badge Celebration Engine
 * High-performance, zero-lag, ephemeral Canvas particle simulation with tactile graffiti stamps.
 * Works seamlessly across all pages.
 */

import { t } from "../lib/i18n.js";

export const BADGE_DEFINITIONS = [
  // ── Newbie Tier ──
  { key: "hello_world",        label: "Hello World",        icon: "gesture",         desc: "Created your account — \"You exist. That's the first step.\"", tier: "newbie", xp: 15, category: "Welcome" },
  { key: "talk_is_silver",     label: "Talk is Silver",     icon: "comment",         desc: "Wrote your first reply — \"You said something. The internet is proud.\"", tier: "newbie", xp: 15, category: "Welcome" },
  { key: "so_it_begins",       label: "So It Begins",       icon: "rocket_launch",   desc: "Started your first discussion — \"Another thread joins the infinite void.\"", tier: "newbie", xp: 15, category: "Welcome" },
  { key: "self_discovery",     label: "Self-Discovery",     icon: "psychology",      desc: "Completed the personality quiz — \"You stared into the quiz, and the quiz stared back.\"", tier: "newbie", xp: 15, category: "Profile" },

  // ── Activity Explorer Tier ──
  { key: "active_explorer",    label: "Active Explorer",    icon: "explore",         desc: "Favourited 5 activities — \"Always hunting for the next big student event.\"", tier: "explorer", xp: 25, category: "Events" },
  { key: "event_goer",         label: "Event Goer",         icon: "event_available", desc: "Participated in 1 activity — \"Made it to an event. Real world interaction unlocked!\"", tier: "explorer", xp: 25, category: "Events" },
  { key: "rising_host",        label: "Rising Host",        icon: "campaign",        desc: "Hosted your first activity — \"Welcoming students, organizing schedules.\"", tier: "explorer", xp: 25, category: "Events" },
  { key: "grand_host",         label: "Grand Host",         icon: "co_present",      desc: "Hosted 5 activities — \"A pillar of student life. You build communities.\"", tier: "explorer", xp: 25, category: "Events" },

  // ── Community Contributor Tier ──
  { key: "conversation_starter", label: "Conversation Starter", icon: "chat",       desc: "Started 5 discussions — \"You're basically a talk show host now.\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "helper",               label: "Helper",                icon: "forum",      desc: "Wrote 10 replies — \"Your keyboard should be a registered charity.\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "chatterbox",           label: "Chatterbox",            icon: "speaker_notes", desc: "Wrote 50 replies — \"Do you ever sleep? Do you ever stop typing?\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "respected",            label: "Respected",             icon: "thumb_up",   desc: "Received 20 likes — \"People approve of your existence. Digitally, at least.\"", tier: "contributor", xp: 50, category: "Community" },

  // ── Legendary Tier ──
  { key: "the_oracle",         label: "The Oracle",          icon: "auto_awesome",   desc: "Received 50 likes — \"You don't give advice. You drop prophecies.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "trendsetter",        label: "Trendsetter",         icon: "waves",          desc: "Started 20 discussions — \"You're not following trends. You're creating them.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "community_star",     label: "Community Star",      icon: "stars",          desc: "Reached 100 contribution score — \"You're basically the main character now.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "keyboard_warrior",   label: "Keyboard Warrior",    icon: "keyboard",       desc: "Wrote 100 replies — \"Your keyboard has seen things. Horrible, wonderful things.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "mentor",             label: "Mentor",              icon: "school",         desc: "Reached Level 5 — \"You have ascended. Use your power wisely.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "the_sage",           label: "The Sage",            icon: "emoji_objects",  desc: "Reached Level 6 — \"You are the final boss of this community.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "one_man_show",       label: "One-Man Show",        icon: "theater_comedy", desc: "10x more replies than discussions started — \"Ever considered podcasting?\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "quality_over_quantity", label: "Quality > Quantity", icon: "target",       desc: "Started ≤ 3 discussions yet each got 5+ likes — \"You barely speak, but when you do, people listen.\"", tier: "legendary", xp: 100, category: "Milestone" },

  // ── Knowledge Category (Certificates) ──
  { key: "certified_novice",    label: "Certified Novice",    icon: "card_membership", desc: "Earned 1 certificate — \"First milestone down. The path of wisdom opens.\"", tier: "explorer", xp: 25, category: "Knowledge" },
  { key: "certified_expert",    label: "Certified Expert",    icon: "workspace_premium", desc: "Earned 5 certificates — \"A certified scholar. Your knowledge base grows deeper.\"", tier: "contributor", xp: 50, category: "Knowledge" },
  { key: "certified_master",    label: "Certified Master",    icon: "military_tech",  desc: "Earned 10 certificates — \"Ultimate scholar status. Academic brilliance unlocked!\"", tier: "legendary", xp: 100, category: "Knowledge" },
];

const TIER_COLORS = {
  newbie: {
    primary: "#1755ba",
    accent: "#38bdf8",
    bg: "#eff6ff",
    border: "#bfdbfe",
    label: "Common",
    stampText: "★ UNLOCKED ★",
    palette: ["#1755ba", "#38bdf8", "#60a5fa", "#93c5fd", "#ffffff"]
  },
  explorer: {
    primary: "#059669",
    accent: "#34d399",
    bg: "#ecfdf5",
    border: "#a7f3d0",
    label: "Uncommon",
    stampText: "★ EXPLORER ★",
    palette: ["#059669", "#10b981", "#34d399", "#6ee7b7", "#ffffff"]
  },
  contributor: {
    primary: "#7c3aed",
    accent: "#a78bfa",
    bg: "#f5f3ff",
    border: "#ddd6fe",
    label: "Rare",
    stampText: "★ PROVEN ★",
    palette: ["#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ffffff"]
  },
  legendary: {
    primary: "#d97706",
    accent: "#fbbf24",
    bg: "#fffbeb",
    border: "#fde68a",
    label: "Legendary",
    stampText: "👑 LEGENDARY 👑",
    palette: ["#d97706", "#f59e0b", "#fbbf24", "#fef08a", "#ffffff"]
  }
};

/**
 * Plays a lightweight melodic chime using the Web Audio API (Zero audio file downloads needed)
 */
function playCelebrationChime(tier = "newbie") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = tier === "legendary" 
      ? [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 triumph
      : [440.00, 554.37, 659.25, 880.00]; // A4, C#5, E5, A5 chime

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.6);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.65);
    });

    setTimeout(() => {
      if (ctx.state !== "closed") ctx.close();
    }, 1500);
  } catch (e) {
    // Audio autoplay restrictions are safe to ignore silently
  }
}

/**
 * Ephemeral HTML5 Canvas Particle Explosion (Destroys itself after 1.8 seconds)
 */
export function launchConfettiBurst(tier = "newbie") {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  const canvas = document.createElement("canvas");
  canvas.className = "sw-confetti-canvas";
  canvas.style.cssText = "position: fixed; inset: 0; width: 100vw; height: 100vh; pointer-events: none; z-index: 100000; overflow: hidden;";
  document.body.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const palette = (TIER_COLORS[tier] || TIER_COLORS.newbie).palette;
  const particleCount = tier === "legendary" ? 80 : 55;
  const particles = [];

  const originX = width / 2;
  const originY = height / 2 - 40;

  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = Math.random() * 9 + 4;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed * (Math.random() * 1.5 + 0.5),
      vy: Math.sin(angle) * speed * (Math.random() * 1.5 + 0.5) - 3,
      size: Math.random() * 8 + 4,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: Math.random() > 0.4 ? "rect" : "circle",
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.22,
      drag: 0.965,
      alpha: 1
    });
  }

  let animationFrameId;
  const startTime = performance.now();
  const DURATION_MS = 1800;

  function render(time) {
    const elapsed = time - startTime;
    ctx.clearRect(0, 0, width, height);

    let aliveCount = 0;

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.rotation += p.rotSpeed;
      p.alpha = Math.max(0, 1 - (elapsed / DURATION_MS));

      if (p.alpha > 0.01) {
        aliveCount++;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (elapsed < DURATION_MS && aliveCount > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      cancelAnimationFrame(animationFrameId);
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  }

  animationFrameId = requestAnimationFrame(render);
}

/**
 * Display the Achievement Showcase Modal with Graffiti Stamp
 */
export function triggerBadgeCelebration(badgeKeyOrObj, options = {}) {
  let badge = badgeKeyOrObj;
  if (typeof badgeKeyOrObj === "string") {
    badge = BADGE_DEFINITIONS.find(b => b.key === badgeKeyOrObj);
  }
  if (!badge) return;

  const tierMeta = TIER_COLORS[badge.tier] || TIER_COLORS.newbie;
  const isInspect = options.isInspect || false;

  // Remove any existing celebration modal
  const existing = document.getElementById("badge-celebration-modal");
  if (existing) existing.remove();

  const modalOverlay = document.createElement("div");
  modalOverlay.id = "badge-celebration-modal";
  modalOverlay.className = "badge-modal-overlay active";
  modalOverlay.setAttribute("role", "dialog");
  modalOverlay.setAttribute("aria-modal", "true");

  modalOverlay.innerHTML = `
    <div class="badge-modal-backdrop"></div>
    <div class="badge-modal-card tier-${badge.tier}">
      <button class="badge-modal-close" aria-label="Close modal">
        <span class="material-symbols-outlined text-lg">close</span>
      </button>

      <div class="badge-modal-top">
        <span class="badge-modal-tier-pill" style="background: ${tierMeta.bg}; color: ${tierMeta.primary}; border: 1px solid ${tierMeta.border};">
          <span class="material-symbols-outlined text-xs">military_tech</span> ${tierMeta.label} Badge
        </span>
        <span class="badge-modal-xp-pill" style="background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a;">
          +${badge.xp || 25} XP
        </span>
      </div>

      <!-- 3D Emblem Container -->
      <div class="badge-modal-emblem-wrap">
        <div class="badge-modal-emblem tier-${badge.tier}">
          <span class="material-symbols-outlined badge-modal-icon">${badge.icon}</span>
        </div>
        <!-- Tactile Graffiti Stamp -->
        <div class="badge-graffiti-stamp tier-${badge.tier}">
          <span>${tierMeta.stampText}</span>
        </div>
      </div>

      <div class="badge-modal-content">
        <h3 class="badge-modal-title">${badge.label}</h3>
        <p class="badge-modal-desc">${badge.desc}</p>
        <div class="badge-modal-meta-row">
          <span><strong>Category:</strong> ${badge.category || "Community"}</span>
          <span>●</span>
          <span><strong>Status:</strong> ${isInspect ? "Unlocked in Profile" : "Newly Achieved!"}</span>
        </div>
      </div>

      <div class="badge-modal-actions">
        <button type="button" class="badge-modal-btn replay-btn" id="badge-replay-fx-btn">
          <span class="material-symbols-outlined text-sm">celebration</span>
          <span>Replay FX</span>
        </button>
        <a href="/profile.html#badges-section" class="badge-modal-btn primary-btn" id="badge-view-profile-btn">
          <span>View in Profile</span>
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
      </div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Play audio chime and launch canvas particles
  playCelebrationChime(badge.tier);
  launchConfettiBurst(badge.tier);

  // Event handlers
  const closeBtn = modalOverlay.querySelector(".badge-modal-close");
  const backdrop = modalOverlay.querySelector(".badge-modal-backdrop");
  const replayBtn = modalOverlay.querySelector("#badge-replay-fx-btn");

  const closeModal = () => {
    modalOverlay.classList.remove("active");
    setTimeout(() => modalOverlay.remove(), 250);
  };

  closeBtn?.addEventListener("click", closeModal);
  backdrop?.addEventListener("click", closeModal);

  replayBtn?.addEventListener("click", () => {
    playCelebrationChime(badge.tier);
    launchConfettiBurst(badge.tier);

    const stamp = modalOverlay.querySelector(".badge-graffiti-stamp");
    if (stamp) {
      stamp.classList.remove("stamp-in");
      void stamp.offsetWidth; // trigger reflow
      stamp.classList.add("stamp-in");
    }
  });

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      closeModal();
      document.removeEventListener("keydown", handleKeyDown);
    }
  };
  document.addEventListener("keydown", handleKeyDown);
}

/**
 * Queue a badge for celebration on the next page (Cross-page queue)
 */
export function queueBadgeCelebration(badgeKeyOrObj) {
  try {
    const key = typeof badgeKeyOrObj === "string" ? badgeKeyOrObj : badgeKeyOrObj.key;
    const currentQueue = JSON.parse(sessionStorage.getItem("pending_badge_celebrations") || "[]");
    if (!currentQueue.includes(key)) {
      currentQueue.push(key);
      sessionStorage.setItem("pending_badge_celebrations", JSON.stringify(currentQueue));
    }
  } catch (e) {}
}

/**
 * Check if there are any queued badges on page load and trigger them
 */
export function checkPendingBadgeCelebrations() {
  try {
    const raw = sessionStorage.getItem("pending_badge_celebrations");
    if (!raw) return;
    const queue = JSON.parse(raw);
    if (Array.isArray(queue) && queue.length > 0) {
      const nextBadge = queue.shift();
      sessionStorage.setItem("pending_badge_celebrations", JSON.stringify(queue));
      setTimeout(() => {
        triggerBadgeCelebration(nextBadge);
      }, 700);
    }
  } catch (e) {}
}

/**
 * Global Initialization: Listens for events and checks queues
 */
export function initBadgeCelebration() {
  checkPendingBadgeCelebrations();

  // Listen for custom badge unlocked event globally
  window.addEventListener("badge-unlocked", (e) => {
    const badge = e.detail?.badge || e.detail?.key;
    if (badge) {
      triggerBadgeCelebration(badge, { isInspect: false });
    }
  });

  // Expose globally for instant testing or inline triggers
  window.triggerBadgeCelebration = triggerBadgeCelebration;
  window.queueBadgeCelebration = queueBadgeCelebration;
}
