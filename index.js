const dotenv = require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const connectDB = require("./config/db.js");
const deviceRoutes = require('./routes/device.js');
const crmRoutes = require('./routes/crm.js');
const retryQueue = require('./services/retryQueue.js');

const app = express();
app.use(morgan('dev'));
app.use(express.json()); // Express 5 has built-in JSON parsing
app.use(require('cors')());

// Debug: Log all incoming requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/device', deviceRoutes);
app.use('/crm', crmRoutes);

// optional health route
app.get('/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;

async function start(){
  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
  retryQueue.startRetryWorker();
}

start().catch(err => {
  console.error('Failed to start', err);
  process.exit(1);
});
