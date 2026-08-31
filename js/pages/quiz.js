import "../../src/style.css";
import { isAuthenticated } from "../lib/session.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { submitSurvey, getSurveyQuestions, getSurveyResult } from "../api/survey.js";
import { initI18n, getLang, setLang, t, applyTranslation } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";
import { triggerBadgeCelebration } from "../components/badgeCelebration.js";

const HARDCODED_QUESTIONS = [
  {
    id: 1,
    category: "Academic Stage",
    categoryKey: "academic_stage",
    icon: "school",
    question: "What academic year are you currently in?",
    answers: [
      { label: "1st Year (Freshman - Exploring university life & opportunities)", weights: { dynamic_explorer: 3, community_leader: 2 } },
      { label: "2nd Year (Sophomore - Diving into major courses & student clubs)", weights: { dynamic_explorer: 2, tech_builder: 2, creative_innovator: 2 } },
      { label: "3rd Year (Junior - Building skills & practical projects)", weights: { career_strategist: 3, tech_builder: 2, deep_learner: 2 } },
      { label: "Final Year / Graduate (Senior - Resume, internship & career launch)", weights: { career_strategist: 4, tech_builder: 1 } },
    ],
  },
  {
    id: 2,
    category: "Core Interests",
    categoryKey: "core_interests",
    icon: "interests",
    question: "What is your primary field of interest or passion?",
    answers: [
      { label: "Information Technology, Software Engineering & AI", weights: { tech_builder: 6, deep_learner: 2 }, types: ["hackathon", "tech_talk", "coding_session"] },
      { label: "Business, Entrepreneurship & Marketing", weights: { career_strategist: 6, community_leader: 2 }, types: ["seminar", "networking", "workshop"] },
      { label: "Design, Fine Arts, Media & Content Creation", weights: { creative_innovator: 6, dynamic_explorer: 1 }, types: ["festival", "art_event", "music_show"] },
      { label: "Social Sciences, Languages, Humanities & Psychology", weights: { changemaker: 5, community_leader: 3 }, types: ["community_event", "workshop"] },
      { label: "Healthcare, Fitness & Sports", weights: { changemaker: 4, dynamic_explorer: 4 }, types: ["community_event", "festival"] },
      { label: "Natural Sciences & Academic Research", weights: { deep_learner: 6, tech_builder: 1 }, types: ["seminar", "tech_talk"] },
    ],
  },
  {
    id: 3,
    category: "Activity Preferences",
    categoryKey: "activity_pref",
    icon: "favorite",
    question: "What type of activity inspires you the most?",
    answers: [
      { label: "Intensive masterclasses / Practical hands-on workshops", weights: { deep_learner: 4, career_strategist: 3 }, types: ["workshop", "seminar"] },
      { label: "Academic contests / Hackathons & Case challenges", weights: { tech_builder: 5, career_strategist: 3 }, types: ["hackathon", "coding_session"] },
      { label: "Arts festivals, Music concerts & Creative exhibitions", weights: { creative_innovator: 6, dynamic_explorer: 2 }, types: ["festival", "art_event", "music_show"] },
      { label: "Student club meetups & Social networking gatherings", weights: { community_leader: 6, dynamic_explorer: 2 }, types: ["networking", "community_event"] },
      { label: "Volunteering, Community charity & Environmental campaigns", weights: { changemaker: 6 }, types: ["volunteer", "charity", "community_event"] },
    ],
  },
  {
    id: 4,
    category: "Team Role",
    categoryKey: "team_role",
    icon: "badge",
    question: "In a team or project, which role do you feel most confident in?",
    answers: [
      { label: "Team Leader / Project planner & Coordinator", weights: { community_leader: 6, career_strategist: 3 } },
      { label: "Technical Specialist / Core problem solver & Builder", weights: { tech_builder: 6, deep_learner: 3 } },
      { label: "Idea Generator / Creative designer & Content creator", weights: { creative_innovator: 6, dynamic_explorer: 2 } },
      { label: "Team Connector / Member care & Supportive facilitator", weights: { changemaker: 5, community_leader: 4 } },
    ],
  },
  {
    id: 5,
    category: "Learning Style",
    categoryKey: "learning_style",
    icon: "auto_stories",
    question: "How do you recharge and learn most effectively?",
    answers: [
      { label: "Engaging in lively group debates and discussions", weights: { community_leader: 5, dynamic_explorer: 2 } },
      { label: "Deep solo study in a quiet, focused environment", weights: { deep_learner: 6, tech_builder: 2 } },
      { label: "Learning by doing through hands-on project work", weights: { tech_builder: 4, creative_innovator: 3, career_strategist: 3 } },
      { label: "Listening to expert insights and systematic note-taking", weights: { deep_learner: 4, career_strategist: 3 } },
    ],
  },
  {
    id: 6,
    category: "Key Goals",
    categoryKey: "key_goals",
    icon: "flag",
    question: "What is your primary goal from extracurricular activities right now?",
    answers: [
      { label: "Enhancing my CV for internships and job opportunities", weights: { career_strategist: 6 }, types: ["workshop", "seminar", "hackathon"] },
      { label: "Expanding my network and finding like-minded friends", weights: { community_leader: 6, dynamic_explorer: 2 }, types: ["networking", "community_event"] },
      { label: "Sharpening soft skills and boosting public confidence", weights: { community_leader: 4, changemaker: 3 }, types: ["workshop", "networking"] },
      { label: "Unwinding, relieving academic stress and having fun", weights: { dynamic_explorer: 5, creative_innovator: 3 }, types: ["festival", "music_show"] },
      { label: "Exploring my hidden potential and trying new things", weights: { dynamic_explorer: 6, creative_innovator: 3 }, types: ["festival", "workshop"] },
    ],
  },
  {
    id: 7,
    category: "Main Obstacle",
    categoryKey: "main_obstacle",
    icon: "help_center",
    question: "What is your biggest hesitation when considering joining an event?",
    answers: [
      { label: "Hesitant to go solo / Feeling shy in large unfamiliar crowds", weights: { deep_learner: 2, tech_builder: 1 }, obstacle: "solo_shy" },
      { label: "Packed course schedules, assignments and tight deadlines", weights: { career_strategist: 2, deep_learner: 1 }, obstacle: "busy_deadline" },
      { label: "Imposter syndrome / Feeling underqualified or inexperienced", weights: { deep_learner: 2, tech_builder: 1 }, obstacle: "imposter_syndrome" },
      { label: "Commute distance or registration expenses", weights: { changemaker: 2, dynamic_explorer: 1 }, obstacle: "commute_cost" },
      { label: "Haven't found events with truly practical value", weights: { creative_innovator: 2, career_strategist: 2 }, obstacle: "quality_content" },
    ],
  },
  {
    id: 8,
    category: "Environment",
    categoryKey: "environment",
    icon: "location_on",
    question: "Which event format is most convenient and comfortable for you?",
    answers: [
      { label: "Right on campus", weights: { community_leader: 2, changemaker: 1 }, pref: "on_campus" },
      { label: "Off-campus at city venues or corporate headquarters", weights: { career_strategist: 3 }, pref: "off_campus" },
      { label: "Virtual / Online (Zoom, Google Meet)", weights: { tech_builder: 3, deep_learner: 2 }, pref: "online" },
      { label: "Flexible, as long as the topic is engaging", weights: { dynamic_explorer: 3, creative_innovator: 2 }, pref: "flexible" },
    ],
  },
  {
    id: 9,
    category: "Schedule",
    categoryKey: "schedule",
    icon: "schedule",
    question: "When are you most available to fully participate in activities?",
    answers: [
      { label: "Weekend mornings (Saturday / Sunday)", weights: { dynamic_explorer: 1, changemaker: 1 }, time: "weekend_morning" },
      { label: "Weekend afternoons", weights: { dynamic_explorer: 1, creative_innovator: 1 }, time: "weekend_afternoon" },
      { label: "Weekday evenings (6PM - 9PM)", weights: { tech_builder: 1, deep_learner: 1 }, time: "weekday_evening" },
      { label: "Short intervals between lecture sessions", weights: { career_strategist: 1 }, time: "short_intervals" },
    ],
  },
  {
    id: 10,
    category: "Key Motivator",
    categoryKey: "key_motivator",
    icon: "bolt",
    question: "What factor motivates you to register immediately?",
    answers: [
      { label: "Close friends or peers are going along", weights: { community_leader: 4, dynamic_explorer: 2 }, motivator: "friends" },
      { label: "Renowned guest speakers and industry-leading mentors", weights: { deep_learner: 4, career_strategist: 4 }, motivator: "speakers" },
      { label: "Job/internship opportunities, recommendation letters, or prizes", weights: { career_strategist: 5, tech_builder: 2 }, motivator: "career_boost" },
      { label: "Exciting, cutting-edge and curiosity-sparking topics", weights: { creative_innovator: 5, dynamic_explorer: 3 }, motivator: "novel_topic" },
      { label: "Free entry with valuable certificates and cool swags", weights: { changemaker: 3, dynamic_explorer: 3 }, motivator: "free_perks" },
    ],
  },
];

let QUESTIONS = [...HARDCODED_QUESTIONS];

const PERSONA_CONFIGS = {
  tech_builder: {
    key: "tech_builder",
    icon: "terminal",
    solidColor: "#2563eb",
    textColor: "#2563eb",
    bgSoft: "#eff6ff",
    types: ["Hackathon", "Tech Talk", "Coding Workshop", "Seminar"],
  },
  community_leader: {
    key: "community_leader",
    icon: "groups",
    solidColor: "#7c3aed",
    textColor: "#7c3aed",
    bgSoft: "#f5f3ff",
    types: ["Networking", "Community Event", "Leadership Workshop", "Seminar"],
  },
  creative_innovator: {
    key: "creative_innovator",
    icon: "palette",
    solidColor: "#ea580c",
    textColor: "#ea580c",
    bgSoft: "#fff7ed",
    types: ["Art Festival", "Design Workshop", "Music Show", "Exhibition"],
  },
  career_strategist: {
    key: "career_strategist",
    icon: "work_outline",
    solidColor: "#0284c7",
    textColor: "#0284c7",
    bgSoft: "#f0f9ff",
    types: ["Career Talk", "Case Challenge", "Company Tour", "Industry Workshop"],
  },
  deep_learner: {
    key: "deep_learner",
    icon: "psychology",
    solidColor: "#4f46e5",
    textColor: "#4f46e5",
    bgSoft: "#eef2ff",
    types: ["Research Seminar", "Masterclass", "Academic Conference", "Study Group"],
  },
  changemaker: {
    key: "changemaker",
    icon: "volunteer_activism",
    solidColor: "#059669",
    textColor: "#059669",
    bgSoft: "#ecfdf5",
    types: ["Volunteer Campaign", "Charity Event", "Environmental Project", "Community Forum"],
  },
  dynamic_explorer: {
    key: "dynamic_explorer",
    icon: "explore",
    solidColor: "#e11d48",
    textColor: "#e11d48",
    bgSoft: "#fff1f2",
    types: ["Cultural Festival", "Hands-on Workshop", "Club Fair", "Social Gathering"],
  },
};

let currentQuestion = 0;
let answers = [];
let lastResultData = null;

let pendingExitUrl = null;

if (!isAuthenticated()) {
  window.location.replace("/login.html");
} else {
  document.body.style.display = "";
}

document.addEventListener("DOMContentLoaded", async () => {
  await initI18n();
  initLanguageSwitcher();
  initExitInterceptors();
  await initChatbot();
  loadFooter();
  await loadQuestions();
  await checkExistingResult();
  initQuiz();
});

function isQuizInProgress() {
  const qScreen = document.getElementById("quizQuestion");
  return qScreen && !qScreen.classList.contains("hidden");
}

function openExitModal(targetUrl) {
  pendingExitUrl = targetUrl;
  const modal = document.getElementById("quizExitModal");
  if (!modal) {
    window.location.href = targetUrl;
    return;
  }
  const content = modal.querySelector(".bg-white");
  modal.hidden = false;
  requestAnimationFrame(() => {
    modal.classList.remove("opacity-0", "pointer-events-none");
    if (content) {
      content.classList.remove("scale-95");
      content.classList.add("scale-100");
    }
  });
}

function closeExitModal() {
  const modal = document.getElementById("quizExitModal");
  if (!modal) return;
  const content = modal.querySelector(".bg-white");
  modal.classList.add("opacity-0", "pointer-events-none");
  if (content) {
    content.classList.remove("scale-100");
    content.classList.add("scale-95");
  }
  setTimeout(() => {
    if (modal.classList.contains("opacity-0")) {
      modal.hidden = true;
    }
  }, 300);
  pendingExitUrl = null;
}

function initExitInterceptors() {
  const brandLink = document.getElementById("quizBrandLink");
  const exitBtn = document.getElementById("quizExitBtn");
  const cancelBtn = document.getElementById("quizExitCancelBtn");
  const confirmBtn = document.getElementById("quizExitConfirmBtn");
  const modal = document.getElementById("quizExitModal");

  brandLink?.addEventListener("click", (e) => {
    if (isQuizInProgress()) {
      e.preventDefault();
      openExitModal("./index.html");
    }
  });

  exitBtn?.addEventListener("click", (e) => {
    if (isQuizInProgress()) {
      e.preventDefault();
      openExitModal("./profile.html");
    }
  });

  cancelBtn?.addEventListener("click", closeExitModal);

  confirmBtn?.addEventListener("click", () => {
    const url = pendingExitUrl || "./profile.html";
    window.location.href = url;
  });

  modal?.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeExitModal();
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (isQuizInProgress()) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
}

function initLanguageSwitcher() {
  const btn = document.getElementById("quizLangToggleBtn");
  const text = document.getElementById("quizLangText");
  if (text) text.textContent = getLang().toUpperCase();

  btn?.addEventListener("click", async () => {
    const nextLang = getLang() === "en" ? "vi" : "en";
    await setLang(nextLang);
    if (text) text.textContent = nextLang.toUpperCase();
  });

  window.addEventListener("language-changed", (e) => {
    const lang = (e.detail?.lang || getLang()).toUpperCase();
    if (text) text.textContent = lang;

    // Update start screen button
    const startBtn = document.getElementById("quizStartBtn");
    if (startBtn) {
      const isRetake = startBtn.dataset.isRetake === "true";
      startBtn.innerHTML = isRetake
        ? `<span class="material-symbols-outlined">refresh</span> <span data-i18n="quiz.retake_btn">${t("quiz.retake_btn")}</span>`
        : `<span class="material-symbols-outlined">play_arrow</span> <span data-i18n="quiz.start_btn">${t("quiz.start_btn")}</span>`;
    }

    // Re-render question if question screen is active
    const qScreen = document.getElementById("quizQuestion");
    if (qScreen && !qScreen.classList.contains("hidden")) {
      renderQuestion();
    }

    // Re-render results if result screen is active
    const rScreen = document.getElementById("quizResult");
    if (rScreen && !rScreen.classList.contains("hidden") && lastResultData) {
      renderResults(lastResultData.personaKey, lastResultData.clientEval);
    }
  });
}

async function checkExistingResult() {
  if (!isAuthenticated()) return;
  const startBtn = document.getElementById("quizStartBtn");
  if (!startBtn) return;

  try {
    const data = await getSurveyResult();
    if (data?.scores || data?.personaKey) {
      startBtn.dataset.isRetake = "true";
      startBtn.innerHTML = `<span class="material-symbols-outlined">refresh</span> <span data-i18n="quiz.retake_btn">${t("quiz.retake_btn")}</span>`;
    }
  } catch {
    // No existing result
  }
}

async function loadQuestions() {
  try {
    const data = await getSurveyQuestions();
    if (data?.questions?.length === HARDCODED_QUESTIONS.length) {
      QUESTIONS = HARDCODED_QUESTIONS.map((hq, idx) => {
        const remoteQ = data.questions[idx];
        return {
          ...hq,
          question: remoteQ?.question || hq.question,
          answers: hq.answers.map((ha, aIdx) => ({
            ...ha,
            label: remoteQ?.answers?.[aIdx]?.label || ha.label,
          })),
        };
      });
    }
  } catch {
    console.log("Using hardcoded questions");
  }
}

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) {
    container.innerHTML = html;
    applyTranslation(container);
  }
}

function initQuiz() {
  document.getElementById("quizStartBtn")?.addEventListener("click", startQuiz);
  document.getElementById("quizNextBtn")?.addEventListener("click", nextQuestion);
  document.getElementById("quizPrevBtn")?.addEventListener("click", prevQuestion);
}

function showScreen(id) {
  document.querySelectorAll(".quiz-card").forEach((c) => c.classList.add("hidden"));
  document.getElementById(id)?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startQuiz() {
  currentQuestion = 0;
  answers = new Array(QUESTIONS.length).fill(null).map(() => []);
  lastResultData = null;
  showScreen("quizQuestion");
  renderQuestion();
}

function getCategoryColor(categoryKey) {
  const colors = {
    academic_stage: "#23499b",
    core_interests: "#8B5CF6",
    activity_pref: "#F59E0B",
    team_role: "#06B6D4",
    learning_style: "#6366F1",
    key_goals: "#3B82F6",
    main_obstacle: "#EF4444",
    environment: "#10B981",
    schedule: "#059669",
    key_motivator: "#EC4899",
  };
  return colors[categoryKey] || "#23499b";
}

function renderQuestion() {
  const q = QUESTIONS[currentQuestion];
  const qKey = `q${q.id}`;
  const rawTranslatedQ = t(`quiz.${qKey}.question`);
  const translatedQuestion = (rawTranslatedQ && rawTranslatedQ !== `quiz.${qKey}.question`) ? rawTranslatedQ : q.question;
  const color = getCategoryColor(q.categoryKey);

  const numEl = document.getElementById("questionNumber");
  if (numEl) {
    numEl.textContent = `${t("quiz.question")} ${currentQuestion + 1} / ${QUESTIONS.length}`;
  }
  
  const categoryEl = document.getElementById("questionCategory");
  const transCategory = t("quiz.categories." + q.categoryKey, {}, q.category);
  if (categoryEl) {
    categoryEl.style.background = color + "15";
    categoryEl.style.color = color;
    categoryEl.innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${q.icon || "help"}</span> ${transCategory}`;
  }

  const title = document.getElementById("questionTitle");
  if (title) {
    title.textContent = translatedQuestion;
    title.style.background = `linear-gradient(135deg, #1e293b, #334155)`;
    title.style.webkitBackgroundClip = "text";
    title.style.webkitTextFillColor = "transparent";
    title.style.backgroundClip = "text";
  }

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const bar = document.getElementById("quizProgressBar");
  if (bar) {
    bar.style.width = `${progress}%`;
    bar.setAttribute("aria-valuenow", currentQuestion + 1);
  }
  const progText = document.getElementById("quizProgressText");
  if (progText) {
    progText.textContent = `${currentQuestion + 1} / ${QUESTIONS.length}`;
  }

  const container = document.getElementById("quizAnswers");
  if (!container) return;
  container.innerHTML = "";
  const selected = answers[currentQuestion] || [];
  
  const hintDiv = document.createElement("div");
  hintDiv.style.cssText = "font-size:12px;color:#64748b;margin-bottom:12px;font-weight:500;display:flex;align-items:center;gap:4px;";
  hintDiv.innerHTML = `<span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">checklist</span> ${t("quiz.multi_select", "Select all that apply")}`;
  container.appendChild(hintDiv);

  const translatedAnswers = t(`quiz.${qKey}.answers`);
  q.answers.forEach((answer, idx) => {
    const isSelected = selected.includes(idx);
    const translatedLabel = Array.isArray(translatedAnswers) ? translatedAnswers[idx] : undefined;
    const displayLabel = translatedLabel || answer.label;
    
    const div = document.createElement("div");
    div.className = `quiz-answer-btn ${isSelected ? "selected" : ""}`;
    div.innerHTML = `
      <span class="quiz-answer-checkbox">${
        isSelected
          ? '<span class="material-symbols-outlined" style="font-size:20px;color:#23499b;">check_box</span>'
          : '<span class="material-symbols-outlined" style="font-size:20px;color:#94a3b8;">check_box_outline_blank</span>'
      }</span>
      <span class="quiz-answer-text">${displayLabel}</span>
    `;
    div.addEventListener("click", () => selectAnswer(idx));
    div.dataset.index = idx;
    container.appendChild(div);
  });

  updateNavButtons();
}

function selectAnswer(index) {
  const current = answers[currentQuestion] || [];
  const idx = current.indexOf(index);
  if (idx > -1) {
    current.splice(idx, 1);
  } else {
    current.push(index);
  }
  answers[currentQuestion] = current;
  renderQuestion();
  const nextBtn = document.getElementById("quizNextBtn");
  if (nextBtn) {
    nextBtn.disabled = current.length === 0;
  }
}

function nextQuestion() {
  const current = answers[currentQuestion] || [];
  if (current.length === 0) return;
  if (currentQuestion === QUESTIONS.length - 1) {
    finishQuiz();
    return;
  }
  currentQuestion++;
  renderQuestion();
}

function prevQuestion() {
  if (currentQuestion === 0) return;
  currentQuestion--;
  renderQuestion();
}

function updateNavButtons() {
  const prevBtn = document.getElementById("quizPrevBtn");
  const nextBtn = document.getElementById("quizNextBtn");
  if (!prevBtn || !nextBtn) return;

  prevBtn.classList.toggle("hidden", currentQuestion === 0);

  if (currentQuestion === QUESTIONS.length - 1) {
    nextBtn.innerHTML = `<span class="material-symbols-outlined">auto_awesome</span> ${t("quiz.finish")}`;
  } else {
    nextBtn.innerHTML = `${t("quiz.next")} <span class="material-symbols-outlined">arrow_forward</span>`;
  }

  nextBtn.disabled = !answers[currentQuestion] || answers[currentQuestion].length === 0;
}

function evaluatePersonaClientSide(userAnswers) {
  const weights = {
    tech_builder: 0,
    community_leader: 0,
    creative_innovator: 0,
    career_strategist: 0,
    deep_learner: 0,
    changemaker: 0,
    dynamic_explorer: 0,
  };

  const collectedTypes = [];

  userAnswers.forEach((selectedIndices, qIdx) => {
    const q = QUESTIONS[qIdx];
    if (!q) return;
    selectedIndices.forEach((ansIdx) => {
      const ans = q.answers[ansIdx];
      if (!ans) return;
      if (ans.weights) {
        Object.entries(ans.weights).forEach(([key, val]) => {
          weights[key] = (weights[key] || 0) + val;
        });
      }
      if (ans.types) {
        collectedTypes.push(...ans.types);
      }
    });
  });

  const sorted = Object.entries(weights).sort((a, b) => b[1] - a[1]);
  const primaryKey = sorted[0]?.[0] || "dynamic_explorer";
  return {
    personaKey: primaryKey,
    weights,
    collectedTypes: [...new Set(collectedTypes)],
  };
}

async function finishQuiz() {
  showScreen("quizResult");
  const resultContainer = document.getElementById("quizResult");
  if (resultContainer) {
    resultContainer.innerHTML = `
      <div class="quiz-loading-result">
        <div class="quiz-spinner"></div>
        <p style="font-size:14px;color:#475569;font-weight:600;">${t("quiz.analyzing")}</p>
      </div>
    `;
  }

  const clientEval = evaluatePersonaClientSide(answers);
  const personaKey = clientEval.personaKey;
  lastResultData = { personaKey, clientEval };

  const answerData = answers.map((selectedIndices, qIndex) => ({
    questionIndex: qIndex,
    answerIndex: selectedIndices,
  }));

  if (isAuthenticated()) {
    const check = canPerformAction("submitSurvey");
    if (check.allowed) {
      markActionPerformed("submitSurvey");
      try {
        await submitSurvey(answerData);
        try {
          const { generateProfile } = await import("../api/profile.js");
          await generateProfile(answerData);
        } catch (profileErr) {
          console.warn("Profile generation failed:", profileErr);
        }
      } catch (err) {
        console.warn("Survey submission failed:", err);
      }
    }
  }

  localStorage.setItem("springwave_quiz_completed", "true");
  localStorage.setItem("springwave_persona_key", personaKey);

  setTimeout(() => renderResults(personaKey, clientEval), 600);
}

function renderResults(personaKey, clientEval) {
  lastResultData = { personaKey, clientEval };
  const config = PERSONA_CONFIGS[personaKey] || PERSONA_CONFIGS.dynamic_explorer;
  const personaI18n = t(`quiz.personas.${personaKey}`) || {};
  const personaTitle = personaI18n.title || personaKey;
  const personaTagline = personaI18n.tagline || "";
  const strengths = Array.isArray(personaI18n.strengths) ? personaI18n.strengths : [];
  const advice = personaI18n.advice || "";

  // Normalize activity types using t("quiz.types.<key>")
  const rawTypes = config.types || ["workshop", "seminar", "networking"];
  const types = rawTypes.map(typeStr => {
    const key = typeStr.toLowerCase().replace(/[\s-]+/g, "_");
    return t(`quiz.types.${key}`, {}, typeStr);
  });

  const resultContainer = document.getElementById("quizResult");
  if (!resultContainer) return;
  resultContainer.innerHTML = `
    <!-- Persona Hero Card -->
    <div class="quiz-persona-card">
      <div class="quiz-persona-badge">
        <span class="material-symbols-outlined" style="font-size:14px;color:#475569;">auto_awesome</span>
        <span>${t("quiz.persona_badge")}</span>
      </div>
      <div class="quiz-persona-icon-box" style="background:${config.solidColor};">
        <span class="material-symbols-outlined">${config.icon}</span>
      </div>
      <h1 class="quiz-persona-name">${personaTitle}</h1>
      <p class="quiz-persona-motto">${personaTagline}</p>
    </div>

    <!-- Strengths Section -->
    ${
      strengths.length > 0
        ? `
      <div class="quiz-block">
        <div class="quiz-block-header">
          <span class="material-symbols-outlined" style="color:#10b981;">verified</span>
          <span>${t("quiz.strengths_title")}</span>
        </div>
        <div class="quiz-strength-grid">
          ${strengths
            .map(
              (s) => `
            <div class="quiz-strength-chip">
              <span class="material-symbols-outlined">check_circle</span>
              <span>${s}</span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
    `
        : ""
    }

    <!-- Personal Advice Card -->
    ${
      advice
        ? `
      <div class="quiz-advice-box">
        <div class="quiz-block-header">
          <span class="material-symbols-outlined">tips_and_updates</span>
          <span>${t("quiz.advice_title")}</span>
        </div>
        <p class="quiz-advice-text">${advice}</p>
      </div>
    `
        : ""
    }

    <!-- Pathway Section -->
    <div class="quiz-block">
      <div class="quiz-block-header">
        <span class="material-symbols-outlined" style="color:#2563eb;">route</span>
        <span>${t("quiz.suggested_activities")}</span>
      </div>
      <div class="quiz-pathway-list">
        ${types
          .map(
            (item) => `
          <span class="quiz-pathway-chip">
            <span class="material-symbols-outlined">stars</span>
            <span>${item}</span>
          </span>
        `
          )
          .join("")}
      </div>
    </div>

    <!-- Action Buttons -->
    <div style="margin-top: 24px;">
      <button class="quiz-action-primary" id="quizExploreBtn">
        <span class="material-symbols-outlined" style="font-size:20px;">explore</span>
        <span>${isAuthenticated() ? t("quiz.explore_activities") : t("quiz.register_explore")}</span>
      </button>
      <button class="quiz-action-secondary" id="quizRetakeBtn">
        <span class="material-symbols-outlined" style="font-size:18px;">replay</span>
        <span>${t("quiz.retake")}</span>
      </button>
    </div>
  `;

  document.getElementById("quizExploreBtn")?.addEventListener("click", () => {
    window.location.href = isAuthenticated() ? "/explore.html" : "/register.html";
  });

  document.getElementById("quizRetakeBtn")?.addEventListener("click", () => {
    currentQuestion = 0;
    answers = [];
    lastResultData = null;
    showScreen("quizStart");
  });

  // Trigger Achievement Celebration with Graffiti & Confetti FX
  setTimeout(() => {
    triggerBadgeCelebration("self_discovery");
  }, 450);
}

