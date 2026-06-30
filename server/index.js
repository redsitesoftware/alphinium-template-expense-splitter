const express = require('express');
const path = require('path');
const fs = require('fs');
const groupsRouter = require('./routes/groups');

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure uploads directory exists (pod filesystem may not persist across restarts)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  return next();
});

// Serve uploaded receipt files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/groups', groupsRouter);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

module.exports = app;
