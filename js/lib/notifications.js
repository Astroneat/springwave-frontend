const STORAGE_KEY = "springwave_notifications";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function save(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
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

export function markRead(id) {
  const list = load();
  const n = list.find((item) => item.id === id);
  if (n) n.read = true;
  save(list);
  window.dispatchEvent(new CustomEvent("notifications-updated"));
}

export function markAllRead() {
  const list = load();
  list.forEach((n) => (n.read = true));
  save(list);
  window.dispatchEvent(new CustomEvent("notifications-updated"));
}
