# CS2 Suite - Local Setup

## Prerequisites
- Node.js 20+
- PostgreSQL 13+

## Backend
1. Copy `.env.example` to `.env` in `backend` and update values as needed.
2. Install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Run migrations:
   ```bash
   npm run migrate
   ```
4. Start the API:
   ```bash
   npm run dev
   ```

## Frontend
1. Copy `.env.example` to `.env` in `frontend` if you need a custom API URL.
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

## Docker Compose (optional)
```bash
docker compose up --build
```

## Notes
- Password reset tokens are logged on the backend for the MVP.
- Inventory JSON parsing is tolerant and skips items without `market_hash_name`.
