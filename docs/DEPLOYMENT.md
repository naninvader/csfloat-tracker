# CS2 Suite - Oracle Cloud (Ubuntu 22.04) Deployment Guide

## 1. Provisioning
- Create an OCI instance with Ubuntu 22.04.
- Open ports 80/443 (and 22 for SSH) in your security list.
- Attach a public IPv4 address.

## 2. Install dependencies
```bash
sudo apt update
sudo apt install -y git curl build-essential
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo apt install -y postgresql postgresql-contrib
```

## 3. Database setup
```bash
sudo -u postgres psql
CREATE USER cs2suite WITH PASSWORD 'your_secure_password';
CREATE DATABASE cs2suite OWNER cs2suite;
\q
```

## 4. App setup
```bash
git clone <your_repo_url> cs2-suite
cd cs2-suite/backend
cp .env.example .env
```
Update `.env`:
- `DATABASE_URL=postgresql://cs2suite:<password>@localhost:5432/cs2suite`
- `JWT_SECRET=<long_random_string>`
- `CORS_ORIGIN=https://your-domain`
- `CSFLOAT_API_KEY=<server-only key>`

Install and build:
```bash
npm install
npm run build
npm run migrate
```

## 5. Systemd service
Create `/etc/systemd/system/cs2-suite.service`:
```ini
[Unit]
Description=CS2 Suite API
After=network.target postgresql.service

[Service]
WorkingDirectory=/home/ubuntu/cs2-suite/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/ubuntu/cs2-suite/backend/dist/index.js
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cs2-suite
sudo systemctl start cs2-suite
sudo systemctl status cs2-suite
```

## 6. Frontend deployment
- Build locally or on server:
```bash
cd /home/ubuntu/cs2-suite/frontend
npm install
npm run build
```
- Serve `frontend/dist` with Nginx.

Example Nginx site `/etc/nginx/sites-available/cs2-suite`:
```nginx
server {
  listen 80;
  server_name your-domain;

  root /home/ubuntu/cs2-suite/frontend/dist;
  index index.html;

  location / {
    try_files $uri /index.html;
  }

  location /api/ {
    proxy_pass http://localhost:4000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```
Enable and restart:
```bash
sudo ln -s /etc/nginx/sites-available/cs2-suite /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 7. Troubleshooting
- **Database connection errors**: verify `DATABASE_URL` and that PostgreSQL is running.
- **CORS errors**: confirm `CORS_ORIGIN` matches the frontend URL.
- **CSFloat 429s**: increase `CSFLOAT_RATE_LIMIT_MS` or disable price list mode.
- **Scheduler not firing**: confirm the system clock and `PRICE_JOB_CRON` value.
