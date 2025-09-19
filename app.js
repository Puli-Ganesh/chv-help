const express = require('express');
const cors = require('cors');

const app = express();

const allowed = (process.env.CORS_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
const corsOptions = {
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowed.length === 0 || allowed.includes(origin)) return cb(null, true);
    cb(null, false);
  },
  credentials: true
};

app.use(cors(corsOptions));
app.set('etag', false);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json());

app.get('/', (req, res) => res.status(200).send('CHV API'));
app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin/files', require('./routes/fileRoutes'));
app.use('/api/employee', require('./routes/employeeRoutes'));

app.use((req, res) => res.status(404).send('Not found'));

module.exports = app;
