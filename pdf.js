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
const ALERGENOS_JS = fs.readFileSync(path.join(__dirname, 'public/carta/alergenos.js'), 'utf8');
require('./public/carta/alergenos.js');
const AL = globalThis.Alergenos;

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
  ['bricolage-grotesque', 'Bricolage Grotesque', [[500, 'normal'], [700, 'normal'], [800, 'normal']]],
  // Colección por tipo de local
  ['zilla-slab', 'Zilla Slab', [[500, 'normal'], [700, 'normal']]],
  ['fredoka', 'Fredoka', [[500, 'normal'], [600, 'normal']]],
  ['abril-fatface', 'Abril Fatface', [[400, 'normal']]],
  ['caveat', 'Caveat', [[700, 'normal']]]
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
${ESTILOS}</style></head><body><div id="d"></div><script>${ALERGENOS_JS}</script><script>${MOTOR}</script></body></html>`;

let navegador = null;
async function obtenerNavegador() {
  if (navegador && navegador.isConnected()) return navegador;
  navegador = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  return navegador;
}

const ESTILOS_VALIDOS = new Set(['mantel', 'barra', 'autor', 'noche', 'sobremesa', 'brasserie', 'editorial', 'sumi', 'riviera', 'deco', 'azulejo', 'trattoria', 'cartel', 'ticket', 'gaceta', 'serigrafia', 'bloque', 'marinero', 'brunch', 'vermut', 'pizarra']);

// Tamaño de la hoja del PDF según el formato (el cuadernillo sale ya impuesto en A3 apaisado)
const HOJA = { a4: { width: '210mm', height: '297mm' }, slim: { width: '140mm', height: '297mm' }, elastico: { width: '420mm', height: '297mm' } };

async function generarPDF(carta, { estilo = 'mantel', logo = null, credito = true, conVista = false, formato = 'a4' } = {}) {
  if (!ESTILOS_VALIDOS.has(estilo)) estilo = 'mantel';
  if (!HOJA[formato]) formato = 'a4';
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
    const info = await pagina.evaluate(async ({ carta, estilo, logo, credito, formato }) => {
      // El logo se decodifica antes de medir; si no, la cabecera mediría 0 y el texto se saldría
      if (logo) await new Promise(res => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = logo; window.__logo = i; });
      return MotorCarta.componer(document.getElementById('d'), carta, { estilo, logo, credito, formato, imponer: true });
    }, { carta, estilo, logo, credito, formato });
    let vista = null;
    if (conVista) {
      try { const hoja = await pagina.$('.pagina'); if (hoja) vista = await hoja.screenshot({ type: 'jpeg', quality: 82 }); } catch (e) {}
    }
    await pagina.emulateMedia({ media: 'print' });
    // El tamaño de hoja se fija con @page (así Chromium respeta también la orientación apaisada del A3)
    await pagina.addStyleTag({ content: `@media print { @page { size: ${HOJA[formato].width} ${HOJA[formato].height}; margin: 0; } }` });
    const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
    return { pdf, info, vista };
  } finally {
    await contexto.close();
  }
}

/* ---------- Tabla de alérgenos: documento A4 para sala e inspección ---------- */
const escH = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FUENTE_TABLA = CARAS_LISTA.filter(c => c.familia === 'Bricolage Grotesque').map(c => cara(c, `data:font/woff2;base64,${fs.readFileSync(ARCHIVOS_FUENTE.get(c.nombre)).toString('base64')}`)).join('');
const CSS_TABLA = `@page{size:A4;margin:12mm 14mm 11mm}*{box-sizing:border-box}html,body{margin:0;background:#fff}
body{font-family:'Bricolage Grotesque',system-ui,sans-serif;font-weight:500;color:#141416;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cab{display:flex;justify-content:space-between;align-items:flex-end;gap:8mm;border-bottom:1.6pt solid #141416;padding-bottom:5mm;margin-bottom:4mm}
.cab h1{font-size:25pt;letter-spacing:-.035em;margin:0;line-height:1;font-weight:800}.cab .r{font-size:11pt;font-weight:700;margin-top:2.5mm}
.cab .logo{max-height:16mm;max-width:60mm;object-fit:contain;display:block;margin-bottom:3mm}
.cab .f{font-size:8pt;color:#6C6C72;text-align:right;line-height:1.5;white-space:nowrap}
table{width:100%;border-collapse:collapse;font-size:8.6pt}thead{display:table-header-group}tr{break-inside:avoid}
th.a{width:8.6mm;padding:0 0 2mm;vertical-align:bottom;font-weight:500}
th.a .n{writing-mode:vertical-rl;transform:rotate(180deg);font-size:7.2pt;white-space:nowrap;margin:0 auto 1.4mm;height:21mm;text-align:left;color:#3A3A40}
th.a .al-i{width:5.4mm;height:5.4mm;display:block;margin:0 auto}
th.a .num{font-size:6.4pt;color:#8A8A92;margin-top:.8mm}
th.p{text-align:left;vertical-align:bottom;padding-bottom:2mm;font-size:7.4pt;text-transform:uppercase;letter-spacing:.12em;color:#6C6C72;font-weight:700}
tr.s td{padding:3.4mm 0 1.4mm;font-size:7.4pt;font-weight:800;text-transform:uppercase;letter-spacing:.13em;border-bottom:.9pt solid #141416;break-after:avoid}
td{border-bottom:.35pt solid #D9D9DE;padding:1mm 0;height:5.6mm}
td.c{text-align:center;border-left:.35pt solid #ECECEF}
td.c i{display:inline-block;width:3mm;height:3mm;border-radius:50%;background:#141416;vertical-align:middle}
td.pl{padding-right:3mm}
td.sin{text-align:center;font-size:7pt;color:#8A8A92;letter-spacing:.08em;text-transform:uppercase;border-left:.35pt solid #ECECEF}
tr.z td.c{background:#FAFAFB}
.pie{padding-top:6mm;font-size:7.4pt;color:#55555C;line-height:1.5;break-inside:avoid}
.firma{display:grid;grid-template-columns:1.4fr 1fr 1.2fr;gap:8mm;margin-top:9mm;font-size:7.6pt;color:#141416;font-weight:700}
.firma div{border-top:.6pt solid #141416;padding-top:1.6mm}`;

function htmlTablaAlergenos(carta, logo) {
  let filas = '', platos = 0, pendientes = 0;
  (carta.secciones || []).forEach(s => {
    filas += `<tr class="s"><td colspan="15">${escH(s.nombre)}</td></tr>`;
    s.platos.forEach((p, i) => {
      platos++;
      const al = p.al || [];
      if (!al.length && !p.al_ok) pendientes++;
      filas += `<tr class="${i % 2 ? '' : 'z'}"><td class="pl">${escH(p.nombre)}</td>${!al.length && p.al_ok
        ? '<td class="sin" colspan="14">Sin alérgenos declarados</td>'
        : AL.ALERGENOS.map(a => `<td class="c">${al.includes(a.id) ? '<i></i>' : ''}</td>`).join('')}</tr>`;
    });
  });
  const hoy = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid', day: 'numeric', month: 'long', year: 'numeric' });
  return { pendientes, html: `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${FUENTE_TABLA}${CSS_TABLA}</style></head><body>
<div class="cab"><div>${logo ? `<img class="logo" src="${logo}" alt="">` : ''}<h1>Tabla de alérgenos</h1>${carta.nombre_restaurante ? `<div class="r">${escH(carta.nombre_restaurante)}</div>` : ''}</div>
<div class="f">Actualizada el ${hoy}<br>${platos} ${platos === 1 ? 'plato' : 'platos'}</div></div>
<table><thead><tr><th class="p">Plato</th>${AL.ALERGENOS.map(a => `<th class="a"><div class="n">${a.es}</div>${AL.icono(a.id)}<div class="num">${a.id}</div></th>`).join('')}</tr></thead><tbody>${filas}</tbody></table>
<div class="pie">Información sobre las 14 sustancias que causan alergias o intolerancias, facilitada conforme al Reglamento (UE) n.º 1169/2011 y al Real Decreto 126/2015. El punto indica que el plato contiene ese alérgeno como ingrediente.${pendientes ? ' Las filas en blanco están pendientes de revisar.' : ''} Si tiene alguna alergia o intolerancia, comuníquelo al personal antes de pedir.
<div class="firma"><div>Revisada por</div><div>Fecha</div><div>Firma</div></div></div>
</body></html>` };
}

async function generarTablaAlergenos(carta, { logo = null } = {}) {
  const { html, pendientes } = htmlTablaAlergenos(carta, logo);
  const nav = await obtenerNavegador();
  const contexto = await nav.newContext();
  try {
    const pagina = await contexto.newPage();
    await pagina.route('**/*', r => r.request().url().startsWith('data:') ? r.continue() : r.abort());
    await pagina.setContent(html, { waitUntil: 'load' });
    await pagina.evaluate(() => document.fonts.ready);
    const pdf = await pagina.pdf({ preferCSSPageSize: true, printBackground: true });
    return { pdf, pendientes };
  } finally {
    await contexto.close();
  }
}

async function cerrar() { if (navegador) await navegador.close().catch(() => {}); }

module.exports = { generarPDF, generarTablaAlergenos, cerrar, CSS_FUENTES_WEB, ARCHIVOS_FUENTE };
