# 🏪 All-in-One Tools Administrasi UMKM

Aplikasi PWA all-in-one untuk UMKM Indonesia: kasir/POS, stok, keuangan, dan laporan dalam satu aplikasi.

> **Status:** MVP & Core Features (Batch A-G) Completed
> **Current Version:** v1.0.0-beta
## Tech Stack

| Layer | Teknologi |
|---|---|
| **Frontend** | SvelteKit (Svelte 5 / Runes) + Tailwind CSS v4 |
| **Backend** | Node.js + Fastify + TypeScript |
| **Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **PWA** | @vite-pwa/sveltekit |
| **CI/CD** | GitHub Actions |
| **Infra** | Docker Compose (dev), Coolify (staging/prod) |

## Quick Start

### Prerequisites
- Node.js ≥ 18.13
- Docker & Docker Compose
- Git

### 1. Start Database & Redis
```bash
docker compose up -d
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend akan berjalan di `http://localhost:5173`

### 3. Backend
```bash
cd backend
npm install
npm run dev
```
Backend API akan berjalan di `http://localhost:3001`
Health check: `GET http://localhost:3001/v1/health`

## Dokumentasi Proyek

| Dokumen | Deskripsi |
|---|---|
| `Prd allinone tools administrasi umkm.MD` | Product Requirements Document |
| `DESIGN.MD` | Design System & Token |
| `Technical specification allinone umkm.MD` | Technical Specification |
| `FLOW WIREFRAME.HTML` | User Flow & Wireframe |
| `Project timeline umkm.HTML` | Project Timeline & Milestone |
| `Testing qa checklist allinone umkm.HTML` | Testing & QA Checklist |
| `Deployment maintenance plan allinone umkm.HTML` | Deployment & Maintenance Plan |

## Struktur Proyek

```
UMKM/
├── frontend/          # SvelteKit PWA
├── backend/           # Fastify API
├── .github/workflows/ # CI/CD
├── docker-compose.yml # Dev environment
└── [docs...]          # Dokumentasi proyek
```

## Tim & Timeline

- **Durasi:** 8 Jul 2026 – 26 Apr 2027 (±42 minggu)
- **Sprint:** 17 sprint kerja (2 minggu) + 4 buffer
- **Milestone:** MVP (12 Okt), Fase 2 (1 Feb), Fase 3 (26 Apr)

---

*Lihat Technical Specification untuk detail arsitektur dan API contract.*
