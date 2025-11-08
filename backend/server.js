const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database
const db = require('./db/database');

// Routes
const sessionsRouter = require('./routes/sessions');
const statsRouter = require('./routes/stats');
const reflectionRouter = require('./routes/reflection');
const categoriesRouter = require('./routes/categories');

app.use('/api/sessions', sessionsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/reflection', reflectionRouter);
app.use('/api/categories', categoriesRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Scheduled task: Categorize sessions every 15 minutes
const categorizationService = require('./services/categorization');
cron.schedule('*/15 * * * *', async () => {
  console.log('Running scheduled categorization...');
  try {
    await categorizationService.categorizeUncategorizedSessions();
  } catch (error) {
    console.error('Scheduled categorization failed:', error);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🧠 Reflectra backend running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
