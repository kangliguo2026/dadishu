/**
 * PM2 进程管理配置
 * 用法：pm2 start ecosystem.config.js
 */
module.exports = {
  apps: [
    {
      name: 'dadishu',
      script: 'server.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
    },
  ],
};
