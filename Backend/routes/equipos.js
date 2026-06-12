const express = require('express');
const router  = express.Router();
const db      = require('../database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

function parseEquipo(equipo) {
  if (!equipo) return null;
  try {
    return { ...equipo, fotos: equipo.fotos ? JSON.parse(equipo.fotos) : [] };
  } catch {
    return { ...equipo, fotos: [] };
  }
}

function parseEquipos(equipos) {
  return equipos.map(parseEquipo);
}

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
  const ratingCols = `
    ROUND(AVG(CASE WHEN s.calificacion IS NOT NULL THEN s.calificacion END), 1) AS avg_rating,
    COUNT(CASE WHEN s.calificacion IS NOT NULL THEN 1 END) AS review_count
  `;
  let equipos;
  if (req.user.rol === 'admin') {
    equipos = db.prepare(`
      SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre,
             u.telefono AS propietario_telefono, u.whatsapp AS propietario_whatsapp,
             ${ratingCols}
      FROM equipos e
      JOIN users u ON u.id = e.propietario_id
      LEFT JOIN solicitudes s ON s.equipo_id = e.id
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all();
  } else if (req.user.rol === 'propietario') {
    equipos = db.prepare(`
      SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre,
             u.telefono AS propietario_telefono, u.whatsapp AS propietario_whatsapp,
             ${ratingCols}
      FROM equipos e
      JOIN users u ON u.id = e.propietario_id
      LEFT JOIN solicitudes s ON s.equipo_id = e.id
      WHERE e.propietario_id = ?
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all(req.user.id);
  } else {
    equipos = db.prepare(`
      SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre,
             u.telefono AS propietario_telefono, u.whatsapp AS propietario_whatsapp,
             ${ratingCols}
      FROM equipos e
      JOIN users u ON u.id = e.propietario_id
      LEFT JOIN solicitudes s ON s.equipo_id = e.id
      WHERE e.estado_val = 'aprobado'
      GROUP BY e.id
      ORDER BY e.created_at DESC
    `).all();
  }
  res.json(parseEquipos(equipos));
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
  res.json(parseEquipos(equipos));
});

// GET /api/equipos/:id — ver uno
router.get('/:id', verificarToken, (req, res) => {
  const equipo = db.prepare(`
    SELECT e.*, u.nombre || ' ' || u.apellido AS propietario_nombre, u.telefono AS propietario_telefono, u.whatsapp AS propietario_whatsapp
    FROM equipos e JOIN users u ON u.id = e.propietario_id
    WHERE e.id = ?
  `).get(req.params.id);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });
  res.json(parseEquipo(equipo));
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/equipos — HU-01: Registrar equipo (solo propietario)
// Estado inicial siempre = 'pendiente'
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', verificarToken, soloPropietarioOAdmin, (req, res) => {
  const { titulo, descripcion, categoria, precio_dia, ubicacion, fotos, lat, lng } = req.body;

  if (!titulo || !descripcion || !categoria || !precio_dia)
    return res.status(400).json({ error: 'Campos obligatorios: titulo, descripcion, categoria, precio_dia.' });

  if (!Array.isArray(fotos) || fotos.length === 0)
    return res.status(400).json({ error: 'Debe subir al menos una foto del equipo.' });

  const categoriasValidas = ['Ciclismo','Acuático','Invierno','Trail/Senderismo','Otro'];
  if (!categoriasValidas.includes(categoria))
    return res.status(400).json({ error: `Categoría inválida. Opciones: ${categoriasValidas.join(', ')}.` });

  if (isNaN(precio_dia) || Number(precio_dia) <= 0)
    return res.status(400).json({ error: 'El precio debe ser un número positivo.' });

  if ((lat !== undefined && lat !== null && isNaN(lat)) || (lng !== undefined && lng !== null && isNaN(lng)))
    return res.status(400).json({ error: 'Coordenadas inválidas.' });

  const propietario_id = req.user.rol === 'admin' ? (req.body.propietario_id || req.user.id) : req.user.id;

  if (req.user.rol !== 'admin') {
    const propietario = db.prepare('SELECT plan FROM users WHERE id = ?').get(propietario_id);
    if (propietario?.plan !== 'premium') {
      const { total } = db.prepare('SELECT COUNT(*) AS total FROM equipos WHERE propietario_id = ?').get(propietario_id);
      if (total >= 3) {
        return res.status(403).json({
          error: 'Plan gratuito: máximo 3 equipos. Contacta al administrador para activar el plan Premium.',
          limite_alcanzado: true,
        });
      }
    }
  }

  const fotosJson = JSON.stringify(fotos);

  const result = db.prepare(`
    INSERT INTO equipos (propietario_id, titulo, descripcion, categoria, precio_dia, ubicacion, lat, lng, fotos, estado_val)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')
  `).run(propietario_id, titulo.trim(), descripcion.trim(), categoria, Number(precio_dia), ubicacion?.trim() || null, lat !== undefined ? Number(lat) : null, lng !== undefined ? Number(lng) : null, fotosJson);

  res.status(201).json({ mensaje: 'Equipo registrado. Estado: pendiente de aprobación.', id: result.lastInsertRowid });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/equipos/:id — HU-02: Editar equipo
// Ediciones de título/descripción/precio/categoría → vuelve a 'pendiente'
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', verificarToken, esdueno, (req, res) => {
  const { titulo, descripcion, categoria, precio_dia, ubicacion, fotos, lat, lng } = req.body;
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

  if ((lat !== undefined && lat !== null && isNaN(lat)) || (lng !== undefined && lng !== null && isNaN(lng)))
    return res.status(400).json({ error: 'Coordenadas inválidas.' });

  const fotosJson = Array.isArray(fotos) ? JSON.stringify(fotos) : eq.fotos;

  db.prepare(`
    UPDATE equipos
    SET titulo=?, descripcion=?, categoria=?, precio_dia=?, ubicacion=?, lat=?, lng=?, fotos=?,
        estado_val=?, motivo_rechazo=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(
    titulo      ?? eq.titulo,
    descripcion ?? eq.descripcion,
    categoria   ?? eq.categoria,
    precio_dia !== undefined ? Number(precio_dia) : eq.precio_dia,
    ubicacion   ?? eq.ubicacion,
    lat !== undefined ? Number(lat) : eq.lat,
    lng !== undefined ? Number(lng) : eq.lng,
    fotosJson,
    nuevoEstado,
    cambiaCritico ? null : eq.motivo_rechazo,
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
// GET /api/equipos/:id/reviews — reseñas del equipo
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id/reviews', (req, res) => {
  const equipo = db.prepare('SELECT id FROM equipos WHERE id = ?').get(req.params.id);
  if (!equipo) return res.status(404).json({ error: 'Equipo no encontrado.' });

  const reviews = db.prepare(`
    SELECT s.calificacion AS rating,
           u.nombre || ' ' || u.apellido AS name,
           COALESCE(s.comentario_cal, '') AS comment,
           s.updated_at AS fecha
    FROM solicitudes s
    JOIN users u ON u.id = s.arrendatario_id
    WHERE s.equipo_id = ? AND s.calificacion IS NOT NULL AND s.estado = 'devuelta'
    ORDER BY s.updated_at DESC
  `).all(req.params.id);

  const avg = reviews.length
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
    : null;

  res.json({ reviews, avg_rating: avg, total: reviews.length });
});

// GET /api/equipos/:id/ocupado — fechas ocupadas (solicitudes aceptadas)
router.get('/:id/ocupado', verificarToken, (req, res) => {
  const rangos = db.prepare(`
    SELECT fecha_inicio, fecha_fin FROM solicitudes
    WHERE equipo_id = ? AND estado IN ('aceptada')
  `).all(req.params.id);
  res.json(rangos);
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
