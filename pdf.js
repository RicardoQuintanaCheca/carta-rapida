// ============================================================
// PDF de la carta, generado en el servidor
// Usa el mismo motor y los mismos estilos que la vista previa
// de la web, así el PDF sale idéntico en cualquier móvil.
// ============================================================
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const MOTOR = fs.readFileSync(path.join(__dirname, 'public/carta/motor.js'), 'utf8');
const ESTILOS = fs.readFileSync(path.join(__dirname, 'public/carta/estilos.css'), 'utf8');

// Tipografías incrustadas en el propio HTML: el PDF no depende de internet
const CARAS = [
  ['eb-garamond', 'EB Garamond', [[400, 'normal'], [500, 'normal'], [600, 'normal'], [400, 'italic'], [500, 'italic']]],
  ['libre-caslon-display', 'Libre Caslon Display', [[400, 'normal']]],
  ['instrument-sans', 'Instrument Sans', [[400, 'normal'], [500, 'normal'], [600, 'normal']]],
  ['instrument-serif', 'Instrument Serif', [[400, 'normal'], [400, 'italic']]],
  ['bodoni-moda', 'Bodoni Moda', [[500, 'normal']]],
  ['newsreader', 'Newsreader', [[400, 'normal'], [500, 'normal'], [400, 'italic']]],
  // Colección 2026
  ['cormorant-garamond', 'Cormorant Garamond', [[300, 'normal'], [400, 'normal'], [500, 'normal'], [600, 'normal'], [400, 'italic'], [500, 'italic']]],
  ['jost', 'Jost', [[400, 'normal'], [500, 'normal']]],
  ['dm-serif-display', 'DM Serif Display', [[400, 'normal'], [400, 'italic']]],
  ['libre-franklin', 'Libre Franklin', [[500, 'normal'], [600, 'normal']]],
  ['playfair-display', 'Playfair Display', [[400, 'normal'], [400, 'italic']]],
  ['fraunces', 'Fraunces', [[300, 'normal'], [300, 'italic']]],
  ['manrope', 'Manrope', [[500, 'normal'], [600, 'normal'], [700, 'normal']]],
  ['shippori-mincho', 'Shippori Mincho', [[500, 'normal'], [600, 'normal']]],
  ['zen-kaku-gothic-new', 'Zen Kaku Gothic New', [[400, 'normal'], [500, 'normal']]],
  ['syne', 'Syne', [[600, 'normal'], [700, 'normal']]],
  ['space-grotesk', 'Space Grotesk', [[300, 'normal'], [400, 'normal'], [500, 'normal'], [600, 'normal']]],
  ['italiana', 'Italiana', [[400, 'normal']]],
  ['cinzel', 'Cinzel', [[400, 'normal'], [500, 'normal']]],
  // Colección papel blanco
  ['young-serif', 'Young Serif', [[400, 'normal']]],
  ['figtree', 'Figtree', [[400, 'normal'], [500, 'normal'], [600, 'normal'], [400, 'italic']]],
  ['karla', 'Karla', [[400, 'normal'], [600, 'normal'], [400, 'italic']]],
  ['anton', 'Anton', [[400, 'normal']]],
  ['archivo', 'Archivo', [[500, 'normal'], [600, 'normal'], [800, 'normal'], [400, 'italic']]],
  ['courier-prime', 'Courier Prime', [[400, 'normal'], [700, 'normal'], [400, 'italic']]],
  ['unifrakturmaguntia', 'UnifrakturMaguntia', [[400, 'normal']]],
  ['old-standard-tt', 'Old Standard TT', [[400, 'normal'], [700, 'normal'], [400, 'italic']]],
  ['bricolage-grotesque', 'Bricolage Grotesque', [[500, 'normal'], [700, 'normal'], [800, 'normal']]]
];
const RANGOS = {
  latin: 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  'latin-ext': 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
};

// Lista única de archivos de fuente: la usan el PDF (incrustadas) y la vista previa web (servidas)
const ARCHIVOS_FUENTE = new Map(); // nombre.woff2 -> ruta absoluta
const CARAS_LISTA = [];
for (const [paquete, familia, variantes] of CARAS) {
  const dir = path.join(path.dirname(require.resolve(`@fontsource/${paquete}/package.json`)), 'files');
  for (const [peso, estilo] of variantes) {
    for (const [subset, rango] of Object.entries(RANGOS)) {
      const nombre = `${paquete}-${subset}-${peso}-${estilo}.woff2`;
      const ruta = path.join(dir, nombre);
      if (!fs.existsSync(ruta)) continue;
      ARCHIVOS_FUENTE.set(nombre, ruta);
      CARAS_LISTA.push({ familia, peso, estilo, rango, nombre });
    }
  }
}
const cara = (c, src) => `@font-face{font-family:'${c.familia}';font-style:${c.estilo};font-weight:${c.peso};font-display:block;src:url(${src}) format('woff2');unicode-range:${c.rango};}\n`;

const FUENTES = CARAS_LISTA.map(c => cara(c, `data:font/woff2;base64,${fs.readFileSync(ARCHIVOS_FUENTE.get(c.nombre)).toString('base64')}`)).join('');
// Misma definición para la web, apuntando a /carta/f/<archivo>
const CSS_FUENTES_WEB = CARAS_LISTA.map(c => cara(c, `/carta/f/${c.nombre}`)).join('');

const PLANTILLA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<style>${FUENTES}
html,body{margin:0;padding:0;background:#fff}
${ESTILOS}</style></head><body><div id="d"></div><script>${MOTOR}</script></body></html>`;

let navegador = null;
async function obtenerNavegador() {
  if (navegador && navegador.isConnected()) return navegador;
  navegador = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  return navegador;
}

const ESTILOS_VALIDOS = new Set(['mantel', 'barra', 'autor', 'noche', 'sobremesa', 'brasserie', 'editorial', 'sumi', 'riviera', 'deco', 'azulejo', 'trattoria', 'cartel', 'ticket', 'gaceta', 'serigrafia']);

async function generarPDF(carta, { estilo = 'mantel', logo = null, credito = true } = {}) {
  if (!ESTILOS_VALIDOS.has(estilo)) estilo = 'mantel';
  const nav = await obtenerNavegador();
  const contexto = await nav.newContext();
  try {
    const pagina = await contexto.newPage();
    // Nada sale a internet desde el renderizado
    await pagina.route('**/*', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    await pagina.setContent(PLANTILLA, { waitUntil: 'load' });
    await pagina.evaluate(async (estilo) => {
      await document.fonts.ready;
      const propias = (MotorCarta.ESTILOS[estilo] || {}).fuentes;
      if (propias) { await Promise.all(propias.map(f => document.fonts.load(f.replace('1em', '16px'), 'Áéñ1'))); return; }
      const caras = ['16px "EB Garamond"', 'italic 16px "EB Garamond"', '500 16px "EB Garamond"', '600 16px "EB Garamond"',
        '16px "Libre Caslon Display"', '16px "Instrument Sans"', '500 16px "Instrument Sans"', '600 16px "Instrument Sans"',
        '16px "Instrument Serif"', 'italic 16px "Instrument Serif"', '500 16px "Bodoni Moda"',
        '16px "Newsreader"', '500 16px "Newsreader"', 'italic 16px "Newsreader"'];
      await Promise.all(caras.map(c => document.fonts.load(c, 'Áéñ')));
    }, estilo);
    const info = await pagina.evaluate(async ({ carta, estilo, logo, credito }) => {
      // El logo se decodifica antes de medir; si no, la cabecera mediría 0 y el texto se saldría
      if (logo) await new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = logo; window.__logo = i; });
      return MotorCarta.componer(document.getElementById('d'), carta, { estilo, logo, credito });
    }, { carta, estilo, logo, credito });
    await pagina.emulateMedia({ media: 'print' });
    const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
    return { pdf, info };
  } finally {
    await contexto.close();
  }
}

async function cerrar() { if (navegador) await navegador.close().catch(() => {}); }

module.exports = { generarPDF, cerrar, CSS_FUENTES_WEB, ARCHIVOS_FUENTE };
