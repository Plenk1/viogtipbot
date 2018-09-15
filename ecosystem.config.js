module.exports = {
  apps: [
    {
      name: 'Xbot',
      script: './bot/bot.js',
      cwd: '[Path-To-Bot]/Xbot/',
      instance_id_env: '0',
      watch: true,
      error_file:
        '[Path-To-Bot]/Xbot/logs/tipbot-err.log',
      out_file: 
      '[Path-To-Bot]/Xbot/logs/tipbot-out.log',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
