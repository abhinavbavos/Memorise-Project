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
    },
  ],
};
