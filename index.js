require('dotenv').config();
const express = require('express');
const compression = require('compression');
const multer = require('multer');
const OpenAI = require('openai');
const { generarPDF, cerrar, CSS_FUENTES_WEB, ARCHIVOS_FUENTE } = require('./pdf');
const { crearRutas: rutasCuenta, planDe, ESTILOS_PRO, MODO_DEMO, CUENTAS_ACTIVAS, persistente } = require('./cuentas');
const { enviarLead, LISTMONK_ACTIVO } = require('./leads');

const app = express();
app.set('trust proxy', true);

// Las fotos se leen en memoria: no se guarda nada en disco
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 9 }
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODELO = process.env.OPENAI_MODEL || 'gpt-4o';

app.use(compression());
app.use(express.json({ limit: '6mb' }));
// HTML siempre fresco; imágenes y fuentes una semana; CSS y JS una hora (cambian con cada versión)
app.use(express.static('public', {
  setHeaders(res, ruta) {
    if (/\.html?$/.test(ruta)) res.setHeader('Cache-Control', 'no-cache');
    else if (/\.(webp|png|jpe?g|ico|svg|woff2?)$/.test(ruta)) res.setHeader('Cache-Control', 'public, max-age=604800');
    else if (/\.(css|js)$/.test(ruta)) res.setHeader('Cache-Control', 'public, max-age=3600');
  }
}));

// Tipografías de las cartas para la vista previa (las mismas del PDF)
app.get('/carta/fuentes.css', (req, res) => {
  res.type('text/css').set('Cache-Control', 'public, max-age=86400').send(CSS_FUENTES_WEB);
});
app.get('/carta/f/:archivo', (req, res) => {
  const ruta = ARCHIVOS_FUENTE.get(req.params.archivo);
  if (!ruta) return res.status(404).end();
  res.type('font/woff2').set('Cache-Control', 'public, max-age=31536000, immutable').sendFile(ruta);
});

// === RATE LIMITING ===
function crearLimite(porHora, porDia, mensajeHora, mensajeDia) {
  const registro = new Map();
  const HORA = 60 * 60 * 1000, DIA = 24 * HORA;
  setInterval(() => {
    const ahora = Date.now();
    for (const [ip, marcas] of registro) {
      const vivas = marcas.filter(t => ahora - t < DIA);
      vivas.length ? registro.set(ip, vivas) : registro.delete(ip);
    }
  }, HORA).unref();

  return (req, res, next) => {
    const ip = req.ip || 'desconocida';
    const ahora = Date.now();
    const marcas = (registro.get(ip) || []).filter(t => ahora - t < DIA);
    if (marcas.filter(t => ahora - t < HORA).length >= porHora) {
      console.warn(`[LIMITE] ${req.path} ${ip} — tope por hora`);
      return res.status(429).json({ ok: false, error: mensajeHora });
    }
    if (marcas.length >= porDia) {
      console.warn(`[LIMITE] ${req.path} ${ip} — tope diario`);
      return res.status(429).json({ ok: false, error: mensajeDia });
    }
    marcas.push(ahora);
    registro.set(ip, marcas);
    next();
  };
}

const limiteProcesar = crearLimite(30, 100,
  'Has procesado demasiadas cartas en la última hora. Espera unos minutos e inténtalo de nuevo.',
  'Has alcanzado el límite diario de cartas procesadas. Vuelve mañana.');
const limiteRehacer = crearLimite(40, 150,
  'Demasiados ajustes seguidos. Espera unos minutos.',
  'Has alcanzado el límite diario de ajustes. Vuelve mañana.');
const limitePDF = crearLimite(60, 200,
  'Demasiadas descargas seguidas. Espera unos minutos.',
  'Has alcanzado el límite diario de descargas. Vuelve mañana.');

// === ESQUEMA DE LA CARTA ===
// El modelo está obligado a devolver exactamente esta forma (sin parseos a mano)
const ESQUEMA_CARTA = {
  type: 'object',
  additionalProperties: false,
  required: ['nombre_restaurante', 'subtitulo', 'idioma', 'nota_pie', 'servicios', 'secciones'],
  properties: {
    nombre_restaurante: { type: 'string' },
    subtitulo: { type: 'string' },
    idioma: { type: 'string' },
    nota_pie: { type: 'string' },
    servicios: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nombre', 'precio'],
        properties: { nombre: { type: 'string' }, precio: { type: 'string' } }
      }
    },
    secciones: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['nombre', 'platos'],
        properties: {
          nombre: { type: 'string' },
          platos: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['nombre', 'racion', 'descripcion', 'precio', 'alergenos', 'destacado'],
              properties: {
                nombre: { type: 'string' },
                descripcion: { type: 'string' },
                precio: { type: 'string' },
                alergenos: { type: 'string' },
                racion: { type: 'string' },
                destacado: { type: 'boolean' }
              }
            }
          }
        }
      }
    }
  }
};

const IDIOMAS = { en: 'English', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', zh: 'Chinese' };
const ESTILOS = ['mantel', 'barra', 'autor', 'noche', 'sobremesa', 'brasserie', 'editorial', 'sumi', 'riviera', 'deco', 'azulejo', 'trattoria', 'cartel', 'ticket', 'gaceta', 'serigrafia'];

const INSTRUCCION_NO_OMITIR = `REGLAS INVIOLABLES DE FIDELIDAD ESTRUCTURAL — PRIORIDAD ABSOLUTA SOBRE TODO LO DEMÁS:

REGLA 1 — ESTRUCTURA SAGRADA: el número de secciones de salida debe ser EXACTAMENTE el número de secciones visibles en la carta original. NO crees secciones nuevas, NO fusiones, NO dividas.

REGLA 2 — PLATOS EN SU LUGAR: cada plato permanece en la sección donde aparece en el original. NUNCA lo muevas a otra sección.

REGLA 3 — DISTINGUIR SECCIÓN DE PLATO:
Una SECCIÓN es un título corto y genérico (Entrantes, Carnes, Postres, Empecemos, Del Mar…), separado visualmente, que agrupa varios platos y NO va seguido de un precio.
Un PLATO va seguido de un precio o de una descripción y aparece bajo una sección. Aunque esté en MAYÚSCULAS y sea largo ("TABLA DE QUESOS DE NUESTRA TIERRA (120g)", "LOMO BAJO DE VACA GALLEGA MADURADA 35 DÍAS"), sigue siendo un plato. Sin excepciones.

REGLA 4 — CERO DUPLICADOS: cada plato aparece UNA SOLA VEZ.

REGLA 5 — NO OMITIR: ni un solo plato ni elemento puede faltar.

REGLA 6 — VERIFICACIÓN ANTES DE RESPONDER:
1. ¿Mismo número de secciones que el original?
2. ¿Cada plato está en su misma sección del original?
3. ¿Algún duplicado?
4. ¿Alguna sección con un único plato que se llama igual que la sección? Es un error: ese plato pertenece a otra sección.

EJEMPLO CORRECTO: sección "EMPECEMOS" con Jamón ibérico, Tabla de quesos de nuestra tierra (120g), Ensaladilla, Ensalada de langostinos, Tomate rosa → la misma sección con los mismos 5 platos.
EJEMPLO INCORRECTO: "EMPECEMOS" con 4 platos + una sección nueva "TABLA DE QUESOS DE NUESTRA TIERRA (120g)". ERROR GRAVE.

SOLO puedes: traducir si se pide, redactar descripciones si se pide y reordenar platos DENTRO de su sección si se pide. NUNCA alterar qué secciones existen ni a qué sección pertenece cada plato.`;

const ORDEN_SECCIONES = `ORDEN DE SECCIONES (aplícalo siempre; si una sección no existe, no la incluyas):
1. Menús del día o especiales · 2. Entrantes, tapas, para compartir · 3. Ensaladas · 4. Sopas, cremas y cuchara · 5. Arroces y pastas · 6. Pescados · 7. Carnes · 8. Postres · 9. Quesos · 10. Café e infusiones · 11. Vinos y bebidas · 12. Otros (pan, extras, suplementos)`;

const REGLAS_CAMPOS = `REGLAS DE CAMPOS:
- precio: solo el número, SIN símbolo €. Decimales con punto ("16.5", no "16,50"); sin ceros finales ("16", no "16.00").
  · La unidad del precio se queda EN EL PRECIO, nunca en racion: "65 €/kg" → "65/kg"; "17 €/pers" → "17/pers"; "5 €/ud" → "5/u".
  · Dos precios (copa/botella, media/entera, tapa/ración) → "3.5 | 18".
  · "S/M", "según mercado", "consultar" → "SPM". NUNCA dejes vacío un plato que en la carta tiene S/M.
  · Sin precio → "".
- nombre (plato): respeta el nombre original; corrige solo erratas evidentes. Si el original está TODO EN MAYÚSCULAS, escríbelo en minúsculas con mayúscula inicial y con mayúscula en nombres propios y denominaciones: lugares (Padrón, Huelva, Jabugo, Rioja, Ribera del Duero), variedades (tomate Raf, Idiazábal) y marcas. Ejemplo: "PIMIENTOS DE PADRÓN" → "Pimientos de Padrón". Sin punto final.
- racion: SOLO cantidades o condiciones de servicio (peso, unidades, personas, "por encargo", "½ ración"), SACADAS del nombre. Nunca descripciones ("madurado 45 días" es descripción, no ración): "80 g", "6 uds.", "2 pax", "por encargo", "½ ración", "(V)", "(VG)". Ejemplo: "Jamón ibérico (80g)" → nombre "Jamón ibérico", racion "80 g". Si no hay → "".
- destacado: true solo si la carta original marca el plato como especialidad, recomendación o plato de la casa (estrella, "de la casa", "recomendado", recuadro…). Si no → false.
- nombre (sección): igual que en el original, también en minúsculas con mayúscula inicial si venía todo en mayúsculas.
- alergenos: cópialos tal cual aparecen en la carta, sin la palabra "Alérgenos:". Si son números o códigos, deja los números ("1, 7"): NUNCA los conviertas en nombres. Si son palabras: "Gluten, lácteos, huevo". Si no hay → "".
- nombre_restaurante: solo si aparece claramente en la carta; si no → "".
- subtitulo: frase corta que acompañe al nombre si aparece en la carta (tipo de cocina, lema, ciudad: "Cocina de mercado · Valencia"). Si no aparece → "". No lo inventes.
- servicios: conceptos que se cobran aparte y no son platos: pan, servicio de mesa, cubierto, suplemento de terraza. Cada uno con su nombre y precio. Si un "Pan" aparece como línea suelta con precio, va aquí y NO como plato. Si no hay → [].
- nota_pie: textos legales o comerciales (IVA incluido, alérgenos a disposición, horarios…). Si no hay → "".
- idioma: código del idioma de salida ("es" por defecto).
NUNCA inventes platos, precios ni descripciones que no se pidan.`;

const REGLAS_ORDEN_VALOR = `ORDEN DENTRO DE CADA SECCIÓN (orden estratégico):
- El plato estrella o especialidad de la casa, si lo hay, el primero.
- Después, los platos de precio medio-alto: son los que más se ven.
- Los platos "por encargo" o de disponibilidad limitada, al final de su sección.
- destacado: además de lo que marque el original, puedes marcar como destacado COMO MÁXIMO 1 plato por sección y 3 en toda la carta: el más representativo de la casa y de precio medio-alto. Menos es más: si la carta es corta, 1 o ninguno.`;

const REGLAS_ORDEN_ORIGINAL = `ORDEN DENTRO DE CADA SECCIÓN: respeta EXACTAMENTE el orden original. NO reordenes platos.`;

const INSTRUCCION_SIN_DESCRIPCIONES = `DESCRIPCIONES: copia literalmente el texto descriptivo que aparezca bajo cada plato en el original. Si no hay, deja "". No escribas descripciones nuevas.`;

function instruccionEstilo(estilo) {
  if (estilo === 'sobremesa' || estilo === 'sumi') return `TONO (cocina de autor): sobrio y preciso. Si redactas descripciones, enumera producto y técnica sin adjetivos ("Pichón, remolacha asada, jugo de sus huesos").`;
  if (estilo === 'noche' || estilo === 'deco') return `TONO (restaurante de noche, elegante): evocador pero contenido. Si redactas descripciones, frases breves y cuidadas.`;
  if (estilo === 'brasserie') return `TONO (gran café, brasserie): clásico y generoso. Si redactas descripciones, breves y tradicionales ("Con patatas fritas y salsa bearnesa").`;
  if (estilo === 'gaceta' || estilo === 'trattoria' || estilo === 'azulejo') return `TONO (casa de comidas con carácter): cercano y apetecible. Si redactas descripciones, breves y tradicionales.`;
  if (estilo === 'ticket' || estilo === 'cartel' || estilo === 'serigrafia') return `TONO (bar moderno): directo, con chispa. Si redactas descripciones, muy cortas: 3 a 7 palabras.`;
  if (estilo === 'editorial' || estilo === 'riviera') return `TONO (local moderno): directo y con carácter. Si redactas descripciones, cortas: 4 a 8 palabras.`;
  if (estilo === 'barra') return `TONO (estilo Barra, taberna contemporánea): directo y concreto. Si redactas descripciones, cortas: 4 a 8 palabras, sin florituras.`;
  if (estilo === 'autor') return `TONO (estilo Autor, cocina gastronómica): preciso y evocador, sin adornos. Si redactas descripciones, enumera producto y técnica con sobriedad ("Pichón, remolacha asada, jugo de sus huesos").`;
  return `TONO (estilo Mantel, casa de comidas clásica): elegante y cercano, vocabulario de hostelería tradicional. Si redactas descripciones, frases completas y breves.`;
}

function instruccionTraduccion(codigo) {
  const idioma = IDIOMAS[codigo] || codigo;
  return `TRANSLATION — MANDATORY:
Translate the ENTIRE menu into ${idioma}: every dish name, every description, every section name, the subtitle, the service names and "nota_pie". Set "idioma" to "${codigo}".
Use professional hospitality terminology in ${idioma}, with the tone of a premium restaurant. For well-known Spanish dishes with no direct translation, keep the Spanish name and make the description explain it in ${idioma}.
DO NOT translate: prices, quantities, (V), (VG), SPM, the restaurant name.`;
}

function construirPrompt({ conDescripciones, conOrden, estilo, idioma }) {
  return [
    'Eres un maquetador experto en cartas de restaurante. Tu trabajo es leer la carta y devolverla estructurada, limpia y lista para imprimir.',
    INSTRUCCION_NO_OMITIR,
    ORDEN_SECCIONES,
    conOrden ? REGLAS_ORDEN_VALOR : REGLAS_ORDEN_ORIGINAL,
    REGLAS_CAMPOS,
    // Las descripciones nuevas se escriben en una segunda pasada: aquí solo se copian las que ya existen
    INSTRUCCION_SIN_DESCRIPCIONES,
    instruccionEstilo(estilo),
    idioma !== 'es' ? instruccionTraduccion(idioma) : ''
  ].filter(Boolean).join('\n\n');
}

async function pedirCarta(messages) {
  const r = await openai.chat.completions.create({
    model: MODELO,
    max_completion_tokens: 16000,
    messages,
    response_format: { type: 'json_schema', json_schema: { name: 'carta', strict: true, schema: ESQUEMA_CARTA } }
  });
  const m = r.choices[0].message;
  if (m.refusal) throw new Error('No hemos podido leer esta carta. Prueba con otra foto.');
  if (r.choices[0].finish_reason === 'length') throw new Error('La carta es demasiado larga para procesarla de una vez. Prueba a subirla en dos partes.');
  return JSON.parse(m.content);
}

const { normalizarCarta, limpio } = require('./limpieza');

// Adjetivos de relleno que un redactor profesional no usa
const RELLENO = /\b(deliciosa?s?|exquisita?s?|sabrosa?s?|cremosa?s?|crujientes?|jugosa?s?|tiernas?|tiernos?|doradas?|dorados?|caseras?|caseros?|tradicional(es)?|irresistibles?|espectacular(es)?|selecta?s?|seleccionad[oa]s?|de (alta|gran|primera) calidad|calidad superior|artesan[oa]s?|crispy|crunchy|creamy|silky|delicious|tasty|juicy|tender|golden|homemade|exquisite|mouth-?watering|croustillante?s?|délicieu(x|se)s?|fondante?s?|croccant[ei]|cremos[oa]|delizios[oa]|knusprig(e|en)?|cremig(e|en)?|lecker(e|en)?)\b/gi;

// Segunda pasada: un "redactor" escribe SOLO las descripciones que faltan.
// Las descripciones originales no se tocan nunca (se protegen en el código, no en el prompt).
async function redactarDescripciones(carta, { estilo, idioma }) {
  const pendientes = [];
  carta.secciones.forEach((s, si) => s.platos.forEach((p, pi) => {
    if (!p.descripcion) pendientes.push({ id: `${si}.${pi}`, seccion: s.nombre, plato: p.nombre, racion: p.racion });
  }));
  if (!pendientes.length) return carta;
  const nombreIdioma = IDIOMAS[idioma] || 'español';
  const r = await openai.chat.completions.create({
    model: MODELO,
    max_completion_tokens: 6000,
    messages: [
      { role: 'system', content: `Eres el redactor de cartas de un restaurante con criterio. Escribe la descripción de cada plato de la lista, en ${nombreIdioma}.
REGLAS:
- De 3 a 8 palabras. Todas con un ritmo parecido. Sin punto final. Primera letra en mayúscula.
- Describe lo que acompaña o cómo se elabora: guarnición, salsa, técnica, origen. Ejemplos del tono: "Con alioli de ajo asado", "Guisado lento al vino tinto", "Brasa de encina y sal en escamas".
- NO repitas el nombre del plato ni palabras de su nombre. NO repitas la ración ni el número de unidades o personas.
- PROHIBIDO usar adjetivos de relleno, en cualquier idioma: delicioso, exquisito, sabroso, cremoso, crujiente, jugoso, tierno, dorado, casero, tradicional, selecto, de calidad, artesano (en inglés: crispy, crunchy, creamy, silky, delicious, tasty, juicy, tender, golden, homemade).
- No inventes productos caros ni denominaciones de origen que la carta no nombra. Si dudas, describe la elaboración clásica.
- Bebidas, vinos, cafés, pan, extras y suplementos: texto "".
${instruccionEstilo(estilo)}` },
      { role: 'user', content: JSON.stringify(pendientes) }
    ],
    response_format: { type: 'json_schema', json_schema: { name: 'descripciones', strict: true, schema: {
      type: 'object', additionalProperties: false, required: ['descripciones'],
      properties: { descripciones: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'texto'],
        properties: { id: { type: 'string' }, texto: { type: 'string' } } } } }
    } } }
  });
  const salida = JSON.parse(r.choices[0].message.content || '{}').descripciones || [];
  salida.forEach(({ id, texto }) => {
    const [si, pi] = String(id).split('.').map(Number);
    const p = carta.secciones[si] && carta.secciones[si].platos[pi];
    if (!p || p.descripcion) return;
    let t = limpio(String(texto || '').replace(RELLENO, '')).replace(/\s+(y|con|de)\s*$/i, '').replace(/\s+,/g, ',').replace(/[.]+$/, '').trim();
    if (t.split(/\s+/).length < 2) return;
    p.descripcion = t.charAt(0).toLocaleUpperCase('es') + t.slice(1);
  });
  return carta;
}

function mensajeError(error) {
  const m = String(error && error.message || '');
  if (/unsupported image|image_parse_error|invalid_image/i.test(m)) return 'Formato de imagen no compatible. Usa JPG, PNG o WEBP.';
  if (/rate limit|quota|429/i.test(m)) return 'Ahora mismo hay mucha demanda. Inténtalo de nuevo en un minuto.';
  if (/^(No hemos|La carta es)/.test(m)) return m;
  return 'No hemos podido procesar la carta. Inténtalo de nuevo.';
}

const TIPOS_IMAGEN = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

app.post('/procesar', limiteProcesar, upload.any(), async (req, res) => {
  try {
    const textoManual = String(req.body.texto || '').slice(0, 20000);
    const conDescripciones = req.body.descripciones === 'si';
    const conOrden = req.body.neuromarketing !== 'no';
    const idioma = IDIOMAS[req.body.idioma] ? req.body.idioma : 'es';
    const estilo = ESTILOS.includes(req.body.estilo) ? req.body.estilo : 'mantel';

    const archivos = req.files || [];
    const fotos = archivos.filter(f => f.fieldname.startsWith('foto'));
    const logoFile = archivos.find(f => f.fieldname === 'logo');

    let logo = null;
    if (logoFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(logoFile.mimetype)) {
        return res.json({ ok: false, error: 'El logotipo debe ser una imagen JPG, PNG o WEBP.' });
      }
      logo = `data:${logoFile.mimetype};base64,${logoFile.buffer.toString('base64')}`;
    }

    const prompt = construirPrompt({ conDescripciones, conOrden, estilo, idioma });
    console.log(`[PROCESAR] modelo=${MODELO} fotos=${fotos.length} desc=${conDescripciones} orden=${conOrden} idioma=${idioma} estilo=${estilo}`);

    let messages;
    if (fotos.length) {
      if (fotos.some(f => !TIPOS_IMAGEN.has(f.mimetype))) {
        return res.json({ ok: false, error: 'Formato de imagen no compatible. Usa JPG, PNG o WEBP.' });
      }
      const content = fotos.map(f => ({ type: 'image_url', image_url: { url: `data:${f.mimetype};base64,${f.buffer.toString('base64')}`, detail: 'high' } }));
      content.push({ type: 'text', text: fotos.length > 1
        ? `Esta carta tiene ${fotos.length} páginas. Léelas TODAS y únelas en una sola carta, sin omitir ningún plato.`
        : 'Lee esta carta.' + (idioma !== 'es' ? ` Y tradúcela ENTERA al ${IDIOMAS[idioma]} (${idioma}): secciones, platos, descripciones, subtítulo, servicios y nota al pie.` : '') });
      messages = [{ role: 'system', content: prompt }, { role: 'user', content }];
    } else if (textoManual.trim()) {
      messages = [{ role: 'system', content: prompt }, { role: 'user', content: 'Carta:\n' + textoManual }];
    } else {
      return res.json({ ok: false, error: 'No se recibió imagen ni texto.' });
    }

    let carta = normalizarCarta(await pedirCarta(messages));
    // El nombre y la frase que escribe el cliente mandan sobre lo que leamos de la carta
    const nombreManual = String(req.body.nombre || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const subtituloManual = String(req.body.subtitulo || '').replace(/\s+/g, ' ').trim().slice(0, 90);
    if (nombreManual) carta.nombre_restaurante = nombreManual;
    if (subtituloManual) carta.subtitulo = subtituloManual;
    if (conDescripciones) {
      try { carta = normalizarCarta(await redactarDescripciones(carta, { estilo, idioma })); }
      catch (e) { console.error('[DESCRIPCIONES] error:', e.message); } // si falla, la carta sale igual, sin descripciones nuevas
    }
    const platos = carta.secciones.reduce((n, s) => n + s.platos.length, 0);
    console.log(`[PROCESAR] ok · ${carta.secciones.length} secciones · ${platos} platos · "${carta.nombre_restaurante}"`);
    if (!platos) return res.json({ ok: false, error: 'No hemos encontrado platos en la imagen. Prueba con una foto más nítida y de frente.' });

    res.json({ ok: true, carta, logo });
  } catch (error) {
    console.error('[PROCESAR] error:', error.message);
    res.json({ ok: false, error: mensajeError(error) });
  }
});

app.post('/rehacer', limiteRehacer, async (req, res) => {
  try {
    const { carta } = req.body || {};
    const ajuste = String((req.body || {}).ajuste || '').trim().slice(0, 600);
    if (!carta || !Array.isArray(carta.secciones) || !ajuste) return res.json({ ok: false, error: 'Faltan datos.' });

    const prompt = `Eres un maquetador experto en cartas de restaurante. Recibes una carta ya estructurada y un ajuste que pide el cliente.

INSTRUCCIONES:
- Aplica EXACTAMENTE el ajuste solicitado y no cambies nada más.
- Conserva todos los platos, precios y descripciones salvo lo que el ajuste indique.
- Si pide traducir, traduce todo con terminología profesional de hostelería y actualiza "idioma".
- Si pide cambiar el orden, reordena según lo indicado.
- NUNCA omitas platos.
- Si el ajuste no tiene que ver con la carta, devuélvela sin cambios.

${REGLAS_CAMPOS}`;

    const resultado = await pedirCarta([
      { role: 'system', content: prompt },
      { role: 'user', content: `CARTA ACTUAL:\n${JSON.stringify(carta)}\n\nAJUSTE DEL CLIENTE:\n${ajuste}` }
    ]);
    console.log(`[REHACER] ok · "${ajuste.slice(0, 80)}"`);
    res.json({ ok: true, carta: normalizarCarta(resultado) });
  } catch (error) {
    console.error('[REHACER] error:', error.message);
    res.json({ ok: false, error: mensajeError(error) });
  }
});

function slug(s) {
  return String(s || 'carta').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'carta';
}

app.post('/pdf', limitePDF, async (req, res) => {
  try {
    const { carta, estilo, logo } = req.body || {};
    if (!carta || !Array.isArray(carta.secciones)) return res.status(400).json({ ok: false, error: 'Falta la carta.' });
    const limpia = normalizarCarta(carta);
    if (!limpia.secciones.length) return res.status(400).json({ ok: false, error: 'La carta está vacía.' });

    // Versión gratis: con firma, sin logo, en español y con los estilos gratis; a cambio del email.
    // Logo, sin firma, traducción y estilos Pro son de Carta Pro (o de la prueba de 7 días)
    const plan = await planDe(req);
    const pro = plan.plan !== 'gratis';
    const estiloFinal = ESTILOS.includes(estilo) ? estilo : 'mantel';
    if (!pro) {
      if (String(limpia.idioma || 'es').slice(0, 2).toLowerCase() !== 'es') {
        return res.status(402).json({ ok: false, pro: true, motivo: 'idioma', error: 'La carta traducida es de Carta Pro. Pruébalo gratis 7 días o descárgala en español.' });
      }
      if (ESTILOS_PRO.includes(estiloFinal)) {
        return res.status(402).json({ ok: false, pro: true, motivo: 'estilo', error: 'Este estilo es de Carta Pro. Pruébalo gratis 7 días o elige uno de los estilos gratis.' });
      }
      const email = String((req.body || {}).email || '').trim().toLowerCase();
      if (!plan.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ ok: false, email: true, error: 'Déjanos tu email para descargar la carta.' });
      }
    }

    const t0 = Date.now();
    const { pdf, info } = await generarPDF(limpia, { estilo: estiloFinal, logo: pro ? logo : null, credito: !pro });
    console.log(`[PDF] ${estiloFinal} · ${info.paginas} pág · ${info.columnas} col · ${info.platos} platos · ${plan.plan} · ${Date.now() - t0} ms`);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="carta-${slug(limpia.nombre_restaurante)}.pdf"`,
      'Cache-Control': 'no-store'
    });
    res.send(Buffer.from(pdf));
  } catch (error) {
    console.error('[PDF] error:', error.message);
    res.status(500).json({ ok: false, error: 'No hemos podido generar el PDF. Inténtalo de nuevo.' });
  }
});

const limiteLeads = crearLimite(10, 30, 'Demasiados envíos seguidos. Espera unos minutos.', 'Has alcanzado el límite diario.');

app.use(rutasCuenta({
  limite: crearLimite(60, 300, 'Demasiadas peticiones seguidas. Espera unos minutos.', 'Has alcanzado el límite diario.'),
  limiteCuenta: crearLimite(15, 60, 'Demasiados intentos seguidos. Espera unos minutos.', 'Has alcanzado el límite diario de intentos.')
}));

// Panel del cliente (Mis cartas)
app.get(['/panel', '/panel/'], (req, res) => { res.set('Cache-Control', 'no-cache'); res.sendFile(require('path').join(__dirname, 'public', 'panel.html')); });

app.post('/guardar-email', limiteLeads, async (req, res) => {
  const b = req.body || {};
  const email = String(b.email || '').trim().toLowerCase().slice(0, 200);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.json({ ok: false, error: 'Email no válido' });
  const lead = {
    email,
    origen: String(b.origen || 'carta-rapida').slice(0, 60),
    restaurante: String(b.restaurante || '').slice(0, 120),
    estilo: ESTILOS.includes(b.estilo) ? b.estilo : '',
    platos: Number.isFinite(+b.platos) ? +b.platos : 0,
    novedades: b.novedades === true,
    fecha: new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })
  };
  enviarLead(lead);
  res.json({ ok: true });
});

app.get('/salud', (req, res) => res.json({ ok: true, modelo: MODELO, pagos: MODO_DEMO ? 'demo' : (process.env.STRIPE_SECRET_KEY ? 'stripe' : 'desactivado'), cuentas: CUENTAS_ACTIVAS, datos: persistente ? 'volumen' : 'temporal', listmonk: LISTMONK_ACTIVO, analitica: !!GA4 }));

// Configuración pública para la web (analítica solo si está configurada; se carga tras el consentimiento)
const GA4 = /^G-[A-Z0-9]{4,20}$/.test(process.env.GA4_ID || '') ? process.env.GA4_ID : '';
app.get('/config', (req, res) => res.set('Cache-Control', 'public, max-age=300').json({ ga4: GA4 }));

// Errores de subida (archivo demasiado grande, etc.)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Cada foto puede pesar como máximo 12 MB.' : 'No hemos podido recibir los archivos.';
    return res.status(400).json({ ok: false, error: msg });
  }
  if (err && err.type === 'entity.too.large') return res.status(413).json({ ok: false, error: 'El archivo es demasiado grande.' });
  console.error('[SERVIDOR] error:', err && err.message);
  res.status(500).json({ ok: false, error: 'Error inesperado. Inténtalo de nuevo.' });
});

const PORT = process.env.PORT || 3000;
const servidor = app.listen(PORT, () => console.log(`Servidor funcionando en puerto ${PORT} · modelo ${MODELO}`));

async function apagar() {
  servidor.close();
  await cerrar();
  process.exit(0);
}
process.on('SIGTERM', apagar);
process.on('SIGINT', apagar);
