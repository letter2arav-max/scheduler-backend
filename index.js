const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env'), override: true });

const testRoutes = require('./src/routes/testRoutes');
const { startServer } = require('./server');

startServer({ testRoutes });
