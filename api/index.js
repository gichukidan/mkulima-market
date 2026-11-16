const serverless = require('serverless-http');
const app = require('../server');

let cachedServer;

async function getServer() {
  if (!cachedServer) {
    if (app && typeof app.start === 'function') {
      await app.start();
    }
    cachedServer = app;
  }
  return cachedServer;
}

module.exports = async function handler(req, res) {
  const server = await getServer();
  return serverless(server)(req, res);
};
