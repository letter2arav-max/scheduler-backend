const path = require('path');
const dotenv = require('dotenv');

// Monorepo root .env (run from scheduler-backend/ or repo root)
dotenv.config({ path: path.join(__dirname, '..', '.env') });
// Optional local overrides
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const testRoutes = require('./src/routes/testRoutes');
const { startServer } = require('./server');

startServer({ testRoutes });
