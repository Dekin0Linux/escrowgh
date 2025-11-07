module.exports = {
  apps: [
    {
      name: 'xcrow-api',
      script: 'dist/src/main.js',
      env_file: '/var/www/escrowgh/.env',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
