#!/usr/bin/env bash
# ============================================================
# SSL Setup Script — run after DNS A records are pointing
# Usage: bash ssl-setup.sh <domain> <email>
# ============================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR="/var/www/novelbase"

[[ -z "$DOMAIN" ]] && { echo -e "${RED}Usage: bash ssl-setup.sh <domain> <email>${NC}"; exit 1; }
[[ -z "$EMAIL" ]] && { echo -e "${RED}Usage: bash ssl-setup.sh <domain> <email>${NC}"; exit 1; }
[[ $EUID -ne 0 ]] && { echo -e "${RED}Run as root${NC}"; exit 1; }

echo -e "${CYAN}── Installing Certbot ──${NC}"
apt-get install -y -qq certbot python3-certbot-nginx

echo -e "${CYAN}── Obtaining SSL certificate ──${NC}"
certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive --redirect

echo -e "${CYAN}── Applying full Nginx config ──${NC}"
# Copy the production nginx config and replace domain placeholder
cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/novelbase
sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/novelbase

nginx -t && systemctl reload nginx

echo -e "${CYAN}── Setting up auto-renewal ──${NC}"
# Certbot auto-renewal timer should already be set up, verify:
systemctl enable certbot.timer
systemctl start certbot.timer

# Test renewal
certbot renew --dry-run

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  SSL setup complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  Site:   ${CYAN}https://$DOMAIN${NC}"
echo -e "  Admin:  ${CYAN}https://$DOMAIN/admin${NC}"
echo -e "  SSL auto-renewal is active"
echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
