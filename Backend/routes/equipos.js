const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// Middleware: solo propietario o admin
function soloPropietarioOAdmin(req, res, next) {
  if (req.user.rol !== 'propietario' && req.user.rol !== 'admin')
    return res.status(403).json({ error: 'Solo propietarios o administradores pueden hacer esto.' });
  next();
}

// Middleware: verifica que el equipo pertenece al propietario (o es admin)
function esdueno(req, res, next) {
  const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });
  if (req.user.rol !== 'admin' && equipo.propietario_id !== req.user.id)
    return res.status(403).json({ error: 'No tenés permiso para modificar este equipo.' });
  req.equipo = equipo;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/equipos — listar equipos aprobados (público con token, para arrendatarios)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', verificarToken, (req, res) => {
  let equipos;
  if (req.user.rol === 'admin') {
    // Admin ve todos
    equipos = db.prepare(`
      SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre
      FROM equipos e
      JOIN users u ON u.id = e.propietario_id
      ORDER BY e.created_at DESC
    `).all();
  } else if (req.user.rol === 'propietario') {
    // Propietario ve los suyos
    equipos = db.prepare(`
      SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre
      FROM equipos e
      JOIN users u ON u.id = e.propietario_id
      WHERE e.propietario_id = ?
      ORDER BY e.created_at DESC
    `).all(req.user.id);
  } else {
    // Arrendatario solo ve aprobados
    equipos = db.prepare(`
      SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre
      FROM equipos e
      JOIN users u ON u.id = e.propietario_id
      WHERE e.estado_val = 'aprobado'
      ORDER BY e.created_at DESC
    `).all();
  }
  res.json(equipos);
});

// GET /api/equipos/pendientes — solo admin, equipos a revisar (HU-03)
router.get('/pendientes', verificarToken, soloAdmin, (req, res) => {
  const equipos = db.prepare(`
    SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre
    FROM equipos e
    JOIN users u ON u.id = e.propietario_id
    WHERE e.estado_val = 'pendiente'
    ORDER BY e.created_at ASC
  `).all();
  res.json(equipos);
});

// GET /api/equipos/:id — ver uno
router.get('/:id', verificarToken, (req, res) => {
  const equipo = db.prepare(`
    SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre
    FROM equipos e JOIN users u ON u.id = e.propietario_id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });
  res.json(equipo);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/equipos — HU-01: Registrar equipo (solo propietario)
// Estado inicial siempre = 'pendiente'
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloPropietarioOAdmin, (req, res) => {
  const { titulo, descripcion, categoria, precio_dia, ubicacion } = req.body;

  if (!titulo || !descripcion || !categoria || !precio_dia)
    return res.status(400).json({ error: 'Campos obligatorios: titulo, descripcion, categoria, precio_dia.' });

  const categoriasValidas = ['Ciclismo','Acuático','Invierno','Trail/Senderismo','Otro'];
  if (!categoriasValidas.includes(categoria))
    return res.status(400).json({ error: `Categoría inválida. Opciones: ${categoriasValidas.join(', ')}.` });

  if (isNaN(precio_dia) || Number(precio_dia) <= 0)
    return res.status(400).json({ error: 'El precio debe ser un número positivo.' });

  const propietario_id = req.user.rol === 'admin' ? (req.body.propietario_id || req.user.id) : req.user.id;

  const result = db.prepare(`
    INSERT INTO equipos (propietario_id, titulo, descripcion, categoria, precio_dia, ubicacion, estado_val)
    VALUES (?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(propietario_id, titulo.trim(), descripcion.trim(), categoria, Number(precio_dia), ubicacion?.trim() || null);

  res.status(201).json({ mensaje: 'Equipo registrado. Estado: pendiente de aprobación.', id: result.lastInsertRowid });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/equipos/:id — HU-02: Editar equipo
// Ediciones de título/descripción/precio/categoría → vuelve a 'pendiente'
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, esdueno, (req, res) => {
  const { titulo, descripcion, categoria, precio_dia, ubicacion } = req.body;
  const eq = req.equipo;

  const CAMPOS_CRITICOS = ['titulo', 'descripcion', 'categoria', 'precio_dia'];
  const cambiaCritico   = CAMPOS_CRITICOS.some(c => req.body[c] !== undefined && req.body[c] != eq[c]);

  // Si edita campos críticos → vuelve a pendiente para revalidación
  const nuevoEstado = cambiaCritico ? 'pendiente' : eq.estado_val;

  if (categoria) {
    const categoriasValidas = ['Ciclismo','Acuático','Invierno','Trail/Senderismo','Otro'];
    if (!categoriasValidas.includes(categoria))
      return res.status(400).json({ error: 'Categoría inválida.' });
  }

  if (precio_dia !== undefined && (isNaN(precio_dia) || Number(precio_dia) <= 0))
    return res.status(400).json({ error: 'El precio debe ser un número positivo.' });

  db.prepare(`
    UPDATE equipos
    SET titulo=?, descripcion=?, categoria=?, precio_dia=?, ubicacion=?,
        estado_val=?, motivo_rechazo=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    titulo      ?? eq.titulo,
    descripcion ?? eq.descripcion,
    categoria   ?? eq.categoria,
    precio_dia !== undefined ? Number(precio_dia) : eq.precio_dia,
    ubicacion   ?? eq.ubicacion,
    nuevoEstado,
    cambiaCritico ? null : eq.motivo_rechazo,  // limpia rechazo si vuelve a pendiente
    eq.id
  );

  res.json({
    mensaje: cambiaCritico
      ? 'Equipo actualizado. Volvió a estado pendiente para revalidación.'
      : 'Equipo actualizado.',
    volvio_a_pendiente: cambiaCritico,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/equipos/:id — HU-02: Eliminar equipo
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', verificarToken, esdueno, (req, res) => {
  db.prepare('DELETE FROM equipos WHERE id = ?').run(req.equipo.id);
  res.json({ mensaje: 'Equipo eliminado correctamente.' });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/equipos/:id/validar — HU-03: Aprobar o rechazar (solo admin)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/validar', verificarToken, soloAdmin, (req, res) => {
  const { accion, motivo } = req.body; // accion: 'aprobar' | 'rechazar'

  const equipo = db.prepare('SELECT * FROM equipos WHERE id = ?').get(req.params.id);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });

  if (!['aprobar','rechazar'].includes(accion))
    return res.status(400).json({ error: 'Acción inválida. Usar: aprobar | rechazar.' });

  if (accion === 'rechazar' && !motivo?.trim())
    return res.status(400).json({ error: 'El motivo de rechazo es obligatorio.' });

  const nuevoEstado     = accion === 'aprobar' ? 'aprobado' : 'rechazado';
  const motivoFinal     = accion === 'rechazar' ? motivo.trim() : null;

  db.prepare(`
    UPDATE equipos SET estado_val=?, motivo_rechazo=?, updated_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(nuevoEstado, motivoFinal, equipo.id);

  res.json({ mensaje: `Equipo ${nuevoEstado} correctamente.`, estado_val: nuevoEstado });
});

module.exports = router;
