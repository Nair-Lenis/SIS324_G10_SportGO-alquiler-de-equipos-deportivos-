const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'sportgo.db'));

// Habilitar foreign keys
db.exec('PRAGMA foreign_keys = ON');

// ── Tabla usuarios ────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre     TEXT NOT NULL,
    apellido   TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    telefono   TEXT,
    rol        TEXT NOT NULL DEFAULT 'arrendatario'
               CHECK(rol IN ('admin', 'propietario', 'arrendatario')),
    estado     TEXT NOT NULL DEFAULT 'activo'
               CHECK(estado IN ('activo', 'inactivo')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Tabla equipos (Sprint 2) ──────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS equipos (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    propietario_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    titulo          TEXT NOT NULL,
    descripcion     TEXT NOT NULL,
    categoria       TEXT NOT NULL
                    CHECK(categoria IN ('Ciclismo','Acuático','Invierno','Trail/Senderismo','Otro')),
    precio_dia      REAL NOT NULL CHECK(precio_dia > 0),
    ubicacion       TEXT,
    estado_val      TEXT NOT NULL DEFAULT 'pendiente'
                    CHECK(estado_val IN ('pendiente','aprobado','rechazado')),
    motivo_rechazo  TEXT,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// ── Seed: usuarios demo ───────────────────────────────────────────────────────
const countUsers = db.prepare('SELECT COUNT(*) as total FROM users').get();
if (countUsers.total === 0) {
  const bcrypt = require('bcryptjs');
  const ins = db.prepare(`
    INSERT INTO users (nombre, apellido, email, password, telefono, rol, estado)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  [
    ['Carlos', 'Mendoza', 'admin@sportgo.com', bcrypt.hashSync('admin123',10), '+59172345678', 'admin',        'activo'],
    ['Ana',    'Garcia',  'ana@sportgo.com',   bcrypt.hashSync('ana123',10),   '+59170234567', 'propietario',  'activo'],
    ['Luis',   'Vargas',  'luis@sportgo.com',  bcrypt.hashSync('luis123',10),  '+59171345678', 'arrendatario', 'activo'],
    ['Sofia',  'Rios',    'sofia@sportgo.com', bcrypt.hashSync('sofia123',10), '+59169876543', 'arrendatario', 'inactivo'],
  ].forEach(u => ins.run(...u));
  console.log('✅ Usuarios demo creados');
}

// ── Seed: equipos demo ────────────────────────────────────────────────────────
const countEquipos = db.prepare('SELECT COUNT(*) as total FROM equipos').get();
if (countEquipos.total === 0) {
  const anaId = db.prepare("SELECT id FROM users WHERE email='ana@sportgo.com'").get()?.id;
  if (anaId) {
    const ins = db.prepare(`
      INSERT INTO equipos (propietario_id, titulo, descripcion, categoria, precio_dia, ubicacion, estado_val)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    [
      [anaId, 'Bicicleta Trek X-Caliber 8', 'MTB hardtail 29", talla M, en excelente estado.', 'Ciclismo', 80, 'Sucre, Bolivia', 'aprobado'],
      [anaId, 'Kayak Perception Swifty 9.5', 'Kayak individual, ideal para ríos tranquilos.', 'Acuático', 120, 'Sucre, Bolivia', 'pendiente'],
      [anaId, 'Tabla Snowboard Burton Custom', 'Tabla 158cm, fijaciones incluidas.', 'Invierno', 95, 'Potosí, Bolivia', 'rechazado'],
    ].forEach(e => ins.run(...e));
    console.log('✅ Equipos demo creados');
  }
}

module.exports = db;
