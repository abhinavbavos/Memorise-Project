module.exports = {
  apps: [
    {
      name: "profile-backend",
      script: "src/index.js",
      interpreter: "node",
      instances: 1,
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      stop_signal: "SIGTERM",
      env: {
        NODE_ENV: "production",
        PORT: process.env.PORT || "4060", // <- your API port
      },
    },
    {
      name: "thumb-worker",
      script: "src/worker/thumbWorker.js",
      interpreter: "node",
      instances: 1,
      watch: false,
      autorestart: true,
      restart_delay: 5000,
      stop_signal: "SIGTERM",
      env: {
        NODE_ENV: "production",
        // IMPORTANT: no PORT here; worker should not listen on a port
      },
    },
  ],
};
