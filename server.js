require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/notesheaven';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Fallback for HTML navigation (if direct URL accessed)
app.get('*', (req, res) => {
  // If request is looking for an API route that wasn't matched
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API route not found' });
  }
  // Otherwise serve index.html
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Connect to MongoDB & Start Server
async function startServer() {
  try {
    console.log('Connecting to MongoDB at:', MONGO_URI);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(' MongoDB connected successfully!');
  } catch (err) {
    console.warn('⚠️ Warning: MongoDB connection failed.', err.message);
    console.warn('Please ensure MongoDB is running locally on mongodb://127.0.0.1:27017/notesheaven or update MONGO_URI in .env');
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 Notes Heaven server running on http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' || err.code === 'EPERM') {
      const fallbackPort = Number(PORT) + 1;
      console.warn(`Port ${PORT} unavailable (${err.code}). Trying port ${fallbackPort}...`);
      app.listen(fallbackPort, () => {
        console.log(`🚀 Notes Heaven server running on http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
