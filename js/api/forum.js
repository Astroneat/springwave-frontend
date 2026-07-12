import { get, post, put, del } from "./client.js";
import { getToken, getUser } from "../lib/session.js";
import { formatDate } from "../lib/utils.js";

import { 
  DISCUSSIONS_MOCK as DISCUSSIONS_FALLBACK, 
  UNIVERSITIES_MOCK as UNIVERSITIES_FALLBACK, 
  SKILLS_MOCK as SKILLS_FALLBACK, 
  COMMENTS_MOCK as COMMENTS_FALLBACK 
} from "./mockdatacommunity.js";

let discussionsCache = null;
let commentsCache = {};

export async function getTrendingDiscussions() {
  return DISCUSSIONS_FALLBACK;
}

export async function getDiscussionsByCategory(category) {
  if (category === "uni") return [];
  if (category === "mine") return getMyDiscussions();
  if (category === "saved") return getSavedDiscussions();
  if (category === "all") return DISCUSSIONS_FALLBACK;
  return DISCUSSIONS_FALLBACK.filter(d => d.category === category);
}

const COMMENTS_KEY_PREFIX = "forum_comments_";

function getStoredComments(discussionId) {
  try {
    return JSON.parse(localStorage.getItem(COMMENTS_KEY_PREFIX + discussionId) || "[]");
  } catch {
    return [];
  }
}

function storeComment(discussionId, comment) {
  const key = COMMENTS_KEY_PREFIX + discussionId;
  const stored = getStoredComments(discussionId);
  if (!stored.find(c => String(c.id) === String(comment.id))) {
    stored.push(comment);
    localStorage.setItem(key, JSON.stringify(stored));
  }
}

export async function getComments(discussionId) {
  let fallback = COMMENTS_FALLBACK.filter(c => String(c.discussionId) === String(discussionId));
  const stored = getStoredComments(discussionId);
  const merged = [...fallback];
  stored.forEach(s => {
    if (!merged.find(m => String(m.id) === String(s.id))) {
      merged.push(s);
    }
  });
  return merged;
}

export async function addComment(discussionId, content) {
  try {
    const data = await post(`/community/discussions/${discussionId}/comments`, { content });
    if (data?.comment) {
      storeComment(discussionId, data.comment);
      return data.comment;
    }
    return null;
  } catch {
    const user = getUser() || {};
    const comment = { id: Date.now(), discussionId, author: user.fullname || "You", avatar: (user.fullname || "Y")[0], content, date: "Just now", likes: 0 };
    storeComment(discussionId, comment);
    return comment;
  }
}

export async function getTopComment(discussionId) {
  try {
    const comments = await getComments(discussionId);
    if (comments.length === 0) return null;
    return comments.reduce((best, c) => (c.likes || 0) > (best.likes || 0) ? c : best);
  } catch {
    return null;
  }
}

export async function getUniversityCommunities() {
  return UNIVERSITIES_FALLBACK;
}

export async function getSkillTopics() {
  return SKILLS_FALLBACK;
}

export async function getUpcomingEvents() {
  try {
    const data = await get("/community/sidebar");
    if (data?.upcomingEvents) return data.upcomingEvents;
  } catch {}
  return [];
}

export async function getPopularDiscussions() {
  try {
    const data = await get("/community/sidebar");
    if (data?.popular) return data.popular;
  } catch {}
  return [];
}

export async function getAISuggestions() {
  try {
    const token = getToken();
    if (!token) return [];
    const { getRecommendations } = await import("./recommendations.js");
    const data = await getRecommendations();
    const recs = data?.recommendations || [];
    return recs.slice(0, 3).map(r => ({
      id: r._id || r.activityID,
      title: r.title || "Recommended activity",
      reason: `${r.type || "Activity"} • Matches your interests`,
    }));
  } catch {}
  return [];
}

export async function getStats() {
  try {
    const data = await get("/community/stats");
    if (data) return data;
  } catch {}
  return { students: 15000, discussions: 2000, universities: 10 };
}

export async function joinUniversity(id) {
  return post(`/community/universities/${id}/join`, {});
}

export async function leaveUniversity(id) {
  return post(`/community/universities/${id}/leave`, {});
}

export async function getMyUniversity() {
  try {
    const data = await get("/community/universities/me");
    return data?.university || null;
  } catch {}
  return null;
}

export async function createDiscussionWithScope({ title, content, category, tags, relatedEvent, scope, communityId, cfTurnstileResponse, postAsOrg, orgId }) {
  try {
    const data = await post("/community/discussions", {
      title, content, category, tags: tags || [],
      relatedEvent: relatedEvent || undefined,
      scope: scope || "general",
      communityId: communityId || undefined,
      cfTurnstileResponse: cfTurnstileResponse || undefined,
      postAsOrg: postAsOrg || undefined,
      orgId: orgId || undefined,
    });
    return data?.discussion || null;
  } catch {
    return null;
  }
}

export async function getCommunityDiscussions(communityId) {
  try {
    const data = await get(`/community/discussions?scope=community&communityId=${communityId}&limit=20`);
    if (data?.discussions) return data.discussions;
  } catch {}
  return [];
}

export async function deleteDiscussion(id) {
  try {
    await del(`/community/discussions/${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function createUniversity(name, description, color) {
  try {
    const data = await post("/community/universities", { name, description: description || "", color: color || "#3B6FD4" });
    return data?.university || null;
  } catch {
    return null;
  }
}

export async function updateUniversity(id, updates) {
  try {
    const data = await put(`/community/universities/${id}`, updates);
    return data?.university || null;
  } catch {
    return null;
  }
}

export async function deleteUniversity(id) {
  try {
    await del(`/community/universities/${id}`);
    return true;
  } catch {
    return false;
  }
}

export async function likeComment(discussionId, commentId) {
  try {
    const data = await post(`/community/discussions/${discussionId}/comments/${commentId}/like`, {});
    return data || null;
  } catch {
    return null;
  }
}

export async function deleteDiscussionComment(discussionId, commentId) {
  try {
    await del(`/community/discussions/${discussionId}/comments/${commentId}`);
    return true;
  } catch {
    return false;
  }
}

export async function addReply(discussionId, content, replyToId) {
  try {
    const data = await post(`/community/discussions/${discussionId}/comments`, { content, replyToId });
    if (data?.comment) {
      storeComment(discussionId, data.comment);
      return data.comment;
    }
    return null;
  } catch {
    const user = getUser() || {};
    const comment = { id: Date.now(), discussionId, author: user.fullname || "You", avatar: (user.fullname || "Y")[0], content, replyToId, date: "Just now", likes: 0, replyTo: { userId: replyToId } };
    storeComment(discussionId, comment);
    return comment;
  }
}

export async function getNotifications() {
  try {
    const data = await get("/notifications");
    if (data?.notifications) return data.notifications;
  } catch {}
  return [];
}

export async function getUnreadNotificationCount() {
  try {
    const data = await get("/notifications/unread-count");
    return data?.count || 0;
  } catch {}
  return 0;
}

export async function markNotificationRead(id) {
  try {
    await put(`/notifications/${id}/read`, {});
    return true;
  } catch {
    return false;
  }
}

export async function markAllNotificationsRead() {
  try {
    await put("/notifications/read-all", {});
    return true;
  } catch {
    return false;
  }
}

export async function getUniversityMembers(uniId) {
  try {
    const data = await get(`/community/universities/${uniId}/members`);
    if (data?.members) return data.members;
  } catch {}
  return [];
}

const SAVED_KEY = "saved_discussions";

function getSavedIds() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveIdLocally(id) {
  const ids = getSavedIds();
  if (!ids.includes(String(id))) {
    ids.push(String(id));
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  }
}

function unsaveIdLocally(id) {
  const ids = getSavedIds().filter(sid => sid !== String(id));
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
}

export async function saveDiscussion(id) {
  try {
    await post(`/community/discussions/${id}/save`, {});
    return true;
  } catch {
    saveIdLocally(id);
    return true;
  }
}

export async function unsaveDiscussion(id) {
  try {
    await del(`/community/discussions/${id}/save`);
    return true;
  } catch {
    unsaveIdLocally(id);
    return true;
  }
}

export async function getSavedDiscussions() {
  try {
    const data = await get("/community/discussions/saved/me");
    if (data?.discussions) return data.discussions;
  } catch {}
  const savedIds = getSavedIds();
  if (savedIds.length === 0) return [];
  return DISCUSSIONS_FALLBACK.filter(d => savedIds.includes(String(d.id)));
}

export async function getMyDiscussions() {
  try {
    const data = await get("/community/discussions?author=me");
    if (data?.discussions) return data.discussions;
  } catch {}
  return [];
}

export async function getEventById(id) {
  const { getActivityById } = await import("./activities.js");
  try {
    const data = await getActivityById(id);
    if (data?.activity) return { id: data.activity._id || id, title: data.activity.title, date: formatDate(data.activity.heldDate), attendees: data.activity.participants || 0 };
  } catch {}
  return null;
}

export async function getEvents() {
  try {
    const data = await get("/community/sidebar");
    if (data?.upcomingEvents) return data.upcomingEvents;
  } catch {}
  return [];
}
