#!/usr/bin/env bash
# ============================================================
# NovelBase Update Script — pull latest code and rebuild
# Run as root: bash /var/www/novelbase/deploy/update.sh
# ============================================================
set -euo pipefail

GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/var/www/novelbase"
cd "$APP_DIR"

echo -e "${CYAN}── Pulling latest code ──${NC}"
git pull origin main

echo -e "${CYAN}── Installing dependencies ──${NC}"
npm install --silent

echo -e "${CYAN}── Generating Prisma client ──${NC}"
npx prisma generate

echo -e "${CYAN}── Pushing schema changes (if any) ──${NC}"
npx prisma db push

echo -e "${CYAN}── Building Next.js ──${NC}"
npm run build

echo -e "${CYAN}── Restarting application ──${NC}"
pm2 restart novelbase

echo -e "${GREEN}[✓] Update complete!${NC}"
pm2 status novelbase
