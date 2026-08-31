/**
 * Global Gamification FX & Badge Celebration Engine
 * High-performance, zero-lag, ephemeral Canvas particle simulation with tactile graffiti stamps.
 * Works seamlessly across all pages.
 */

import { t } from "../lib/i18n.js";

export const BADGE_DEFINITIONS = [
  // ── Tier 1: Newbie (Common / Introductory) ──
  { key: "hello_world",        label: "Hello World",        icon: "gesture",         desc: "Created your account — \"You exist. That's the first step.\"", tier: "newbie", xp: 15, category: "Welcome" },
  { key: "self_discovery",     label: "Self-Discovery",     icon: "psychology",      desc: "Completed the personality quiz — \"You stared into the quiz, and the quiz stared back.\"", tier: "newbie", xp: 15, category: "Profile" },
  { key: "talk_is_silver",     label: "Talk is Silver",     icon: "comment",         desc: "Wrote your first reply — \"You said something. The internet is proud.\"", tier: "newbie", xp: 15, category: "Welcome" },
  { key: "so_it_begins",       label: "So It Begins",       icon: "rocket_launch",   desc: "Started your first discussion — \"Another thread joins the infinite void.\"", tier: "newbie", xp: 15, category: "Welcome" },

  // ── Tier 2: Activity Explorer (Uncommon / Early Progression) ──
  { key: "active_explorer",    label: "Active Explorer",    icon: "explore",         desc: "Favourited 5 activities — \"Always hunting for the next big student event.\"", tier: "explorer", xp: 25, category: "Events" },
  { key: "event_goer",         label: "Event Goer",         icon: "event_available", desc: "Participated in 1 activity — \"Made it to an event. Real world interaction unlocked!\"", tier: "explorer", xp: 25, category: "Events" },
  { key: "certified_novice",    label: "Certified Novice",    icon: "card_membership", desc: "Earned 1 certificate — \"First milestone down. The path of wisdom opens.\"", tier: "explorer", xp: 25, category: "Knowledge" },
  { key: "rising_host",        label: "Rising Host",        icon: "campaign",        desc: "Hosted your first activity — \"Welcoming students, organizing schedules.\"", tier: "explorer", xp: 25, category: "Events" },

  // ── Tier 3: Community Contributor (Rare / Active Platform Member) ──
  { key: "conversation_starter", label: "Conversation Starter", icon: "chat",       desc: "Started 5 discussions — \"You're basically a talk show host now.\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "helper",               label: "Helper",                icon: "forum",      desc: "Wrote 10 replies — \"Your keyboard should be a registered charity.\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "chatterbox",           label: "Chatterbox",            icon: "speaker_notes", desc: "Wrote 50 replies — \"Do you ever sleep? Do you ever stop typing?\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "respected",            label: "Respected",             icon: "thumb_up",   desc: "Received 20 likes — \"People approve of your existence. Digitally, at least.\"", tier: "contributor", xp: 50, category: "Community" },
  { key: "certified_expert",    label: "Certified Expert",    icon: "workspace_premium", desc: "Earned 5 certificates — \"A certified scholar. Your knowledge base grows deeper.\"", tier: "contributor", xp: 50, category: "Knowledge" },
  { key: "grand_host",         label: "Grand Host",         icon: "co_present",      desc: "Hosted 5 activities — \"A pillar of student life. You build communities.\"", tier: "contributor", xp: 50, category: "Events" },

  // ── Tier 4: Legendary (Epic / Ultimate Platform Milestones) ──
  { key: "the_oracle",         label: "The Oracle",          icon: "auto_awesome",   desc: "Received 50 likes — \"You don't give advice. You drop prophecies.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "trendsetter",        label: "Trendsetter",         icon: "waves",          desc: "Started 20 discussions — \"You're not following trends. You're creating them.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "keyboard_warrior",   label: "Keyboard Warrior",    icon: "keyboard",       desc: "Wrote 100 replies — \"Your keyboard has seen things. Horrible, wonderful things.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "community_star",     label: "Community Star",      icon: "stars",          desc: "Reached 100 contribution score — \"You're basically the main character now.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "mentor",             label: "Mentor",              icon: "school",         desc: "Reached Level 5 — \"You have ascended. Use your power wisely.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "the_sage",           label: "The Sage",            icon: "emoji_objects",  desc: "Reached Level 6 — \"You are the final boss of this community.\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "certified_master",    label: "Certified Master",    icon: "military_tech",  desc: "Earned 10 certificates — \"Ultimate scholar status. Academic brilliance unlocked!\"", tier: "legendary", xp: 100, category: "Knowledge" },
  { key: "one_man_show",       label: "One-Man Show",        icon: "theater_comedy", desc: "10x more replies than discussions started — \"Ever considered podcasting?\"", tier: "legendary", xp: 100, category: "Milestone" },
  { key: "quality_over_quantity", label: "Quality > Quantity", icon: "target",       desc: "Started ≤ 3 discussions yet each got 5+ likes — \"You barely speak, but when you do, people listen.\"", tier: "legendary", xp: 100, category: "Milestone" },
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
 * Plays distinct synthesized melodies, acoustic textures, and celebratory soundscapes tailored to each badge tier.
 * - Newbie (Tier 1): A crisp, friendly 2-note UI pop-ping.
 * - Explorer (Tier 2): An uplifting 4-note acoustic marimba chime with shimmering crystal bell overtone.
 * - Contributor (Tier 3): A triumphant brass-synth fanfare with rich sub-bass, layered chord resonance, and sparkling cascade.
 * - Legendary (Tier 4): A grand cinematic royal victory fanfare featuring a deep sub-bass impact, majestic 3-part brass orchestral progression, glorious climax chord, and a fireworks shower of golden star chimes.
 */
function playCelebrationChime(tier = "newbie") {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;

    // Helper to create a shaped, enveloping tone
    const playTone = ({ freq, type = "sine", startTime, duration, attack = 0.015, gainVal = 0.12, decay = true }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(gainVal, startTime + attack);
      if (decay) {
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      } else {
        gain.gain.setValueAtTime(gainVal, startTime + duration - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      }

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
      return { osc, gain };
    };

    if (tier === "legendary") {
      // ════════════════════════════════════════════════════════════════════
      // 👑 TIER 4: LEGENDARY — GRAND ROYAL CORONATION & CINEMATIC FANFARE
      // ════════════════════════════════════════════════════════════════════

      // 1. Cinematic Sub-Bass Impact Boom (Gives physical weight & epic drama)
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      const subFilter = ctx.createBiquadFilter();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(95, now);
      subOsc.frequency.exponentialRampToValueAtTime(38, now + 0.55); // Dramatic pitch drop

      subFilter.type = "lowpass";
      subFilter.frequency.setValueAtTime(160, now);

      subGain.gain.setValueAtTime(0.0001, now);
      subGain.gain.linearRampToValueAtTime(0.32, now + 0.02);
      subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      subOsc.connect(subFilter);
      subFilter.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.75);

      // 2. Majestic 3-Stage Brass Fanfare Chord Progression
      // Stage A (Announcement: G3 + D4 + B4): 0.00s - 0.16s
      const stageA = [
        { freq: 196.00, type: "sawtooth", g: 0.08 }, // G3
        { freq: 293.66, type: "triangle", g: 0.12 }, // D4
        { freq: 493.88, type: "triangle", g: 0.10 }  // B4
      ];
      stageA.forEach(({ freq, type, g }) => {
        playTone({ freq, type, startTime: now, duration: 0.18, attack: 0.02, gainVal: g });
      });

      // Stage B (Ascending Triumph: A3 + E4 + C#5): 0.16s - 0.34s
      const stageB = [
        { freq: 220.00, type: "sawtooth", g: 0.09 }, // A3
        { freq: 329.63, type: "triangle", g: 0.13 }, // E4
        { freq: 554.37, type: "triangle", g: 0.12 }  // C#5
      ];
      stageB.forEach(({ freq, type, g }) => {
        playTone({ freq, type, startTime: now + 0.16, duration: 0.20, attack: 0.02, gainVal: g });
      });

      // Stage C (Glorious Royal Climax: C3 + G3 + C4 + E4 + G4 + C5 + E5 + G5): 0.34s - 2.4s
      const climaxVoices = [
        { freq: 130.81, type: "sawtooth", g: 0.10, dur: 1.8 }, // C3 warm low brass
        { freq: 196.00, type: "triangle", g: 0.12, dur: 1.8 }, // G3
        { freq: 261.63, type: "sawtooth", g: 0.12, dur: 1.9 }, // C4
        { freq: 329.63, type: "triangle", g: 0.14, dur: 2.0 }, // E4
        { freq: 392.00, type: "sawtooth", g: 0.13, dur: 2.0 }, // G4
        { freq: 523.25, type: "sine",     g: 0.15, dur: 2.2 }, // C5
        { freq: 659.25, type: "sine",     g: 0.14, dur: 2.2 }, // E5
        { freq: 1046.50, type: "sine",    g: 0.12, dur: 2.4 }  // C6 high shine
      ];
      climaxVoices.forEach(({ freq, type, g, dur }) => {
        playTone({ freq, type, startTime: now + 0.34, duration: dur, attack: 0.03, gainVal: g });
      });

      // 3. Golden Fireworks Sparkle Cascade (High crystalline arpeggios showering down)
      const sparkleNotes = [
        { freq: 1318.51, delay: 0.38 }, // E6
        { freq: 1567.98, delay: 0.44 }, // G6
        { freq: 1975.53, delay: 0.50 }, // B6
        { freq: 2093.00, delay: 0.56 }, // C7
        { freq: 2637.02, delay: 0.63 }, // E7
        { freq: 3135.96, delay: 0.70 }, // G7
        { freq: 4186.01, delay: 0.78 }  // C8 apex shimmer
      ];
      sparkleNotes.forEach(({ freq, delay }) => {
        playTone({ freq, type: "sine", startTime: now + delay, duration: 0.7, attack: 0.005, gainVal: 0.08 });
      });

    } else if (tier === "contributor") {
      // ════════════════════════════════════════════════════════════════════
      // 🔮 TIER 3: CONTRIBUTOR — ENERGETIC HEROIC SYNTH FANFARE
      // ════════════════════════════════════════════════════════════════════

      // 1. Warm Bass Pulse
      playTone({ freq: 130.81, type: "triangle", startTime: now, duration: 0.3, attack: 0.02, gainVal: 0.18 });
      playTone({ freq: 174.61, type: "triangle", startTime: now + 0.28, duration: 0.9, attack: 0.02, gainVal: 0.20 });

      // 2. Triumphant Ascending Arpeggio (F Major -> Power Chords)
      const fanfareSteps = [
        { freq: 349.23, delay: 0.00, dur: 0.22, g: 0.12 }, // F4
        { freq: 440.00, delay: 0.08, dur: 0.22, g: 0.13 }, // A4
        { freq: 523.25, delay: 0.16, dur: 0.24, g: 0.14 }, // C5
        { freq: 698.46, delay: 0.24, dur: 0.26, g: 0.16 }, // F5
      ];
      fanfareSteps.forEach(({ freq, delay, dur, g }) => {
        playTone({ freq, type: "triangle", startTime: now + delay, duration: dur, attack: 0.015, gainVal: g });
        playTone({ freq: freq * 2, type: "sine", startTime: now + delay, duration: dur * 0.7, attack: 0.01, gainVal: g * 0.4 });
      });

      // 3. Sustained Power Chord Arrival (F5 + A5 + C6)
      const powerChord = [
        { freq: 349.23, type: "sawtooth", g: 0.08 }, // F4
        { freq: 698.46, type: "triangle", g: 0.15 }, // F5
        { freq: 880.00, type: "sine",     g: 0.14 }, // A5
        { freq: 1046.50, type: "sine",    g: 0.13 }  // C6
      ];
      powerChord.forEach(({ freq, type, g }) => {
        playTone({ freq, type, startTime: now + 0.32, duration: 1.1, attack: 0.025, gainVal: g });
      });

      // 4. Shimmering Celesta Sparkles
      const sparkles = [1396.91, 1760.00, 2093.00]; // F6, A6, C7
      sparkles.forEach((freq, i) => {
        playTone({ freq, type: "sine", startTime: now + 0.42 + i * 0.08, duration: 0.5, attack: 0.005, gainVal: 0.06 });
      });

    } else if (tier === "explorer") {
      // ════════════════════════════════════════════════════════════════════
      // 🌿 TIER 2: EXPLORER — CHEERFUL MARIMBA CHIME & CRYSTAL HARMONICS
      // ════════════════════════════════════════════════════════════════════

      // Warm 4-note ascending chord progression (A4 -> C#5 -> E5 -> A5)
      const melody = [
        { freq: 440.00, delay: 0.00, dur: 0.35, g: 0.12 }, // A4
        { freq: 554.37, delay: 0.09, dur: 0.38, g: 0.13 }, // C#5
        { freq: 659.25, delay: 0.18, dur: 0.42, g: 0.14 }, // E5
        { freq: 880.00, delay: 0.27, dur: 0.65, g: 0.16 }, // A5 (accent ring)
      ];

      melody.forEach(({ freq, delay, dur, g }) => {
        // Fundamental
        playTone({ freq, type: "sine", startTime: now + delay, duration: dur, attack: 0.01, gainVal: g });
        // Metallic bell harmonic overtone
        playTone({ freq: freq * 2.756, type: "sine", startTime: now + delay, duration: dur * 0.45, attack: 0.005, gainVal: g * 0.3 });
      });

      // Light crystal tail sparkle
      playTone({ freq: 1318.51, type: "sine", startTime: now + 0.38, duration: 0.45, attack: 0.005, gainVal: 0.07 });

    } else {
      // ════════════════════════════════════════════════════════════════════
      // 🔹 TIER 1: NEWBIE — CRISP, FRIENDLY DOUBLE-PING UI POP
      // ════════════════════════════════════════════════════════════════════

      // Note 1: Friendly starter blip (G5 783.99Hz)
      playTone({ freq: 783.99, type: "sine", startTime: now, duration: 0.18, attack: 0.008, gainVal: 0.11 });
      playTone({ freq: 1567.98, type: "triangle", startTime: now, duration: 0.10, attack: 0.005, gainVal: 0.03 });

      // Note 2: Bright confirming pop (C6 1046.50Hz)
      playTone({ freq: 1046.50, type: "sine", startTime: now + 0.09, duration: 0.28, attack: 0.008, gainVal: 0.13 });
      playTone({ freq: 2093.00, type: "triangle", startTime: now + 0.09, duration: 0.15, attack: 0.005, gainVal: 0.04 });
    }

    setTimeout(() => {
      if (ctx.state !== "closed") ctx.close();
    }, 2800);
  } catch (e) {
    // Audio autoplay restrictions are safe to ignore silently
  }
}

/**
 * Helper to draw a 5-pointed star on canvas
 */
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

/**
 * Helper to draw a diamond on canvas
 */
function drawDiamond(ctx, cx, cy, size) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.7, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.7, cy);
  ctx.closePath();
  ctx.fill();
}

/**
 * Ephemeral HTML5 Canvas Particle Explosion with tier-specific dynamics
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
  
  // Tier-specific particle counts, velocities, and physics
  let particleCount = 26;
  let speedMultiplier = 0.85;
  let gravity = 0.26;
  let DURATION_MS = 1100;

  if (tier === "legendary") {
    particleCount = 125;
    speedMultiplier = 1.55;
    gravity = 0.16;
    DURATION_MS = 2500;
  } else if (tier === "contributor") {
    particleCount = 80;
    speedMultiplier = 1.25;
    gravity = 0.19;
    DURATION_MS = 1900;
  } else if (tier === "explorer") {
    particleCount = 50;
    speedMultiplier = 1.05;
    gravity = 0.22;
    DURATION_MS = 1500;
  }

  const particles = [];
  const shockwaves = [];
  const originX = width / 2;
  const originY = height / 2 - 40;

  // Add initial expanding energy shockwave for higher tiers
  if (tier === "legendary" || tier === "contributor") {
    shockwaves.push({
      x: originX,
      y: originY,
      radius: 5,
      maxRadius: tier === "legendary" ? 220 : 150,
      color: tier === "legendary" ? "#fbbf24" : "#a78bfa",
      lineWidth: tier === "legendary" ? 6 : 4,
      alpha: 1
    });
  }

  function spawnParticles(count, ox, oy, speedMul, isSecondary = false) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (Math.random() * 9 + 4) * speedMul;
      
      let shape = "circle";
      const rand = Math.random();
      if (tier === "legendary") {
        shape = rand > 0.55 ? "star" : (rand > 0.3 ? "diamond" : (rand > 0.15 ? "ribbon" : "circle"));
      } else if (tier === "contributor") {
        shape = rand > 0.6 ? "star" : (rand > 0.35 ? "ribbon" : (rand > 0.15 ? "diamond" : "circle"));
      } else if (tier === "explorer") {
        shape = rand > 0.5 ? "rect" : (rand > 0.25 ? "diamond" : "circle");
      } else {
        shape = rand > 0.5 ? "circle" : "rect";
      }

      particles.push({
        x: ox,
        y: oy,
        vx: Math.cos(angle) * speed * (Math.random() * 1.5 + 0.5),
        vy: Math.sin(angle) * speed * (Math.random() * 1.5 + 0.5) - (tier === "legendary" ? (isSecondary ? 5.5 : 4.5) : (tier === "contributor" ? 3.5 : 2)),
        size: (Math.random() * 8 + 4) * (tier === "legendary" ? 1.25 : 1),
        color: palette[Math.floor(Math.random() * palette.length)],
        shape,
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 14,
        rotX: Math.random() * Math.PI,
        rotXSpeed: Math.random() * 0.15 + 0.05,
        rotY: Math.random() * Math.PI,
        rotYSpeed: Math.random() * 0.15 + 0.05,
        twinklePhase: Math.random() * Math.PI * 2,
        gravity,
        drag: tier === "legendary" ? 0.975 : (tier === "contributor" ? 0.97 : 0.96),
        alpha: 1
      });
    }
  }

  // Primary burst
  spawnParticles(particleCount, originX, originY, speedMultiplier);

  // Secondary firework burst for Legendary at t = 340ms
  let secondaryTriggered = false;

  let animationFrameId;
  const startTime = performance.now();

  function render(time) {
    const elapsed = time - startTime;
    ctx.clearRect(0, 0, width, height);

    // Trigger secondary fireworks burst for legendary
    if (tier === "legendary" && !secondaryTriggered && elapsed > 340) {
      secondaryTriggered = true;
      spawnParticles(35, originX, originY - 60, 1.35, true);
      shockwaves.push({
        x: originX,
        y: originY - 60,
        radius: 5,
        maxRadius: 180,
        color: "#fef08a",
        lineWidth: 4,
        alpha: 0.9
      });
    }

    // Render expanding shockwaves
    for (let sw of shockwaves) {
      if (sw.alpha > 0.01) {
        sw.radius += (sw.maxRadius - sw.radius) * 0.12;
        sw.alpha *= 0.91;
        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = sw.color;
        ctx.lineWidth = sw.lineWidth;
        ctx.globalAlpha = sw.alpha;
        ctx.stroke();
        ctx.restore();
      }
    }

    let aliveCount = 0;

    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= p.drag;
      p.vy = p.vy * p.drag + p.gravity;
      p.rotation += p.rotSpeed;
      p.rotX += p.rotXSpeed;
      p.rotY += p.rotYSpeed;
      p.twinklePhase += 0.15;
      
      const baseAlpha = Math.max(0, 1 - (elapsed / DURATION_MS));
      let currentAlpha = baseAlpha;
      if (p.shape === "star" && (tier === "legendary" || tier === "contributor")) {
        currentAlpha = baseAlpha * (0.65 + 0.35 * Math.sin(p.twinklePhase));
      }
      p.alpha = currentAlpha;

      if (p.alpha > 0.01) {
        aliveCount++;
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);

        // 3D perspective flip scaling
        const scaleX = Math.cos(p.rotX);
        const scaleY = Math.sin(p.rotY);
        ctx.scale(Math.abs(scaleX) < 0.1 ? 0.1 : scaleX, Math.abs(scaleY) < 0.1 ? 0.1 : scaleY);

        if (p.shape === "star") {
          drawStar(ctx, 0, 0, 5, p.size, p.size / 2.2);
        } else if (p.shape === "diamond") {
          drawDiamond(ctx, 0, 0, p.size);
        } else if (p.shape === "ribbon") {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size * 1.4, p.size * 0.45);
        } else if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
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
  const isProfilePage = window.location.pathname.includes("profile.html") || 
                        window.location.pathname.endsWith("/profile") || 
                        document.getElementById("badges-section") !== null;

  // Remove any existing celebration modal
  const existing = document.getElementById("badge-celebration-modal");
  if (existing) existing.remove();

  // Tier-specific decorative elements
  let extraDecorativeHTML = "";
  if (badge.tier === "legendary") {
    extraDecorativeHTML = `
      <div class="badge-godrays" aria-hidden="true"></div>
      <div class="badge-crown-crest" aria-hidden="true">👑</div>
      <div class="badge-orbit-sparkle s1" aria-hidden="true">✦</div>
      <div class="badge-orbit-sparkle s2" aria-hidden="true">★</div>
      <div class="badge-orbit-sparkle s3" aria-hidden="true">✦</div>
      <div class="badge-orbit-sparkle s4" aria-hidden="true">✨</div>
    `;
  } else if (badge.tier === "contributor") {
    extraDecorativeHTML = `
      <div class="badge-rotating-aura" aria-hidden="true"></div>
      <div class="badge-orbit-sparkle s1" aria-hidden="true">✦</div>
      <div class="badge-orbit-sparkle s2" aria-hidden="true">✦</div>
    `;
  } else if (badge.tier === "explorer") {
    extraDecorativeHTML = `
      <div class="badge-glow-ring" aria-hidden="true"></div>
    `;
  }

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
        <div class="badge-modal-pills-group">
          <span class="badge-modal-tier-pill" style="background: ${tierMeta.bg}; color: ${tierMeta.primary}; border: 1px solid ${tierMeta.border};">
            <span class="material-symbols-outlined text-xs">military_tech</span> ${tierMeta.label} Badge
          </span>
          <span class="badge-modal-xp-pill" style="background: #f8fafc; border: 1px solid #e2e8f0; color: #0f172a;">
            +${badge.xp || 25} XP
          </span>
        </div>
      </div>

      <!-- 3D Emblem Container -->
      <div class="badge-modal-emblem-wrap tier-${badge.tier}">
        ${extraDecorativeHTML}
        <div class="badge-modal-emblem tier-${badge.tier}">
          <div class="badge-emblem-sheen"></div>
          <span class="material-symbols-outlined badge-modal-icon">${badge.icon}</span>
        </div>
        <!-- Tactile Graffiti Stamp -->
        <div class="badge-graffiti-stamp tier-${badge.tier}">
          <span>${tierMeta.stampText}</span>
        </div>
      </div>

      <div class="badge-modal-content">
        <h3 class="badge-modal-title tier-${badge.tier}">${badge.label}</h3>
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
        ${!isProfilePage ? `
        <a href="/profile.html#badge-${badge.key}" class="badge-modal-btn primary-btn tier-${badge.tier}" id="badge-view-profile-btn">
          <span>View in Profile</span>
          <span class="material-symbols-outlined text-sm">arrow_forward</span>
        </a>
        ` : ""}
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
