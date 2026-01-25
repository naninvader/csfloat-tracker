# CS2 Suite - Oracle Cloud (Ubuntu 22.04) Deployment Guide

This guide walks through provisioning an OCI instance, installing system dependencies, configuring Postgres, deploying the backend + frontend, and validating the full CS2 Suite experience.

## 1. Provision an OCI instance
1. **Create a VM**: Oracle Cloud → Compute → Instances → Create.
2. **Image**: Ubuntu 22.04 LTS.
3. **Shape**: Choose a VM.Standard shape that fits your expected load.
4. **Networking**:
   - Ensure the instance has a public IPv4.
   - Add ingress rules for:
     - TCP 22 (SSH)
     - TCP 80 (HTTP)
     - TCP 443 (HTTPS)
5. **SSH access**:
   - Download/save your SSH key during instance creation.
   - Connect: `ssh ubuntu@<PUBLIC_IP> -i /path/to/key.pem`

## 2. Prepare the server
```bash
sudo apt update
sudo apt install -y git curl build-essential ufw
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable
```

## 3. Install runtime dependencies
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo apt install -y postgresql postgresql-contrib
sudo apt install -y nginx
```

Verify versions:
```bash
node -v
npm -v
psql --version
nginx -v
```

## 4. Configure PostgreSQL
1. Create a database user and database:
   ```bash
   sudo -u postgres psql
   CREATE USER cs2suite WITH PASSWORD 'your_secure_password';
   CREATE DATABASE cs2suite OWNER cs2suite;
   \\q
   ```
2. (Optional) Confirm connectivity:
   ```bash
   psql "postgresql://cs2suite:your_secure_password@localhost:5432/cs2suite" -c "SELECT now();"
   ```

## 5. Clone and configure the app
```bash
git clone <your_repo_url> cs2-suite
cd cs2-suite
```

### 5.1 Backend environment
```bash
cd backend
cp .env.example .env
```
Update `.env` with **production** values:
- `DATABASE_URL=postgresql://cs2suite:<password>@localhost:5432/cs2suite`
- `JWT_SECRET=<long_random_string>`
- `JWT_EXPIRES_IN=8h` (or your preference)
- `CORS_ORIGIN=https://your-domain`
- `CSFLOAT_API_KEY=<server-only key>`
- `CSFLOAT_RATE_LIMIT_MS=1000`
- `CSFLOAT_CACHE_TTL_MS=300000`
- `CSFLOAT_ENABLE_PRICE_LIST=true`
- `PRICE_JOB_CRON=0 * * * *`

Install, build, and migrate:
```bash
npm install
npm run build
npm run migrate
```

### 5.2 Frontend environment
```bash
cd ../frontend
cp .env.example .env
```
Update `.env`:
- `VITE_API_URL=https://your-domain` (or `http://<PUBLIC_IP>` if no HTTPS yet)

Build the frontend:
```bash
npm install
npm run build
```

## 6. Run the backend as a systemd service
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

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable cs2-suite
sudo systemctl start cs2-suite
sudo systemctl status cs2-suite
```

## 7. Configure Nginx
Create `/etc/nginx/sites-available/cs2-suite`:
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

## 8. (Optional) HTTPS with Let's Encrypt
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain
```

## 9. Validation checklist
- Visit `http://your-domain` (or `https://your-domain` if using HTTPS).
- Register an account and log in.
- Import inventory JSON in **Import** page.
- Verify holdings appear in **Analytics**.
- Wait for the hourly price job or manually trigger `runPriceJob` via a temporary script for testing.

## 10. Troubleshooting
- **Backend not responding**: `sudo systemctl status cs2-suite` and check logs with `journalctl -u cs2-suite -f`.
- **Database connection errors**: verify `DATABASE_URL`, Postgres status, and credentials.
- **CORS errors**: confirm `CORS_ORIGIN` matches your frontend origin.
- **CSFloat 429s**: increase `CSFLOAT_RATE_LIMIT_MS` or disable price list mode.
- **Scheduler not firing**: confirm server time and `PRICE_JOB_CRON`.
