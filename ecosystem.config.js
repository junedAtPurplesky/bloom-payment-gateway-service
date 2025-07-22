module.exports = {
  apps: [{
    name: "bloom-payment-gateway-backend",
    script: "./build/app.js",
    interpreter: "node",
    env: {
      NODE_ENV: "production",
      TS_NODE_PROJECT: "./tsconfig.json"
    },
    env_development: {
      NODE_ENV: "development",
      TS_NODE_PROJECT: "./tsconfig.json"
    },
    instances: "1",
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "1G",
    log_date_format: "YYYY-MM-DD HH:mm Z",
    error_file: "./logs/pm2-error.log",
    out_file: "./logs/pm2-out.log"
  }]
};

