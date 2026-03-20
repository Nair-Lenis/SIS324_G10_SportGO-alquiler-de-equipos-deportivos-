<?php
/**
 * SportGo - Backend API REST
 * Stack: PHP + PDO + SQLite
 * Compatible con XAMPP sin configuración extra
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200); exit();
}

// ─── Conexión PDO SQLite ─────────────────────────
try {
    $db = new PDO('sqlite:' . __DIR__ . '/sportgo.db');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo conectar a la base de datos: ' . $e->getMessage()]);
    exit();
}

// Crear tablas
$db->exec("
    CREATE TABLE IF NOT EXISTS usuarios (
        id        TEXT PRIMARY KEY,
        nombre    TEXT NOT NULL,
        apellido  TEXT NOT NULL,
        email     TEXT NOT NULL UNIQUE,
        password  TEXT NOT NULL,
        telefono  TEXT DEFAULT '',
        rol       TEXT NOT NULL DEFAULT 'renter',
        estado    TEXT NOT NULL DEFAULT 'active',
        creado    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sesiones (
        token   TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        expira  TEXT NOT NULL
    );
");

// Seed datos iniciales
$count = $db->query("SELECT COUNT(*) FROM usuarios")->fetchColumn();
if ($count == 0) {
    $seeds = [
        ['usr_001','Carlos','Mendoza','admin@sportgo.com', hash('sha256','admin123'), '+591 72345678','admin', 'active',   '2026-01-10T08:00:00'],
        ['usr_002','Ana',   'Garcia', 'ana@sportgo.com',   hash('sha256','ana123'),   '+591 70234567','owner', 'active',   '2026-01-15T10:30:00'],
        ['usr_003','Luis',  'Vargas', 'luis@sportgo.com',  hash('sha256','luis123'),  '+591 71345678','renter','active',   '2026-02-03T09:00:00'],
        ['usr_004','Sofia', 'Rios',   'sofia@sportgo.com', hash('sha256','sofia123'), '+591 69876543','renter','inactive', '2026-02-20T14:00:00'],
    ];
    $stmt = $db->prepare("INSERT INTO usuarios VALUES (?,?,?,?,?,?,?,?,?)");
    foreach ($seeds as $s) $stmt->execute($s);
}

// ─── Helpers ────────────────────────────────────
function pw($p)     { return hash('sha256', $p); }
function sg_id()    { return 'usr_' . bin2hex(random_bytes(6)); }
function sg_token() { return bin2hex(random_bytes(32)); }
function body()     { return json_decode(file_get_contents('php://input'), true) ?? []; }

function clean($row) {
    if (!$row) return null;
    unset($row['password']);
    return $row;
}

function ok($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit();
}

function fail($msg, $code = 400) {
    http_response_code($code);
    echo json_encode(['error' => $msg], JSON_UNESCAPED_UNICODE);
    exit();
}

function auth($db) {
    $headers = getallheaders();
    $token = trim(str_replace('Bearer ', '', $headers['Authorization'] ?? $headers['authorization'] ?? ''));
    if (!$token) return null;
    $stmt = $db->prepare("
        SELECT u.* FROM sesiones s
        JOIN usuarios u ON s.user_id = u.id
        WHERE s.token = ? AND s.expira > datetime('now')
    ");
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    return $row ? clean($row) : null;
}

// ─── Router ─────────────────────────────────────
$method = $_SERVER['REQUEST_METHOD'];
$uri    = preg_replace('/\?.*/', '', $_SERVER['REQUEST_URI']);
$uri    = preg_replace('#^.*?/api\.php/?#', '', $uri);
$uri    = trim($uri, '/');
$parts  = explode('/', $uri);
$ruta   = $parts[0] ?? '';
$param  = $parts[1] ?? '';

// ══════════════════════════════════════════════
//  POST /login
// ══════════════════════════════════════════════
if ($ruta === 'login' && $method === 'POST') {
    $b     = body();
    $email = strtolower(trim($b['email'] ?? ''));
    $clave = $b['password'] ?? '';

    if (!$email || !$clave) fail('Correo y contraseña son requeridos.');

    $stmt = $db->prepare("SELECT * FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $row = $stmt->fetch();

    if (!$row)                        fail('Correo no registrado.', 401);
    if ($row['password'] !== pw($clave)) fail('Contraseña incorrecta.', 401);
    if ($row['estado'] === 'inactive') fail('Cuenta inactiva. Contacta al administrador.', 403);

    $tok    = sg_token();
    $expira = date('Y-m-d H:i:s', strtotime('+8 hours'));
    $db->prepare("INSERT INTO sesiones VALUES (?,?,?)")->execute([$tok, $row['id'], $expira]);

    ok(['token' => $tok, 'user' => clean($row), 'expira' => $expira]);
}

// ══════════════════════════════════════════════
//  POST /logout
// ══════════════════════════════════════════════
if ($ruta === 'logout' && $method === 'POST') {
    $headers = getallheaders();
    $tok = trim(str_replace('Bearer ', '', $headers['Authorization'] ?? ''));
    if ($tok) $db->prepare("DELETE FROM sesiones WHERE token = ?")->execute([$tok]);
    ok(['message' => 'Sesión cerrada.']);
}

// ══════════════════════════════════════════════
//  GET /me
// ══════════════════════════════════════════════
if ($ruta === 'me' && $method === 'GET') {
    $user = auth($db);
    if (!$user) fail('No autorizado.', 401);
    ok($user);
}

// ══════════════════════════════════════════════
//  GET /usuarios/stats
// ══════════════════════════════════════════════
if ($ruta === 'usuarios' && $param === 'stats' && $method === 'GET') {
    $user = auth($db);
    if (!$user) fail('No autorizado.', 401);
    ok([
        'total'     => (int)$db->query("SELECT COUNT(*) FROM usuarios")->fetchColumn(),
        'activos'   => (int)$db->query("SELECT COUNT(*) FROM usuarios WHERE estado='active'")->fetchColumn(),
        'inactivos' => (int)$db->query("SELECT COUNT(*) FROM usuarios WHERE estado='inactive'")->fetchColumn(),
        'owners'    => (int)$db->query("SELECT COUNT(*) FROM usuarios WHERE rol='owner'")->fetchColumn(),
        'renters'   => (int)$db->query("SELECT COUNT(*) FROM usuarios WHERE rol='renter'")->fetchColumn(),
        'admins'    => (int)$db->query("SELECT COUNT(*) FROM usuarios WHERE rol='admin'")->fetchColumn(),
    ]);
}

// ══════════════════════════════════════════════
//  GET /usuarios
// ══════════════════════════════════════════════
if ($ruta === 'usuarios' && !$param && $method === 'GET') {
    $user = auth($db);
    if (!$user) fail('No autorizado.', 401);

    $q = trim($_GET['q'] ?? '');
    if ($q) {
        $like = "%$q%";
        $stmt = $db->prepare("SELECT * FROM usuarios WHERE nombre LIKE ? OR apellido LIKE ? OR email LIKE ? OR rol LIKE ? ORDER BY creado DESC");
        $stmt->execute([$like, $like, $like, $like]);
    } else {
        $stmt = $db->query("SELECT * FROM usuarios ORDER BY creado DESC");
    }
    ok(array_map('clean', $stmt->fetchAll()));
}

// ══════════════════════════════════════════════
//  GET /usuarios/:id
// ══════════════════════════════════════════════
if ($ruta === 'usuarios' && $param && $param !== 'stats' && $method === 'GET') {
    $user = auth($db);
    if (!$user) fail('No autorizado.', 401);

    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$param]);
    $row = $stmt->fetch();
    if (!$row) fail('Usuario no encontrado.', 404);
    ok(clean($row));
}

// ══════════════════════════════════════════════
//  POST /usuarios
// ══════════════════════════════════════════════
if ($ruta === 'usuarios' && $method === 'POST') {
    $b      = body();
    $nombre = trim($b['nombre']   ?? '');
    $apell  = trim($b['apellido'] ?? '');
    $email  = strtolower(trim($b['email'] ?? ''));
    $clave  = $b['password'] ?? '';
    $tel    = trim($b['telefono'] ?? '');
    $rol    = $b['rol']    ?? 'renter';
    $estado = $b['estado'] ?? 'active';

    if (!$nombre || !$apell || !$email) fail('Nombre, apellido y correo son obligatorios.');
    if (!$clave || strlen($clave) < 6)  fail('La contraseña debe tener mínimo 6 caracteres.');

    $check = $db->prepare("SELECT id FROM usuarios WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) fail('El correo ya está registrado.', 409);

    $id     = sg_id();
    $creado = date('c');
    $db->prepare("INSERT INTO usuarios VALUES (?,?,?,?,?,?,?,?,?)")
       ->execute([$id, $nombre, $apell, $email, pw($clave), $tel, $rol, $estado, $creado]);

    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$id]);
    ok(clean($stmt->fetch()), 201);
}

// ══════════════════════════════════════════════
//  PUT /usuarios/:id
// ══════════════════════════════════════════════
if ($ruta === 'usuarios' && $param && $method === 'PUT') {
    $user = auth($db);
    if (!$user) fail('No autorizado.', 401);

    $b      = body();
    $nombre = trim($b['nombre']   ?? '');
    $apell  = trim($b['apellido'] ?? '');
    $email  = strtolower(trim($b['email'] ?? ''));
    $clave  = $b['password'] ?? '';
    $tel    = trim($b['telefono'] ?? '');
    $rol    = $b['rol']    ?? '';
    $estado = $b['estado'] ?? '';

    if (!$nombre || !$apell || !$email) fail('Nombre, apellido y correo son obligatorios.');

    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$param]);
    $old = $stmt->fetch();
    if (!$old) fail('Usuario no encontrado.', 404);

    $dup = $db->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
    $dup->execute([$email, $param]);
    if ($dup->fetch()) fail('El correo ya lo usa otro usuario.', 409);

    $hpw    = ($clave && strlen($clave) >= 6) ? pw($clave) : $old['password'];
    $rol    = $rol    ?: $old['rol'];
    $estado = $estado ?: $old['estado'];

    $db->prepare("UPDATE usuarios SET nombre=?,apellido=?,email=?,password=?,telefono=?,rol=?,estado=? WHERE id=?")
       ->execute([$nombre, $apell, $email, $hpw, $tel, $rol, $estado, $param]);

    $stmt = $db->prepare("SELECT * FROM usuarios WHERE id = ?");
    $stmt->execute([$param]);
    ok(clean($stmt->fetch()));
}

// ══════════════════════════════════════════════
//  DELETE /usuarios/:id
// ══════════════════════════════════════════════
if ($ruta === 'usuarios' && $param && $method === 'DELETE') {
    $user = auth($db);
    if (!$user) fail('No autorizado.', 401);
    if ($user['id'] === $param) fail('No puedes eliminar tu propia cuenta activa.');

    $stmt = $db->prepare("SELECT id FROM usuarios WHERE id = ?");
    $stmt->execute([$param]);
    if (!$stmt->fetch()) fail('Usuario no encontrado.', 404);

    $db->prepare("DELETE FROM usuarios WHERE id = ?")->execute([$param]);
    ok(['message' => 'Usuario eliminado correctamente.']);
}

fail('Ruta no encontrada.', 404);
?>
