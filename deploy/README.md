# NovelBase VPS Deployment Guide

Ubuntu 24.04 VPS deployment with Node.js, PostgreSQL, Redis, Nginx, and SSL.

## Prerequisites

- Ubuntu 24.04 VPS (2+ Core, 4GB+ RAM recommended)
- Domain name
- SSH root access
- Git repo pushed to GitHub/GitLab (private or public)

## Quick Deploy (One Command)

SSH into your VPS and run:

```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/YOUR_USER/novel-data-web/main/deploy/setup.sh | bash
```

Or clone first, then run:

```bash
git clone https://github.com/YOUR_USER/novel-data-web.git /tmp/novelbase-setup
bash /tmp/novelbase-setup/deploy/setup.sh
```

The script will prompt for:
- Domain name
- Git repo URL
- Admin email & password

It automatically installs and configures everything.

## What Gets Installed

| Component    | Version | Purpose               |
|-------------|---------|------------------------|
| Node.js     | 22.x    | Runtime                |
| PostgreSQL  | 16      | Database               |
| Redis       | Latest  | Caching & rate limiting|
| Nginx       | Latest  | Reverse proxy + SSL    |
| PM2         | Latest  | Process manager        |
| Certbot     | Latest  | SSL certificates       |

## After Initial Setup

### 1. Point DNS

Add these DNS A records at your domain registrar:

```
Type  Name   Value         TTL
A     @      YOUR_VPS_IP   300
A     www    YOUR_VPS_IP   300
```

### 2. SSL Setup

After DNS propagates (usually 5-30 minutes), run:

```bash
bash /var/www/novelbase/deploy/ssl-setup.sh yourdomain.com your@email.com
```

### 3. Configure Cloudflare R2 (Optional)

1. Create an R2 bucket named `novelbase` in Cloudflare dashboard
2. Create an R2 API token with read/write access
3. Set up a custom domain for R2 (e.g. `cdn.yourdomain.com`)
4. Edit the env file:

```bash
nano /var/www/novelbase/.env.local
```

Uncomment and fill R2 variables:

```
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_key
R2_SECRET_ACCESS_KEY=your_secret
R2_BUCKET_NAME=novelbase
R2_PUBLIC_URL=https://cdn.yourdomain.com
```

Then restart:

```bash
pm2 restart novelbase
```

## Common Operations

### Update/Redeploy

```bash
bash /var/www/novelbase/deploy/update.sh
```

### View Logs

```bash
pm2 logs novelbase          # Live logs
pm2 logs novelbase --lines 100  # Last 100 lines
```

### Restart App

```bash
pm2 restart novelbase
```

### Check Status

```bash
pm2 status
pm2 monit    # Real-time monitoring
```

### Database Backup

```bash
# Manual backup
pg_dump -U novelbase novelbase > /root/backups/novelbase-$(date +%Y%m%d).sql

# Set up daily backup cron
crontab -e
# Add: 0 3 * * * pg_dump -U novelbase novelbase > /root/backups/novelbase-$(date +\%Y\%m\%d).sql
```

### Check Disk Usage

```bash
df -h
du -sh /var/www/novelbase/
du -sh /var/www/novelbase/public/uploads/
```

## File Structure on VPS

```
/var/www/novelbase/       # Application code
/var/log/novelbase/       # PM2 logs
/var/www/certbot/         # Let's Encrypt challenges
/etc/nginx/sites-available/novelbase  # Nginx config
```

## Troubleshooting

### App won't start
```bash
pm2 logs novelbase --lines 50   # Check error logs
cat /var/www/novelbase/.env.local  # Verify env vars
```

### Database connection failed
```bash
sudo -u postgres psql -l        # List databases
systemctl status postgresql     # Check PostgreSQL status
```

### Nginx errors
```bash
nginx -t                        # Test config syntax
systemctl status nginx          # Check Nginx status
journalctl -u nginx --since "1 hour ago"
```

### Redis not connecting
```bash
redis-cli ping                  # Should return PONG
systemctl status redis-server
```

### Out of memory
```bash
free -h                         # Check memory
swapon --show                   # Check swap
pm2 monit                       # Monitor app memory
```
