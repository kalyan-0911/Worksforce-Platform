# WorkForceX - AI-Powered Workforce Liquidity Platform

WorkForceX is an AI-powered Workforce-as-a-Service (WaaS) platform that enables organizations to discover, verify, and deploy project-ready professionals instantly. It replaces traditional recruitment cycles with an intelligent workforce availability system, providing real-time talent matching, dynamic readiness assessments, and automated team formation.

---

## 🚀 Core Features

### 1. Dual-Portal Architecture
- **Employer Command Center**: Contains real-time metrics (Active Projects, Open Requisitions, and the Bench Liquidity Index), searchable Workforce Inventory, and an automated Team Builder squad allocator.
- **Professional Portal**: Allows candidates to toggle their availability, display verified skill badges, and enter the **Assessment Hub** to verify new competencies.

### 2. Verification Assessment Hub
- Features interactive, step-by-step multiple-choice questionnaires for core skills (e.g. React Architecture, Python Data Science, Security Auditing).
- Implements secure server-side grading (correct answer keys are stripped from API payloads on transit) and automatically updates candidate global readiness indices.

### 3. AI-Powered Semantic Talent Matching
- Matches open requisitions against candidate skills using a Jaccard overlap similarity index weighted by their general test readiness scores.
- Renders candidate compatibility rankings on the Employer dashboard with color-coded overlapping skills (green) and missing requirements (gray) highlighted.

### 4. Secure Gateway Authentication
- Standard email/password signup and login gates.
- Employs secure JSON Web Token (JWT) session cookies to authorize requests and dynamically filter layout sidebar routing paths based on user roles.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Vanilla CSS (Premium Glassmorphic Theme with radial gradients, blur filters, and hover micro-animations)
- **Session State**: `localStorage` (persists JWT tokens and user context)

### Backend
- **Framework**: Python 3 + Flask (lightweight REST routing with CORS enabled)
- **Auth Tokens**: `PyJWT` (JWT session signature verification decorators)
- **Password Hash**: PBKDF2 HMAC SHA-256 (built-in standard library, ensuring zero compiler dependencies on Windows setups)

### Database
- **Engine**: SQLite 3 (`workforcex.db`)
- **Schema**: Fully normalized relational schema with primary/foreign keys, junction mapping, and cascade deletion rules.

---

## 📦 Project Structure

```text
workforce/
├── backend/
│   ├── src/
│   │   ├── app.py             # Flask App Entrypoint & Route Controllers
│   │   ├── db_manager.py      # SQLite Schema Management & Database Seeds
│   │   └── ai_engine.py       # Local Semantic Matching Math Engine
│   └── requirements.txt       # Flask, CORS, and PyJWT Dependencies
├── frontend/
│   ├── src/
│   │   ├── components/        # Navigation Sidebar & Topbar components
│   │   ├── pages/             # Dashboards, Inventory, Teams, and Login pages
│   │   ├── services/          # API Fetch Helper client
│   │   └── styles/            # Global styling variables
│   ├── package.json           # React dependencies
│   └── vite.config.js         # Vite configuration
├── run-backend.bat            # Backend launch automation batch file
├── run-dev.bat                # Frontend launch automation batch file
└── README.md                  # Project Documentation
```

---

## 💻 Local Setup & Installation

### Prerequisites
- **Python 3.12+**
- **Node.js** (A portable node version is already packaged in the repository for convenience)

### Running the Platform

1. **Start the Backend Server**:
   Double-click or run `run-backend.bat` in your terminal:
   ```bash
   .\run-backend.bat
   ```
   This will automatically install Python dependencies (`Flask`, `Flask-CORS`, `PyJWT`), initialize the SQLite database tables, run seed migrations, and start the server on `http://localhost:5000`.

2. **Start the Frontend Client**:
   In a separate terminal window, run:
   ```bash
   .\run-dev.bat
   ```
   This will launch the Vite development server on `http://localhost:5173`.

---

## 🔑 Demo Credentials

On initial database startup, the platform pre-seeds default credentials so you can log in and test immediately:

- **Employer Portal**:
  - Email: `employer@workforcex.com`
  - Password: `password123`
- **Candidate/Professional Portal**:
  - Email: `sarah@workforcex.com`
  - Password: `password123`
