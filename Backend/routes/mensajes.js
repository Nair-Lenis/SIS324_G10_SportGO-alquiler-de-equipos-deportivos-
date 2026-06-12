const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verificarToken } = require('../middleware/auth');

// GET /api/mensajes/novistos/:userId — contar mensajes no leídos del usuario
// MUST be defined before /:solicitudId to avoid route shadowing
router.get('/novistos/:userId', verificarToken, (req, res) => {
  if (req.user.id !== parseInt(req.params.userId) && req.user.rol !== 'admin')
    return res.status(403).json({ error: 'Sin permiso.' });

  const { total } = db.prepare(`
    SELECT COUNT(*) AS total FROM mensajes m
    JOIN solicitudes s ON s.id = m.solicitud_id
    WHERE (s.arrendatario_id = ? OR s.propietario_id = ?)
      AND m.remitente_id != ?
      AND m.leido = 0
  `).get(req.params.userId, req.params.userId, req.params.userId);

  res.json({ total });
});

// GET /api/mensajes/:solicitudId — obtener mensajes de una solicitud
router.get('/:solicitudId', verificarToken, (req, res) => {
  try {
    const solId = Number(req.params.solicitudId);
    const uid   = Number(req.user.id);
    const sol = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(solId);
    if (!sol) return res.status(404).json({ error: 'Solicitud no encontrada.' });

    const esParticipante = uid === Number(sol.arrendatario_id) || uid === Number(sol.propietario_id) || req.user.rol === 'admin';
    if (!esParticipante) return res.status(403).json({ error: 'Sin permiso.' });

    db.prepare('UPDATE mensajes SET leido = 1 WHERE solicitud_id = ? AND remitente_id != ?').run(solId, uid);

    const mensajes = db.prepare(`
      SELECT m.*, u.nombre || ' ' || u.apellido AS remitente_nombre, u.rol AS remitente_rol
      FROM mensajes m
      JOIN users u ON u.id = m.remitente_id
      WHERE m.solicitud_id = ?
      ORDER BY m.created_at ASC
    `).all(solId);

    res.json(mensajes);
  } catch (e) {
    console.error('GET /mensajes/:id error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/mensajes — enviar mensaje
router.post('/', verificarToken, (req, res) => {
  try {
    const { solicitud_id, contenido } = req.body;
    if (!contenido?.trim()) return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
    if (!solicitud_id) return res.status(400).json({ error: 'solicitud_id requerido.' });

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
    console.error('POST /mensajes error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
