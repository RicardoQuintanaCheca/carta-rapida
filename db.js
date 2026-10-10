// Base de datos de Carta Rápida: cuentas y cartas guardadas.
// SQLite en un solo archivo dentro de DATA_DIR (en Railway, un volumen montado en /app/datos).
// Si el volumen no está montado los datos se perderían al redesplegar: por eso /salud avisa ("datos": "temporal").
const fs = require('fs');
const path = require('path');

const DIR_DATOS = process.env.DATA_DIR || path.join(__dirname, 'datos');
const ARCHIVO = path.join(DIR_DATOS, 'cartarapida.db');

let db = null;
let motivo = '';
try {
  // Silencia el aviso "experimental" de node:sqlite en los logs
  const avisar = process.emitWarning;
  process.emitWarning = (w, ...r) => (String(w).includes('SQLite') ? undefined : avisar.call(process, w, ...r));
  const { DatabaseSync } = require('node:sqlite');
  process.emitWarning = avisar;
  fs.mkdirSync(DIR_DATOS, { recursive: true });
  db = new DatabaseSync(ARCHIVO);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      hash TEXT NOT NULL,
      sal TEXT NOT NULL,
      version_sesion INTEGER NOT NULL DEFAULT 1,
      creado INTEGER NOT NULL,
      novedades INTEGER NOT NULL DEFAULT 0,
      prueba_hasta INTEGER NOT NULL DEFAULT 0,
      stripe_cliente TEXT,
      sub_id TEXT,
      sub_estado TEXT,
      sub_plan TEXT,
      sub_hasta INTEGER NOT NULL DEFAULT 0,
      sub_cancela INTEGER NOT NULL DEFAULT 0,
      sub_revisado INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS cartas (
      id TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      titulo TEXT NOT NULL,
      estilo TEXT NOT NULL,
      datos TEXT NOT NULL,
      creado INTEGER NOT NULL,
      actualizado INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS cartas_usuario ON cartas(usuario_id, actualizado DESC);
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      origen TEXT,
      restaurante TEXT,
      estilo TEXT,
      platos INTEGER,
      novedades INTEGER NOT NULL DEFAULT 0,
      fecha INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS leads_fecha ON leads(fecha DESC);
    CREATE TABLE IF NOT EXISTS eventos (
      tipo TEXT NOT NULL,
      fecha INTEGER NOT NULL,
      detalle TEXT
    );
    CREATE INDEX IF NOT EXISTS eventos_tipo ON eventos(tipo, fecha);
    CREATE TABLE IF NOT EXISTS solicitudes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      telefono TEXT,
      restaurante TEXT,
      estilo TEXT,
      platos INTEGER,
      datos TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'nueva',
      fecha INTEGER NOT NULL,
      atendida INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS solicitudes_fecha ON solicitudes(fecha DESC);
  `);
  // Columnas nuevas (bases de datos ya creadas): acceso con Google y cuentas sin contraseña propia
  const cols = db.prepare('PRAGMA table_info(usuarios)').all().map(c => c.name);
  if (!cols.includes('google_sub')) db.exec('ALTER TABLE usuarios ADD COLUMN google_sub TEXT');
  if (!cols.includes('sin_clave')) db.exec('ALTER TABLE usuarios ADD COLUMN sin_clave INTEGER NOT NULL DEFAULT 0');
  if (!cols.includes('origen')) db.exec('ALTER TABLE usuarios ADD COLUMN origen TEXT');
  // Origen de campaña en cada evento (trazabilidad)
  if (!db.prepare('PRAGMA table_info(eventos)').all().some(c => c.name === 'origen')) db.exec('ALTER TABLE eventos ADD COLUMN origen TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS eventos_fecha ON eventos(fecha)');
} catch (e) {
  motivo = e.message;
  db = null;
  console.error('[DB] cuentas desactivadas:', e.message);
}

// ¿Está en un volumen persistente? En Railway, RAILWAY_VOLUME_MOUNT_PATH existe solo si hay volumen.
const persistente = !process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_VOLUME_MOUNT_PATH;

// Contador sencillo de uso (cartas generadas, PDF descargados…) para el panel de administración
function evento(tipo, detalle = '', origen = null) {
  if (!db) return;
  try { db.prepare('INSERT INTO eventos (tipo, fecha, detalle, origen) VALUES (?, ?, ?, ?)').run(tipo, Date.now(), String(detalle).slice(0, 60), origen ? String(origen).slice(0, 140) : null); } catch {}
}

// ── Copias de seguridad ──
// Una copia al día dentro del volumen (carpeta copias/), se guardan las 14 últimas.
// Protege de un borrado o de un despliegue que estropee datos; NO de perder el volumen entero:
// para eso, descarga una copia desde /admin (botón «Copia de seguridad») y guárdala fuera.
const DIR_COPIAS = path.join(DIR_DATOS, 'copias');
const MAX_COPIAS = 14;
function copiaA(ruta) {
  if (fs.existsSync(ruta)) fs.unlinkSync(ruta);
  db.exec(`VACUUM INTO '${ruta.replace(/'/g, "''")}'`);
  return ruta;
}
function copiaDiaria() {
  if (!db) return null;
  try {
    fs.mkdirSync(DIR_COPIAS, { recursive: true });
    const hoy = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' }); // AAAA-MM-DD
    const ruta = path.join(DIR_COPIAS, `cartarapida-${hoy}.db`);
    if (fs.existsSync(ruta)) return ruta;
    copiaA(ruta);
    const viejas = fs.readdirSync(DIR_COPIAS).filter(f => /^cartarapida-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort();
    viejas.slice(0, Math.max(0, viejas.length - MAX_COPIAS)).forEach(f => fs.unlinkSync(path.join(DIR_COPIAS, f)));
    console.log(`[COPIA] ${path.basename(ruta)} (${Math.round(fs.statSync(ruta).size / 1024)} KB)`);
    return ruta;
  } catch (e) { console.error('[COPIA] falló:', e.message); return null; }
}
if (db) {
  setTimeout(copiaDiaria, 60 * 1000).unref();
  setInterval(copiaDiaria, 3 * 60 * 60 * 1000).unref();
}

module.exports = { db, motivo, persistente, ARCHIVO, evento, copiaA, copiaDiaria, DIR_COPIAS };
