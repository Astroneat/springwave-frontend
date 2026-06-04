# SpringWave

A community-driven activity discovery and management platform for students. Browse, host, and participate in social activities, academic competitions, and events.

## Pages

| Page | File | Description |
|---|---|---|
| **Homepage** | `index.html` | Landing page with hero, explore section, and activity cards |
| **Login** | `login.html` | User authentication |
| **Register** | `register.html` | New user registration (fullname, username, email, password) |
| **Explore** | `explore.html` | Browse and filter activities |
| **Profile** | `profile.html` | User profile with edit modal |
| **Host Activity** | `hostActivity.html` | Create and publish a new activity |

## Tech Stack

| Layer | Technology |
|---|---|
| Build Tool | Vite |
| CSS | Tailwind CSS v4 (via `@tailwindcss/vite`) |
| Frontend | Vanilla HTML / JS (ES Modules) |
| Maps | MapLibre GL JS + OpenFreeMap vector tiles |
| Geocoding | Nominatim (OpenStreetMap, free, no key) |
| Icons | Font Awesome 6 + Material Symbols + Bootstrap Icons |
| Fonts | Inter, Plus Jakarta Sans (Google Fonts) |
| Backend | REST API at `api.springwave.io.vn` |

## Project Structure

```
springwave/
├── index.html
├── login.html
├── register.html
├── explore.html
├── profile.html
├── hostActivity.html
├── package.json
├── vite.config.js
├── src/
│   └── style.css              # Tailwind config + all component styles
├── js/
│   ├── config.js              # API base URL
│   ├── lib/
│   │   ├── session.js         # localStorage session management
│   │   └── utils.js           # Helper functions
│   ├── api/
│   │   ├── client.js          # HTTP request wrapper
│   │   ├── auth.js            # Auth API
│   │   ├── activities.js      # Activities API
│   │   └── user.js            # User API
│   ├── components/
│   │   ├── navbar.js          # Navbar component
│   │   └── chatbot.js         # Chatbot component
│   └── pages/
│       ├── index.js           # Homepage
│       ├── login.js           # Login
│       ├── register.js        # Register
│       ├── explore.js         # Explore
│       ├── profile.js         # Profile
│       └── hostActivity.js    # Host activity
├── components/                # Reusable HTML fragments
│   ├── navbar.html
│   ├── footer.html
│   ├── chatbot.html
│   └── ...
├── assets/images/
└── dist/                      # Build output (auto-generated)
```

## Running Locally

### Prerequisites
- Node.js 18+

### Install & Run
```bash
npm install
npm run dev
```

Open `http://localhost:5173`

### Build for Production
```bash
npm run build
```

Output will be in `dist/` folder.

### Preview Production Build
```bash
npm run preview
```

## Deploy to Cloudflare Pages

1. Push code to GitHub
2. Connect repo to Cloudflare Pages
3. Set build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** 18+
4. Deploy

## API

Base URL: `https://api.springwave.io.vn`

| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Authenticate user |
| `/auth/register` | POST | Create new account |
| `/auth/me` | GET | Get current user |
| `/activities` | GET | List all activities |

## Browser Support

Modern browsers with ES Module support (Chrome, Firefox, Safari, Edge).
