#!/usr/bin/env bash
# ============================================================
# NovelBase VPS Setup Script — Ubuntu 24.04
# Run as root: bash setup.sh
# ============================================================
set -euo pipefail

# ── Colors ───────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}── $1 ──${NC}"; }

# ── Check root ───────────────────────────────────────────────
[[ $EUID -ne 0 ]] && err "This script must be run as root"

# ── Prompt for configuration ─────────────────────────────────
step "Configuration"

read -rp "Domain name (e.g. novelbase.com): " DOMAIN
[[ -z "$DOMAIN" ]] && err "Domain is required"

read -rp "Git repo URL (HTTPS, e.g. https://github.com/user/novel-data-web.git): " GIT_REPO
[[ -z "$GIT_REPO" ]] && err "Git repo URL is required"

read -rp "Admin email (for SSL + admin account): " ADMIN_EMAIL
[[ -z "$ADMIN_EMAIL" ]] && err "Admin email is required"

read -rsp "Admin password (min 6 chars): " ADMIN_PASSWORD
echo
[[ ${#ADMIN_PASSWORD} -lt 6 ]] && err "Password must be at least 6 characters"

read -rp "Admin display name [Admin]: " ADMIN_NAME
ADMIN_NAME=${ADMIN_NAME:-Admin}

# Generate secure secrets
DB_PASSWORD=$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)
JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 64)

APP_DIR="/var/www/novelbase"
DB_NAME="novelbase"
DB_USER="novelbase"

echo ""
log "Domain:     $DOMAIN"
log "App dir:    $APP_DIR"
log "DB:         $DB_NAME (user: $DB_USER)"
log "Admin:      $ADMIN_EMAIL"
echo ""
read -rp "Continue? [Y/n] " CONFIRM
[[ "$CONFIRM" =~ ^[Nn] ]] && exit 0

# ── 1. System update ─────────────────────────────────────────
step "1/10 System update"
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq curl wget git build-essential unzip software-properties-common ca-certificates gnupg
log "System updated"

# ── 2. Swap (2GB) ────────────────────────────────────────────
step "2/10 Setting up 2GB swap"
if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    # Optimize swap usage
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    log "2GB swap created"
else
    warn "Swap already exists, skipping"
fi

# ── 3. Node.js 22 ───────────────────────────────────────────
step "3/10 Installing Node.js 22"
if ! command -v node &>/dev/null || [[ "$(node -v)" != v22* ]]; then
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y -qq nodejs
    log "Node.js $(node -v) installed"
else
    log "Node.js $(node -v) already installed"
fi

# Install PM2 globally
npm install -g pm2 --silent
log "PM2 $(pm2 -v) installed"

# ── 4. PostgreSQL 16 ────────────────────────────────────────
step "4/10 Installing PostgreSQL 16"
if ! command -v psql &>/dev/null; then
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list
    apt-get update -qq
    apt-get install -y -qq postgresql-16
    log "PostgreSQL 16 installed"
else
    log "PostgreSQL already installed"
fi

# Create database and user
step "Creating database"
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
log "Database '$DB_NAME' ready"

# ── 5. Redis ─────────────────────────────────────────────────
step "5/10 Installing Redis"
if ! command -v redis-server &>/dev/null; then
    apt-get install -y -qq redis-server
    # Bind to localhost only
    sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory .*/maxmemory 256mb/' /etc/redis/redis.conf
    sed -i 's/^# maxmemory-policy .*/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
    systemctl enable redis-server
    systemctl restart redis-server
    log "Redis installed and configured"
else
    log "Redis already installed"
fi

# ── 6. Nginx ─────────────────────────────────────────────────
step "6/10 Installing Nginx"
if ! command -v nginx &>/dev/null; then
    apt-get install -y -qq nginx
    systemctl enable nginx
    log "Nginx installed"
else
    log "Nginx already installed"
fi

# ── 7. Clone and build app ───────────────────────────────────
step "7/10 Setting up application"

# Create app directory
mkdir -p "$APP_DIR"
mkdir -p /var/log/novelbase
mkdir -p /var/www/certbot

if [[ -d "$APP_DIR/.git" ]]; then
    warn "App directory already has a git repo, pulling latest..."
    cd "$APP_DIR"
    git pull origin main
else
    git clone "$GIT_REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# Create .env.local for production
cat > "$APP_DIR/.env.local" <<ENVFILE
# Database
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

# Auth
JWT_SECRET=${JWT_SECRET}

# Site URL (update after SSL is set up)
NEXT_PUBLIC_SITE_URL=https://${DOMAIN}

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2 (configure later)
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET_NAME=novelbase
# R2_PUBLIC_URL=https://cdn.${DOMAIN}

# Admin creation
ADMIN_EMAIL=${ADMIN_EMAIL}
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_DISPLAY_NAME=${ADMIN_NAME}
ENVFILE

chmod 600 "$APP_DIR/.env.local"
log ".env.local created"

# Install dependencies
log "Installing npm packages (this may take a minute)..."
cd "$APP_DIR"
npm ci --omit=dev --silent 2>/dev/null || npm install --omit=dev --silent
# Also install dev deps temporarily for build + prisma
npm install --silent

# Generate Prisma client
log "Generating Prisma client..."
npx prisma generate

# Push database schema
log "Pushing database schema..."
npx prisma db push --accept-data-loss

# Seed genres
log "Seeding genres..."
npx tsx prisma/seed.ts

# Create admin user
log "Creating admin user..."
npx tsx prisma/create-admin.ts

# Build Next.js
log "Building Next.js (this may take 2-3 minutes)..."
npm run build

# Create uploads directory
mkdir -p "$APP_DIR/public/uploads/covers"

log "Application built successfully"

# ── 8. Configure Nginx ───────────────────────────────────────
step "8/10 Configuring Nginx"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# First, set up HTTP-only config for Certbot
cat > /etc/nginx/sites-available/novelbase <<NGINX_TEMP
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN} www.${DOMAIN};

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_TEMP

ln -sf /etc/nginx/sites-available/novelbase /etc/nginx/sites-enabled/novelbase
nginx -t && systemctl reload nginx
log "Nginx configured (HTTP)"

# ── 9. Start app with PM2 ────────────────────────────────────
step "9/10 Starting application with PM2"
cd "$APP_DIR"
pm2 delete novelbase 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || true
log "Application started on port 3000"

# ── 10. Firewall ─────────────────────────────────────────────
step "10/10 Configuring firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
log "Firewall enabled (SSH + HTTP + HTTPS)"

# ── Summary ──────────────────────────────────────────────────
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  NovelBase deployment complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  App:        ${CYAN}http://${DOMAIN}${NC} (HTTP only for now)"
echo -e "  Admin:      ${CYAN}http://${DOMAIN}/admin${NC}"
echo -e "  Login:      ${CYAN}${ADMIN_EMAIL}${NC}"
echo -e "  App dir:    ${APP_DIR}"
echo -e "  Logs:       ${CYAN}pm2 logs novelbase${NC}"
echo ""
echo -e "${YELLOW}  ⚡ NEXT STEPS:${NC}"
echo ""
echo -e "  1. Point your DNS A record:"
echo -e "     ${CYAN}${DOMAIN}     → $(curl -4s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')${NC}"
echo -e "     ${CYAN}www.${DOMAIN} → same IP${NC}"
echo ""
echo -e "  2. After DNS propagates, run SSL setup:"
echo -e "     ${CYAN}bash ${APP_DIR}/deploy/ssl-setup.sh ${DOMAIN} ${ADMIN_EMAIL}${NC}"
echo ""
echo -e "  3. Configure Cloudflare R2 (optional):"
echo -e "     Edit ${APP_DIR}/.env.local and uncomment R2 variables"
echo -e "     Then: ${CYAN}cd ${APP_DIR} && pm2 restart novelbase${NC}"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
