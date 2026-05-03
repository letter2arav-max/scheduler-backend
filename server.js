const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const { startScheduler } = require('./scheduler');

const PORT = Number(process.env.PORT) || 5000;

/**
 * @param {{ testRoutes?: import('express').Router }} [options]
 */
function createApp(options = {}) {
  const testRoutes = options.testRoutes ?? require('./src/routes/testRoutes');

  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use('/', testRoutes);
  app.use(routes);

  return app;
}

/**
 * @param {{ testRoutes?: import('express').Router }} [options]
 */
function startServer(options = {}) {
  const app = createApp(options);
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    startScheduler();
  });
}

module.exports = { createApp, startServer };
