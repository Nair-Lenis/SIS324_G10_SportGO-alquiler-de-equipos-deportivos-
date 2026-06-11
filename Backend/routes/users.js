const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../database');
const { verificarToken, soloAdmin } = require('../middleware/auth');

// GET /api/users — listar todos (solo admin)
router.get('/', verificarToken, soloAdmin, (req, res) => {
  const users = db.prepare(
    'SELECT id, nombre, apellido, email, telefono, rol, estado, created_at FROM users ORDER BY created_at DESC'
  ).all();
  res.json(users);
});

// GET /api/users/:id — ver uno
router.get('/:id', verificarToken, (req, res) => {
  const user = db.prepare(
    'SELECT id, nombre, apellido, email, telefono, whatsapp, departamento, ciudad, provincia, bio, foto_perfil, rol, estado, created_at FROM users WHERE id = ?'
  ).get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  res.json(user);
});

// POST /api/users — crear (solo admin)
router.post('/', verificarToken, soloAdmin, (req, res) => {
  const { nombre, apellido, email, password, telefono, rol, estado } = req.body;
  if (!nombre || !apellido || !email || !password)
    return res.status(400).json({ error: 'Campos obligatorios incompletos.' });

  const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existe) return res.status(409).json({ error: 'Email ya registrado.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (nombre, apellido, email, password, telefono, rol, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nombre, apellido, email, hash, telefono || null, rol || 'arrendatario', estado || 'activo');

  res.status(201).json({ mensaje: 'Usuario creado.', id: result.lastInsertRowid });
});

// PUT /api/users/:id — editar (solo admin)
router.put('/:id', verificarToken, (req, res) => {
  const { nombre, apellido, email, telefono, whatsapp, departamento, ciudad, provincia, bio, foto_perfil, rol, estado, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  if (req.user.rol !== 'admin' && req.user.id !== user.id)
    return res.status(403).json({ error: 'No tenés permiso para editar este usuario.' });

  const newPassword = password ? bcrypt.hashSync(password, 10) : user.password;

  db.prepare(`
    UPDATE users SET nombre=?, apellido=?, email=?, password=?, telefono=?, whatsapp=?, departamento=?, ciudad=?, provincia=?, bio=?, foto_perfil=?, rol=?, estado=?
    WHERE id=?
  `).run(
    nombre || user.nombre,
    apellido || user.apellido,
    email || user.email,
    newPassword,
    telefono || user.telefono,
    whatsapp || user.whatsapp,
    departamento || user.departamento,
    ciudad || user.ciudad,
    provincia || user.provincia,
    bio || user.bio,
    foto_perfil || user.foto_perfil,
    req.user.rol === 'admin' ? (rol || user.rol) : user.rol,
    req.user.rol === 'admin' ? (estado || user.estado) : user.estado,
    req.params.id
  );

  res.json({ mensaje: 'Usuario actualizado.' });
});

// DELETE /api/users/:id — eliminar (solo admin)
router.delete('/:id', verificarToken, soloAdmin, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  // No permitir eliminar al propio admin
  if (parseInt(req.params.id) === req.user.id)
    return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ mensaje: 'Usuario eliminado.' });
});

module.exports = router;