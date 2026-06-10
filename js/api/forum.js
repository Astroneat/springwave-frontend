import { get, post, put, del } from "./client.js";
import { getToken } from "../lib/session.js";
import { formatDate } from "../lib/utils.js";

const DISCUSSIONS_FALLBACK = [
  { id: "mock-1", author: "Minh Anh", university: "University of Da Nang", avatar: "M", title: "Anyone joining AI Hackathon 2026?", preview: "Looking for teammates interested in NLP and computer vision.", category: "general", tags: ["AI", "Hackathon"], replies: 12, views: 234, lastActivity: "2h ago" },
  { id: "mock-2", author: "Thanh Trung", university: "Duy Tan University", avatar: "T", title: "How can I prepare for a startup competition?", preview: "First time joining a startup pitch competition.", category: "skills", tags: ["Startup", "Pitching"], replies: 8, views: 156, lastActivity: "5h ago" },
  { id: "mock-3", author: "Huy Nguyen", university: "University of Education", avatar: "H", title: "Best opportunities for first-year students?", preview: "Just started uni and want to make the most of my time.", category: "skills", tags: ["First Year"], replies: 24, views: 412, lastActivity: "1d ago" },
  { id: "mock-4", author: "Linh Chi", university: "University of Economics", avatar: "L", title: "Volunteer Program at Green City Project", preview: "Anyone participated in the Green City volunteering program?", category: "general", tags: ["Volunteer"], replies: 6, views: 89, lastActivity: "3h ago" },
  { id: "mock-5", author: "Khoa Nguyen", university: "University of Science and Technology", avatar: "K", title: "Recommendations for UI/UX workshops", preview: "Looking for good UI/UX design workshops.", category: "skills", tags: ["UI/UX"], replies: 15, views: 198, lastActivity: "6h ago" },
  { id: "mock-6", author: "Phuong Anh", university: "University of Foreign Languages", avatar: "P", title: "Networking tips for international students", preview: "Being an international student, I find it hard to connect.", category: "skills", tags: ["Networking"], replies: 19, views: 276, lastActivity: "4h ago" },
];

const UNIVERSITIES_FALLBACK = [
  { id: 1, name: "University of Da Nang", memberCount: 2840, activeDiscussions: 156, color: "#3B6FD4" },
  { id: 2, name: "Duy Tan University", memberCount: 1950, activeDiscussions: 98, color: "#10B981" },
  { id: 3, name: "FPT University", memberCount: 1680, activeDiscussions: 87, color: "#F59E0B" },
  { id: 4, name: "University of Education", memberCount: 920, activeDiscussions: 45, color: "#8B5CF6" },
];

const SKILLS_FALLBACK = [
  { id: 1, name: "Communication", icon: "forum", discussionCount: 156, color: "#3B82F6", description: "Public speaking, writing, presentation & more" },
  { id: 2, name: "Technical", icon: "code", discussionCount: 234, color: "#8B5CF6", description: "Coding, engineering, problem-solving & more" },
  { id: 3, name: "Creativity", icon: "palette", discussionCount: 112, color: "#F59E0B", description: "Design, innovation, artistic thinking & more" },
  { id: 4, name: "Social Impact", icon: "volunteer_activism", discussionCount: 89, color: "#10B981", description: "Leadership, community, volunteering & more" },
];

const COMMENTS_FALLBACK = [
  { id: 1, discussionId: "mock-1", author: "Quang Huy", avatar: "Q", content: "Count me in!", date: "1h ago", likes: 5 },
  { id: 2, discussionId: "mock-1", author: "Mai Lan", avatar: "M", content: "Great initiative!", date: "45m ago", likes: 3 },
  { id: 3, discussionId: "mock-2", author: "Bao Tran", avatar: "B", content: "Focus on your MVP first.", date: "4h ago", likes: 8 },
  { id: 4, discussionId: "mock-3", author: "Thao Vy", avatar: "T", content: "First year is the best time to explore!", date: "12h ago", likes: 10 },
  { id: 5, discussionId: "mock-4", author: "Kim Ngan", avatar: "K", content: "Amazing experience!", date: "2h ago", likes: 4 },
  { id: 6, discussionId: "mock-5", author: "Tuan Anh", avatar: "T", content: "Check Coursera for free courses.", date: "5h ago", likes: 6 },
  { id: 7, discussionId: "mock-6", author: "Minh Thu", avatar: "M", content: "Join the International Student Club!", date: "3h ago", likes: 5 },
];

let discussionsCache = null;
let commentsCache = {};

export async function getTrendingDiscussions() {
  try {
    const data = await get("/community/discussions?sort=trending&limit=20");
    if (data?.discussions) {
      discussionsCache = data.discussions;
      return data.discussions;
    }
  } catch {}
  return DISCUSSIONS_FALLBACK;
}

export async function getDiscussionsByCategory(category) {
  if (category === "event") return [];
  if (category === "uni") return [];
  if (category === "mine") return getMyDiscussions();
  if (category === "saved") return getSavedDiscussions();
  try {
    const params = category === "all" ? "" : `?category=${category}`;
    const data = await get(`/community/discussions${params}`);
    if (data?.discussions) {
      discussionsCache = data.discussions;
      return data.discussions;
    }
  } catch {}
  if (category === "all") return DISCUSSIONS_FALLBACK;
  return DISCUSSIONS_FALLBACK.filter(d => d.category === category);
}

export async function getComments(discussionId) {
  try {
    const data = await get(`/community/discussions/${discussionId}/comments`);
    if (data?.comments) {
      commentsCache[discussionId] = data.comments;
      return data.comments;
    }
  } catch {}
  return COMMENTS_FALLBACK.filter(c => String(c.discussionId) === String(discussionId));
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

export async function addComment(discussionId, content) {
  try {
    const data = await post(`/community/discussions/${discussionId}/comments`, { content });
    return data?.comment || null;
  } catch {
    const user = (() => { try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; } })();
    return { id: Date.now(), discussionId, author: user.fullname || "You", avatar: (user.fullname || "Y")[0], content, date: "Just now", likes: 0 };
  }
}

export async function getUniversityCommunities() {
  try {
    const data = await get("/community/universities");
    if (data?.universities) return data.universities;
  } catch {}
  return UNIVERSITIES_FALLBACK;
}

export async function getSkillTopics() {
  try {
    const data = await get("/community/skills");
    if (data?.skills) return data.skills;
  } catch {}
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

export async function createDiscussionWithScope({ title, content, category, tags, relatedEvent, scope, communityId }) {
  try {
    const data = await post("/community/discussions", {
      title, content, category, tags: tags || [],
      relatedEvent: relatedEvent || undefined,
      scope: scope || "general",
      communityId: communityId || undefined,
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

export async function saveDiscussion(id) {
  try {
    await post(`/community/discussions/${id}/save`, {});
    return true;
  } catch {
    return false;
  }
}

export async function unsaveDiscussion(id) {
  try {
    await del(`/community/discussions/${id}/save`);
    return true;
  } catch {
    return false;
  }
}

export async function getSavedDiscussions() {
  try {
    const data = await get("/community/discussions/saved/me");
    if (data?.discussions) return data.discussions;
  } catch {}
  return [];
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
    if (data?.activity) return { id: data.activity._id || id, title: data.activity.title, date: formatDate(data.activity.heldDate), attendees: data.activity.viewCount || 0 };
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
