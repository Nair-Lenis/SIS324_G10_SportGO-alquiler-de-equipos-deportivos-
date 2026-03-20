/**
 * SportGo · Frontend JavaScript
 * Conecta con API REST Flask en localhost:5000
 * CU implementados: Login, Logout, CRUD Usuarios, Stats
 */

const API = 'http://localhost/Proyecto_SportGo/api.php';

// ══════════════════════════════════════════════
//  Estado global
// ══════════════════════════════════════════════
const STATE = {
  token:    localStorage.getItem('sg_token') || null,
  user:     JSON.parse(localStorage.getItem('sg_user') || 'null'),
  editId:   null,
  deleteId: null,
  filter:   'all',
};

// ══════════════════════════════════════════════
//  Canvas fondo animado
// ══════════════════════════════════════════════
(function initCanvas() {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, points = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function makePoints(n) {
    points = [];
    for (let i = 0; i < n; i++) {
      points.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - .5) * .3,
        vy: (Math.random() - .5) * .3,
        r: Math.random() * 1.5 + .5,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    // Líneas entre puntos cercanos
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[i].x - points[j].x;
        const dy = points[i].y - points[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 140) {
          ctx.beginPath();
          ctx.strokeStyle = `rgba(0,224,138,${(1 - d/140) * 0.07})`;
          ctx.lineWidth = .5;
          ctx.moveTo(points[i].x, points[i].y);
          ctx.lineTo(points[j].x, points[j].y);
          ctx.stroke();
        }
      }
    }
    // Puntos
    points.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(0,224,138,0.2)';
      ctx.fill();
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
    });
    requestAnimationFrame(draw);
  }

  resize();
  makePoints(60);
  draw();
  window.addEventListener('resize', () => { resize(); makePoints(60); });
})();

// ══════════════════════════════════════════════
//  API helper
// ══════════════════════════════════════════════
async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;

  try {
    const res  = await fetch(API + path, { ...opts, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  } catch (e) {
    if (e.message === 'Failed to fetch')
      throw new Error('Sin conexión al servidor. ¿Está corriendo server.py?');
    throw e;
  }
}

// ══════════════════════════════════════════════
//  Toast notifications
// ══════════════════════════════════════════════
const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

function showToast(msg, type = 'success', ms = 3800) {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="ti">${ICONS[type]}</span><span>${msg}</span>`;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, ms);
}

// ══════════════════════════════════════════════
//  Pantallas
// ══════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  el.classList.add('active');
}

// ══════════════════════════════════════════════
//  CU-02 · LOGIN
// ══════════════════════════════════════════════
async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('l-email').value.trim();
  const pass  = document.getElementById('l-pass').value;
  const btn   = document.getElementById('login-btn');
  const txt   = document.getElementById('login-btn-txt');

  btn.disabled = true;
  txt.textContent = 'Verificando…';

  try {
    const data = await api('/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    STATE.token = data.token;
    STATE.user  = data.user;
    localStorage.setItem('sg_token', data.token);
    localStorage.setItem('sg_user',  JSON.stringify(data.user));
    showToast(`¡Bienvenido, ${data.user.nombre}! 🎉`, 'success');
    enterDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    txt.textContent = 'Ingresar al sistema';
  }
}

// ══════════════════════════════════════════════
//  CU-03 · LOGOUT
// ══════════════════════════════════════════════
async function handleLogout() {
  try { await api('/logout', { method: 'POST' }); } catch (_) {}
  STATE.token = null;
  STATE.user  = null;
  localStorage.removeItem('sg_token');
  localStorage.removeItem('sg_user');
  showToast('Sesión cerrada.', 'info');
  showScreen('screen-login');
  buildDemoCards();
}

// ══════════════════════════════════════════════
//  Entrar al dashboard
// ══════════════════════════════════════════════
function enterDashboard() {
  showScreen('screen-dashboard');
  renderSidebar();
  renderTopbarSession();
  loadStats();
  loadUsuarios();
}

// ══════════════════════════════════════════════
//  Sidebar session info
// ══════════════════════════════════════════════
function renderSidebar() {
  const u = STATE.user;
  if (!u) return;
  const [color, bg, border] = avatarPalette(u.nombre + u.apellido);
  const initials = (u.nombre[0] || '') + (u.apellido[0] || '');
  const ROL = { owner: 'Propietario', renter: 'Arrendatario', admin: 'Administrador' };

  document.getElementById('sb-av').textContent = initials;
  document.getElementById('sb-av').style.cssText =
    `background:${bg};color:${color};border-color:${border}`;
  document.getElementById('sb-uname').textContent = `${u.nombre} ${u.apellido}`;
  document.getElementById('sb-urole').textContent = ROL[u.rol] || u.rol;
}

function renderTopbarSession() {
  const u = STATE.user;
  if (!u) return;
  const ROL = { owner: 'Propietario', renter: 'Arrendatario', admin: 'Administrador' };
  const [color] = avatarPalette(u.nombre + u.apellido);
  document.getElementById('tb-session').innerHTML = `
    <span style="color:var(--g);font-size:10px">●</span>
    <strong style="font-weight:600">${u.nombre} ${u.apellido}</strong>
    <span style="color:var(--tx3)">·</span>
    <span style="color:${color}">${ROL[u.rol] || u.rol}</span>
  `;
}

// ══════════════════════════════════════════════
//  Demo cards en login
// ══════════════════════════════════════════════
const DEMOS = [
  { email:'admin@sportgo.com', pass:'admin123', nombre:'Carlos', apellido:'Mendoza', rol:'admin'  },
  { email:'ana@sportgo.com',   pass:'ana123',   nombre:'Ana',    apellido:'García',  rol:'owner'  },
  { email:'luis@sportgo.com',  pass:'luis123',  nombre:'Luis',   apellido:'Vargas',  rol:'renter' },
  { email:'sofia@sportgo.com', pass:'sofia123', nombre:'Sofía',  apellido:'Ríos',    rol:'renter' },
];
const ROL_LABEL = { owner:'Propietario', renter:'Arrendatario', admin:'Administrador' };
const ROL_COLOR = { owner:'var(--g)', renter:'var(--blue)', admin:'var(--amber)' };

function buildDemoCards() {
  document.getElementById('demo-list').innerHTML = DEMOS.map(d => {
    const [color, bg, border] = avatarPalette(d.nombre + d.apellido);
    const initials = d.nombre[0] + d.apellido[0];
    return `
    <div class="demo-card" onclick="fillLogin('${d.email}','${d.pass}')">
      <div class="dc-left">
        <div class="dc-av" style="background:${bg};color:${color};border-color:${border}">${initials}</div>
        <div>
          <div class="dc-email">${d.email}</div>
          <div class="dc-pass">pass: ${d.pass}</div>
        </div>
      </div>
      <div class="dc-role" style="color:${ROL_COLOR[d.rol]}">${ROL_LABEL[d.rol]}</div>
    </div>`;
  }).join('');
}

function fillLogin(email, pass) {
  document.getElementById('l-email').value = email;
  document.getElementById('l-pass').value  = pass;
  showToast('Credenciales cargadas — presiona Ingresar', 'info', 2500);
}

// ══════════════════════════════════════════════
//  CU-08 · ESTADÍSTICAS
// ══════════════════════════════════════════════
async function loadStats() {
  try {
    const s = await api('/usuarios/stats');
    animateCount('s-total',   s.total);
    animateCount('s-activos', s.activos);
    animateCount('s-owners',  s.owners);
    animateCount('s-renters', s.renters);
    document.getElementById('sb-total-badge').textContent = s.total;
  } catch (err) {
    showToast('Error cargando estadísticas: ' + err.message, 'error');
  }
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.floor(target / 20));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(iv);
  }, 40);
}

// ══════════════════════════════════════════════
//  CU-04 · LISTAR Y BUSCAR USUARIOS
// ══════════════════════════════════════════════
async function loadUsuarios() {
  const q     = (document.getElementById('search-inp')?.value || '').trim();
  const tbody = document.getElementById('t-body');
  tbody.innerHTML = `<tr><td colspan="6" class="td-center"><div class="spin-ring"></div></td></tr>`;

  try {
    let users = await api(`/usuarios${q ? `?q=${encodeURIComponent(q)}` : ''}`);

    if (STATE.filter !== 'all')
      users = users.filter(u => u.rol === STATE.filter);

    // Footer info
    document.getElementById('tbl-footer').textContent =
      `${users.length} usuario${users.length !== 1 ? 's' : ''} encontrado${users.length !== 1 ? 's' : ''}`;

    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="td-center">
        <div class="empty-state">
          <div class="es-icon">🔍</div>
          <div class="es-text">No se encontraron usuarios con ese criterio</div>
        </div>
      </td></tr>`;
      return;
    }

    tbody.innerHTML = users.map((u, i) => `
      <tr style="animation:countUp .35s ${i*0.04}s both">
        <td>
          <div class="u-cell">
            ${mkAvatar(u)}
            <div>
              <div class="u-name">${esc(u.nombre)} ${esc(u.apellido)}</div>
              <div class="u-email">${esc(u.email)}</div>
            </div>
          </div>
        </td>
        <td>${rolBadge(u.rol)}</td>
        <td style="color:var(--tx2);font-size:13px">${esc(u.telefono || '—')}</td>
        <td>${estadoBadge(u.estado)}</td>
        <td style="color:var(--tx2);font-size:13px">${fmtDate(u.creado)}</td>
        <td>
          <div class="acts">
            <button class="act-btn act-view" onclick="openView('${u.id}')">
              <svg viewBox="0 0 14 14" fill="none"><ellipse cx="7" cy="7" rx="6" ry="4" stroke="currentColor" stroke-width="1.2"/><circle cx="7" cy="7" r="1.5" stroke="currentColor" stroke-width="1.2"/></svg>
              Ver
            </button>
            <button class="act-btn act-edit" onclick="openModal('edit','${u.id}')">
              <svg viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>
              Editar
            </button>
            <button class="act-btn act-del" onclick="openDelete('${u.id}','${esc(u.nombre)} ${esc(u.apellido)}')">
              <svg viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.7 7.5h6.6L11 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>
              Eliminar
            </button>
          </div>
        </td>
      </tr>`).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="td-center" style="color:var(--red)">⚠ ${err.message}</td></tr>`;
    showToast(err.message, 'error');
  }
}

// ══════════════════════════════════════════════
//  Filtro por rol
// ══════════════════════════════════════════════
function setFilter(el, f) {
  document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
  el.classList.add('active');
  STATE.filter = f;
  loadUsuarios();
}

// ══════════════════════════════════════════════
//  CU-01/CU-06 · CREAR / EDITAR USUARIO
// ══════════════════════════════════════════════
function openModal(type, id = null) {
  STATE.editId = id;
  const isEdit = type === 'edit';

  document.getElementById('m-eyebrow').textContent = isEdit ? 'Editar usuario existente' : 'Registrar nuevo usuario';
  document.getElementById('m-title').textContent   = isEdit ? 'Editar usuario'           : 'Nuevo usuario';
  document.getElementById('save-txt').textContent  = isEdit ? 'Guardar cambios'           : 'Crear usuario';
  document.getElementById('pass-star').style.display = isEdit ? 'none' : 'inline';
  document.getElementById('pass-hint').textContent   = isEdit ? 'Dejar vacío para no cambiar la contraseña' : '';

  clearFormUsuario();

  if (isEdit && id) {
    api(`/usuarios/${id}`).then(u => {
      document.getElementById('u-nombre').value  = u.nombre;
      document.getElementById('u-apellido').value = u.apellido;
      document.getElementById('u-email').value   = u.email;
      document.getElementById('u-tel').value     = u.telefono || '';
      document.getElementById('u-rol').value     = u.rol;
      setEstado(u.estado);
    }).catch(err => showToast(err.message, 'error'));
  }

  openOv('ov-form');
}

function clearFormUsuario() {
  ['u-nombre','u-apellido','u-email','u-pass','u-tel'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('u-rol').value = 'renter';
  setEstado('active');
}

function setEstado(val) {
  document.getElementById('u-estado').value = val;
  document.getElementById('btn-active').classList.toggle('selected',   val === 'active');
  document.getElementById('btn-inactive').classList.toggle('selected', val === 'inactive');
}

async function handleSave(e) {
  e.preventDefault();
  const isEdit = !!STATE.editId;
  const btn    = document.getElementById('btn-save');

  const body = {
    nombre:   document.getElementById('u-nombre').value.trim(),
    apellido: document.getElementById('u-apellido').value.trim(),
    email:    document.getElementById('u-email').value.trim(),
    password: document.getElementById('u-pass').value,
    telefono: document.getElementById('u-tel').value.trim(),
    rol:      document.getElementById('u-rol').value,
    estado:   document.getElementById('u-estado').value,
  };

  if (!isEdit && (!body.password || body.password.length < 6)) {
    showToast('La contraseña debe tener mínimo 6 caracteres.', 'error'); return;
  }

  btn.disabled = true;
  try {
    if (isEdit) {
      await api(`/usuarios/${STATE.editId}`, { method:'PUT', body:JSON.stringify(body) });
      showToast('Usuario actualizado correctamente ✓', 'success');
    } else {
      await api('/usuarios', { method:'POST', body:JSON.stringify(body) });
      showToast('Usuario creado exitosamente ✓', 'success');
    }
    closeOv('ov-form');
    loadStats();
    loadUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

// ══════════════════════════════════════════════
//  CU-05 · VER DETALLE
// ══════════════════════════════════════════════
async function openView(id) {
  try {
    const u = await api(`/usuarios/${id}`);
    const [color, bg, border] = avatarPalette(u.nombre + u.apellido);
    const initials = (u.nombre[0]||'') + (u.apellido[0]||'');

    document.getElementById('view-body').innerHTML = `
      <div class="view-hero" style="padding:0 28px 22px;margin:0 0 22px">
        <div class="av av-lg" style="background:${bg};color:${color};border-color:${border}">${initials}</div>
        <div>
          <div class="view-name">${esc(u.nombre)} ${esc(u.apellido)}</div>
          <div class="view-email">${esc(u.email)}</div>
          <div style="margin-top:6px">${rolBadge(u.rol)} ${estadoBadge(u.estado)}</div>
        </div>
      </div>
      <div class="view-grid" style="padding:0 28px;margin-bottom:22px">
        <div>
          <div class="vf-label">ID del usuario</div>
          <div class="vf-id">${u.id}</div>
        </div>
        <div>
          <div class="vf-label">Teléfono</div>
          <div class="vf-val">${esc(u.telefono || '—')}</div>
        </div>
        <div>
          <div class="vf-label">Rol en plataforma</div>
          <div class="vf-val">${rolBadge(u.rol)}</div>
        </div>
        <div>
          <div class="vf-label">Estado de cuenta</div>
          <div class="vf-val">${estadoBadge(u.estado)}</div>
        </div>
        <div style="grid-column:1/-1">
          <div class="vf-label">Fecha de registro</div>
          <div class="vf-val">${fmtDateLong(u.creado)}</div>
        </div>
      </div>
      <div style="padding:0 28px 28px;display:flex;gap:10px">
        <button class="btn-save" onclick="closeOv('ov-view');openModal('edit','${u.id}')">
          <svg viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>
          Editar usuario
        </button>
        <button class="btn-ghost" onclick="closeOv('ov-view')">Cerrar</button>
      </div>`;

    openOv('ov-view');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ══════════════════════════════════════════════
//  CU-07 · ELIMINAR USUARIO
// ══════════════════════════════════════════════
function openDelete(id, nombre) {
  STATE.deleteId = id;
  document.getElementById('del-title').textContent = `¿Eliminar a ${nombre}?`;
  document.getElementById('del-sub').textContent   =
    `Se eliminará el registro de "${nombre}" permanentemente de la base de datos SQLite. Esta acción no se puede deshacer.`;
  openOv('ov-del');
}

async function confirmDelete() {
  if (!STATE.deleteId) return;
  try {
    await api(`/usuarios/${STATE.deleteId}`, { method: 'DELETE' });
    showToast('Usuario eliminado de la base de datos.', 'info');
    closeOv('ov-del');
    STATE.deleteId = null;
    loadStats();
    loadUsuarios();
  } catch (err) {
    showToast(err.message, 'error');
    closeOv('ov-del');
  }
}

// ══════════════════════════════════════════════
//  Modales helpers
// ══════════════════════════════════════════════
function openOv(id)  { document.getElementById(id).classList.add('open'); }
function closeOv(id) { document.getElementById(id).classList.remove('open'); }
function ovClose(e, id) { if (e.target === e.currentTarget) closeOv(id); }

document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    ['ov-form','ov-view','ov-del'].forEach(closeOv);
});

// ══════════════════════════════════════════════
//  Toggle password visibility
// ══════════════════════════════════════════════
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.innerHTML = show
    ? `<svg viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" stroke-width="1.2"/><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`
    : `<svg viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="8" rx="6" ry="4" stroke="currentColor" stroke-width="1.2"/><circle cx="8" cy="8" r="1.8" stroke="currentColor" stroke-width="1.2"/></svg>`;
}

// ══════════════════════════════════════════════
//  Módulos en desarrollo
// ══════════════════════════════════════════════
function comingSoon() {
  showToast('Este módulo estará disponible en la siguiente fase del proyecto.', 'info');
}

// ══════════════════════════════════════════════
//  UI Helpers
// ══════════════════════════════════════════════
const PALETTE = [
  ['#00E08A','rgba(0,224,138,.12)','rgba(0,224,138,.3)'],
  ['#5B9EFF','rgba(91,158,255,.12)','rgba(91,158,255,.3)'],
  ['#FFB020','rgba(255,176,32,.12)','rgba(255,176,32,.3)'],
  ['#FF7EB3','rgba(255,126,179,.12)','rgba(255,126,179,.3)'],
  ['#A78BFA','rgba(167,139,250,.12)','rgba(167,139,250,.3)'],
];

function avatarPalette(name) {
  let h = 0;
  for (const c of name) h += c.charCodeAt(0);
  return PALETTE[h % PALETTE.length];
}

function mkAvatar(u, large = false) {
  const [color, bg, border] = avatarPalette(u.nombre + u.apellido);
  const initials = (u.nombre?.[0]||'') + (u.apellido?.[0]||'');
  const cls = large ? 'av av-lg' : 'av';
  return `<div class="${cls}" style="background:${bg};color:${color};border-color:${border}">${initials}</div>`;
}

function rolBadge(rol) {
  const M = {
    owner:  '<span class="badge b-owner">🎿 Propietario</span>',
    renter: '<span class="badge b-renter">🏄 Arrendatario</span>',
    admin:  '<span class="badge b-admin">⚙️ Administrador</span>',
  };
  return M[rol] || `<span class="badge">${rol}</span>`;
}

function estadoBadge(e) {
  return e === 'active'
    ? '<span class="badge b-active">● Activo</span>'
    : '<span class="badge b-inactive">● Inactivo</span>';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-BO', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtDateLong(iso) {
  return new Date(iso).toLocaleDateString('es-BO', {
    weekday:'long', day:'2-digit', month:'long', year:'numeric',
    hour:'2-digit', minute:'2-digit'
  });
}

function esc(str) {
  const d = document.createElement('div');
  d.textContent = String(str || '');
  return d.innerHTML;
}

// ══════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════
async function init() {
  buildDemoCards();

  if (STATE.token && STATE.user) {
    try {
      const me = await api('/me');
      STATE.user = me;
      localStorage.setItem('sg_user', JSON.stringify(me));
      enterDashboard();
    } catch (_) {
      STATE.token = null;
      STATE.user  = null;
      localStorage.removeItem('sg_token');
      localStorage.removeItem('sg_user');
      showScreen('screen-login');
    }
  } else {
    showScreen('screen-login');
  }
}

init();
