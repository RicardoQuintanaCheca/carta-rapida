// Limpieza de la carta que devuelve la lectura: espacios, precios, puntos, duplicados.
// Limpieza final: lo que el lector deje imperfecto se corrige aquí, siempre igual
const limpio = s => (typeof s === 'string' ? s : '')
  .replace(/[   \t\r\n]+/g, ' ')   // espacios raros y saltos de línea
  .replace(/\s{2,}/g, ' ')                         // espacios dobles
  .replace(/\s+([,.;:!?)])/g, '$1')                // espacio antes de puntuación
  .replace(/([(¿¡])\s+/g, '$1')                    // espacio después de apertura
  .replace(/\.{2,}$/, '')                          // puntos suspensivos de relleno al final
  .trim();

const sinPuntoFinal = s => s.replace(/\s*[.·,;:]+$/, '').trim();
const mayusInicial = s => s ? s.charAt(0).toLocaleUpperCase('es') + s.slice(1) : s;

// "12,50 €" → "12.50" · "12'5" → "12.5" · "S/M" → "SPM" · "5 €/u" → "5/u" · "9€ | 16€" → "9 | 16"
function limpiarPrecio(p) {
  let s = limpio(String(p == null ? '' : p)).replace(/€|eur(os)?\b|EUR/gi, '').replace(/\s*\/\s*/g, '/').replace(/\s*\|\s*/g, ' | ').trim();
  if (/^s\/?m$|^s\.?p\.?m\.?$|según mercado/i.test(s)) return 'SPM';
  s = s.replace(/(\d)[,'](\d)/g, '$1.$2');
  s = s.replace(/^[-–—.\s]+|[-–—\s]+$/g, '');
  return s;
}

// Precio pegado al final del nombre: solo si viene con € o con puntos guía ("Croquetas ..... 9,50 €")
const RE_PRECIO_FINAL = /(?:\s*[-–—.·…_]{2,}\s*|\s+)(\d{1,4}(?:[.,]\d{1,2})?)\s*(€|eur(?:os)?)?\s*$/i;

function limpiarPlato(p) {
  let nombre = sinPuntoFinal(limpio(p.nombre));
  let precio = limpiarPrecio(p.precio);
  if (!precio) {
    const m = nombre.match(RE_PRECIO_FINAL);
    if (m && (m[2] || /[-–—.·…_]{2,}/.test(m[0])) && m.index > 2) { precio = limpiarPrecio(m[1]); nombre = nombre.slice(0, m.index).trim(); }
  }
  // Precio repetido dentro del nombre cuando ya viene aparte
  if (precio && nombre.endsWith(precio.replace('.', ','))) nombre = nombre.slice(0, -precio.length).replace(/[-–—.·…\s]+$/, '').trim();
  let descripcion = sinPuntoFinal(limpio(p.descripcion));
  // Una descripción no repite el nombre del plato: "Pulpo a feira con cachelos" → "Con cachelos"
  if (nombre && descripcion.toLowerCase().startsWith(nombre.toLowerCase() + ' ')) descripcion = descripcion.slice(nombre.length).trim();
  // Una "descripción" que solo repite la ración ("100g", "8 uds", "Mín. 2 pers") no es descripción
  const racion = limpio(p.racion).replace(/^\(|\)$/g, '');
  const n = x => x.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');
  if (descripcion && (racion && n(descripcion).length <= n(racion).length + 4 && (n(descripcion).includes(n(racion)) || n(racion).includes(n(descripcion)))
      || /^(m[ií]n\.?\s*)?\d+\s*(g|gr|kg|ml|cl|l|uds?\.?|unidades|pers\.?|personas|pax|raciones)\b\.?$/i.test(descripcion))) descripcion = '';
  descripcion = mayusInicial(descripcion);
  let alergenos = limpio(p.alergenos).replace(/^al[eé]rgenos\s*:?\s*/i, '');
  alergenos = alergenos ? mayusInicial(alergenos.toLocaleLowerCase('es')) : '';
  // Alérgenos marcados por el hostelero: ids oficiales 1–14. "al_ok" = revisado y sin alérgenos.
  const al = [...new Set((Array.isArray(p.al) ? p.al : []).map(Number).filter(x => Number.isInteger(x) && x >= 1 && x <= 14))].sort((a, b) => a - b);
  return {
    nombre, racion, descripcion: descripcion === nombre ? '' : descripcion,
    precio, alergenos: sinPuntoFinal(alergenos), destacado: p.destacado === true,
    ...(al.length ? { al } : (p.al_ok === true ? { al_ok: true } : {}))
  };
}

function normalizarCarta(c) {
  c = c || {};
  const secciones = (c.secciones || []).map(s => ({
    nombre: sinPuntoFinal(limpio(s.nombre)),
    platos: (s.platos || []).map(limpiarPlato).filter(p => p.nombre)
  })).filter(s => s.platos.length);
  // Una sección "fantasma" de un solo plato que se llama igual que el plato: se une a la anterior
  for (let i = secciones.length - 1; i > 0; i--) {
    const s = secciones[i];
    if (s.platos.length === 1 && s.platos[0].nombre.toLowerCase() === s.nombre.toLowerCase()) {
      secciones[i - 1].platos.push(s.platos[0]); secciones.splice(i, 1);
    }
  }
  // Solo se quita un plato si está repetido DENTRO de la misma sección con el mismo nombre, ración y precio
  // (una lectura duplicada). El mismo nombre en otra sección o con otro precio es una variante real
  // ("Ensaladilla" de tapa a 4 € y de ración a 10 €) y se conserva siempre.
  const precioClave = p => isNaN(parseFloat(p)) ? String(p || '') : String(parseFloat(p));
  secciones.forEach(s => {
    const vistos = new Set();
    s.platos = s.platos.filter(p => {
      const k = [p.nombre, p.racion, precioClave(p.precio)].join('|').toLowerCase();
      if (vistos.has(k)) return false;
      vistos.add(k); return true;
    });
  });
  const out = {
    nombre_restaurante: sinPuntoFinal(limpio(c.nombre_restaurante)),
    subtitulo: sinPuntoFinal(limpio(c.subtitulo)),
    idioma: limpio(c.idioma).slice(0, 5) || 'es',
    nota_pie: limpio(c.nota_pie),
    servicios: (c.servicios || []).map(s => ({ nombre: sinPuntoFinal(limpio(s.nombre)), precio: limpiarPrecio(s.precio) })).filter(s => s.nombre),
    secciones: secciones.filter(s => s.platos.length),
    ...(['numeros', 'no'].includes(c.alergenos_modo) ? { alergenos_modo: c.alergenos_modo } : {})
  };
  // Criterio de diseño: destacar poco para que destaque. Máx. 1 por sección y 3 en total.
  let quedan = 3;
  out.secciones.forEach(s => {
    let enSeccion = 0;
    s.platos.forEach(p => { if (p.destacado) { if (enSeccion < 1 && quedan > 0) { enSeccion++; quedan--; } else p.destacado = false; } });
  });
  return out;
}

module.exports = { normalizarCarta, limpiarPrecio, limpio };
