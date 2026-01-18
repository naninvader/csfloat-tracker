# CSFloat Price History Tracker (MVP)

A full-stack MVP to import a Steam inventory JSON, track CSFloat prices hourly, and analyze holdings, portfolios, and historical charts.

## Repository Structure

```
/backend
/frontend
/docs
/scripts
```

## Assumptions

See [`docs/assumptions.md`](docs/assumptions.md).

## Local Development (Docker Compose)

1. Copy env templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

2. Start services:

```bash
docker-compose up --build
```

3. Run migrations (once):

```bash
docker-compose exec backend npm run migrate
```

4. (Optional) Seed demo user:

```bash
docker-compose exec backend npm run seed
```

Frontend: http://localhost:5173
Backend: http://localhost:4000

## Local Development (Manual)

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Environment Variables

### Backend (.env)

| Variable | Description |
| --- | --- |
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `DB_SSL` | `true` for SSL (prod) |
| `JWT_SECRET` | JWT signing secret |
| `JWT_EXPIRES_IN` | JWT expiration (e.g. `4h`) |
| `CORS_ORIGIN` | Comma-separated origins |
| `CSFLOAT_API_KEY` | CSFloat API key |
| `CSFLOAT_BASE_URL` | Base URL (default official) |
| `CSFLOAT_USE_PRICE_LIST` | `true` to use price-list endpoint |
| `CSFLOAT_MIN_INTERVAL_MS` | Throttle interval (default 1000ms) |

### Frontend (.env)

| Variable | Description |
| --- | --- |
| `VITE_API_URL` | Backend base URL |

## CSFloat API Key

1. Create an account on CSFloat.
2. Generate an API key from your account settings.
3. Set `CSFLOAT_API_KEY` in `backend/.env`.

## Deployment (Ubuntu OCI Single Server)

### 1) Install dependencies

```bash
sudo apt update
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx
```

### 2) Set up PostgreSQL

```bash
sudo -u postgres createuser csfloat_user
sudo -u postgres createdb csfloat_tracker -O csfloat_user
```

Set a password and construct a `DATABASE_URL`.

### 3) Backend

```bash
cd /opt/csfloat-tracker/backend
cp .env.example .env
npm install
npm run migrate
```

Use systemd or PM2 (example with PM2):

```bash
sudo npm install -g pm2
pm2 start src/index.js --name csfloat-backend
pm2 save
```

### 4) Frontend

```bash
cd /opt/csfloat-tracker/frontend
cp .env.example .env
npm install
npm run build
```

Serve with Nginx:

```
server {
  listen 80;
  server_name your-domain.com;

  location / {
    root /opt/csfloat-tracker/frontend/dist;
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
  }
}
```

Reload Nginx:

```bash
sudo systemctl reload nginx
```

## Usage Notes

* Inventory import creates/updates a bulk holding per `market_hash_name`.
* Hourly pricing uses Postgres advisory lock to prevent double runs.
* Password reset tokens are returned in the API response for development.

## Tests

```bash
cd backend
npm test
```
