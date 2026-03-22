#!/bin/bash
# ============================================
# Webflipper Render Worker — Hetzner Setup
# Run this once on a fresh Hetzner server
# ============================================
set -e

echo "🎬 Setting up Webflipper Render Worker..."

# 1. System dependencies
echo "📦 Installing system dependencies..."
apt-get update -qq
apt-get install -y -qq \
  curl git build-essential \
  chromium-browser \
  fonts-liberation fonts-noto-color-emoji \
  ffmpeg \
  > /dev/null 2>&1

# 2. Node.js 20 (if not installed)
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
  echo "📦 Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs > /dev/null 2>&1
fi

echo "   Node $(node -v), npm $(npm -v)"

# 3. PM2 (process manager)
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  npm install -g pm2 > /dev/null 2>&1
fi

# 4. Create app directory
echo "📁 Setting up /opt/webflipper/video..."
mkdir -p /opt/webflipper/video
mkdir -p /var/log/webflipper
mkdir -p /tmp/webflipper-renders

# 5. Clone or pull the video project
if [ -d "/opt/webflipper/video/.git" ]; then
  echo "🔄 Pulling latest code..."
  cd /opt/webflipper/video
  git pull
else
  echo "📥 Cloning repository..."
  # Clone only the video subfolder (sparse checkout)
  cd /opt/webflipper
  git clone --depth 1 --filter=blob:none --sparse \
    https://github.com/michalbaturko-lang/webflipper.git temp-clone
  cd temp-clone
  git sparse-checkout set video
  cp -r video/* /opt/webflipper/video/
  cp -r video/.* /opt/webflipper/video/ 2>/dev/null || true
  cd /opt/webflipper
  rm -rf temp-clone
fi

# 6. Install npm dependencies
echo "📦 Installing npm packages..."
cd /opt/webflipper/video
npm install --production=false > /dev/null 2>&1

# 7. Copy env file if not exists
if [ ! -f "/opt/webflipper/video/.env" ]; then
  echo "⚙️  Creating .env from template..."
  cp deploy/.env.production .env
  echo ""
  echo "⚠️  IMPORTANT: Edit /opt/webflipper/video/.env and set:"
  echo "   - SUPABASE_SERVICE_KEY"
  echo "   - ELEVENLABS_API_KEY (optional)"
  echo ""
fi

# 8. Set Chromium path for Remotion
export PUPPETEER_EXECUTABLE_PATH=$(which chromium-browser || which chromium)
echo "PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH" >> .env

# 9. Start with PM2
echo "🚀 Starting render worker..."
pm2 start deploy/ecosystem.config.js
pm2 save

# 10. Auto-start on reboot
pm2 startup systemd -u root --hp /root 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "Commands:"
echo "  pm2 logs webflipper-render    — View logs"
echo "  pm2 restart webflipper-render — Restart worker"
echo "  pm2 stop webflipper-render    — Stop worker"
echo "  pm2 monit                     — Monitor resources"
echo ""
echo "Config: /opt/webflipper/video/.env"
echo "Logs:   /var/log/webflipper/"
