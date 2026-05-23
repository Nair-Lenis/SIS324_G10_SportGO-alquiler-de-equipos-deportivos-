const express = require('express');
const cors    = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error('No permitido por CORS'));
  },
}));
app.use(express.json());

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/users',   require('./routes/users'));
app.use('/api/equipos', require('./routes/equipos'));

app.get('/', (_req, res) => res.json({ mensaje: '🚀 SportGo API corriendo', version: '2.0' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Servidor en http://localhost:${PORT}`));
