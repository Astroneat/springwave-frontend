import "../../src/style.css";
import { isAuthenticated, getUser, getToken } from "../lib/session.js";
import {
  getTrendingDiscussions,
  getUniversityCommunities,
  getSkillTopics,
  getUpcomingEvents,
  getPopularDiscussions,
  getAISuggestions,
  getDiscussionsByCategory,
  getEventById,
  getEvents,
  getComments,
  getTopComment,
  addComment,
  getStats,
  joinUniversity,
  leaveUniversity,
  getMyUniversity,
  createDiscussionWithScope,
  getCommunityDiscussions,
  deleteDiscussion,
  likeComment,
  saveDiscussion,
  unsaveDiscussion,
  getSavedDiscussions,
  createUniversity,
  updateUniversity,
  deleteUniversity as deleteUni,
} from "../api/forum.js";
import { initChatbot } from "../components/chatbot.js";
import { loadNavbar as loadSharedNavbar, initBasicScroll } from "../components/navbar.js";
import { fetchContent, formatDate, capitalize } from "../lib/utils.js";
import { getActivityById, getActivities } from "../api/activities.js";
import { grantContribution } from "../api/user.js";
import { addBadgeNotification } from "../lib/notifications.js";
import { CDN_DOMAIN } from "../config.js";

const CATEGORIES = {
  all:   { label: "All Discussions",        sectionTitle: "Trending Discussions",     sectionSubtitle: "Active conversations across the community" },
  event: { label: "Event Discussions",      sectionTitle: "Event Discussions",        sectionSubtitle: "Discussions about events and activities" },
  skills:{ label: "Skill Development",      sectionTitle: "Skill Discussions",        sectionSubtitle: "Explore topics by skill area and interest" },
  uni:   { label: "University Communities", sectionTitle: "University Discussions",   sectionSubtitle: "Discussions from your university community" },
  mine:  { label: "My Discussions",         sectionTitle: "My Discussions",           sectionSubtitle: "Your discussions and topics" },
  saved: { label: "Saved Posts",            sectionTitle: "Saved Posts",              sectionSubtitle: "Your bookmarked content" },
};

function getCategoryFromURL() {
  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");
  return cat && CATEGORIES[cat] ? cat : "all";
}

const MAX_EVENT_DISCUSSIONS = 20;
let discussionsCache = [];

async function getEventDiscussions() {
  try {
    const { activities } = await getActivities();
    if (!activities || activities.length === 0) return [];
    return activities.slice(0, MAX_EVENT_DISCUSSIONS).map(eventToDiscussion);
  } catch {
    const events = await getEvents();
    if (!events || events.length === 0) return [];
    return events.map((e) => ({
      id: e.id,
      author: "SpringWave",
      university: "",
      avatar: "S",
      title: e.title,
      preview: `Join the discussion about ${e.title}! Share your thoughts and connect with other attendees.`,
      category: "event",
      tags: ["event"],
      replies: 0,
      views: 0,
      lastActivity: e.date,
      relatedEvent: e.id,
      _event: { title: e.title, date: e.date, attendees: e.attendees },
    }));
  }
}

function eventToDiscussion(event) {
  return {
    id: event.activityID || event._id,
    author: event.hostName || "SpringWave",
    university: event.location || "",
    avatar: (event.hostName || "S")[0],
    title: event.title,
    preview: (event.description || "").slice(0, 120) + ((event.description || "").length > 120 ? "..." : ""),
    category: "event",
    tags: [event.type || "event"],
    replies: event.participants || 0,
    views: 0,
    lastActivity: event.heldDate ? formatDate(event.heldDate) : "Upcoming",
    relatedEvent: event.activityID || event._id,
    _event: { title: event.title, date: event.heldDate, attendees: event.participants || 0 },
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar();
  const user = getUser();
  const avatarEl = document.getElementById("forumStatusAvatar");
  if (avatarEl && user) {
    avatarEl.textContent = (user.username || user.fullname || "?").charAt(0).toUpperCase();
  }
  initBasicScroll();
  initForumSidebarToggle();
  await initPostModal();

  const category = getCategoryFromURL();
  setActiveCategory(category);
  updatePageTitle(category);
  showSections(category);

  let discussions;
  if (category === "event") {
    discussions = await getEventDiscussions();
    discussionsCache = discussions;
  } else {
    discussions = await getDiscussionsByCategory(category);
  }
  window._currentDiscussions = discussions;
  renderDiscussions(discussions, category);

  if (category === "all" || category === "uni") {
    await renderUniGrid();
    const user = getUser();
    const addBtn = document.getElementById("forumAddUniBtn");
    if (addBtn && user?.role === "admin") {
      addBtn.style.display = "flex";
      addBtn.addEventListener("click", () => {
        openUniDialog(null, async (name, description, color) => {
          const result = await createUniversity(name, description, color);
          if (result) window.location.reload();
        });
      });
    }
    initUniDialog();
  }
  if (category === "all" || category === "skills") {
    await renderTopicGrid();
  }

  initSidebarLinkClick();
  initEventDetailPopup();
  initDiscussionDetail();
  initDiscussionPopupClose();
  await loadSidebar(category);
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

function setActiveCategory(category) {
  document.querySelectorAll(".forum-category-item").forEach((item) => {
    const href = item.getAttribute("href");
    const itemCat = !href || href === "./community.html" ? "all" : (href.match(/cat=(\w+)/) || [])[1];
    const isActive = itemCat === category;
    item.classList.toggle("active", isActive);
    if (isActive) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function updatePageTitle(category) {
  const config = CATEGORIES[category] || CATEGORIES.all;
  document.title = `${config.label} - SpringWave`;
}

function showSections(category) {
  const trending = document.getElementById("trending");
  const universities = document.getElementById("universities");
  const careerTopics = document.getElementById("careerTopics");
  const config = CATEGORIES[category] || CATEGORIES.all;

  if (trending) {
    trending.style.display = category === "uni" ? "none" : "";
    const title = trending.querySelector(".forum-section-title");
    const sub = trending.querySelector(".forum-section-subtitle");
    if (title) title.textContent = config.sectionTitle;
    if (sub) sub.textContent = config.sectionSubtitle;
  }

  if (universities) universities.style.display = category === "all" || category === "uni" ? "" : "none";
  if (careerTopics) careerTopics.style.display = category === "all" || category === "skills" ? "" : "none";
}

function initSidebarLinkClick() {
  document.querySelectorAll(".forum-category-item").forEach((link) => {
    link.addEventListener("click", () => {
      document.getElementById("forumSidebar")?.classList.remove("open");
    });
  });
}

/* =============================
   SIDEBAR TOGGLE
   ============================= */

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

async function loadSidebar(category) {
  const container = document.getElementById("forumSidebarContainer");
  const html = await fetchContent("./components/forum-sidebar.html");
  container.innerHTML = html;

  const widgets = container.querySelectorAll(".forum-sidebar-widget");
  if (category === "event") {
    if (widgets[0]) widgets[0].style.display = "none";
    if (widgets[1]) widgets[1].style.display = "";
    if (widgets[2]) widgets[2].style.display = "none";
  } else if (category === "skills") {
    if (widgets[0]) widgets[0].style.display = "none";
    if (widgets[1]) widgets[1].style.display = "none";
    if (widgets[2]) widgets[2].style.display = "";
  } else if (category === "uni") {
    if (widgets[0]) widgets[0].style.display = "";
    if (widgets[1]) widgets[1].style.display = "none";
    if (widgets[2]) widgets[2].style.display = "none";
  } else {
    if (widgets[0]) widgets[0].style.display = "";
    if (widgets[1]) widgets[1].style.display = "";
    if (widgets[2]) widgets[2].style.display = "";
  }

  await renderPopularDiscussions();
  await renderUpcomingEvents();
  await renderAISuggestions();
}

async function renderPopularDiscussions() {
  const container = document.getElementById("sidebarPopular");
  if (!container) return;
  const popular = await getPopularDiscussions();
  container.innerHTML = popular
    .map(
      (d, i) => `
    <div class="forum-sidebar-popular-item" data-discussion-id="${d.id}" style="cursor:pointer;">
      <span class="forum-sidebar-popular-rank">${String(i + 1).padStart(2, "0")}</span>
      <div class="forum-sidebar-popular-info">
        <span class="forum-sidebar-popular-title">${d.title}</span>
        <span class="forum-sidebar-popular-replies">${d.replies} replies</span>
      </div>
    </div>
  `
    )
    .join("");

  container.querySelectorAll(".forum-sidebar-popular-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const id = item.dataset.discussionId;
      if (id) await openDiscussionDetail(id);
    });
  });
}

async function renderUpcomingEvents() {
  const container = document.getElementById("sidebarUpcomingEvents");
  if (!container) return;
  const events = await getUpcomingEvents();
  if (!events || events.length === 0) { container.innerHTML = '<div class="forum-sidebar-empty" style="padding:12px;text-align:center;color:#94a3b8;font-size:13px;">No upcoming events</div>'; return; }
  container.innerHTML = events
    .map(
      (e) => {
      const parts = (e.date || "").split(" ");
      return `
    <div class="forum-sidebar-event" data-event-id="${e.id}" style="cursor:pointer;">
      <div class="forum-sidebar-event-date">
        <span class="forum-sidebar-event-day">${parts[0] || "?"}</span>
        <span class="forum-sidebar-event-month">${parts[1] || ""}</span>
      </div>
      <div class="forum-sidebar-event-info">
        <span class="forum-sidebar-event-title">${e.title}</span>
      </div>
    </div>
  `
    })
    .join("");

  container.querySelectorAll(".forum-sidebar-event").forEach((item) => {
    item.addEventListener("click", async () => {
      const id = item.dataset.eventId;
      if (id) {
        hideDiscussionPopup();
        await window.openEventDetailPopup?.(id);
      }
    });
  });
}

async function renderAISuggestions() {
  const container = document.getElementById("sidebarAISuggested");
  if (!container) return;
  const suggestions = await getAISuggestions();
  if (!suggestions || suggestions.length === 0) { container.style.display = "none"; return; }
  container.style.display = "";
  container.innerHTML = suggestions
    .map(
      (s) => `
    <div class="forum-sidebar-ai-item" data-event-id="${s.id}" style="cursor:pointer;">
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

  container.querySelectorAll(".forum-sidebar-ai-item").forEach((item) => {
    item.addEventListener("click", async () => {
      const id = item.dataset.eventId;
      if (id) {
        hideDiscussionPopup();
        await window.openEventDetailPopup?.(id);
      }
    });
  });
}

/* =============================
   DISCUSSIONS
   ============================= */

function renderDiscussions(discussions, category) {
  const container = document.getElementById("forumDiscussions");
  if (!container) return;

  if (discussions.length === 0) {
    const emptyMessages = {
      mine:   ["forum", "No discussions yet", "You haven't started any discussions yet. Click 'Start Discussion' to create one!"],
      saved:  ["bookmark", "No saved posts", "You haven't saved any posts yet. Click the bookmark icon on a discussion to save it for later."],
      uni:    ["account_balance", "No university discussions", "Join a university community above to see discussions from your campus."],
      event:  ["event", "No event discussions", "There are no event discussions yet. Be the first to start one!"],
      skills: ["school", "No skill discussions", "There are no skill discussions yet. Be the first to start one!"],
    };
    const msg = emptyMessages[category] || ["forum", "No discussions yet", "Be the first to start a discussion in this category."];
    container.innerHTML = `
      <div class="forum-empty">
        <span class="material-symbols-outlined forum-empty-icon">${msg[0]}</span>
        <p class="forum-empty-title">${msg[1]}</p>
        <p class="forum-empty-desc">${msg[2]}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = discussions
    .map(
      (d) => {
        const eventRef = d.relatedEvent ? renderEventRef(d.relatedEvent, d._event) : "";
        return `
    <div class="forum-discussion-card" data-discussion-id="${d.id}">
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
      ${eventRef}
      <div class="forum-discussion-meta">
        <span class="forum-category-badge forum-category-${d.category}">${capitalize(d.category)}</span>
        <div class="forum-discussion-tags">
          ${d.tags.map((t) => `<span class="forum-tag">${t}</span>`).join("")}
        </div>
      </div>

      <div class="forum-discussion-footer">
        <div class="forum-discussion-stats">
          <button class="forum-discussion-stat forum-reply-btn" data-discussion-id="${d.id}">
            <span class="material-symbols-outlined text-sm">chat_bubble</span>
            ${d.replies} replies
          </button>
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
    })
    .join("");
}

function buildDiscussionCardHTML(d) {
  const eventRef = d.relatedEvent ? renderEventRef(d.relatedEvent, d._event) : "";
  return `
    <div class="forum-discussion-card" data-discussion-id="${d.id}">
      <div class="forum-discussion-card-header">
        <div class="forum-discussion-author-avatar" style="background: linear-gradient(135deg, #23499b, #3B6FD4);">
          ${d.avatar || ""}
        </div>
        <div class="forum-discussion-author-info">
          <span class="forum-discussion-author-name">${d.author || "Unknown"}</span>
          <span class="forum-discussion-author-uni">${d.university || ""}</span>
        </div>
        <span class="forum-discussion-time">${d.lastActivity || "Just now"}</span>
      </div>
      <h3 class="forum-discussion-title">${d.title || ""}</h3>
      <p class="forum-discussion-preview">${d.preview || ""}</p>
      ${eventRef}
      <div class="forum-discussion-meta">
        <span class="forum-category-badge forum-category-${d.category || "general"}">${capitalize(d.category || "general")}</span>
        <div class="forum-discussion-tags">
          ${(d.tags || []).map((t) => `<span class="forum-tag">${t}</span>`).join("")}
        </div>
      </div>

      <div class="forum-discussion-footer">
        <div class="forum-discussion-stats">
          <button class="forum-discussion-stat forum-reply-btn" data-discussion-id="${d.id}">
            <span class="material-symbols-outlined text-sm">chat_bubble</span>
            ${d.replies || 0} replies
          </button>
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">visibility</span>
            ${d.views || 0} views
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
      </div>`;
}

function renderEventRef(eventId, eventData) {
  if (!eventData) return "";
  const event = eventData;
  return `
    <div class="forum-event-ref" data-event-id="${eventId}">
      <div class="forum-event-ref-icon">
        <span class="material-symbols-outlined">event</span>
      </div>
      <div class="forum-event-ref-info">
        <span class="forum-event-ref-label">Discussing</span>
        <span class="forum-event-ref-title">${event.title}</span>
        <span class="forum-event-ref-meta">
          <span class="material-symbols-outlined text-xs">calendar_today</span>
          ${event.date}
          <span class="material-symbols-outlined text-xs">person</span>
          ${event.attendees} attending
        </span>
      </div>
      <span class="forum-event-ref-link">View Event</span>
    </div>
  `;
}

/* =============================
   DISCUSSION DETAIL POPUP
   ============================= */

function initDiscussionDetail() {
  document.getElementById("forumDiscussions")?.addEventListener("click", async (e) => {
    const card = e.target.closest(".forum-discussion-card");
    if (!card) return;
    if (e.target.closest(".forum-event-ref, .forum-event-ref-link, .forum-reply-btn")) return;

    const actionBtn = e.target.closest(".forum-discussion-action-btn");
    if (actionBtn) {
      const id = card.dataset.discussionId;
      if (!id) return;
      const icon = actionBtn.querySelector(".material-symbols-outlined");
      if (icon && icon.textContent.includes("bookmark")) {
        if (!isAuthenticated()) { alert("Please login to save posts"); return; }
        const isSaved = icon.textContent === "bookmark";
        if (isSaved) {
          const ok = await unsaveDiscussion(id);
          if (ok) icon.textContent = "bookmark_border";
        } else {
          const ok = await saveDiscussion(id);
          if (ok) icon.textContent = "bookmark";
        }
      } else if (icon && icon.textContent.includes("share")) {
        const url = `${window.location.origin}/community.html?discussion=${id}`;
        if (navigator.share) {
          try { await navigator.share({ title: "Check this discussion", url }); } catch {}
        } else {
          try { await navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); } catch {}
        }
      }
      return;
    }

    const id = card.dataset.discussionId;
    if (id) await openDiscussionDetail(id);
  });
}

async function openDiscussionDetail(id) {
  const overlay = document.getElementById("discussionPopupOverlay");
  const container = document.getElementById("discussionPopupContainer");
  if (!overlay || !container) return;

  overlay.removeAttribute("hidden");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";
  container.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;

  const currentDiscussions = window._currentDiscussions || [];
  const allDiscussions = await getDiscussionsByCategory("all");
  const eventDisc = (discussionsCache || []);
  const discussion = [...currentDiscussions, ...allDiscussions, ...eventDisc].find((d) => String(d.id) === String(id));
  if (!discussion) {
    container.innerHTML = `<div class="popup-loading text-slate-500">Discussion not found</div>`;
    return;
  }

  const comments = await getComments(id);
  container.innerHTML = buildDiscussionDetailHTML(discussion, comments);

  container.querySelector("#discussion-back-btn")?.addEventListener("click", closeDiscussionDetail);
  container.querySelector("#discussion-submit-btn")?.addEventListener("click", () => {
    submitDiscussionComment(id, container);
  });
  container.querySelector("#discussion-input")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitDiscussionComment(id, container);
    }
  });
  container.querySelector("#discussion-input")?.focus();

  container.querySelectorAll(".forum-comment-like-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const commentId = btn.dataset.commentId;
      if (!commentId) return;
      const result = await likeComment(id, commentId);
      if (result) {
        const likeSpan = btn.querySelector("span");
        if (likeSpan) likeSpan.textContent = result.likes;
        const icon = btn.querySelector(".material-symbols-outlined");
        if (icon) {
          icon.textContent = result.liked ? "thumb_up" : "thumb_up";
          btn.classList.toggle("liked", result.liked);
        }
      }
    });
  });

  container.querySelector("#discussion-delete-btn")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to delete this discussion?")) return;
    const ok = await deleteDiscussion(id);
    if (ok) {
      closeDiscussionDetail();
      window.location.reload();
    } else {
      alert("Failed to delete discussion");
    }
  });

  container.querySelector("#discussion-share-btn")?.addEventListener("click", async () => {
    const url = `${window.location.origin}/community.html?discussion=${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: "Check this discussion", url }); } catch {}
    } else {
      try { await navigator.clipboard.writeText(url); alert("Link copied to clipboard!"); } catch {}
    }
  });
}

function closeDiscussionDetail() {
  const overlay = document.getElementById("discussionPopupOverlay");
  const container = document.getElementById("discussionPopupContainer");
  if (!overlay || !container || overlay.hasAttribute("hidden")) return;
  overlay.classList.remove("active");
  document.body.style.overflow = "";
  setTimeout(() => {
    container.innerHTML = "";
    overlay.setAttribute("hidden", "");
  }, 300);
}

function hideDiscussionPopup() {
  const overlay = document.getElementById("discussionPopupOverlay");
  const container = document.getElementById("discussionPopupContainer");
  if (!overlay || !container || overlay.hasAttribute("hidden")) return;
  overlay.classList.remove("active");
  overlay.setAttribute("hidden", "");
}

async function submitDiscussionComment(id, container) {
  const input = container.querySelector("#discussion-input");
  const text = input.value.trim();
  if (!text) return;
  await addComment(id, text);
  grantContribution("reply").then((res) => {
    if (res && res.newBadges && Array.isArray(res.newBadges)) {
      res.newBadges.forEach((key) => addBadgeNotification(key, key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())));
    }
  }).catch(() => {});
  input.value = "";
  const comments = await getComments(id);
  const list = container.querySelector(".discussion-detail-comments");
  if (list) {
    const lastComment = comments[comments.length - 1];
    if (lastComment) list.insertAdjacentHTML("beforeend", buildCommentHTML(lastComment, getUser()));
  }
}

function buildDiscussionDetailHTML(d, comments) {
  const eventRef = d.relatedEvent ? renderEventRef(d.relatedEvent, d._event) : "";
  const user = getUser();
  const isOwner = user && (d.author === (user.fullname || user.username));
  const isAdmin = user && user.role === "admin";
  const topActions = `
    <div class="top-actions">
      <button class="icon-btn" id="discussion-share-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
      ${isOwner || isAdmin ? `<button class="icon-btn text-red-500" id="discussion-delete-btn"><i class="fa-solid fa-trash-can"></i> Delete</button>` : ""}
    </div>
  `;
  return `
    <div class="container discussion-detail">
      <div class="top-bar">
        <button class="back-btn" id="discussion-back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
        ${topActions}
      </div>
      <div class="discussion-detail-card">
        <div class="forum-discussion-card-header">
          <div class="forum-discussion-author-avatar" style="background: linear-gradient(135deg, #23499b, #3B6FD4);">
            ${d.avatar}
          </div>
          <div class="forum-discussion-author-info">
            <span class="forum-discussion-author-name">${d.author}</span>
            <span class="forum-discussion-author-uni">${d.university || "SpringWave"}</span>
          </div>
          <span class="forum-discussion-time">${d.lastActivity}</span>
        </div>
        <h3 class="forum-discussion-title">${d.title}</h3>
        <p class="forum-discussion-preview">${d.preview}</p>
        ${eventRef}
        <div class="forum-discussion-meta">
          <span class="forum-category-badge forum-category-${d.category}">${capitalize(d.category)}</span>
          <div class="forum-discussion-tags">
            ${d.tags.map((t) => `<span class="forum-tag">${t}</span>`).join("")}
          </div>
        </div>
        <div class="forum-discussion-stats">
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">chat_bubble</span>
            ${comments.length} replies
          </span>
          <span class="forum-discussion-stat">
            <span class="material-symbols-outlined text-sm">visibility</span>
            ${d.views} views
          </span>
        </div>
      </div>
      <div class="discussion-detail-comments">
        ${comments.length === 0 ? '<p class="discussion-detail-empty">No comments yet. Be the first to reply!</p>'
          : comments.map(c => buildCommentHTML(c, user)).join("")}
      </div>
      <div class="discussion-detail-form">
        <input type="text" id="discussion-input" class="forum-comment-input" placeholder="Write a comment..." />
        <button class="forum-comment-submit" id="discussion-submit-btn">
          <span class="material-symbols-outlined text-sm">send</span> Post
        </button>
      </div>
    </div>
  `;
}

function buildCommentHTML(c, currentUser) {
  const liked = c.likedBy && currentUser && c.likedBy.some ? c.likedBy.some(id => String(id) === String(currentUser._id)) : false;
  return `
    <div class="discussion-detail-comment">
      <div class="forum-comment-avatar" style="background: linear-gradient(135deg, #23499b, #3B6FD4);">${c.avatar || (c.userName || "?").charAt(0).toUpperCase()}</div>
      <div class="forum-comment-body">
        <div class="forum-comment-header">
          <span class="forum-comment-author">${c.author || c.userName}</span>
          <span class="forum-comment-date">${c.date || c.createdAt || "recent"}</span>
        </div>
        <p class="forum-comment-text">${c.content}</p>
        <div class="forum-comment-footer">
          <button class="forum-comment-like-btn ${liked ? 'liked' : ''}" data-comment-id="${c.id}">
            <span class="material-symbols-outlined text-xs">${liked ? 'thumb_up' : 'thumb_up'}</span>
            <span>${c.likes || 0}</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

/* =============================
   UNIVERSITY GRID
   ============================= */

async function renderUniGrid() {
  const container = document.getElementById("forumUniGrid");
  if (!container) return;
  const isAuthed = isAuthenticated();
  const [unis, myUni] = await Promise.all([
    getUniversityCommunities(),
    isAuthed ? getMyUniversity().catch(() => null) : Promise.resolve(null),
  ]);
  const myUniId = myUni?._id || myUni?.id;
  const user = getUser();
  const isAdmin = user?.role === "admin";

  if (!unis || unis.length === 0) {
    container.innerHTML = `
      <div class="forum-empty" style="grid-column:1/-1;">
        <span class="material-symbols-outlined forum-empty-icon">account_balance</span>
        <p class="forum-empty-title">No university communities</p>
        <p class="forum-empty-desc">University communities are not available yet. Check back later!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = unis
    .map(
      (u) => {
      const isJoined = myUniId && (String(u.id) === String(myUniId));
      return `
    <div class="forum-uni-card" data-uni-id="${u.id}">
      <div class="forum-uni-card-top" style="background: linear-gradient(135deg, ${u.color}22, ${u.color}11);">
        <div class="forum-uni-icon" style="background: ${u.color};">
          <span class="material-symbols-outlined text-white text-2xl">account_balance</span>
        </div>
        <h3 class="forum-uni-name">${u.name}</h3>
        ${isAdmin ? `
        <div class="forum-uni-admin-actions">
          <button class="forum-uni-edit-btn" title="Edit"><span class="material-symbols-outlined text-sm">edit</span></button>
          <button class="forum-uni-delete-btn" title="Delete"><span class="material-symbols-outlined text-sm">delete</span></button>
        </div>` : ""}
      </div>
      <div class="forum-uni-card-body">
        <div class="forum-uni-stat">
          <span class="forum-uni-stat-value">${(u.memberCount || 0).toLocaleString()}</span>
          <span class="forum-uni-stat-label">Members</span>
        </div>
        <div class="forum-uni-stat">
          <span class="forum-uni-stat-value">${u.activeDiscussions}</span>
          <span class="forum-uni-stat-label">Discussions</span>
        </div>
        <button class="forum-uni-join-btn ${isJoined ? 'joined' : ''}">
          ${isJoined ? '✓ Joined' : 'Join Community'}
        </button>
      </div>
    </div>
  `}).join("");

  function updateMemberCount(cardEl, delta) {
    const stat = cardEl?.querySelector(".forum-uni-stat-value");
    if (!stat) return;
    const current = parseInt(stat.textContent.replace(/,/g, "")) || 0;
    stat.textContent = (current + delta).toLocaleString();
  }

  container.querySelectorAll(".forum-uni-join-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const card = btn.closest(".forum-uni-card");
      const id = card?.dataset.uniId;
      if (!id) return;
      if (btn.classList.contains("joined")) {
        await leaveUniversity(id);
        btn.classList.remove("joined");
        btn.textContent = "Join Community";
        updateMemberCount(card, -1);
      } else {
        const res = await joinUniversity(id);
        if (res) {
          const prevJoined = document.querySelector(".forum-uni-join-btn.joined");
          if (prevJoined) updateMemberCount(prevJoined.closest(".forum-uni-card"), -1);
          document.querySelectorAll(".forum-uni-join-btn").forEach(b => {
            b.classList.remove("joined");
            b.textContent = "Join Community";
          });
          btn.classList.add("joined");
          btn.textContent = "✓ Joined";
          updateMemberCount(card, 1);
        }
      }
    });
  });

  container.querySelectorAll(".forum-uni-edit-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const card = btn.closest(".forum-uni-card");
      const id = card?.dataset.uniId;
      if (!id) return;
      const uni = unis.find(u => String(u.id) === String(id));
      if (!uni) return;
      openUniDialog(uni, async (name, description, color) => {
        const result = await updateUniversity(id, { name, description, color });
        if (result) window.location.reload();
      });
    });
  });

  container.querySelectorAll(".forum-uni-delete-btn").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const card = btn.closest(".forum-uni-card");
      const id = card?.dataset.uniId;
      if (!id) return;
      if (!confirm("Delete this university? This action cannot be undone.")) return;
      const ok = await deleteUni(id);
      if (ok) window.location.reload();
    });
  });
}

/* =============================
   TOPIC GRID
   ============================= */

async function renderTopicGrid() {
  const container = document.getElementById("forumTopicGrid");
  if (!container) return;
  const topics = await getSkillTopics();
  if (!topics || topics.length === 0) {
    container.innerHTML = `
      <div class="forum-empty" style="grid-column:1/-1;">
        <span class="material-symbols-outlined forum-empty-icon">school</span>
        <p class="forum-empty-title">No skill topics yet</p>
        <p class="forum-empty-desc">Skill discussion topics are being curated. Stay tuned!</p>
      </div>
    `;
    return;
  }
  container.innerHTML = topics
    .map(
      (t) => `
    <div class="forum-topic-card" data-topic="${t.name}" style="cursor:pointer;">
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

  container.querySelectorAll(".forum-topic-card").forEach((card) => {
    card.addEventListener("click", async () => {
      const topic = card.dataset.topic;
      if (!topic) return;
      window.location.href = `./community.html?cat=skills&topic=${encodeURIComponent(topic)}`;
    });
  });
}

/* =============================
   UNIVERSITY DIALOG
   ============================= */

let uniDialogCallback = null;
let uniDialogMode = "create";
let uniDialogEditId = null;

function initUniDialog() {
  const overlay = document.getElementById("uniDialog");
  const closeBtn = document.getElementById("uniDialogClose");
  const cancelBtn = document.getElementById("uniDialogCancel");
  const saveBtn = document.getElementById("uniDialogSave");
  const colorPicker = document.getElementById("uniColorPicker");
  const colorHex = document.getElementById("uniColorHex");

  if (!overlay) return;

  function close() {
    overlay.style.display = "none";
    document.body.style.overflow = "";
  }

  closeBtn?.addEventListener("click", close);
  cancelBtn?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  colorPicker?.addEventListener("input", () => {
    if (colorHex) colorHex.value = colorPicker.value;
  });

  colorHex?.addEventListener("input", () => {
    const val = colorHex.value.trim();
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      if (colorPicker) colorPicker.value = val;
    }
  });

  document.querySelectorAll(".forum-uni-color-swatch").forEach(swatch => {
    swatch.addEventListener("click", () => {
      const color = swatch.dataset.color;
      if (colorPicker) colorPicker.value = color;
      if (colorHex) colorHex.value = color;
      document.querySelectorAll(".forum-uni-color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
    });
  });

  saveBtn?.addEventListener("click", () => {
    const name = document.getElementById("uniName")?.value.trim();
    if (!name) {
      document.getElementById("uniName")?.focus();
      return;
    }
    const description = document.getElementById("uniDescription")?.value.trim() || "";
    const color = document.getElementById("uniColorPicker")?.value || "#3B6FD4";
    close();
    if (uniDialogCallback) uniDialogCallback(name, description, color);
    uniDialogCallback = null;
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.style.display !== "none") close();
  });
}

function openUniDialog(editData, callback) {
  const overlay = document.getElementById("uniDialog");
  const title = document.getElementById("uniDialogTitle");
  const nameInput = document.getElementById("uniName");
  const descInput = document.getElementById("uniDescription");
  const colorPicker = document.getElementById("uniColorPicker");
  const colorHex = document.getElementById("uniColorHex");
  if (!overlay) return;

  if (editData) {
    title.textContent = "Edit University";
    nameInput.value = editData.name || "";
    descInput.value = editData.description || "";
    const c = editData.color || "#3B6FD4";
    if (colorPicker) colorPicker.value = c;
    if (colorHex) colorHex.value = c;
  } else {
    title.textContent = "Add University";
    nameInput.value = "";
    descInput.value = "";
    if (colorPicker) colorPicker.value = "#3B6FD4";
    if (colorHex) colorHex.value = "#3B6FD4";
  }

  document.querySelectorAll(".forum-uni-color-swatch").forEach(s => s.classList.remove("active"));

  uniDialogCallback = callback;
  overlay.style.display = "flex";
  document.body.style.overflow = "hidden";
  setTimeout(() => nameInput?.focus(), 100);
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
  const categorySelect = document.getElementById("postCategory");
  const postEventCards = document.getElementById("postEventCards");
  const postSkillPills = document.getElementById("postSkillPills");
  const postScopeField = document.getElementById("postScopeField");

  let selectedEventId = null;
  let selectedSkill = "";
  let closeTimer = null;

  async function loadEventCards() {
    if (!postEventCards) return;
    postEventCards.innerHTML = '<div class="forum-post-loading-events">Loading events...</div>';
    const events = await getEvents();
    if (!events || events.length === 0) {
      postEventCards.innerHTML = '<div class="forum-post-empty-events">No upcoming events</div>';
      return;
    }
    postEventCards.innerHTML = events.map(e => {
      const parts = (e.date || "").split(" ");
      const isSelected = String(e.id) === String(selectedEventId);
      return `
      <div class="forum-post-event-card ${isSelected ? 'selected' : ''}" data-event-id="${e.id}">
        <div class="forum-post-event-date">
          <span class="forum-post-event-day">${parts[0] || "?"}</span>
          <span class="forum-post-event-month">${parts[1] || ""}</span>
        </div>
        <div class="forum-post-event-info">
          <span class="forum-post-event-title">${e.title}</span>
        </div>
        <span class="forum-post-event-check ${isSelected ? '' : 'hidden'}">
          <span class="material-symbols-outlined text-sm">check_circle</span>
        </span>
      </div>
    `}).join("");

    postEventCards.querySelectorAll(".forum-post-event-card").forEach(card => {
      card.addEventListener("click", () => {
        postEventCards.querySelectorAll(".forum-post-event-card").forEach(c => {
          c.classList.remove("selected");
          c.querySelector(".forum-post-event-check")?.classList.add("hidden");
        });
        card.classList.add("selected");
        card.querySelector(".forum-post-event-check")?.classList.remove("hidden");
        selectedEventId = card.dataset.eventId;
      });
    });
  }

  function updateCategoryUI(category) {
    const isEvent = category === "event";
    const isSkills = category === "skills";

    if (postEventCards) postEventCards.style.display = isEvent ? "" : "none";
    if (postSkillPills) postSkillPills.style.display = isSkills ? "" : "none";

    if (isEvent) loadEventCards();
    if (isSkills) selectedSkill = "";
  }

  if (categorySelect) {
    categorySelect.addEventListener("change", () => updateCategoryUI(categorySelect.value));
  }

  if (postSkillPills) {
    postSkillPills.querySelectorAll(".forum-post-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        postSkillPills.querySelectorAll(".forum-post-pill").forEach(p => p.classList.remove("selected"));
        pill.classList.add("selected");
        selectedSkill = pill.dataset.skill;
      });
    });
  }

  async function checkScope() {
    if (!postScopeField) return;
    if (!isAuthenticated()) { postScopeField.style.display = "none"; return; }
    const myUni = await getMyUniversity().catch(() => null);
    const myUniId = myUni?._id || myUni?.id;
    postScopeField.style.display = myUniId ? "" : "none";
  }

  function open() {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    selectedEventId = null;
    selectedSkill = "";
    overlay.style.display = "flex";
    requestAnimationFrame(() => {
      overlay.classList.add("active");
    });
    document.body.style.overflow = "hidden";

    const cat = categorySelect?.value || "general";
    updateCategoryUI(cat);
    checkScope();
  }
  window.openPostModal = open;

  function close() {
    overlay.classList.remove("active");
    closeTimer = setTimeout(() => {
      overlay.style.display = "none";
    }, 300);
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
    publishBtn.addEventListener("click", async () => {
      const title = document.getElementById("postTitle")?.value.trim();
      if (!title) {
        document.getElementById("postTitle")?.focus();
        return;
      }
      publishBtn.disabled = true;
      try {
        const category = categorySelect?.value || "general";
        const content = document.getElementById("postContent")?.value.trim() || "";
        const tagsInput = document.getElementById("postTags")?.value || "";
        const tags = tagsInput ? tagsInput.split(",").map(t => t.trim()).filter(Boolean) : [];

        let relatedEvent = undefined;
        if (category === "event" && selectedEventId) relatedEvent = selectedEventId;
        if (category === "skills" && selectedSkill) tags.push(selectedSkill);

        const scopeEl = document.querySelector('input[name="scope"]:checked');
        const scope = scopeEl?.value === "community" ? "community" : "general";
        let communityId = undefined;
        if (scope === "community") {
          const myUni = await getMyUniversity().catch(() => null);
          communityId = myUni?._id || myUni?.id;
        }

        const result = await createDiscussionWithScope({
          title, content, category, tags, relatedEvent, scope, communityId,
        });

        if (result) {
          grantContribution("discussion").then((res) => {
            if (res && res.newBadges && Array.isArray(res.newBadges)) {
              res.newBadges.forEach((key) => addBadgeNotification(key, key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())));
            }
          }).catch(() => {});

          const u = getUser();
          result.avatar = (result.author || u?.username || "?")[0].toUpperCase();
          result.university = u?.university || u?.school || "";
          result.lastActivity = "Just now";
          result.preview = content.substring(0, 150) + (content.length > 150 ? "..." : "");
          result.tags = tags;
          result.replies = 0;
          result.views = 0;
        }

        close();
        document.getElementById("postTitle").value = "";
        document.getElementById("postContent").value = "";
        document.getElementById("postTags").value = "";
        selectedEventId = null;
        selectedSkill = "";

        if (result) {
          const container = document.getElementById("forumDiscussions");
          const empty = container?.querySelector(".forum-empty");
          const cardHTML = buildDiscussionCardHTML(result);
          if (empty) {
            container.innerHTML = cardHTML;
          } else {
            container.insertAdjacentHTML("afterbegin", cardHTML);
          }
          if (Array.isArray(window._currentDiscussions)) {
            window._currentDiscussions.unshift(result);
          }

          const uniId = communityId || document.querySelector(".forum-uni-join-btn.joined")?.closest(".forum-uni-card")?.dataset.uniId;
          if (uniId) {
            const uniCard = document.querySelector(`.forum-uni-card[data-uni-id="${uniId}"]`);
            const discStats = uniCard?.querySelectorAll(".forum-uni-stat-value");
            const discStat = discStats?.[1];
            if (discStat) {
              const current = parseInt(discStat.textContent.replace(/,/g, "")) || 0;
              discStat.textContent = (current + 1).toLocaleString();
            }
          }
        }
      } finally {
        publishBtn.disabled = false;
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) close();
  });
}

/* =============================
   EVENT DETAIL POPUP
   ============================= */

function initEventDetailPopup() {
  const overlay = document.getElementById("eventPopupOverlay");
  const backdrop = document.getElementById("eventPopupBackdrop");
  const container = document.getElementById("eventPopupContainer");

  async function open(eventId) {
  window.openEventDetailPopup = open;
    if (!eventId) return;
    container.innerHTML = `<div class="popup-loading"><div class="spinner"></div></div>`;
    overlay.removeAttribute("hidden");
    overlay.classList.add("active");
    document.body.style.overflow = "hidden";

    try {
      const { activity } = await getActivityById(eventId);
      container.innerHTML = buildEventDetailPopupHTML(activity);
    } catch {
      const event = await getEventById(eventId);
      if (event) {
        container.innerHTML = buildEventDetailPopupHTML({
          activityID: event.id,
          title: event.title,
          heldDate: event.date,
          type: "event",
          location: "Da Nang",
          hostName: "SpringWave",
          description: "Join the community discussion about this event! Share your thoughts, ask questions, and connect with other attendees.",
          thumbnail: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop",
          attachments: [],
        });
      } else {
        container.innerHTML = `<div class="popup-loading text-slate-500">Event not found</div>`;
      }
    }

    container.querySelector("#back-btn")?.addEventListener("click", close);

    container.querySelector(".icon-btn")?.addEventListener("click", () => {
      const id = eventId;
      const title = "SpringWave Event";
      const url = `${window.location.origin}/explore.html?event=${id}`;
      if (navigator.share) {
        navigator.share({ title, url }).catch(() => {});
      } else {
        navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!")).catch(() => {});
      }
    });
  }

  function close() {
    overlay.classList.remove("active");
    setTimeout(() => {
      container.innerHTML = "";
      overlay.setAttribute("hidden", "");
      const discOverlay = document.getElementById("discussionPopupOverlay");
      const discContainer = document.getElementById("discussionPopupContainer");
      if (discOverlay && discContainer && discContainer.innerHTML && discOverlay.hasAttribute("hidden")) {
        discOverlay.removeAttribute("hidden");
        requestAnimationFrame(() => discOverlay.classList.add("active"));
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "";
      }
    }, 300);
  }

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || backdrop?.contains(e.target)) close();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hasAttribute("hidden")) close();
  });

  document.addEventListener("click", async (e) => {
    const ref = e.target.closest(".forum-event-ref");
    if (!ref) return;
    const eventId = ref.dataset.eventId;
    if (eventId) {
      hideDiscussionPopup();
      await open(eventId);
    }
  });
}

function buildEventDetailPopupHTML(a) {
  const heldDate = formatDate(a.heldDate);
  const type = capitalize(a.type);
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.location)}`;
  const filesHTML = (a.attachments || []).map(f => {
    const link = f.link || f.activityAttachLink || "";
    const fileName = decodeURIComponent(link.split('/').pop());
    return `<div class="file-item">
        <div class="file-left">
            <div class="file-icon"><i class="fa-solid fa-file"></i></div>
            <div><h4>${fileName}</h4></div>
        </div>
        <a class="download-btn" href="${CDN_DOMAIN}/${link}" target="_blank"><i class="fa-solid fa-download"></i></a>
    </div>`;
  }).join("");

  return `
    <div class="container">
      <div class="top-bar">
        <button class="back-btn" id="back-btn"><i class="fa-solid fa-arrow-left"></i> Back</button>
        <div class="top-actions">
          <button class="icon-btn"><i class="fa-solid fa-share-nodes"></i> Share</button>
          <button type="button" class="favorite-btn"><div class="star"><i class="fa-solid fa-star"></i></div><span class="favorite-text">Favourite</span></button>
        </div>
      </div>
      <div class="main-content">
        <div class="left-panel">
          <img src="${a.thumbnail || "https://images.unsplash.com/photo-1618477462146-050d2767eac4?q=80&w=1200&auto=format&fit=crop"}" alt="${a.title}">
          <div class="tag"><i class="fa-solid fa-tag"></i> ${type}</div>
          <div class="details-card">
            <h2>Details</h2>
            <div class="detail-item"><i class="fa-solid fa-location-dot"></i><div><span>Location</span><p>${a.location}</p></div></div>
            <div class="detail-item"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${heldDate}</p></div></div>
            <div class="detail-item"><i class="fa-regular fa-user"></i><div><span>Host</span><p>${a.hostName || a.createdByName || "Unknown"}</p></div></div>
            <div class="detail-item"><i class="fa-solid fa-tag"></i><div><span>Type</span><p>${type}</p></div></div>
          </div>
        </div>
        <div class="right-panel">
          <h1 class="title">${a.title}</h1>
          <a class="location-link" href="${googleMapsLink}" target="_blank"><i class="fa-solid fa-location-dot"></i> ${a.location}</a>
          <div class="info-boxes">
            <div class="info-box"><i class="fa-regular fa-calendar"></i><div><span>Date</span><p>${heldDate}</p></div></div>
            <div class="info-box"><i class="fa-regular fa-user"></i><div><span>Hosted by</span><p>${a.hostName || a.createdByName || "Unknown"}</p></div></div>
          </div>
          <div class="description-panel">
            ${(a.description || "").split('\n').filter(p => p.trim()).map(p => `<p>${p}</p>`).join('')}
          </div>
          ${filesHTML ? `<div class="files-box"><h3>Attached Files (${(a.attachments || []).length})</h3>${filesHTML}</div>` : ""}
        </div>
      </div>
    </div>`;
}

function initDiscussionPopupClose() {
  const overlay = document.getElementById("discussionPopupOverlay");
  const backdrop = document.getElementById("discussionPopupBackdrop");
  if (!overlay) return;

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || backdrop?.contains(e.target)) closeDiscussionDetail();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hasAttribute("hidden")) closeDiscussionDetail();
  });
}


