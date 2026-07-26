import "../../src/style.css";
import { isAuthenticated } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { submitSurvey, getSurveyQuestions, getSurveyResult } from "../api/survey.js";
import { generateProfile } from "../api/profile.js";
import { t } from "../lib/i18n.js";
import { canPerformAction, markActionPerformed } from "../lib/throttle.js";

const HARDCODED_QUESTIONS = [
  {
    id: 1,
    category: "Preferences",
    question: "What type of activity do you want to join most?",
    answers: [
      { label: "Workshop / skill-sharing session", scores: { communication: 30, technical: 40, creativity: 20, socialImpact: 10 } },
      { label: "Competition / hackathon", scores: { communication: 20, technical: 50, creativity: 20, socialImpact: 10 } },
      { label: "Arts event / festival", scores: { communication: 30, technical: 10, creativity: 40, socialImpact: 20 } },
      { label: "Club / group activities", scores: { communication: 40, technical: 10, creativity: 20, socialImpact: 30 } },
      { label: "Volunteer / charity work", scores: { communication: 20, technical: 10, creativity: 20, socialImpact: 50 } },
    ],
  },
  {
    id: 2,
    category: "Interests",
    question: "Which field interests you?",
    answers: [
      { label: "Technology - Programming", scores: { communication: 10, technical: 70, creativity: 10, socialImpact: 10 } },
      { label: "Business - Entrepreneurship", scores: { communication: 30, technical: 20, creativity: 30, socialImpact: 20 } },
      { label: "Arts - Creativity", scores: { communication: 20, technical: 10, creativity: 60, socialImpact: 10 } },
      { label: "Sports - Health", scores: { communication: 20, technical: 10, creativity: 20, socialImpact: 50 } },
      { label: "Soft skills - Self development", scores: { communication: 50, technical: 10, creativity: 20, socialImpact: 20 } },
      { label: "Science - Academics", scores: { communication: 20, technical: 40, creativity: 20, socialImpact: 20 } },
    ],
  },
  {
    id: 3,
    category: "Schedule",
    question: "What time are you usually free?",
    answers: [
      { label: "Morning (8AM–12PM)", scores: { communication: 20, technical: 40, creativity: 20, socialImpact: 20 } },
      { label: "Afternoon (1PM–5PM)", scores: { communication: 30, technical: 20, creativity: 20, socialImpact: 30 } },
      { label: "Evening (6PM–10PM)", scores: { communication: 25, technical: 15, creativity: 40, socialImpact: 20 } },
      { label: "Weekends", scores: { communication: 25, technical: 15, creativity: 20, socialImpact: 40 } },
    ],
  },
  {
    id: 4,
    category: "Commitment",
    question: "How much time are you willing to commit?",
    answers: [
      { label: "1–2 hours (short, one-time event)", scores: { communication: 30, technical: 20, creativity: 30, socialImpact: 20 } },
      { label: "Half day (3–4 hours)", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
      { label: "Full day (conference, competition)", scores: { communication: 20, technical: 30, creativity: 30, socialImpact: 20 } },
      { label: "Multiple sessions (long-term workshop)", scores: { communication: 20, technical: 35, creativity: 25, socialImpact: 20 } },
    ],
  },
  {
    id: 5,
    category: "Social Style",
    question: "Do you prefer group or individual activities?",
    answers: [
      { label: "Group (working with friends)", scores: { communication: 45, technical: 10, creativity: 20, socialImpact: 25 } },
      { label: "Individual (solo experience)", scores: { communication: 10, technical: 40, creativity: 40, socialImpact: 10 } },
      { label: "No preference", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
    ],
  },
  {
    id: 6,
    category: "Goals",
    question: "What is your main goal when participating?",
    answers: [
      { label: "Learn new skills", scores: { communication: 20, technical: 40, creativity: 30, socialImpact: 10 } },
      { label: "Expand my network", scores: { communication: 50, technical: 10, creativity: 10, socialImpact: 30 } },
      { label: "Relax and have fun", scores: { communication: 20, technical: 10, creativity: 50, socialImpact: 20 } },
      { label: "Build my resume / CV", scores: { communication: 20, technical: 30, creativity: 20, socialImpact: 30 } },
      { label: "Discover my passions", scores: { communication: 20, technical: 20, creativity: 40, socialImpact: 20 } },
    ],
  },
  {
    id: 7,
    category: "Location",
    question: "Where would you like the activity to take place?",
    answers: [
      { label: "On campus", scores: { communication: 30, technical: 25, creativity: 20, socialImpact: 25 } },
      { label: "Off campus (city center, company)", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
      { label: "Online (virtual platform)", scores: { communication: 25, technical: 40, creativity: 25, socialImpact: 10 } },
      { label: "Doesn't matter", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
    ],
  },
  {
    id: 8,
    category: "Role",
    question: "What role do you want to take in the activity?",
    answers: [
      { label: "Participant", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
      { label: "Organizer / coordinator", scores: { communication: 40, technical: 15, creativity: 25, socialImpact: 20 } },
      { label: "Presenter / instructor", scores: { communication: 50, technical: 20, creativity: 20, socialImpact: 10 } },
      { label: "Supporter / volunteer", scores: { communication: 20, technical: 10, creativity: 20, socialImpact: 50 } },
    ],
  },
  {
    id: 9,
    category: "Competition",
    question: "Do you prefer competitive or social activities?",
    answers: [
      { label: "Competitive (prizes, contests)", scores: { communication: 20, technical: 40, creativity: 30, socialImpact: 10 } },
      { label: "Social (networking, sharing)", scores: { communication: 40, technical: 10, creativity: 20, socialImpact: 30 } },
      { label: "Both", scores: { communication: 30, technical: 25, creativity: 25, socialImpact: 20 } },
      { label: "No preference", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
    ],
  },
  {
    id: 10,
    category: "Motivation",
    question: "Which factor attracts you the most?",
    answers: [
      { label: "Expert / celebrity instructor", scores: { communication: 30, technical: 20, creativity: 30, socialImpact: 20 } },
      { label: "Certificate / award", scores: { communication: 20, technical: 40, creativity: 20, socialImpact: 20 } },
      { label: "Friends are joining too", scores: { communication: 40, technical: 10, creativity: 10, socialImpact: 40 } },
      { label: "Interesting, novel topic", scores: { communication: 20, technical: 20, creativity: 50, socialImpact: 10 } },
      { label: "Free or low cost", scores: { communication: 25, technical: 25, creativity: 25, socialImpact: 25 } },
    ],
  },
];

let QUESTIONS = [...HARDCODED_QUESTIONS];

const SCORE_LABELS = {
  communication: { nameKey: "quiz.score_comm", icon: "forum", color: "#3B82F6", descKey: "quiz.score_comm_desc" },
  technical: { nameKey: "quiz.score_tech", icon: "code", color: "#8B5CF6", descKey: "quiz.score_tech_desc" },
  creativity: { nameKey: "quiz.score_creative", icon: "palette", color: "#F59E0B", descKey: "quiz.score_creative_desc" },
  socialImpact: { nameKey: "quiz.score_social", icon: "volunteer_activism", color: "#10B981", descKey: "quiz.score_social_desc" },
};

function getSuggestion(primary, secondary, primaryScore, secondaryScore) {
  const primaryLabel = t(SCORE_LABELS[primary]?.nameKey) || primary;
  const secondaryLabel = t(SCORE_LABELS[secondary]?.nameKey) || secondary;
  const reasonText = t("quiz.suggestion_reason", { primary: primaryLabel, secondary: secondaryLabel });

  const suggestions = {
    communication: {
      technical: { reason: reasonText, types: ["workshop", "seminar", "networking", "hackathon", "tech_talk", "coding_session"], level: "strong" },
      creativity: { reason: reasonText, types: ["festival", "art_event", "music_show", "workshop", "seminar", "networking"], level: "strong" },
      socialImpact: { reason: reasonText, types: ["volunteer", "community_event", "charity", "workshop", "seminar", "networking"], level: "strong" },
    },
    technical: {
      communication: { reason: reasonText, types: ["hackathon", "tech_talk", "coding_session", "workshop", "seminar", "networking"], level: "strong" },
      creativity: { reason: reasonText, types: ["hackathon", "tech_talk", "coding_session", "art_event", "festival", "workshop"], level: "strong" },
      socialImpact: { reason: reasonText, types: ["volunteer", "community_event", "hackathon", "tech_talk", "coding_session"], level: "strong" },
    },
    creativity: {
      communication: { reason: reasonText, types: ["festival", "art_event", "music_show", "workshop", "seminar", "networking"], level: "strong" },
      technical: { reason: reasonText, types: ["festival", "art_event", "music_show", "hackathon", "tech_talk", "workshop"], level: "strong" },
      socialImpact: { reason: reasonText, types: ["festival", "art_event", "music_show", "volunteer", "community_event", "charity"], level: "strong" },
    },
    socialImpact: {
      communication: { reason: reasonText, types: ["volunteer", "community_event", "charity", "workshop", "seminar", "networking"], level: "strong" },
      technical: { reason: reasonText, types: ["volunteer", "community_event", "charity", "hackathon", "tech_talk", "coding_session"], level: "strong" },
      creativity: { reason: reasonText, types: ["volunteer", "community_event", "charity", "festival", "art_event", "music_show"], level: "strong" },
    },
  };

  return suggestions[primary]?.[secondary] || null;
}

const CATEGORY_LABELS = {
  communication: { label: "Communication", types: ["workshop", "seminar", "networking"] },
  technical: { label: "Technical", types: ["hackathon", "tech_talk", "coding_session"] },
  creativity: { label: "Creativity", types: ["festival", "art_event", "music_show"] },
  socialImpact: { label: "Social Impact", types: ["volunteer", "community_event", "charity"] },
};

let currentQuestion = 0;
let answers = [];
let animFrame = null;

if (!isAuthenticated()) {
  window.location.replace("/login.html");
} else {
  document.body.style.display = "";
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  await initChatbot();
  loadFooter();
  await loadQuestions();
  await checkExistingResult();
  initQuiz();
});

async function checkExistingResult() {
  if (!isAuthenticated()) return;
  const startBtn = document.getElementById("quizStartBtn");
  if (!startBtn) return;

  try {
    const data = await getSurveyResult();
    if (data?.scores) {
      startBtn.innerHTML = `<span class="material-symbols-outlined">refresh</span> ${t("quiz.retake_btn")}`;
    }
  } catch {
    // No existing result, show start as normal
  }
}

async function loadQuestions() {
  try {
    const data = await getSurveyQuestions();
    if (data?.questions?.length === HARDCODED_QUESTIONS.length) {
      QUESTIONS = data.questions.map((q, idx) => ({
        ...q,
        id: idx + 1,
        category: HARDCODED_QUESTIONS[idx]?.category || 'General',
        answers: q.answers.map((a, aidx) => ({
          ...a,
          scores: HARDCODED_QUESTIONS[idx]?.answers[aidx]?.scores || { communication: 25, technical: 25, creativity: 25, socialImpact: 25 },
        })),
      }));
    }
  } catch {
    console.log('Using hardcoded questions');
  }
}

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  const container = document.getElementById("footer-container");
  if (container) container.innerHTML = html;
}

function initQuiz() {
  document.getElementById("quizStartBtn").addEventListener("click", startQuiz);
  document.getElementById("quizNextBtn").addEventListener("click", nextQuestion);
  document.getElementById("quizPrevBtn").addEventListener("click", prevQuestion);
  document.getElementById("quizExploreBtn").addEventListener("click", () => {
    window.location.href = isAuthenticated() ? "/explore.html" : "/register.html";
  });
  document.getElementById("quizRetakeBtn").addEventListener("click", () => {
    currentQuestion = 0;
    answers = [];
    showScreen("quizStart");
  });
}

function showScreen(id) {
  document.querySelectorAll(".quiz-card").forEach(c => c.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function startQuiz() {
  currentQuestion = 0;
  answers = new Array(QUESTIONS.length).fill(null).map(() => []);
  showScreen("quizQuestion");
  renderQuestion();
}

function getCategoryIcon(category) {
  const icons = { Preferences: "favorite", Interests: "explore", Schedule: "schedule", Commitment: "hourglass_top", "Social Style": "groups", Goals: "flag", Location: "location_on", Role: "badge", Competition: "emoji_events", Motivation: "psychology" };
  return icons[category] || "help";
}

function renderQuestion() {
  const q = QUESTIONS[currentQuestion];
  const qKey = `q${q.id}`;
  const translatedQuestion = t(`quiz.${qKey}.question`);
  document.getElementById("questionNumber").textContent = `${t("quiz.question")} ${currentQuestion + 1}`;
  document.getElementById("questionCategory").textContent = q.category;
  document.getElementById("questionCategory").style.background = getCategoryColor(q.category) + "20";
  document.getElementById("questionCategory").style.color = getCategoryColor(q.category);
  document.getElementById("questionCategory").innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${getCategoryIcon(q.category)}</span> ${q.category}`;

  const title = document.getElementById("questionTitle");
  title.textContent = translatedQuestion !== `quiz.${qKey}.question` ? translatedQuestion : q.question;
  title.style.background = `linear-gradient(135deg, #23499b, #3B6FD4)`;
  title.style.webkitBackgroundClip = "text";
  title.style.webkitTextFillColor = "transparent";
  title.style.backgroundClip = "text";

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  document.getElementById("quizProgressBar").style.width = `${progress}%`;
  document.getElementById("quizProgressText").textContent = `${currentQuestion + 1} / ${QUESTIONS.length}`;

  const container = document.getElementById("quizAnswers");
  container.innerHTML = "";
  const selected = answers[currentQuestion] || [];
  container.innerHTML = `<div class="quiz-multi-hint" style="font-size:12px;color:#64748b;margin-bottom:12px;font-weight:500;"><span class="material-symbols-outlined" style="font-size:16px;vertical-align:middle;">checklist</span> ${t("quiz.multi_select") || "Select all that apply"}</div>`;
  const translatedAnswers = t(`quiz.${qKey}.answers`);
  q.answers.forEach((answer, idx) => {
    const isSelected = selected.includes(idx);
    const translatedLabel = Array.isArray(translatedAnswers) ? translatedAnswers[idx] : undefined;
    const displayLabel = translatedLabel || answer.label;
    const div = document.createElement("div");
    div.className = `quiz-answer-btn ${isSelected ? "selected" : ""}`;
    div.innerHTML = `
      <span class="quiz-answer-checkbox">${isSelected ? '<span class="material-symbols-outlined" style="font-size:20px;color:#23499b;">check_box</span>' : '<span class="material-symbols-outlined" style="font-size:20px;color:#94a3b8;">check_box_outline_blank</span>'}</span>
      <span class="quiz-answer-text">${displayLabel}</span>
    `;
    div.addEventListener("click", () => selectAnswer(idx));
    div.dataset.index = idx;
    container.appendChild(div);
  });

  updateNavButtons();
}

function getCategoryColor(category) {
  const colors = {
    Preferences: "#23499b", Interests: "#8B5CF6", Schedule: "#10B981",
    Commitment: "#F59E0B", "Social Style": "#EF4444", Goals: "#3B82F6",
    Location: "#06B6D4", Role: "#EC4899", Competition: "#F97316", Motivation: "#23499b",
  };
  return colors[category] || "#23499b";
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
  document.getElementById("quizNextBtn").disabled = current.length === 0;
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

  prevBtn.classList.toggle("hidden", currentQuestion === 0);

  if (currentQuestion === QUESTIONS.length - 1) {
    nextBtn.innerHTML = `<span class="material-symbols-outlined">check</span> ${t("quiz.finish")}`;
  } else {
    nextBtn.innerHTML = `${t("quiz.next")} <span class="material-symbols-outlined">arrow_forward</span>`;
  }

  nextBtn.disabled = !answers[currentQuestion] || answers[currentQuestion].length === 0;
}

async function finishQuiz() {
  showScreen("quizResult");
  document.getElementById("quizResult").innerHTML = `
    <div class="quiz-loading-result">
      <div class="quiz-spinner"></div>
      <p>${t("quiz.analyzing")}</p>
    </div>
  `;

  let scores = calculateScores();
  const answerData = answers.map((selectedIndices, qIndex) => ({
    questionIndex: qIndex,
    answerIndex: selectedIndices,
  }));

  if (isAuthenticated()) {
    const check = canPerformAction('submitSurvey');
    if (check.allowed) {
      markActionPerformed('submitSurvey');
      try {
        const result = await submitSurvey(answerData);
        if (result?.scores) {
          scores = result.scores;
        }
        try {
          await generateProfile({ answers: answerData });
        } catch (profileErr) {
          console.warn("Profile generation failed:", profileErr);
        }
      } catch (err) {
        console.warn("Survey submission failed:", err);
      }
    }
  }

  localStorage.setItem("springwave_quiz_completed", "true");
  setTimeout(() => renderResults(scores), 600);
}

function calculateScores() {
  const total = { communication: 0, technical: 0, creativity: 0, socialImpact: 0 };
  let divisor = 0;
  QUESTIONS.forEach((q, i) => {
    const selectedIndices = answers[i] || [];
    selectedIndices.forEach(idx => {
      const scores = q.answers[idx]?.scores;
      if (scores) {
        total.communication += scores.communication;
        total.technical += scores.technical;
        total.creativity += scores.creativity;
        total.socialImpact += scores.socialImpact;
      }
    });
    if (selectedIndices.length > 0) divisor++;
  });

  const count = divisor || QUESTIONS.length;
  return {
    communication: Math.round(total.communication / count),
    technical: Math.round(total.technical / count),
    creativity: Math.round(total.creativity / count),
    socialImpact: Math.round(total.socialImpact / count),
  };
}

function renderResults(scores) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const primary = sorted[0];
  const secondary = sorted[1];

  let suggestions = getSuggestion(primary[0], secondary[0], primary[1], secondary[1]);
  if (!suggestions) {
    suggestions = {
      reason: t("quiz.balanced"),
      types: ["workshop", "seminar", "networking", "hackathon", "festival", "volunteer"],
      level: "balanced",
    };
  }

  let suggestionList = [...new Set(suggestions.types)].slice(0, 4);

  document.getElementById("quizResult").innerHTML = `
    <div class="quiz-result-icon">
      <span class="material-symbols-outlined">auto_awesome</span>
    </div>
    <h1 class="quiz-result-title">${t("quiz.result_title")}</h1>
    <p class="quiz-result-desc">${t("quiz.result_desc")}</p>

    <div class="quiz-scores" id="quizScores"></div>

    <div class="quiz-suggestions" id="quizSuggestions"></div>

    <div class="quiz-result-actions">
      <button class="quiz-btn-primary" id="quizExploreBtn">
        <span class="material-symbols-outlined">explore</span>
        ${isAuthenticated() ? t("quiz.explore_activities") : t("quiz.register_explore")}
      </button>
      <button class="quiz-btn-secondary" id="quizRetakeBtn">
        <span class="material-symbols-outlined">replay</span>
        ${t("quiz.retake")}
      </button>
    </div>
  `;

  document.getElementById("quizExploreBtn").addEventListener("click", () => {
    window.location.href = isAuthenticated() ? "/explore.html" : "/register.html";
  });
  document.getElementById("quizRetakeBtn").addEventListener("click", () => {
    currentQuestion = 0;
    answers = [];
    showScreen("quizStart");
  });

  const scoresContainer = document.getElementById("quizScores");
  Object.entries(scores).forEach(([key, value]) => {
    const info = SCORE_LABELS[key];
    const level = value >= 70 ? "high" : value >= 45 ? "medium" : "low";
    const levelLabel = value >= 70 ? t("quiz.score_strong") : value >= 45 ? t("quiz.score_moderate") : t("quiz.score_developing");
    scoresContainer.innerHTML += `
      <div class="quiz-score-item">
        <div class="quiz-score-header">
          <div class="quiz-score-info">
            <span class="material-symbols-outlined quiz-score-icon" style="color:${info.color}">${info.icon}</span>
            <div>
              <span class="quiz-score-name">${t(info.nameKey)}</span>
              <span class="quiz-score-desc">${t(info.descKey)}</span>
            </div>
          </div>
          <span class="quiz-score-value" style="color:${info.color}">${value}</span>
        </div>
        <div class="quiz-score-bar-track">
          <div class="quiz-score-bar-fill" data-value="${value}" style="width:0%;background:${info.color}"></div>
        </div>
        <span class="quiz-score-level ${level}">${levelLabel}</span>
      </div>
    `;
  });

  const suggestionsContainer = document.getElementById("quizSuggestions");
  suggestionsContainer.innerHTML = `
    <div class="quiz-suggestion-card">
      <div class="quiz-suggestion-header">
        <span class="material-symbols-outlined" style="color:#23499b">tips_and_updates</span>
        <h3>${t("quiz.suggested_activities")}</h3>
      </div>
      <p class="quiz-suggestion-reason">${suggestions.reason}</p>
      <div class="quiz-suggestion-tags">
        ${suggestionList.map(t => `<span class="quiz-suggestion-tag">${t}</span>`).join("")}
      </div>
    </div>
  `;

  animFrame = requestAnimationFrame(() => animateBars());
}

function animateBars() {
  document.querySelectorAll(".quiz-score-bar-fill").forEach(bar => {
    const value = parseInt(bar.dataset.value);
    setTimeout(() => { bar.style.width = value + "%"; }, 100);
  });
}
