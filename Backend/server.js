const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/users',      require('./routes/users'));
app.use('/api/equipos',    require('./routes/equipos'));
app.use('/api/solicitudes', require('./routes/solicitudes'));

const fs = require('fs');
const publicDir  = path.join(__dirname, 'public');
const indexHtml  = path.join(publicDir, 'index.html');

if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (req, res) => {
    if (fs.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.status(404).json({ error: 'Frontend no encontrado.' });
    }
  });
}

const PORT = process.env.PORT || 1573;
app.listen(PORT, () => console.log(`✅ Servidor en http://localhost:${PORT}`));
