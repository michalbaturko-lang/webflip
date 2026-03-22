#!/bin/bash
# ============================================
# Quick update script — pull latest & restart
# Run: bash /opt/webflipper/video/deploy/update.sh
# ============================================
set -e

cd /opt/webflipper/video

echo "🔄 Pulling latest code..."
git pull

echo "📦 Installing dependencies..."
npm install --production=false > /dev/null 2>&1

echo "🔄 Restarting render worker..."
pm2 restart webflipper-render

echo "✅ Updated and restarted!"
pm2 logs webflipper-render --lines 5
