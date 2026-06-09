# Contribution & Badge System

A community engagement system replacing the old EXP/gamification panel. Points and badges are earned through forum actions (discussions, replies, likes), not event attendance — since we only post event info, not track real participation.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Contribution Score](#2-contribution-score)
3. [Badge System — How It Works](#3-badge-system--how-it-works)
4. [All 16 Badges](#4-all-16-badges)
5. [Backend API Reference](#5-backend-api-reference)
6. [Notification System](#6-notification-system)
7. [Toast on Profile](#7-toast-on-profile)
8. [Complete File Reference](#8-complete-file-reference)
9. [What Still Needs Backend](#9-what-still-needs-backend)
10. [FAQ](#10-faq)

---

## 1. Architecture Overview

```
                    ┌─────────────────────────────┐
                    │     Backend (api.springwave) │
                    │  GET /user/contribution      │
                    │  POST /user/contribution/grant│
                    └──────────┬──────────────────┘
                               │
                    ┌──────────▼──────────────────┐
                    │  Frontend (profile.js)       │
                    │                              │
                    │  1. Fetch from API           │
                    │  2. Merge with local compute │
                    │  3. Compare to localStorage  │
                    │  4. Show badges + toast      │
                    └──────────────────────────────┘
```

**Key principle:** The frontend uses a **hybrid approach** — it fetches badges from the server, but also computes them locally from available counters. The two sets are merged with `[...new Set([...serverBadges, ...localBadges])]`. This means badges work **even before the backend implements badge computation**, as long as `GET /user/contribution` returns the basic counters (`score`, `discussionsStarted`, `repliesGiven`, `likesReceived`).

---

## 2. Contribution Score

### Level thresholds

| Level | Min Score | Max Score |
|---|---|---|
| 1 | 0 | 99 |
| 2 | 100 | 249 |
| 3 | 250 | 499 |
| 4 | 500 | 999 |
| 5 | 1000 | 1999 |
| 6 | 2000+ | ∞ |

### Points awarded

| Action | Points |
|---|---|
| Start a discussion | +10 |
| Reply to a discussion | +5 |
| Receive a like on comment | +2 |
| Have a discussion saved | +2 |

### Profile display

The profile sidebar shows a single progress bar + 3 stat counters:

```
┌─────────────────────────────┐
│  Community Contribution     │
│                              │
│  🌐 Contribution Score  Lv.4│
│  [████████░░░░░░░░░░░░]     │
│  280 pts      180 / 500     │
│                              │
│  ┌──────┐ ┌──────┐ ┌──────┐│
│  │  🗨️   │ │  💬  │ │  👍  ││
│  │   5   │ │  42  │ │  67  ││
│  │  Disc.│ │Replies│ │ Likes││
│  └──────┘ └──────┘ └──────┘│
└─────────────────────────────┘
```

**Counter meanings:**
- **Discussions** = number of forum threads the user started
- **Replies** = number of comments the user wrote on discussions
- **Likes** = total likes received on the user's comments/discussions

---

## 3. Badge System — How It Works

### Computation

Badges are computed from **two sources** and merged:

```js
const serverBadges = data.contribution.badges;  // from API (can be empty)
const localBadges = computeLocalBadges(user, c); // frontend computation
mergedBadges = [...new Set([...serverBadges, ...localBadges])];
```

**`computeLocalBadges(user, c)`** checks:

| Condition | Badge |
|---|---|
| User has completed profile (`user.dob && user.school`) | `hello_world` |
| `repliesGiven >= 1` | `talk_is_silver` |
| `discussionsStarted >= 1` | `so_it_begins` |
| `discussionsStarted >= 5` | `conversation_starter` |
| `repliesGiven >= 10` | `helper` |
| `repliesGiven >= 50` | `chatterbox` |
| `likesReceived >= 20` | `respected` |
| `likesReceived >= 50` | `the_oracle` |
| `discussionsStarted >= 20` | `trendsetter` |
| `score >= 100` | `community_star` |
| `repliesGiven >= 100` | `keyboard_warrior` |
| `score >= 1000` | `mentor` |
| `score >= 2000` | `the_sage` |
| `repliesGiven > discussionsStarted * 10` (and discussions > 0) | `one_man_show` |
| `discussionsStarted <= 3` and `likesReceived >= discussionsStarted * 5` | `quality_over_quantity` |

**Which badges need backend vs frontend-only:**

- **Self-Discovery** (`self_discovery`) — only the server can detect this (quiz completion flags). Not computed locally.
- All other 15 badges are computed locally from counters the API already returns.

### Display on profile

All 16 badges are shown in a 2-column grid in the main panel:

- **Earned badges** — blue-tinted background, green checkmark icon
- **Locked badges** — 55% opacity, lock icon, gray text

```
┌──────────────────────────────────────┐
│  Badges                              │
│  Complete actions to earn badges...  │
│                                      │
│  ┌──────────────┐ ┌──────────────┐   │
│  │ 🏁 Hello ✓   │ │ 💬 Talk  🔒 │   │
│  │   World      │ │   is Silver  │   │
│  └──────────────┘ └──────────────┘   │
│  ┌──────────────┐ ┌──────────────┐   │
│  │ 🚀 So It ✓   │ │ 🗣️ Conv. 🔒  │   │
│  │   Begins     │ │   Starter   │   │
│  └──────────────┘ └──────────────┘   │
│  ...                                 │
└──────────────────────────────────────┘
```

### New badge detection (toast trigger)

When the profile page loads, the frontend:

1. Fetches contribution data from the API
2. Computes merged badges (server + local)
3. Compares with `localStorage["springwave_badges"]` (cached from last visit)
4. If new badges are found → shows a toast notification
5. Saves the new badge list to localStorage for next visit

---

## 4. All 16 Badges

### Newbie Tier (easy — first actions)

| # | Key | Label | Icon | Earn condition | Humor text |
|---|---|---|---|---|---|
| 1 | `hello_world` | Hello World | `gesture` | Profile completed (dob + school) | *"You exist. That's the first step."* |
| 2 | `talk_is_silver` | Talk is Silver | `comment` | Wrote first reply | *"You said something. The internet is proud."* |
| 3 | `so_it_begins` | So It Begins | `rocket_launch` | Started first discussion | *"Another thread joins the infinite void."* |
| 4 | `self_discovery` | Self-Discovery | `psychology` | Completed personality quiz | *"You stared into the quiz, and the quiz stared back."* |

### Community Contributor (medium)

| # | Key | Label | Icon | Earn condition | Humor text |
|---|---|---|---|---|---|
| 5 | `conversation_starter` | Conversation Starter | `chat` | Started 5 discussions | *"You're basically a talk show host now."* |
| 6 | `helper` | Helper | `forum` | Wrote 10 replies | *"Your keyboard should be a registered charity."* |
| 7 | `chatterbox` | Chatterbox | `speaker_notes` | Wrote 50 replies | *"Do you ever sleep? Do you ever stop typing?"* |
| 8 | `respected` | Respected | `thumb_up` | Received 20 likes | *"People approve of your existence. Digitally, at least."* |

### Community Leader (hard)

| # | Key | Label | Icon | Earn condition | Humor text |
|---|---|---|---|---|---|
| 9 | `the_oracle` | The Oracle | `auto_awesome` | Received 50 likes | *"You don't give advice. You drop prophecies."* |
| 10 | `trendsetter` | Trendsetter | `waves` | Started 20 discussions | *"You're not following trends. You're creating them."* |
| 11 | `community_star` | Community Star | `stars` | Reached 100 score | *"You're basically the main character now."* |
| 12 | `keyboard_warrior` | Keyboard Warrior | `keyboard` | Wrote 100 replies | *"Your keyboard has seen things. Horrible, wonderful things."* |

### Legendary (very hard)

| # | Key | Label | Icon | Earn condition | Humor text |
|---|---|---|---|---|---|
| 13 | `mentor` | Mentor | `school` | Reached Level 5 (1000 pts) | *"You have ascended. Use your power wisely."* |
| 14 | `the_sage` | The Sage | `emoji_objects` | Reached Level 6 (2000 pts) | *"You are the final boss of this community."* |
| 15 | `one_man_show` | One-Man Show | `theater_comedy` | 10× more replies than discussions | *"Ever considered podcasting?"* |
| 16 | `quality_over_quantity` | Quality > Quantity | `target` | ≤3 discussions, each got 5+ likes | *"You barely speak, but when you do, people listen."* |

---

## 5. Backend API Reference

### Required endpoints

| Method | Endpoint | Request body | Response |
|---|---|---|---|
| `GET` | `/user/contribution` | — | `{ contribution: { score, discussionsStarted, repliesGiven, likesReceived, badges[] } }` |
| `POST` | `/user/contribution/grant` | `{ action: "discussion" \| "reply" \| "like_received" \| "saved" }` | `{ contribution: {...}, newBadges?: string[] }` |

### What the backend MUST return

Even if the backend doesn't compute badges, it **must** return the 4 counters:

```json
{
  "contribution": {
    "score": 280,
    "discussionsStarted": 5,
    "repliesGiven": 42,
    "likesReceived": 67,
    "badges": []
  }
}
```

The `badges` array can be empty — the frontend will compute its own and merge.

### What the backend SHOULD return for better accuracy

The `POST /user/contribution/grant` endpoint should detect if a new badge was earned and return it:

```json
{
  "contribution": { ... },
  "newBadges": ["helper"]
}
```

This triggers an immediate notification on the frontend.

### Badge computation on backend (optional)

If the backend implements badge computation, the function it should use:

```js
function computeBadges(contribution, user) {
  const badges = [];
  if (user.dob && user.school) badges.push("hello_world");
  if (contribution.repliesGiven >= 1) badges.push("talk_is_silver");
  if (contribution.discussionsStarted >= 1) badges.push("so_it_begins");
  if (user.quizCompleted) badges.push("self_discovery");
  if (contribution.discussionsStarted >= 5) badges.push("conversation_starter");
  if (contribution.repliesGiven >= 10) badges.push("helper");
  if (contribution.repliesGiven >= 50) badges.push("chatterbox");
  if (contribution.likesReceived >= 20) badges.push("respected");
  if (contribution.likesReceived >= 50) badges.push("the_oracle");
  if (contribution.discussionsStarted >= 20) badges.push("trendsetter");
  if (contribution.score >= 100) badges.push("community_star");
  if (contribution.repliesGiven >= 100) badges.push("keyboard_warrior");
  if (contribution.score >= 1000) badges.push("mentor");
  if (contribution.score >= 2000) badges.push("the_sage");
  if (contribution.discussionsStarted > 0 && contribution.repliesGiven > contribution.discussionsStarted * 10) badges.push("one_man_show");
  if (contribution.discussionsStarted <= 3 && contribution.discussionsStarted > 0 && contribution.likesReceived >= contribution.discussionsStarted * 5) badges.push("quality_over_quantity");
  return badges;
}
```

### Forum endpoints (grant contributions)

When the forum gets a real backend, these endpoints should auto-grant:

| Endpoint | Action |
|---|---|
| `POST /discussions` | Auto-call `grantContribution(userId, "discussion")` |
| `POST /discussions/:id/comments` | Auto-call `grantContribution(userId, "reply")` |
| `POST /comments/:id/like` | Auto-call `grantContribution(commentAuthorId, "like_received")` |
| `POST /discussions/:id/save` | Auto-call `grantContribution(discussionAuthorId, "saved")` |

---

## 6. Notification System

### How it works

Notifications are **client-side only** (stored in localStorage). No backend notification endpoint needed.

```
                    ┌──────────────────────────┐
                    │   grantContribution()     │
                    │   returns newBadges[]     │
                    └──────────┬───────────────┘
                               │
                    ┌──────────▼───────────────┐
                    │   addBadgeNotification()  │
                    │   saves to localStorage   │
                    │   fires custom event      │
                    └──────────┬───────────────┘
                               │
              ┌────────────────▼────────────────┐
              │  navbar.js listens for event     │
              │  updates bell count + dropdown   │
              └─────────────────────────────────┘
```

### Storage format

```json
[
  {
    "id": "notif_1712345678_abc1",
    "type": "badge",
    "badgeKey": "helper",
    "message": "You earned the \"Helper\" badge!",
    "createdAt": "2026-06-09T10:30:00.000Z",
    "read": false
  }
]
```

### Bell icon behavior

- Unauthenticated users: bell icon is hidden
- Authenticated users: bell icon shows a **red count badge** with unread number (>9 shows "9+")
- Clicking bell toggles a **dropdown** with notification list
- Each notification shows: icon, message text, time ago ("5m ago", "2h ago")
- Unread items have a blue dot indicator
- "Mark all read" button in the header
- Clicking a notification → marks it read → redirects to `/profile.html`
- Clicking outside the dropdown closes it

### Notification creation

In `community.js`, after `grantContribution(action)` resolves:

```js
grantContribution("reply").then((res) => {
  if (res && res.newBadges) {
    res.newBadges.forEach((key) => addBadgeNotification(key, formattedLabel));
  }
});
```

The `addBadgeNotification()` function:
- Checks if a notification for this badge already exists (dedup)
- Saves to localStorage
- Dispatches `notifications-updated` custom event
- The navbar picks up the event and updates the bell icon + dropdown in real-time

---

## 7. Toast on Profile

When the user navigates to `/profile.html`, `renderContribPanel()` detects new badges and shows a toast.

### Detection logic

```js
const stored = localStorage.getItem("springwave_badges");
const prevBadges = stored ? JSON.parse(stored) : [];
const newBadges = mergedBadges.filter(k => !prevBadges.includes(k));
localStorage.setItem("springwave_badges", JSON.stringify(mergedBadges));
```

### Toast behavior

- Slides in from the right after an 800ms delay (gives the page time to render)
- Shows badge icon, "New Badge Earned!" heading, and badge label
- Multiple new badges stack vertically (each offset 80px)
- Auto-dismisses after 4.5 seconds
- Animated slide-in + fade-out

```
┌──────────────────────┐
│ 🏁 New Badge Earned! │  ← slides in from right
│    Hello World       │
└──────────────────────┘
```

### CSS classes

- `.badge-toast` — fixed bottom-right, white card, blue accent border left
- `.badge-toast.show` — triggers slide-in (translateX 0)
- `.badge-toast-icon` — icon container with brand blue background
- `.badge-toast-body` — heading + label stacked

---

## 8. Complete File Reference

### Files created

| File | Purpose |
|---|---|
| `js/lib/notifications.js` | `addBadgeNotification()`, `getNotifications()`, `getUnreadCount()`, `markRead()`, `markAllRead()` |

### Files modified

| File | Changes |
|---|---|
| `js/api/user.js` | Added `getUserContribution()`, `grantContribution()` |
| `js/pages/profile.js` | Removed old EXP panel; added `computeLocalBadges()`, `CONTRIB_LEVELS`, `calcContribLevel()`, `renderContribPanel()`, `renderBadgesPanel()`, `showBadgeToast()`; imported `getUserContribution` |
| `js/pages/community.js` | Added `grantContribution` + `addBadgeNotification` imports; changed `grantContribution` calls from fire-and-forget to promise-based with `newBadges` detection |
| `js/components/navbar.js` | Added `initNotifications()`, `renderNotifCount()`, `renderNotifDropdown()`, `timeAgo()`; imported from `notifications.js` |
| `public/components/navbar.html` | Added `<span id="bell-count">` inside bell icon; added `<div id="notif-dropdown">` container |
| `profile.html` | "Self-development" → "Community Contribution"; removed Stats Overview + Participated Activities; added Badges section with subtitle |
| `src/style.css` | Added styles for `.contrib-stats`, `.contrib-stat*`, `.contrib-badges`, `.contrib-badge*`, `.contrib-empty-hint`; `.badges-all`, `.badge-card*`, `.badge-icon*`, `.badge-info*`, `.badge-check`, `.badge-lock`; `.badges-subtitle`; `.badge-toast*`; `.notif-*` dropdown styles |
| `CONTRIBUTION-SYSTEM.md` | This document |

---

## 9. What Still Needs Backend

| Feature | Current status | What backend needs to do |
|---|---|---|
| **`GET /user/contribution`** | ✅ Frontend calls it, falls back gracefully on error | Return `{ contribution: { score, discussionsStarted, repliesGiven, likesReceived, badges[] } }` |
| **`POST /user/contribution/grant`** | ✅ Frontend calls it on reply/discussion | Accept `{ action }`, increment counters, return `{ contribution, newBadges? }` |
| **Badge computation** | ✅ Frontend computes locally (15/16 badges) | Optional — backend can compute too, merged client-side |
| **Self-Discovery badge** | ❌ Never earned (no local flag) | Add `quizCompleted` field to user; include in badge computation |
| **Forum auto-grant** | ⚠️ Frontend calls API manually | Optional — backend can auto-grant when forum endpoints are hit |
| **Like/save grant** | ❌ Not implemented | Backend forum endpoints need to call `grantContribution` |
| **User profile fields** | ✅ Used by `hello_world` check | Just needs `dob` and `school` in user object (already exists) |

### Minimum backend requirement

The system works with just these two endpoints returning basic data:

```
GET  /user/contribution           → { contribution: { score, discussionsStarted, repliesGiven, likesReceived, badges: [] } }
POST /user/contribution/grant     → { contribution: {...}, newBadges?: [...] }
```

Everything else (badge computation, notifications, toast) runs client-side.

---

## 10. FAQ

**Q: Do badges require backend changes?**  
A: No. The frontend computes 15 of 16 badges locally from the counters the API already returns. Only "Self-Discovery" needs the server to return it.

**Q: What happens if the contribution API is down?**  
A: The profile page shows a zero state (score: 0, no badges) gracefully. No error shown to the user.

**Q: Can I add more badges?**  
A: Yes. Add them to the `ALL_BADGES` array in `profile.js` and add the condition in `computeLocalBadges()`. They'll appear immediately.

**Q: How do notifications work without a backend?**  
A: They're stored in `localStorage["springwave_notifications"]`. Created when `grantContribution()` returns `newBadges`. No backend notification system needed.

**Q: If I clear localStorage, will I lose my progress?**  
A: Only cached badge state. The actual counters come from the API, so on next profile load everything recalculates correctly. Notifications will be lost though.

**Q: Why doesn't "Self-Discovery" show as earned even after I took the quiz?**  
A: The frontend has no way to know if you completed the quiz — the quiz result is returned from the API and not stored locally. The backend needs to include `"self_discovery"` in the badges array when it detects quiz completion.
