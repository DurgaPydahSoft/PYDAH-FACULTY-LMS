# 📘 Pydah Faculty Leave Management System

[![Status](https://img.shields.io/badge/status-in%20development-2c7be5.svg)](#) 
[![License](https://img.shields.io/badge/license-MIT-success.svg)](#-license) 
[![Tech](https://img.shields.io/badge/stack-React%20%7C%20Node.js%20%7C%20MongoDB-ff9800.svg)](#-tech-stack)

Modern, role-driven leave management for **Pydah Institutions**. FLMS brings every stakeholder onto a single platform, cutting paperwork, tightening governance, and delivering a transparent approval trail from request to final sanction.

<img width="1896" height="879" alt="Faculty Leave Management dashboards" src="https://github.com/user-attachments/assets/7dc9acef-3154-4889-b3bf-361b590aa70f" />

---

## 🔗 Quick Links
- [Live Preview](https://pydah-faculty-lms.vercel.app/) 

---

## 📚 Table of Contents
- [Why FLMS?](#-why-flms)
- [Feature Highlights](#-feature-highlights)
- [Tech Stack](#-tech-stack)
- [System Flow](#-system-flow)
- [Module Deep Dive](#-module-deep-dive)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Scripts & Tooling](#-scripts--tooling)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)
- [About PydahSoft](#-about-pydahsoft)

---

## 🎯 Why FLMS?
- **Paperless & Fast:** Replace manual leave slips with guided digital forms.
- **Transparent Workflow:** Every action is tracked with role-based remarks.
- **Data Integrity:** Centralized leave history ensures reliable audits.
- **Actionable Insights:** Built-in analytics highlight bottlenecks and trends.
- **Scalable Foundation:** Modular architecture ready for new departments or campuses.

---

## ✨ Feature Highlights

**Faculty experience**
- Guided leave application with attachment support.
- Real-time application status and historical leave ledger.
- Inline remarks and notifications from reviewers.

**HOD operations**
- Department-level queue with filters and sorting.
- Forward-to-principal or reject with contextual comments.
- Visibility into faculty leave balance and clash indicators.

**Principal dashboard**
- Consolidated campus-wide pipeline.
- Bulk approvals and scheduling assistant.
- Insight into department load and approval SLAs.

**Admin & HR control**
- User provisioning for faculty, HOD, principal roles.
- Department mapping and faculty roster management.
- Reports by department, date range, or status.

---

## 🧑‍💻 Tech Stack
- **Frontend:** React, Vite, Tailwind CSS, Axios, React Query
- **Backend:** Node.js, Express.js, Nestable services
- **Database:** MongoDB (default) with PostgreSQL compatibility layer
- **Auth & Security:** JSON Web Tokens (JWT), bcrypt, role-based access control
- **DevOps:** Docker-ready compose, CI scaffolding (GitHub Actions planned)

---

## 🔄 System Flow
```text
Faculty ➜ Submit Leave Request ➜ HOD ➜ Forward or Reject ➜ Principal ➜ Approve/Reject ➜ Notify Faculty ➜ Update Reports
```

Key checkpoints:
1. Faculty submits leave dates, category, and remarks.
2. HOD validates overlaps or staffing conflicts.
3. Principal delivers final decision with optional directives.
4. Faculty receives notification; ledger updates for HR/admin dashboards.
5. Admin exports summaries for compliance and payroll.

---

## 🧩 Module Deep Dive
- **Authentication & RBAC:** Secure login with role-aware route guarding.
- **Leave Request Engine:** Drafts, submissions, revisions, and attachments.
- **Approval Workflow:** Tracking, forwarding, and threaded remarks.
- **Dashboards:** Custom metrics for each role, built with reusable widgets.
- **Reports & Analytics:** Downloadable summaries, trend visualizations, and filters.

---

## 🏗️ Architecture
```text
pydah-faculty-lms/
├── backend/
│   ├── src/
│   │   ├── api/             # REST endpoints & controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Mongoose / Sequelize schemas
│   │   └── utils/           # Shared helpers
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # UI atoms, molecules, organisms
│   │   ├── pages/           # Route-level views
│   │   ├── hooks/           # Data-fetching & state hooks
│   │   └── assets/
│   ├── tests/
│   └── package.json
├── docs/                    # API specs, user guides (planned)
└── readme.md
```

---

## 🚀 Getting Started

> Prerequisites: Node.js 18+, npm 9+ (or Yarn), and MongoDB/PostgreSQL instance.

1. **Clone**
   ```bash
   git clone https://github.com/your-username/pydah-flms.git
   cd pydah-flms
   ```
2. **Install**
   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```
3. **Configure Environment** – See [Environment Variables](#-environment-variables).
4. **Run**
   ```bash
   # Backend
   cd backend
   npm run dev   # nodemon watch mode

   # Frontend (new terminal)
   cd frontend
   npm run dev
   ```
5. **Access**
   - Frontend UI → `http://localhost:3000`
   - Backend API → `http://localhost:5000`

---

## 🔐 Environment Variables

| Variable | Scope | Description |
| --- | --- | --- |
| `PORT` | Backend | Express server port (default `5000`) |
| `DB_URI` | Backend | MongoDB/PostgreSQL connection string |
| `JWT_SECRET` | Backend | Secret for signing JWT tokens |
| `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` | Backend _(optional)_ | SMTP settings for notifications |
| `VITE_API_BASE_URL` | Frontend | Base URL for backend API |

Create `.env` files in both `backend/` and `frontend/` using `.env.example` templates (coming soon).

---

## 🧪 Scripts & Tooling

| Command | Location | Purpose |
| --- | --- | --- |
| `npm run dev` | `backend` | Start API with hot reload |
| `npm test` | `backend`, `frontend` | Run unit tests (Jest / Vitest) |
| `npm run lint` | `frontend` | Lint frontend code with ESLint |
| `npm run build` | `frontend` | Production-ready bundle |
| `npm run migrate` | `backend` | Database migrations (planned) |

---

## 🛣️ Roadmap
- [ ] Role-based email/SMS notifications
- [ ] Mobile-first UI and PWA support
- [ ] Biometric attendance integration
- [ ] Academic calendar sync
- [ ] AI-assisted workload forecasting

Track progress via [GitHub Projects](#) _(coming soon)_.

---

## 🤝 Contributing
We welcome contributions from the Pydah community!

1. Fork the repository.
2. Create a feature branch (`feature/amazing-improvement`).
3. Commit with clear messages.
4. Push and open a Pull Request.

Please review our forthcoming `CONTRIBUTING.md` for coding standards, commit conventions, and review checklist.

---

## 📜 License
Distributed under the MIT License. See `LICENSE` for details.

---

## 🏢 About PydahSoft
**PydahSoft** is the in-house software innovation team at **Pydah Institutions**, delivering products that simplify academic and administrative processes. From intelligent dashboards to fully-managed workflows, we focus on reliable, accessible technology that elevates student, faculty, and staff experiences.

---

> _Have questions or ideas?_ Open an issue or reach out to **team1@pydahsoft.in**.