/**
 * PM2 Ecosystem Configuration for Webflipper Render Worker
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 logs webflipper-render
 *   pm2 stop webflipper-render
 *   pm2 restart webflipper-render
 */
module.exports = {
  apps: [
    {
      name: "webflipper-render",
      script: "npx",
      args: "tsx scripts/render-worker.ts --watch",
      cwd: "/opt/webflipper/video",
      env: {
        NODE_ENV: "production",
        RENDER_MODE: "local",
        SKIP_VOICEOVER: "0",
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,

      // Logging
      error_file: "/var/log/webflipper/render-error.log",
      out_file: "/var/log/webflipper/render-out.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss",

      // Memory limit — restart if exceeds 2GB
      max_memory_restart: "2G",

      // Watch for file changes (disabled in production)
      watch: false,
    },
  ],
};
