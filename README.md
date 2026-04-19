# 🛡️ Vigilo Insights

**AI-Powered Community Crime Reporting & Safety Intelligence Platform for Surat**

Vigilo Insights is a full-stack web application that empowers citizens to report crime incidents, visualize safety patterns on an interactive map, and make informed decisions about their surroundings — all powered by AI-driven trust scoring and real-time community verification.

> 🎓 Built as a college project prototype — no real police or emergency service integrations.

---

## ✨ Key Features

### 🗺️ Interactive Crime Map
- Real-time heatmap visualization of crime density across Surat
- **Time-based Risk View** — slide through 24 hours to see how safety changes throughout the day
- Click anywhere on the map to check the **AI Safety Score** for that area
- Community-reported incidents displayed as interactive map pins with full details

### 📝 Smart Crime Reporting
- **User-friendly crime categories** — no legal jargon, just simple descriptions like "Phone/Bag Snatching", "House/Shop Break-in"
- **Exact time picker** for precise incident timestamps
- **Auto-calculated severity** based on crime type and weapon involvement
- AI-powered media verification using image analysis
- **Trust Score Engine** — every report is scored (0-100) using ML models analyzing description quality, location data, media evidence, and user history

### 🔍 Admin Verification Panel
- Dedicated admin dashboard with pending report queue
- AI analysis summary with trust score breakdown
- One-click verify, reject, or request-more-info actions
- Email escalation system for high-severity reports

### 👥 Community Features
- **"I Witnessed This Too"** — community members can confirm incidents, boosting the report's trust score
- Public user profiles with reporting history and credibility badges
- Real-time WebSocket alerts for nearby verified incidents
- Saved locations with proximity-based notifications

### 🚨 SOS Emergency System
- One-tap SOS button that auto-creates a high-priority report
- Captures current GPS location instantly
- Sends emergency notifications to saved contacts

### 🗺️ Safe Route Planner
- Calculate walking/driving routes between two points
- Routes factor in crime data to suggest safer paths
- Turn-by-turn directions with distance and duration estimates

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, MapLibre GL |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **Database** | PostgreSQL (Neon Cloud) |
| **AI/ML** | Scikit-learn (Trust Score Model), HuggingFace API (Image Verification) |
| **Maps** | MapLibre GL JS, OpenStreetMap, Photon & Nominatim Geocoding |
| **Media** | Cloudinary (Image Upload & Storage) |
| **Email** | Resend API |
| **Auth** | JWT (JSON Web Tokens) |

---

## 📁 Project Structure

```
Vigilo/
├── server/                    # Backend (FastAPI)
│   ├── app/
│   │   ├── models/            # SQLAlchemy database models
│   │   ├── routes/            # API endpoints
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Business logic (AI, scoring, email, PDF)
│   │   └── utils/             # Auth helpers, serialization
│   ├── migrations/            # Alembic database migrations
│   ├── ml_model.pkl           # Trained trust score ML model
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment variable template
│
├── vigilo-insights/           # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── admin/         # Admin panel components
│   │   │   ├── common/        # Sidebar, Navbar, Footer, SOS, Search
│   │   │   ├── map/           # MapView, HeatmapLayer, CrimeMarker, Popup
│   │   │   ├── reports/       # Report cards, media upload
│   │   │   └── ui/            # ShadCN UI primitives
│   │   ├── context/           # Auth & Location providers
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/               # API client, constants, POI catalog, i18n
│   │   └── pages/             # All page-level components
│   ├── public/                # Static assets (logo)
│   └── package.json           # Node dependencies
│
├── .gitignore
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **Python** 3.10+
- **PostgreSQL** database (or [Neon](https://neon.tech) free tier)

### 1. Clone the Repository
```bash
git clone https://github.com/dhir-1/Vigilo.git
cd Vigilo
```

### 2. Backend Setup
```bash
cd server
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Create a `.env` file in `server/` using `.env.example` as a template:
```env
DATABASE_URL=postgresql://user:password@host/dbname
JWT_SECRET_KEY=your-secret-key
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
HUGGINGFACE_API_KEY=your-hf-key
RESEND_API_KEY=your-resend-key
```

Run the server:
```bash
uvicorn app.main:app --reload
```
Backend runs at `http://localhost:8000`

### 3. Frontend Setup
```bash
cd vigilo-insights
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`

---

## 📸 Screenshots

| Dashboard with Heatmap | Crime Reporting Form |
|:-:|:-:|
| Interactive map with time-based risk slider | User-friendly categories with auto-severity |

| Admin Verification | Community Confirmations |
|:-:|:-:|
| AI-powered trust score analysis | "I witnessed this too" system |

---

## 🔒 Security Notes

- `.env` files containing API keys and database credentials are **never committed** to the repository
- All passwords are hashed using bcrypt
- JWT tokens expire after 24 hours
- Admin routes are protected by role-based access control
- Report submissions are rate-limited and AI-verified

---

## 📄 License

This project is built for educational purposes as part of a college project submission.

---

## 👨‍💻 Author

**Dhir** — [@dhir-1](https://github.com/dhir-1)

---

<p align="center">
  <strong>Vigilo Insights</strong> — Making Surat Safer, One Report at a Time 🏙️
</p>
