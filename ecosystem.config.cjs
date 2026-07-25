// PM2 ecosystem config for Hostinger deployment
module.exports = {
  apps: [
    {
      name: "gadgetpe-api",
      cwd: "./backend",
      script: "src/server.js",
      env: {
        PORT: 4000,
        NODE_ENV: "production",
      },
      node_args: "--experimental-vm-modules",
    },
    {
      name: "gadgetpe-web",
      cwd: "./frontend",
      script: "serve.mjs",
      env: {
        PORT: 3000,
        API_BACKEND: "http://localhost:4000",
        NODE_ENV: "production",
      },
    },
  ],
};
