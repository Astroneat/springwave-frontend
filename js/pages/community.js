import "../../src/style.css";
import { isAuthenticated, getUser } from "../lib/session.js";
import {
  getTrendingDiscussions,
  getUniversityCommunities,
  getSkillTopics,
  getUpcomingEvents,
  getPopularDiscussions,
  getAISuggestions,
  getDiscussionsByCategory,
} from "../api/forum.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { fetchContent } from "../lib/utils.js";

let currentCategory = "all";

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  initBasicScroll();
  initForumSidebarToggle();
  initPostModal();
  loadSidebar();
  renderDiscussions(getTrendingDiscussions());
  renderUniGrid();
  renderTopicGrid();
  initCategoryFilter();
  await initChatbot();
  await loadFooter();
});

async function loadNavbar() {
  await loadSharedNavbar({ activeSection: "community" });
}

async function loadFooter() {
  const html = await fetchContent("./components/footer.html");
  document.getElementById("footer-container").innerHTML = html;
}

function initForumSidebarToggle() {
  const toggle = document.getElementById("forumFilterBtn");
  const sidebar = document.getElementById("forumSidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", () => {
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", (e) => {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== toggle && !toggle.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });
  }
  const closeBtn = document.getElementById("forumSidebarToggle");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => sidebar.classList.remove("open"));
  }
}

/* =============================
   SIDEBAR
   ============================= */

async function loadSidebar() {
  const container = document.getElementById("forumSidebarContainer");
  const html = await fetchContent("./components/forum-sidebar.html");
  container.innerHTML = html;

  renderPopularDiscussions();
  renderUpcomingEvents();
  renderAISuggestions();
}

function renderPopularDiscussions() {
  const container = document.getElementById("sidebarPopular");
  if (!container) return;
  const popular = getPopularDiscussions();
  container.innerHTML = popular
    .map(
      (d, i) => `
    <div class="forum-sidebar-popular-item">
      <span class="forum-sidebar-popular-rank">${String(i + 1).padStart(2, "0")}</span>
      <div class="forum-sidebar-popular-info">
        <span class="forum-sidebar-popular-title">${d.title}</span>
        <span class="forum-sidebar-popular-replies">${d.replies} replies</span>
      </div>
    </div>
  `
    )
    .join("");
}

function renderUpcomingEvents() {
  const container = document.getElementById("sidebarUpcomingEvents");
  if (!container) return;
  const events = getUpcomingEvents();
  container.innerHTML = events
    .map(
      (e) => `
    <div class="forum-sidebar-event">
      <div class="forum-sidebar-event-date">
        <span class="forum-sidebar-event-day">${e.date.split(" ")[0]}</span>
        <span class="forum-sidebar-event-month">${e.date.split(" ")[1]}</span>
      </div>
      <div class="forum-sidebar-event-info">
        <span class="forum-sidebar-event-title">${e.title}</span>
        <span class="forum-sidebar-event-attendees">
          <span class="material-symbols-outlined text-xs">person</span>
          ${e.attendees} attending
        </span>
      </div>
    </div>
  `
    )
    .join("");
}

function renderAISuggestions() {
  const container = document.getElementById("sidebarAISuggested");
  if (!container) return;
  const suggestions = getAISuggestions();
  container.innerHTML = suggestions
    .map(
      (s) => `
    <div class="forum-sidebar-ai-item">
      <div class="forum-sidebar-ai-icon">
        <span class="material-symbols-outlined">auto_awesome</span>
      </div>
      <div class="forum-sidebar-ai-info">
        <span class="forum-sidebar-ai-title">${s.title}</span>
        <span class="forum-sidebar-ai-reason">${s.reason}</span>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   DISCUSSIONS
   ============================= */

function renderDiscussions(discussions) {
  const container = document.getElementById("forumDiscussions");
  if (!container) return;
  if (discussions.length === 0) {
    container.innerHTML = `
      <div class="forum-empty">
        <span class="material-symbols-outlined forum-empty-icon">forum</span>
        <p class="forum-empty-title">No discussions yet</p>
        <p class="forum-empty-desc">Be the first to start a discussion in this category.</p>
      </div>
    `;
    return;
  }
  container.innerHTML = discussions
    .map(
      (d) => `
    <div class="forum-discussion-card">
      <div class="forum-discussion-card-header">
        <div class="forum-discussion-author-avatar" style="background: linear-gradient(135deg, #23499b, #3B6FD4);">
          ${d.avatar}
        </div>
        <div class="forum-discussion-author-info">
          <span class="forum-discussion-author-name">${d.author}</span>
          <span class="forum-discussion-author-uni">${d.university}</span>
        </div>
        <span class="forum-discussion-time">${d.lastActivity}</span>
      </div>
      <h3 class="forum-discussion-title">${d.title}</h3>
      <p class="forum-discussion-preview">${d.preview}</p>
      <div class="forum-discussion-meta">
        <span class="forum-category-badge forum-category-${d.category}">${capitalize(d.category)}</span>
        <div class="forum-discussion-tags">
          ${d.tags.map((t) => `<span class="forum-tag">${t}</span>`).join("")}
        </div>
      </div>
      <div class="forum-discussion-footer">
        <div class="forum-discussion-stats">
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">chat_bubble</span>
            ${d.replies} replies
          </span>
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">visibility</span>
            ${d.views} views
          </span>
        </div>
        <div class="forum-discussion-actions">
          <button class="forum-discussion-action-btn" title="Save">
            <span class="material-symbols-outlined text-sm">bookmark_border</span>
          </button>
          <button class="forum-discussion-action-btn" title="Share">
            <span class="material-symbols-outlined text-sm">share</span>
          </button>
        </div>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   UNIVERSITY GRID
   ============================= */

function renderUniGrid() {
  const container = document.getElementById("forumUniGrid");
  if (!container) return;
  const unis = getUniversityCommunities();
  container.innerHTML = unis
    .map(
      (u) => `
    <div class="forum-uni-card">
      <div class="forum-uni-card-top" style="background: linear-gradient(135deg, ${u.color}22, ${u.color}11);">
        <div class="forum-uni-icon" style="background: ${u.color};">
          <span class="material-symbols-outlined text-white text-2xl">account_balance</span>
        </div>
        <h3 class="forum-uni-name">${u.name}</h3>
      </div>
      <div class="forum-uni-card-body">
        <div class="forum-uni-stat">
          <span class="forum-uni-stat-value">${u.memberCount.toLocaleString()}</span>
          <span class="forum-uni-stat-label">Members</span>
        </div>
        <div class="forum-uni-stat">
          <span class="forum-uni-stat-value">${u.activeDiscussions}</span>
          <span class="forum-uni-stat-label">Discussions</span>
        </div>
        <button class="forum-uni-join-btn">Join Community</button>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   TOPIC GRID
   ============================= */

function renderTopicGrid() {
  const container = document.getElementById("forumTopicGrid");
  if (!container) return;
  const topics = getSkillTopics();
  container.innerHTML = topics
    .map(
      (t) => `
    <div class="forum-topic-card">
      <div class="forum-topic-icon" style="background: ${t.color}15; color: ${t.color};">
        <span class="material-symbols-outlined text-2xl">${t.icon}</span>
      </div>
      <div class="forum-topic-info">
        <h3 class="forum-topic-name">${t.name}</h3>
        <p class="forum-topic-desc">${t.description}</p>
        <span class="forum-topic-count">${t.discussionCount} discussions</span>
      </div>
    </div>
  `
    )
    .join("");
}

/* =============================
   CATEGORY FILTER
   ============================= */

function initCategoryFilter() {
  const items = document.querySelectorAll(".forum-category-item");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      items.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      currentCategory = item.dataset.category;
      const discussions = getDiscussionsByCategory(currentCategory);
      renderDiscussions(discussions);
      document.getElementById("forumSidebar")?.classList.remove("open");

      document.getElementById("trending")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* =============================
   POST MODAL
   ============================= */

function initPostModal() {
  const overlay = document.getElementById("forumPostOverlay");
  const backdrop = document.getElementById("forumPostBackdrop");
  const openBtns = document.querySelectorAll("[id='startDiscussionBtn']");
  const closeBtn = document.getElementById("forumPostClose");
  const cancelBtn = document.getElementById("forumPostCancel");

  function open() {
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  function close() {
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  }

  openBtns.forEach((btn) => {
    if (btn) btn.addEventListener("click", open);
  });
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (cancelBtn) cancelBtn.addEventListener("click", close);
  if (backdrop) backdrop.addEventListener("click", close);

  const publishBtn = document.getElementById("forumPostPublish");
  if (publishBtn) {
    publishBtn.addEventListener("click", () => {
      const title = document.getElementById("postTitle")?.value.trim();
      if (!title) {
        document.getElementById("postTitle")?.focus();
        return;
      }
      close();
      document.getElementById("postTitle").value = "";
      document.getElementById("postContent").value = "";
      document.getElementById("postTags").value = "";
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close();
  });
}

function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}
