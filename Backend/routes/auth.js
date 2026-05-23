const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');
require('dotenv').config();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: 'Email y contraseña requeridos.' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user)
    return res.status(401).json({ error: 'Credenciales incorrectas.' });

  if (user.estado === 'inactivo')
    return res.status(403).json({ error: 'Cuenta inactiva. Contacta al administrador.' });

  if (!bcrypt.compareSync(password, user.password))
    return res.status(401).json({ error: 'Credenciales incorrectas.' });

  const token = jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );

  const redirects = {
    admin:        '/dashboard/admin',
    propietario:  '/dashboard/propietario',
    arrendatario: '/dashboard/arrendatario',
  };

  res.json({ mensaje: 'Login exitoso', token, rol: user.rol, nombre: user.nombre, redirect: redirects[user.rol] });
});

// POST /api/auth/register
// 🔒 SEGURIDAD: el campo `rol` del body es ignorado — siempre se asigna 'arrendatario'
// Solo un Admin puede promover a un usuario (vía PUT /api/users/:id)
router.post('/register', (req, res) => {
  const { nombre, apellido, email, password, telefono } = req.body;

  if (!nombre || !apellido || !email || !password)
    return res.status(400).json({ error: 'Campos obligatorios incompletos.' });

  if (password.length < 6)
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

  const existe = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existe)
    return res.status(409).json({ error: 'El email ya está registrado.' });

  const hash = bcrypt.hashSync(password, 10);

  const result = db.prepare(`
    INSERT INTO users (nombre, apellido, email, password, telefono, rol)
    VALUES (?, ?, ?, ?, ?, 'arrendatario')
  `).run(nombre, apellido, email, hash, telefono || null);

  res.status(201).json({ mensaje: 'Usuario registrado exitosamente.', id: result.lastInsertRowid });
});

module.exports = router;
