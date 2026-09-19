module.exports = {
  apps: [
    {
      name: 'astrality-bot',
      script: './index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      time: true,
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};