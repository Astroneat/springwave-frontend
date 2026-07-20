# SpringWave - Feature Documentation

## Project Overview

**SpringWave** is a community-driven activity discovery and management platform for students. It's a single-page application (SPA) built with vanilla JavaScript using Vite as the build tool, deployed on Cloudflare Pages.

---

## 🎯 Core Features

### 1. **User Authentication & Profile Management**

| Feature | Description |
|---------|-------------|
| **User Registration** | Email/password registration with optional profile details (DOB, school, class, major, phone) |
| **User Login** | Email/password login with JWT-based authentication |
| **Google OAuth SSO** | Google sign-in integration for quick access |
| **Email Verification** | Email verification flow for new accounts |
| **Profile Editing** | Update full name, date of birth, phone, school, class, major |
| **Avatar Upload** | Upload and crop profile pictures |
| **Role-based Access** | Different features for Student, Host, and Admin roles |

### 2. **AI-Powered Personality Quiz**

| Feature | Description |
|---------|-------------|
| **10-Question Quiz** | Interactive quiz covering preferences, interests, schedule, commitment, social style, goals, location, role preference, competition preference, and motivation |
| **Multi-select Answers** | Students can select multiple answers per question |
| **AI Profile Generation** | Backend generates personality profile based on quiz answers |
| **Score Calculation** | Scores across 4 dimensions: Communication, Technical, Creativity, Social Impact |
| **Personalized Recommendations** | Suggests activity types based on personality scores |
| **Retake Option** | Students can retake the quiz anytime |

### 3. **Activity/Event Discovery**

| Feature | Description |
|---------|-------------|
| **Browse Activities** | Grid/list view of all available events |
| **Category Filtering** | Filter by: Sport, Music, Education, Technology, Volunteering, Social, Art, Workshop, Seminar |
| **Search Functionality** | Semantic search powered by AI embeddings |
| **Date Range Picker** | Custom date range selection for filtering events |
| **Location Search** | Search events by location with map integration |
| **Sorting Options** | Sort by: Relevance, Newest, Most Popular, Ending Soon |
| **Status Filter** | Show upcoming or past events |
| **Pagination** | 20 items per page with navigation |
| **Interactive Cards** | Hover effects and reveal animations |
| **Activity Details Popup** | Modal with full event information |

### 4. **Event Participation System**

| Feature | Description |
|---------|-------------|
| **Join Events** | Register to participate in events |
| **Favourite Events** | Save events to personal favorites list |
| **View Favorites** | Dedicated popup showing all favorited activities |
| **Unfavorite** | Remove events from favorites |
| **Participate/Unparticipate** | Toggle participation status |

### 5. **AI-Powered Recommendations**

| Feature | Description |
|---------|-------------|
| **Personalized Feed** | AI-suggested activities based on user profile |
| **Recommendation Cards** | Highlighted recommendation section on explore page |
| **Semantic Search** | AI-powered search that understands meaning, not just keywords |

### 6. **Community Forum**

| Feature | Description |
|---------|-------------|
| **Discussion Categories** | All, Event Discussions, Skill Development, University Communities |
| **Create Discussions** | Start new discussions with category, tags, and related event |
| **Comments System** | Nested comment threads with replies |
| **Like Comments** | Like/unlike comments |
| **Save Posts** | Bookmark discussions for later |
| **Share Discussions** | Share via native share or copy link |
| **Delete Posts** | Delete own discussions |
| **Sort Comments** | Newest, Oldest, Most Relevant |

### 7. **University Communities**

| Feature | Description |
|---------|-------------|
| **Browse Universities** | Grid view of university communities |
| **Join/Leave Community** | Join one university community at a time |
| **University-Specific Discussions** | View discussions specific to joined university |
| **Create Universities** | Admin can create new university communities |
| **Edit Universities** | Admin can edit university name, description, color |
| **Delete Universities** | Admin can delete university communities |
| **View Members** | See list of members in a university |
| **Member Count** | Display member count per university |

### 8. **Skill Topics**

| Feature | Description |
|---------|-------------|
| **Browse Topics** | Grid of skill discussion topics |
| **Topic Categories** | Organized by skill areas and interests |
| **Discussion Count** | Shows number of discussions per topic |

### 9. **Organization Management**

| Feature | Description |
|---------|-------------|
| **Organization Profiles** | Public pages for organizations/hosts |
| **Organization Dashboard** | Hosts can manage their own events |
| **Organization Events** | List events created by specific organization |
| **Follow Organizations** | Follow organizations for updates |

### 10. **Host Activity Creation**

| Feature | Description |
|---------|-------------|
| **Create New Activity** | Form to create events with all details |
| **Thumbnail Upload** | Upload activity banner image |
| **Activity Types** | Select from predefined types |
| **Description Editor** | Rich text description |
| **Location Picker** | Interactive map with address search |
| **Date Selection** | Held date and application deadline |
| **Attachments** | Upload files (images, PDFs, documents, ZIP) |
| **Draft Saving** | Save activity as draft before publishing |
| **Turnstile Protection** | Bot protection for form submission |
| **Check-in Rules** | Configure check-in settings |
| **Organization Selector** | Associate activity with organization |

### 11. **AI Chatbot**

| Feature | Description |
|---------|-------------|
| **Floating Widget** | Persistent chatbot button on pages |
| **AI-Powered Responses** | Chat with AI assistant for help |
| **Login Required** | Chat requires authenticated user |

### 12. **User Dashboard (Profile Page)**

| Feature | Description |
|---------|-------------|
| **Profile Overview** | Display user info and avatar |
| **Participated Events** | List of events user has attended |
| **Event Reviews** | Rate and review events attended |
| **Favorites List** | Quick access to favorite activities |
| **AI Profile Display** | Show AI-generated personality profile |

### 13. **Gamification & Badges**

| Feature | Description |
|---------|-------------|
| **Contribution System** | Points earned for community participation |
| **Levels (1-6)** | Progress through contribution levels |
| **20+ Badges** | Achievement badges across tiers |
| **Badge Tiers** | Newbie, Explorer, Contributor, Legendary |
| **Progress Tracking** | Visual progress bars for locked badges |
| **Badge Toasts** | Notifications when new badge earned |
| **Badge Categories** | Discussion, Reply, Like, Event, Host achievements |

### 14. **Admin Panel**

| Feature | Description |
|---------|-------------|
| **Dashboard View** | Overview of all events with stats |
| **Pending Review Tab** | Events awaiting approval |
| **Published Events Tab** | All approved events |
| **Event Approval** | Approve pending events |
| **Event Rejection** | Reject and delete events |
| **Event Editing** | Edit event details (title, location, type, date, description) |
| **Event Deletion** | Delete published events |
| **Bulk Actions** | Select and approve/delete multiple events |
| **Facebook Scraping** | Scrape events from Facebook pages |
| **Manual Event Creation** | Add events manually |
| **View Count Tracking** | Display view counts per event |
| **Show/Hide Expired** | Toggle visibility of past events |
| **Auto-refresh** | Periodic refresh of event data |
| **Search Events** | Search within admin table |

### 15. **My Tickets**

| Feature | Description |
|---------|-------------|
| **Ticket Management** | View purchased/earned tickets |
| **Ticket Status** | Display checked-in status |

### 16. **Review & Rating System**

| Feature | Description |
|---------|-------------|
| **Rate Events** | 5-star rating system |
| **Write Reviews** | Text reviews for attended events |
| **Review Display** | Show ratings on event cards and detail pages |

### 17. **Internationalization (i18n)**

| Feature | Description |
|---------|-------------|
| **English Support** | Full English translation |
| **Vietnamese Support** | Full Vietnamese translation |
| **Language Switching** | Dynamic language toggle |
| **Translateable Strings** | All UI text uses `data-i18n` attributes |

### 18. **Notifications System**

| Feature | Description |
|---------|-------------|
| **Notification Bell** | Navbar notification icon |
| **Unread Count** | Badge showing unread notifications |
| **Notification List** | Dropdown with recent notifications |
| **Mark as Read** | Mark individual or all as read |
| **Badge Notifications** | Special notifications for earned badges |

### 19. **My Events**

| Feature | Description |
|---------|-------------|
| **Organized Events** | Events user has organized/hosted |
| **Event Management** | Edit and manage own events |

### 20. **Host Registration**

| Feature | Description |
|---------|-------------|
| **Host Account** | Request to become a host/organizer |
| **Host Dashboard Access** | Access to organization management |

### 21. **About Page**

| Feature | Description |
|---------|-------------|
| **Platform Introduction** | Mission and vision |
| **Team Introduction** | Meet the developers (RAH team) |
| **Call to Action** | Encourage user registration |

---

## 🔧 Technical Features

| Feature | Description |
|---------|-------------|
| **Single Page Application** | No page reloads, smooth transitions |
| **JWT Authentication** | Secure token‑based auth with refresh |
| **HMAC Request Signing** | Secure API communication |
| **Rate Limiting** | Throttle on sensitive actions |
| **Error Handling** | Graceful error states and retry logic |
| **Loading States** | Skeleton loaders and spinners |
| **Responsive Design** | Mobile‑friendly layouts |
| **Map Integration** | OpenStreetMap with Leaflet |
| **File Upload** | Cloudflare R2 storage integration |
| **CDN Assets** | Fast asset delivery |
| **Version Caching** | Cache busting with git hash |
| **Scroll Animations** | Reveal effects on scroll |
| **Keyboard Navigation** | Escape to close modals, Enter to submit |

---

## 📱 Pages Summary

| Page | Purpose |
|------|---------|
| `index.html` | Homepage with hero, stats, AI features |
| `login.html` | User login |
| `register.html` | User registration |
| `explore.html` | Activity discovery and search |
| `profile.html` | User profile and settings |
| `hostActivity.html` | Create/edit activities |
| `community.html` | Forum and discussions |
| `quiz.html` | AI personality quiz |
| `about.html` | About the platform |
| `admin.html` | Admin event management |
| `admin-host.html` | Admin host management |
| `admin-categories.html` | Admin category management |
| `org-dashboard.html` | Organization dashboard |
| `org-profile.html` | Public organization page |
| `complete-profile.html` | Complete user profile |
| `register-host.html` | Host registration |
| `my-tickets.html` | User's tickets |
| `my-events.html` | User's organized events |
| `verify-email.html` | Email verification |

---

This markdown file provides a comprehensive overview of **all** features in the SpringWave project, suitable for a teacher or any stakeholder to understand the scope and functionality of the application.
