# SpringWave

A community-driven activity discovery and management platform for students. Browse, host, and participate in social activities, academic competitions, and events.

## Pages

| Page | File | Description |
|---|---|---|
| **Homepage** | `index.html` | Landing page with hero, explore section, and activity cards |
| **Login** | `login.html` | User authentication |
| **Register** | `register.html` | New user registration with full profile fields |
| **Host Activity** | `hostActivity.html` | Create and publish a new activity |

## Architecture

Vanilla HTML/CSS/JS multi-page app. Each page loads reusable HTML components dynamically via `fetch()` and injects them into placeholder containers. No framework or build step is required — open the HTML files directly or serve with any static file server.

### Component Loading Pattern

```
Page loads → DOMContentLoaded
  → fetch() component HTML from ./components/
  → inject into <div id="xxx-container">
  → initialize page-specific JS logic
```

## Project Structure

```
springwave/
├── index.html                 # Homepage
├── login.html                 # Login page
├── register.html              # Registration page
├── hostActivity.html          # Host-an-activity page
├── assets/images/             # Static images
├── components/                # Reusable HTML fragments
│   ├── navBar.html            # Navigation bar
│   ├── hero.html              # Hero section
│   ├── explore.html           # Explore/search section
│   ├── cards.html             # Activity card template
│   ├── description.html       # Activity detail popup
│   ├── hostActivityDetails.html # Create-activity form
│   ├── userChip.html          # Logged-in user menu
│   └── footer.html            # Footer
├── css/
│   ├── variables.css           # CSS custom properties (colors)
│   ├── global.css              # Reset & base styles
│   └── components/             # Per-component stylesheets
│       ├── navBar.css
│       ├── hero.css
│       ├── explore.css
│       ├── searchBar.css
│       ├── cards.css
│       ├── popup.css
│       ├── description.css
│       ├── footer.css
│       ├── hostActivity.css
│       ├── login.css
│       └── register.css
└── js/
    ├── config.js               # API base URL
    ├── lib/
    │   └── session.js          # localStorage session management
    ├── api/
    │   ├── client.js           # HTTP request wrapper
    │   ├── auth.js             # Auth API (login/register/me)
    │   └── activities.js       # Activities API
    └── pages/                  # Page-specific entry scripts
        ├── index.js            # Homepage logic
        ├── login.js            # Login form handler
        ├── register.js         # Register form handler
        └── hostActivity.js     # Host-activity logic
```

## Features

### Navigation
- Fixed navbar with skew logo panel
- Collapses on scroll with smooth animation
- Auth-aware: shows user chip dropdown when logged in, Login button when logged out
- Active link highlighting

### Homepage
- **Hero** — Full-viewport banner with call-to-action
- **Search Bar** — Floating glassmorphism search with:
  - Location input
  - Date range picker (custom calendar dropdown, dd/mm - dd/mm format)
  - Preferences input
  - Search button
- **Activity Cards** — Dynamic grid populated from API with:
  - Image, title, location, date, type
  - Intersection Observer reveal animations
  - Star (favourite) toggle
  - "View Details" button opens popup overlay

### Activity Detail Popup
- Image, tags, host info, description
- Location link (Google Maps)
- Attached files with download links
- Discuss / Participate / Report action buttons
- Favourite toggle

### Host Activity Form
- Thumbnail upload with preview
- Activity title, type (Social/Academic), description
- **Custom date pickers** for start date and application deadline (styled calendar dropdown matching the search bar)
- Validation: deadline must be before start date
- **Location picker** with interactive map (MapLibre GL + OpenFreeMap vector tiles + Nominatim geocoding) — no API key required
- File attachments (up to 10 files, multiple formats)
- Save as Draft / Publish buttons

### Authentication
- Login via API (`POST /auth/login`)
- Register with full profile (`POST /auth/register`)
- Session stored in localStorage (token + user data)
- Logout clears session and redirects

## API

Base URL: `https://api.springwave.io.vn`

| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Authenticate user |
| `/auth/register` | POST | Create new account |
| `/auth/me` | GET | Get current user |
| `/activities` | GET | List all activities |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML / CSS / JS (ES Modules) |
| Maps | MapLibre GL JS + OpenFreeMap vector tiles |
| Geocoding | Nominatim (OpenStreetMap, free, no key) |
| Icons | Font Awesome 6 + Material Symbols |
| Fonts | Inter, Plus Jakarta Sans (Google Fonts) |
| Backend | REST API at `api.springwave.io.vn` |

## Running Locally

Serve the project root with any static file server:

```bash
# Python
python -m http.server 8000 -d springwave/

# Node (npx)
npx serve springwave/

# VS Code
# Install "Live Server" extension → right-click index.html → Open with Live Server
```

Then open `http://localhost:8000` (or the URL provided by your server).

**Note:** The API base URL is configured in `js/config.js`. Update `API_BASE_URL` if you need to point to a different backend.

## Browser Support

Modern browsers with ES Module support (Chrome, Firefox, Safari, Edge).
