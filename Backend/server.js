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
app.use('/api/mensajes',   require('./routes/mensajes'));

// Express 5: POST /api/mensajes sin trailing slash no llega al router montado,
// se registra también aquí con ruta completa para garantizar que sea capturado.
const { verificarToken: vt } = require('./middleware/auth');
app.post('/api/mensajes', vt, (req, res) => {
  try {
    const { solicitud_id, contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    if (!solicitud_id)      return res.status(400).json({ error: 'solicitud_id requerido.' });

    const sol = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(Number(solicitud_id));
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada.' });

    const uid = Number(req.user.id);
    const esParticipante = uid === Number(sol.arrendatario_id) || uid === Number(sol.propietario_id);
    if (!esParticipante) return res.status(403).json({ error: 'Sin permiso.' });

    const result = db.prepare(
      'INSERT INTO mensajes (solicitud_id, remitente_id, contenido) VALUES (?, ?, ?)'
    ).run(Number(solicitud_id), uid, contenido.trim());

    res.status(201).json({ id: result.lastInsertRowid, mensaje: 'Mensaje enviado.' });
  } catch (e) {
    console.error('POST /api/mensajes error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Ruta dedicada para cambiar plan — sin ambigüedad de parámetros
const db  = require('./database');
const jwt = require('jsonwebtoken');
app.post('/api/setplan', (req, res) => {
  try {
    const auth = req.headers.authorization?.split(' ')[1];
    if (!auth) return res.status(401).json({ error: 'Token requerido.' });
    const decoded = jwt.verify(auth, process.env.JWT_SECRET);
    if (decoded.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores.' });
    const { userId, plan } = req.body;
    if (!['free','premium'].includes(plan)) return res.status(400).json({ error: 'Plan inválido.' });
    const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
    db.prepare('UPDATE users SET plan = ? WHERE id = ?').run(plan, userId);
    res.json({ ok: true, plan });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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
