import { getNotifications as fetchServerNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead } from "../api/forum.js";
import { isAuthenticated, getUser } from "../lib/session.js";

const NOTIF_POLL_INTERVAL = 30000;

let pollTimer = null;

function getStorageKey() {
  const user = getUser();
  return user ? `springwave_notifications_${user._id}` : "springwave_notifications_guest";
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(getStorageKey()) || "[]");
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(getStorageKey(), JSON.stringify(list));
}

export function getNotifications() {
  return load();
}

export function getUnreadCount() {
  return load().filter((n) => !n.read).length;
}

export function addBadgeNotification(badgeKey, badgeLabel) {
  const list = load();
  const exists = list.some((n) => n.type === "badge" && n.badgeKey === badgeKey);
  if (exists) return;
  list.unshift({
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    type: "badge",
    badgeKey,
    message: `You earned the "${badgeLabel}" badge!`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  save(list);
  window.dispatchEvent(new CustomEvent("notifications-updated"));
}

export function addInteractionNotification(type, message, discussionId) {
  if (!isAuthenticated()) return;
  const list = load();
  list.unshift({
    id: "notif_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
    type: type,
    message: message,
    createdAt: new Date().toISOString(),
    read: false,
    discussionId: discussionId,
  });
  if (list.length > 100) list.length = 100;
  save(list);
  window.dispatchEvent(new CustomEvent("notifications-updated"));
}

export function markRead(id) {
  const list = load();
  const n = list.find((item) => item.id === id);
  if (n) n.read = true;
  save(list);
  markNotificationRead(id).catch(() => {});
  window.dispatchEvent(new CustomEvent("notifications-updated"));
}

export function markAllRead() {
  const list = load();
  list.forEach((n) => (n.read = true));
  save(list);
  markAllNotificationsRead().catch(() => {});
  window.dispatchEvent(new CustomEvent("notifications-updated"));
}

export async function pollServerNotifications() {
  if (!isAuthenticated()) return;
  try {
    const serverNotifs = await fetchServerNotifications();
    if (!serverNotifs || serverNotifs.length === 0) return;
    const localList = load();
    const serverIds = new Set(serverNotifs.map(n => n._id));
    const existingIds = new Set(localList.map(n => n.id));
    const newNotifs = serverNotifs
      .filter(n => !existingIds.has(n._id))
      .map(n => ({
        id: n._id,
        type: n.type,
        message: n.message,
        createdAt: n.createdAt,
        read: n.read,
        discussionId: n.discussionId,
        actorName: n.actorName,
      }));
    if (newNotifs.length > 0) {
      localList.unshift(...newNotifs);
      if (localList.length > 100) localList.length = 100;
      save(localList);
      window.dispatchEvent(new CustomEvent("notifications-updated"));
    }
    return serverNotifs;
  } catch {
    return [];
  }
}

export function startNotificationPolling() {
  stopNotificationPolling();
  pollServerNotifications();
  pollTimer = setInterval(pollServerNotifications, NOTIF_POLL_INTERVAL);
}

export function stopNotificationPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}
