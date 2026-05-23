const jwt = require('jsonwebtoken');
require('dotenv').config();

const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ error: 'Token inválido o expirado.' });
  }
};

const soloAdmin = (req, res, next) => {
  if (req.user.rol !== 'admin')
    return res.status(403).json({ error: 'Solo administradores pueden hacer esto.' });
  next();
};

module.exports = { verificarToken, soloAdmin };
