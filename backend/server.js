require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');
const startPricingJob = require('./jobs/pricingJob');

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
if (process.env.NODE_ENV !== 'production') {
  for (const origin of ['http://localhost:5173', 'http://127.0.0.1:5173']) {
    if (!allowedOrigins.includes(origin)) allowedOrigins.push(origin);
  }
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    const error = new Error('Origin is not allowed by CORS');
    error.status = 403;
    return callback(error);
  }
}));
app.use(express.json({ limit: '1mb' }));
morgan.token('url', req =>
  req.originalUrl.replace(/([?&]token=)[^&]*/i, '$1[REDACTED]')
);
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/meters', require('./routes/meterRoutes'));
app.use('/api/listings', require('./routes/listingRoutes'));
app.use('/api/bids', require('./routes/bidRoutes'));
app.use('/api/matching', require('./routes/matchingRoutes'));
app.use('/api/wallet', require('./routes/walletRoutes'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/ledger', require('./routes/ledgerRoutes'));
app.use('/api/grid', require('./routes/gridRoutes'));
app.use('/api/pricing', require('./routes/pricingRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/carbon', require('./routes/carbonRoutes'));
app.use('/api/disputes', require('./routes/disputeRoutes'));

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  startPricingJob();
  app.listen(PORT, () => console.log(`API running on ${PORT}`));
}).catch(error => {
  console.error('Unable to start the API because MongoDB could not be reached. Check MONGO_URI and confirm MongoDB is running.', error);
  process.exitCode = 1;
});
