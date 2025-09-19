const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  credentials: true
}));

app.use(express.json());

app.get('/', (req, res) => res.status(200).send('CHV API'));
app.get('/healthz', (req, res) => res.status(200).send('ok'));

app.use((req, res) => res.status(404).send('Not found'));

module.exports = app;
