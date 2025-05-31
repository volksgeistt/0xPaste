# 0xPaste 
**Share Instantly** - A modern, sleek pastebin service with glass morphism design and advanced features
---

# 📝Features
## Modern UI/UX
- Glass Morphism Design – Beautiful translucent elements with backdrop blur effects
- Neon Accents – Cyberpunk-inspired color scheme with glowing effects
- Responsive Layout – Optimized for desktop, tablet, and mobile
- Smooth Animations – Floating orbs, hover effects, seamless transitions
- Dark Theme – Eye-friendly dark mode with gradients

## Paste Management
- Instant Sharing – Create and share pastes in a click
- Custom Titles – Add descriptive titles
- Expiration Control – Set to 1 day, 1 week, 1 month, or never
- Private Pastes – Hidden from recent feeds
- View Counter – Track number of views
- Character Counter – Real-time while typing
---
# ⚙️Architecture
## Frontend
- Vanilla JavaScript – Lightweight, fast
- TailwindCSS – Utility-first styling
- Lucide Icons – Clean, modern icon set
- Custom CSS – Glass morphism effects and animations

## Backend
- Express.js – Fast and minimal web framework
- SQLite3 – Lightweight DB
- CORS Support – Enabled
- RESTful API – Predictable endpoints

## Deployment
- Vercel Ready – Serverless optimized
- Local Development – Easy local setup
---
# 📁 Project Structure
```bash
0xPaste/
├── public/                 # Frontend assets
│   ├── index.html         # Main HTML file
│   ├── script.js          # JS logic
│   └── style.css          # Glass morphism CSS
├── api/                   # Vercel functions
│   └── pastes.js
├── package.json           # Dependencies and scripts
├── vercel.json            # Deployment config
├── server.js              # Local dev server
└── pastes.db              # SQLite database
```
---
# 📡 API Reference
## Create Paste
- POST `/api/pastes`
**Body:**
```json
{
  "title": "My Awesome Paste",
  "content": "Hello, World!",
  "expiration": "1day",
  "isPrivate": false
}
```
**Response:**
```json
{
  "success": true,
  "url": "abc123def456",
  "shareUrl": "https://your-domain.com/#/abc123def456"
}
```
--- 
## Get Paste
- GET `/api/pastes/{pasteId}`
**Response:**
```json
{
  "url": "abc123def456",
  "title": "My Awesome Paste",
  "content": "Hello, World!",
  "expiration": "1day",
  "isPrivate": false,
  "createdAt": "2025-05-31T10:30:00Z",
  "views": 42
}
```
---
## Get Recent Pastes
- GET `/api/pastes?limit=6`
**Response:**
```json
[
  {
    "url": "abc123def456",
    "title": "Recent Paste",
    "content": "Some content...",
    "createdAt": "2025-05-31T10:30:00Z",
    "views": 15,
    "expiration": "1week"
  }
]
```
--- 
# 🎨 Customization
## Tailwind Color Palette
```js
midnight:    "#0f0f23", // Dark bg
dark-blue:   "#1a1a2e", // Secondary bg
neon-blue:   "#00d4ff", // Primary accent
neon-purple: "#8b5cf6"  // Secondary accent
```
## CSS Effects
- `.glass-morphism` – Basic translucent blur
- `.glass-morphism-strong` – Stronger blur

## Animations
- `glow` – Pulsing glow
- `float` – Floating animation
- `slide-up` – Entrance animation
- `fade-in` – Fade in
---
# 🧪 Development
## Scripts
```bash
npm run dev      # Start dev server
npm start        # Start production
npm install      # Install deps
```
# Database Schema
```sql
CREATE TABLE pastes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    expiration TEXT NOT NULL,
    isPrivate BOOLEAN DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0
);
```
---
# 🙏 Acknowledgments & Support
Thank you for checking out 0xPaste!
We appreciate your support, stars ⭐, and contributions.
If you encounter any issues or have feature requests, please open an issue or discussion on GitHub.
