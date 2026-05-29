module.exports = {
  apps: [
    {
      name: "novelbase",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: "/var/www/novelbase",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      // Logs
      error_file: "/var/log/novelbase/error.log",
      out_file: "/var/log/novelbase/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      // Memory limit — restart if exceeds 1.5GB
      max_memory_restart: "1500M",
    },
  ],
};
