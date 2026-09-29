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
  `);
} catch (e) {
  motivo = e.message;
  db = null;
  console.error('[DB] cuentas desactivadas:', e.message);
}

// ¿Está en un volumen persistente? En Railway, RAILWAY_VOLUME_MOUNT_PATH existe solo si hay volumen.
const persistente = !process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_VOLUME_MOUNT_PATH;

module.exports = { db, motivo, persistente, ARCHIVO };
