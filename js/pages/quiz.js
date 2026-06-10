import "../../src/style.css";
import { isAuthenticated } from "../lib/session.js";
import { loadNavbar } from "../components/navbar.js";
import { initChatbot } from "../components/chatbot.js";
import { fetchContent } from "../lib/utils.js";
import { submitSurvey, getSurveyQuestions, getSurveyResult } from "../api/survey.js";
import { generateProfile } from "../api/profile.js";

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
  communication: { name: "Communication", icon: "forum", color: "#3B82F6", desc: "Speaking, presenting, interacting" },
  technical: { name: "Technical", icon: "code", color: "#8B5CF6", desc: "Coding, engineering, problem-solving" },
  creativity: { name: "Creativity", icon: "palette", color: "#F59E0B", desc: "Design, innovation, artistic thinking" },
  socialImpact: { name: "Social Impact", icon: "volunteer_activism", color: "#10B981", desc: "Volunteering, community, leadership" },
};

function getSuggestion(primary, secondary, primaryScore, secondaryScore) {
  const primaryLabel = SCORE_LABELS[primary]?.name || primary;
  const secondaryLabel = SCORE_LABELS[secondary]?.name || secondary;

  const suggestions = {
    communication: {
      technical: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["workshop", "seminar", "networking", "hackathon", "tech_talk", "coding_session"], level: "strong" },
      creativity: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["festival", "art_event", "music_show", "workshop", "seminar", "networking"], level: "strong" },
      socialImpact: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["volunteer", "community_event", "charity", "workshop", "seminar", "networking"], level: "strong" },
    },
    technical: {
      communication: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["hackathon", "tech_talk", "coding_session", "workshop", "seminar", "networking"], level: "strong" },
      creativity: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["hackathon", "tech_talk", "coding_session", "art_event", "festival", "workshop"], level: "strong" },
      socialImpact: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["volunteer", "community_event", "hackathon", "tech_talk", "coding_session"], level: "strong" },
    },
    creativity: {
      communication: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["festival", "art_event", "music_show", "workshop", "seminar", "networking"], level: "strong" },
      technical: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["festival", "art_event", "music_show", "hackathon", "tech_talk", "workshop"], level: "strong" },
      socialImpact: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["festival", "art_event", "music_show", "volunteer", "community_event", "charity"], level: "strong" },
    },
    socialImpact: {
      communication: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["volunteer", "community_event", "charity", "workshop", "seminar", "networking"], level: "strong" },
      technical: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["volunteer", "community_event", "charity", "hackathon", "tech_talk", "coding_session"], level: "strong" },
      creativity: { reason: `You have a strong tendency in ${primaryLabel} and ${secondaryLabel}`, types: ["volunteer", "community_event", "charity", "festival", "art_event", "music_show"], level: "strong" },
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

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar({ activeSection: "home" });
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
      startBtn.innerHTML = `<span class="material-symbols-outlined">refresh</span> Retake Quiz`;
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
  answers = new Array(QUESTIONS.length).fill(null);
  showScreen("quizQuestion");
  renderQuestion();
}

function getCategoryIcon(category) {
  const icons = { Preferences: "favorite", Interests: "explore", Schedule: "schedule", Commitment: "hourglass_top", "Social Style": "groups", Goals: "flag", Location: "location_on", Role: "badge", Competition: "emoji_events", Motivation: "psychology" };
  return icons[category] || "help";
}

function renderQuestion() {
  const q = QUESTIONS[currentQuestion];
  document.getElementById("questionNumber").textContent = `Question ${currentQuestion + 1}`;
  document.getElementById("questionCategory").textContent = q.category;
  document.getElementById("questionCategory").style.background = getCategoryColor(q.category) + "20";
  document.getElementById("questionCategory").style.color = getCategoryColor(q.category);
  document.getElementById("questionCategory").innerHTML = `<span class="material-symbols-outlined" style="font-size:14px">${getCategoryIcon(q.category)}</span> ${q.category}`;

  const title = document.getElementById("questionTitle");
  title.textContent = q.question;
  title.style.background = `linear-gradient(135deg, #23499b, #3B6FD4)`;
  title.style.webkitBackgroundClip = "text";
  title.style.webkitTextFillColor = "transparent";
  title.style.backgroundClip = "text";

  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  document.getElementById("quizProgressBar").style.width = `${progress}%`;
  document.getElementById("quizProgressText").textContent = `${currentQuestion + 1} / ${QUESTIONS.length}`;

  const container = document.getElementById("quizAnswers");
  container.innerHTML = "";
  q.answers.forEach((answer, idx) => {
    const btn = document.createElement("button");
    btn.className = `quiz-answer-btn ${answers[currentQuestion] === idx ? "selected" : ""}`;
    btn.innerHTML = `
      <div class="quiz-answer-circle">${String.fromCharCode(65 + idx)}</div>
      <span class="quiz-answer-text">${answer.label}</span>
      ${answers[currentQuestion] === idx ? '<span class="material-symbols-outlined quiz-answer-check">check_circle</span>' : ""}
    `;
    btn.addEventListener("click", () => selectAnswer(idx));
    btn.dataset.index = idx;
    container.appendChild(btn);
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
  answers[currentQuestion] = index;
  document.querySelectorAll(".quiz-answer-btn").forEach((btn, i) => {
    btn.classList.toggle("selected", i === index);
    const check = btn.querySelector(".quiz-answer-check");
    if (i === index) {
      if (!check) {
        const icon = document.createElement("span");
        icon.className = "material-symbols-outlined quiz-answer-check";
        icon.textContent = "check_circle";
        btn.appendChild(icon);
      }
    } else {
      check?.remove();
    }
  });
  document.getElementById("quizNextBtn").disabled = false;
}

function nextQuestion() {
  if (answers[currentQuestion] === null) return;
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
    nextBtn.innerHTML = `<span class="material-symbols-outlined">check</span> Finish`;
  } else {
    nextBtn.innerHTML = `Next <span class="material-symbols-outlined">arrow_forward</span>`;
  }

  nextBtn.disabled = answers[currentQuestion] === null;
}

async function finishQuiz() {
  showScreen("quizResult");
  document.getElementById("quizResult").innerHTML = `
    <div class="quiz-loading-result">
      <div class="quiz-spinner"></div>
      <p>Analyzing your responses...</p>
    </div>
  `;

  let scores = calculateScores();
  const answerData = answers.map((answerIndex, qIndex) => ({
    questionIndex: qIndex,
    answerIndex,
  }));

  if (isAuthenticated()) {
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

  setTimeout(() => renderResults(scores), 600);
}

function calculateScores() {
  const total = { communication: 0, technical: 0, creativity: 0, socialImpact: 0 };
  QUESTIONS.forEach((q, i) => {
    const answerIndex = answers[i];
    if (answerIndex !== null) {
      const scores = q.answers[answerIndex]?.scores;
      if (scores) {
        total.communication += scores.communication;
        total.technical += scores.technical;
        total.creativity += scores.creativity;
        total.socialImpact += scores.socialImpact;
      }
    }
  });

  const count = QUESTIONS.length;
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
      reason: "You have a balanced tendency across multiple skill areas",
      types: ["workshop", "seminar", "networking", "hackathon", "festival", "volunteer"],
      level: "balanced",
    };
  }

  let suggestionList = [...new Set(suggestions.types)].slice(0, 4);

  document.getElementById("quizResult").innerHTML = `
    <div class="quiz-result-icon">
      <span class="material-symbols-outlined">auto_awesome</span>
    </div>
    <h1 class="quiz-result-title">Your Personality Profile</h1>
    <p class="quiz-result-desc">Based on your responses, here's how you score across four key areas.</p>

    <div class="quiz-scores" id="quizScores"></div>

    <div class="quiz-suggestions" id="quizSuggestions"></div>

    <div class="quiz-result-actions">
      <button class="quiz-btn-primary" id="quizExploreBtn">
        <span class="material-symbols-outlined">explore</span>
        ${isAuthenticated() ? "Explore Recommended Activities" : "Register to Explore Activities"}
      </button>
      <button class="quiz-btn-secondary" id="quizRetakeBtn">
        <span class="material-symbols-outlined">replay</span>
        Retake Quiz
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
    const levelLabel = value >= 70 ? "Strong" : value >= 45 ? "Moderate" : "Developing";
    scoresContainer.innerHTML += `
      <div class="quiz-score-item">
        <div class="quiz-score-header">
          <div class="quiz-score-info">
            <span class="material-symbols-outlined quiz-score-icon" style="color:${info.color}">${info.icon}</span>
            <div>
              <span class="quiz-score-name">${info.name}</span>
              <span class="quiz-score-desc">${info.desc}</span>
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
        <h3>Suggested Activities For You</h3>
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
