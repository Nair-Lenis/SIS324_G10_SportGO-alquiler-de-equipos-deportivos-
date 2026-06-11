const express = require('express');
const router = express.Router();
const db = require('../database');
const { verificarToken } = require('../middleware/auth');

const departamentosBolivia = ['Beni', 'Chuquisaca', 'Cochabamba', 'La Paz', 'Oruro', 'Pando', 'Potosí', 'Santa Cruz', 'Tarija'];

function calcularDias(inicio, fin) {
  const a = new Date(inicio);
  const b = new Date(fin);
  const diff = b.getTime() - a.getTime();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

router.post('/', verificarToken, (req, res) => {
  if (req.user.rol !== 'arrendatario')
    return res.status(403).json({ error: 'Solo arrendatarios pueden crear solicitudes.' });

  const { equipo_id, fecha_inicio, fecha_fin, mensaje } = req.body;
  if (!equipo_id || !fecha_inicio || !fecha_fin)
    return res.status(400).json({ error: 'Equipo, fecha de inicio y fecha de fin son obligatorios.' });

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const inicio = new Date(fecha_inicio);
  const fin = new Date(fecha_fin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime()))
    return res.status(400).json({ error: 'Fechas inválidas.' });

  if (inicio < hoy)
    return res.status(400).json({ error: 'La fecha de inicio debe ser igual o posterior a hoy.' });
  if (fin <= inicio)
    return res.status(400).json({ error: 'La fecha de fin debe ser posterior a la fecha de inicio.' });

  const equipo = db.prepare(`
    SELECT e.*, u.id AS propietario_id, u.whatsapp AS propietario_whatsapp, u.nombre || ' ' || u.apellido AS propietario_nombre
    FROM equipos e
    JOIN users u ON u.id = e.propietario_id
    WHERE e.id = ?
  `).get(equipo_id);

  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });
  if (equipo.estado_val !== 'aprobado')
    return res.status(400).json({ error: 'Solo se pueden solicitar equipos aprobados.' });

  const activa = db.prepare(`
    SELECT 1 FROM solicitudes
    WHERE equipo_id = ? AND arrendatario_id = ? AND estado IN ('pendiente','aceptada')
  `).get(equipo_id, req.user.id);
  if (activa)
    return res.status(400).json({ error: 'Ya tenés una solicitud activa para este equipo.' });

  const result = db.prepare(`
    INSERT INTO solicitudes (equipo_id, arrendatario_id, propietario_id, fecha_inicio, fecha_fin, mensaje, estado)
    VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(equipo_id, req.user.id, equipo.propietario_id, fecha_inicio, fecha_fin, mensaje?.trim() || null);

  res.status(201).json({ mensaje: 'Solicitud creada correctamente.', id: result.lastInsertRowid });
});

router.get('/mis', verificarToken, (req, res) => {
  if (req.user.rol !== 'arrendatario')
    return res.status(403).json({ error: 'Solo arrendatarios pueden ver sus solicitudes.' });

  const solicitudes = db.prepare(`
    SELECT s.*, e.titulo AS equipo_titulo, e.categoria AS equipo_categoria, e.precio_dia AS equipo_precio,
           u.nombre || ' ' || u.apellido AS propietario_nombre, u.whatsapp AS propietario_whatsapp,
           u.telefono AS propietario_telefono
    FROM solicitudes s
    JOIN equipos e ON e.id = s.equipo_id
    JOIN users u ON u.id = s.propietario_id
    WHERE s.arrendatario_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);

  res.json(solicitudes);
});

router.get('/recibidas', verificarToken, (req, res) => {
  if (req.user.rol !== 'propietario')
    return res.status(403).json({ error: 'Solo propietarios pueden ver solicitudes recibidas.' });

  const solicitudes = db.prepare(`
    SELECT s.*, e.titulo AS equipo_titulo, e.categoria AS equipo_categoria, e.precio_dia AS equipo_precio,
           u.nombre || ' ' || u.apellido AS arrendatario_nombre, u.email AS arrendatario_email,
           u.telefono AS arrendatario_telefono, u.whatsapp AS arrendatario_whatsapp
    FROM solicitudes s
    JOIN equipos e ON e.id = s.equipo_id
    JOIN users u ON u.id = s.arrendatario_id
    WHERE s.propietario_id = ?
    ORDER BY s.created_at DESC
  `).all(req.user.id);

  res.json(solicitudes);
});

router.patch('/:id/responder', verificarToken, (req, res) => {
  if (req.user.rol !== 'propietario')
    return res.status(403).json({ error: 'Solo propietarios pueden responder solicitudes.' });

  const { accion, motivo } = req.body;
  if (!['aceptar', 'rechazar'].includes(accion))
    return res.status(400).json({ error: 'Acción inválida. Usar: aceptar o rechazar.' });

  const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(req.params.id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (solicitud.propietario_id !== req.user.id)
    return res.status(403).json({ error: 'No tenés permiso para responder esta solicitud.' });
  if (solicitud.estado !== 'pendiente')
    return res.status(400).json({ error: 'Solo solicitudes pendientes pueden ser respondidas.' });

  if (accion === 'rechazar' && (!motivo || motivo.trim().length < 10))
    return res.status(400).json({ error: 'Motivo de rechazo obligatorio (mínimo 10 caracteres).' });

  const nuevoEstado = accion === 'aceptar' ? 'aceptada' : 'rechazada';
  const motivoFinal = accion === 'rechazar' ? motivo.trim() : null;

  db.prepare(`
    UPDATE solicitudes SET estado = ?, motivo_rechazo = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(nuevoEstado, motivoFinal, solicitud.id);

  res.json({ mensaje: `Solicitud ${nuevoEstado} correctamente.`, estado: nuevoEstado });
});

router.patch('/:id/devolver', verificarToken, (req, res) => {
  if (req.user.rol !== 'propietario')
    return res.status(403).json({ error: 'Solo propietarios pueden marcar entregas como devueltas.' });

  const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(req.params.id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (solicitud.propietario_id !== req.user.id)
    return res.status(403).json({ error: 'No tenés permiso para actualizar esta solicitud.' });
  if (solicitud.estado !== 'aceptada')
    return res.status(400).json({ error: 'Solo solicitudes aceptadas pueden marcarse como devueltas.' });

  db.prepare('UPDATE solicitudes SET estado = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('devuelta', solicitud.id);
  res.json({ mensaje: 'Solicitud marcada como devuelta.', estado: 'devuelta' });
});

router.patch('/:id/calificar', verificarToken, (req, res) => {
  if (req.user.rol !== 'arrendatario')
    return res.status(403).json({ error: 'Solo arrendatarios pueden calificar.' });

  const { calificacion, comentario_cal } = req.body;
  const solicitud = db.prepare('SELECT * FROM solicitudes WHERE id = ?').get(req.params.id);
  if (!solicitud) return res.status(404).json({ error: 'Solicitud no encontrada.' });
  if (solicitud.arrendatario_id !== req.user.id)
    return res.status(403).json({ error: 'No tenés permiso para calificar esta solicitud.' });
  if (solicitud.estado !== 'devuelta')
    return res.status(400).json({ error: 'Solo solicitudes devueltas pueden ser calificadas.' });
  if (solicitud.calificacion !== null)
    return res.status(400).json({ error: 'Esta solicitud ya fue calificada.' });
  if (!calificacion || isNaN(calificacion) || calificacion < 1 || calificacion > 5)
    return res.status(400).json({ error: 'Calificación inválida. Debe ser de 1 a 5.' });

  db.prepare(`
    UPDATE solicitudes
    SET calificacion = ?, comentario_cal = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(Number(calificacion), comentario_cal?.trim() || null, solicitud.id);

  res.json({ mensaje: 'Calificación registrada correctamente.' });
});

module.exports = router;
