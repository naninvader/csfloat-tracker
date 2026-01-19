# CS2 Suite

CS2 Suite is a CSFloat price history tracker for Steam inventories, portfolios, and analytics.

## Structure
- `backend/` Express + PostgreSQL API
- `frontend/` React SPA
- `docs/` setup and deployment docs
- `scripts/` utilities and seed data

## Quick Start (local)
```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev

cd ../frontend
cp .env.example .env
npm install
npm run dev
```

## Docker (optional)
```bash
docker compose up --build
```

See `docs/SETUP.md` for full local setup and `docs/DEPLOYMENT.md` for production deployment steps.
