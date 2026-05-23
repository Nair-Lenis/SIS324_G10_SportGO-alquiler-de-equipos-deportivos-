/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║         SportGo – Sprint 2: Specs de Comportamiento (SDD)               ║
 * ║         Gestión de Equipos / Productos                                   ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * Ejecutar (desde /Backend):
 *   npm install --save-dev jest supertest
 *   npx jest specs/equipos.spec.js
 *
 * Variables de entorno necesarias en .env.test:
 *   JWT_SECRET=test_secret
 */

const request = require('supertest');
const express = require('express');
const jwt     = require('jsonwebtoken');

// ── Setup de tokens de prueba ────────────────────────────────────────────────
const SECRET  = 'test_secret_sportgo';
process.env.JWT_SECRET = SECRET;

const makeToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: '1h' });

const TOKEN_ADMIN        = makeToken({ id:1, rol:'admin',        nombre:'Admin',       email:'admin@test.com' });
const TOKEN_PROPIETARIO  = makeToken({ id:2, rol:'propietario',  nombre:'Propietario', email:'prop@test.com'  });
const TOKEN_ARRENDATARIO = makeToken({ id:3, rol:'arrendatario', nombre:'Luis',        email:'luis@test.com'  });

// ── App aislada para tests ───────────────────────────────────────────────────
// (usa una BD en memoria para no contaminar la de desarrollo)
const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.exec('PRAGMA foreign_keys = ON');
db.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY, nombre TEXT, apellido TEXT,
    email TEXT UNIQUE, password TEXT, telefono TEXT,
    rol TEXT DEFAULT 'arrendatario', estado TEXT DEFAULT 'activo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE equipos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    propietario_id INTEGER NOT NULL REFERENCES users(id),
    titulo         TEXT NOT NULL,
    descripcion    TEXT NOT NULL,
    categoria      TEXT NOT NULL,
    precio_dia     REAL NOT NULL,
    ubicacion      TEXT,
    estado_val     TEXT NOT NULL DEFAULT 'pendiente',
    motivo_rechazo TEXT,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);
// Seed de usuarios de prueba
db.prepare("INSERT INTO users VALUES (1,'Admin','T','admin@test.com','x',null,'admin','activo',CURRENT_TIMESTAMP)").run();
db.prepare("INSERT INTO users VALUES (2,'Prop','T','prop@test.com','x',null,'propietario','activo',CURRENT_TIMESTAMP)").run();
db.prepare("INSERT INTO users VALUES (3,'Luis','T','luis@test.com','x',null,'arrendatario','activo',CURRENT_TIMESTAMP)").run();

// Montar express con el módulo de rutas inyectando la BD de test
jest.mock('../database', () => db);
const app = express();
app.use(express.json());
app.use('/api/equipos', require('../routes/equipos'));

// ════════════════════════════════════════════════════════════════════════════
// HU-01 – Registro de equipo (Propietario)
// ════════════════════════════════════════════════════════════════════════════
describe('HU-01 | Registro de equipo', () => {

  test('[CASO BASE] Propietario crea equipo → 201, estado pendiente', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Bicicleta Trek', descripcion:'MTB hardtail 29"', categoria:'Ciclismo', precio_dia:80, ubicacion:'Sucre' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.mensaje).toMatch(/pendiente/i);

    // Verificar en BD que estado_val = 'pendiente'
    const eq = db.prepare('SELECT estado_val FROM equipos WHERE id=?').get(res.body.id);
    expect(eq.estado_val).toBe('pendiente');
  });

  test('[BORDE] Arrendatario NO puede crear equipo → 403', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_ARRENDATARIO}`)
      .send({ titulo:'Test', descripcion:'Test', categoria:'Ciclismo', precio_dia:50 });
    expect(res.status).toBe(403);
  });

  test('[BORDE] Datos incompletos (sin descripcion) → 400', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Solo título', categoria:'Otro', precio_dia:30 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/obligatorio/i);
  });

  test('[BORDE] Precio negativo → 400', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Test', descripcion:'desc', categoria:'Ciclismo', precio_dia:-10 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/precio/i);
  });

  test('[BORDE] Categoría inválida → 400', async () => {
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Test', descripcion:'desc', categoria:'Futbol', precio_dia:50 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/categor/i);
  });

  test('[BORDE] Sin token → 401', async () => {
    const res = await request(app).post('/api/equipos')
      .send({ titulo:'Test', descripcion:'desc', categoria:'Otro', precio_dia:10 });
    expect(res.status).toBe(401);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HU-02 – Edición y eliminación de equipo
// ════════════════════════════════════════════════════════════════════════════
describe('HU-02 | Edición y eliminación de equipo', () => {
  let equipoId;

  beforeAll(async () => {
    // Crear un equipo aprobado para editar
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Kayak Riot', descripcion:'Kayak individual', categoria:'Acuático', precio_dia:100 });
    equipoId = res.body.id;
    // Aprobarlo directo en BD
    db.prepare("UPDATE equipos SET estado_val='aprobado' WHERE id=?").run(equipoId);
  });

  test('[CASO BASE] Edición de campo NO crítico (ubicacion) → mantiene estado aprobado', async () => {
    const res = await request(app)
      .put(`/api/equipos/${equipoId}`)
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ ubicacion:'La Paz' });

    expect(res.status).toBe(200);
    expect(res.body.volvio_a_pendiente).toBe(false);

    const eq = db.prepare('SELECT estado_val FROM equipos WHERE id=?').get(equipoId);
    expect(eq.estado_val).toBe('aprobado');
  });

  test('[CASO BASE] Edición crítica (precio) → vuelve a pendiente', async () => {
    const res = await request(app)
      .put(`/api/equipos/${equipoId}`)
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ precio_dia: 150 });

    expect(res.status).toBe(200);
    expect(res.body.volvio_a_pendiente).toBe(true);

    const eq = db.prepare('SELECT estado_val FROM equipos WHERE id=?').get(equipoId);
    expect(eq.estado_val).toBe('pendiente');
  });

  test('[BORDE] Propietario NO puede editar equipo ajeno → 403', async () => {
    // Crear equipo de admin
    const otro = db.prepare(`
      INSERT INTO equipos (propietario_id,titulo,descripcion,categoria,precio_dia,estado_val)
      VALUES (1,'Equipo Admin','desc','Otro',50,'pendiente')
    `).run();

    const res = await request(app)
      .put(`/api/equipos/${otro.lastInsertRowid}`)
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ ubicacion:'Cochabamba' });
    expect(res.status).toBe(403);
  });

  test('[CASO BASE] Propietario elimina su propio equipo → 200', async () => {
    const crearRes = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Para eliminar', descripcion:'temp', categoria:'Otro', precio_dia:10 });

    const id = crearRes.body.id;
    const delRes = await request(app)
      .delete(`/api/equipos/${id}`)
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`);

    expect(delRes.status).toBe(200);
    const eq = db.prepare('SELECT id FROM equipos WHERE id=?').get(id);
    expect(eq).toBeUndefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// HU-03 – Validación de contenido (Administrador)
// ════════════════════════════════════════════════════════════════════════════
describe('HU-03 | Validación de contenido por Admin', () => {
  let pendienteId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Snowboard Burton', descripcion:'Tabla 158cm', categoria:'Invierno', precio_dia:90 });
    pendienteId = res.body.id;
  });

  test('[CASO BASE] Admin aprueba equipo pendiente → estado = aprobado', async () => {
    const res = await request(app)
      .patch(`/api/equipos/${pendienteId}/validar`)
      .set('Authorization', `Bearer ${TOKEN_ADMIN}`)
      .send({ accion:'aprobar' });

    expect(res.status).toBe(200);
    expect(res.body.estado_val).toBe('aprobado');

    const eq = db.prepare('SELECT estado_val FROM equipos WHERE id=?').get(pendienteId);
    expect(eq.estado_val).toBe('aprobado');
  });

  test('[CASO BASE] Admin rechaza equipo con motivo → estado = rechazado', async () => {
    const crearRes = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Casco viejo', descripcion:'Sin foto', categoria:'Ciclismo', precio_dia:20 });

    const res = await request(app)
      .patch(`/api/equipos/${crearRes.body.id}/validar`)
      .set('Authorization', `Bearer ${TOKEN_ADMIN}`)
      .send({ accion:'rechazar', motivo:'Las imágenes no son claras.' });

    expect(res.status).toBe(200);
    expect(res.body.estado_val).toBe('rechazado');

    const eq = db.prepare('SELECT motivo_rechazo FROM equipos WHERE id=?').get(crearRes.body.id);
    expect(eq.motivo_rechazo).toBe('Las imágenes no son claras.');
  });

  test('[BORDE] Rechazar sin motivo → 400', async () => {
    const crearRes = await request(app)
      .post('/api/equipos')
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ titulo:'Sin motivo', descripcion:'desc', categoria:'Otro', precio_dia:10 });

    const res = await request(app)
      .patch(`/api/equipos/${crearRes.body.id}/validar`)
      .set('Authorization', `Bearer ${TOKEN_ADMIN}`)
      .send({ accion:'rechazar' }); // sin motivo

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/motivo/i);
  });

  test('[BORDE] Propietario NO puede validar → 403', async () => {
    const res = await request(app)
      .patch(`/api/equipos/${pendienteId}/validar`)
      .set('Authorization', `Bearer ${TOKEN_PROPIETARIO}`)
      .send({ accion:'aprobar' });
    expect(res.status).toBe(403);
  });

  test('[BORDE] Arrendatario NO puede validar → 403', async () => {
    const res = await request(app)
      .patch(`/api/equipos/${pendienteId}/validar`)
      .set('Authorization', `Bearer ${TOKEN_ARRENDATARIO}`)
      .send({ accion:'aprobar' });
    expect(res.status).toBe(403);
  });

  test('[BORDE] Acción inválida → 400', async () => {
    const res = await request(app)
      .patch(`/api/equipos/${pendienteId}/validar`)
      .set('Authorization', `Bearer ${TOKEN_ADMIN}`)
      .send({ accion:'publicar' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/acción inválida/i);
  });

  test('[BORDE] Equipo inexistente → 404', async () => {
    const res = await request(app)
      .patch('/api/equipos/99999/validar')
      .set('Authorization', `Bearer ${TOKEN_ADMIN}`)
      .send({ accion:'aprobar' });
    expect(res.status).toBe(404);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Bug fix Sprint 1 – Seguridad en registro
// ════════════════════════════════════════════════════════════════════════════
describe('BUG FIX | Registro con rol forzado', () => {
  const authApp = express();
  authApp.use(express.json());
  authApp.use('/api/auth', require('../routes/auth'));

  test('Enviar rol=admin en registro NO eleva el rol → siempre arrendatario', async () => {
    const res = await request(authApp)
      .post('/api/auth/register')
      .send({ nombre:'Hacker', apellido:'Test', email:'hacker@test.com',
              password:'pass123', rol:'admin' });
    // Puede ser 201 o 409 si ya existe, pero nunca debe crear admin
    if (res.status === 201) {
      const u = db.prepare("SELECT rol FROM users WHERE email='hacker@test.com'").get();
      expect(u.rol).toBe('arrendatario');
    }
  });
});
