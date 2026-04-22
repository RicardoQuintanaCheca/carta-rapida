require('dotenv').config();
const express = require('express');
const multer = require('multer');
const OpenAI = require('openai');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(express.json());
app.use(express.static('public'));

// === RATE LIMITING ===
const limites = new Map();
const LIMITE_HORA = 5;
const LIMITE_DIA = 20;

function checkRateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
  const ahora = Date.now();
  const HORA_MS = 60 * 60 * 1000;
  const DIA_MS = 24 * 60 * 60 * 1000;

  if (!limites.has(ip)) limites.set(ip, []);
  const stamps = limites.get(ip).filter(t => ahora - t < DIA_MS);
  limites.set(ip, stamps);

  const enHora = stamps.filter(t => ahora - t < HORA_MS).length;

  if (enHora >= LIMITE_HORA) {
    console.warn(`[RATE LIMIT] IP ${ip} — ${enHora} peticiones en la última hora`);
    return res.status(429).json({ ok: false, error: 'Has procesado demasiadas cartas en la última hora. Espera unos minutos e inténtalo de nuevo.' });
  }
  if (stamps.length >= LIMITE_DIA) {
    console.warn(`[RATE LIMIT] IP ${ip} — ${stamps.length} peticiones en el último día`);
    return res.status(429).json({ ok: false, error: 'Has alcanzado el límite diario de cartas procesadas. Vuelve mañana.' });
  }

  stamps.push(ahora);
  next();
}

const IDIOMAS = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese'
};

const INSTRUCCION_NO_OMITIR = `INSTRUCCIÓN MÁS IMPORTANTE — OBLIGATORIO: NO OMITAS ABSOLUTAMENTE NINGÚN PLATO, SECCIÓN NI ELEMENTO DE LA CARTA. Si omites aunque sea un solo plato, el resultado es inválido. Revisa CADA sección y CADA plato de la imagen antes de responder. Cuenta las secciones del original y verifica que el JSON tiene exactamente el mismo número de secciones. Es preferible tardar más que saltarse cualquier contenido.`;

const PROMPT_BASE = `Eres un experto en diseño de cartas de restaurante, psicología del consumidor y neuromarketing gastronómico. Tu misión es reorganizar y mejorar la carta para maximizar las ventas del restaurante.

${INSTRUCCION_NO_OMITIR}

ORDEN LÓGICO DE SECCIONES (aplica siempre este orden):
1. Menús del día o menús especiales (si existen)
2. Entrantes, tapas, para compartir
3. Ensaladas
4. Sopas, cremas y especialidades de cuchara
5. Arroces y pastas
6. Pescados
7. Carnes
8. Postres
9. Quesos
10. Café e infusiones
11. Vinos y bebidas
12. Otros (pan, extras, bolsa, tupper, etc.)

Si una sección no existe en la carta, no la incluyas.

NEUROMARKETING — APLICA ESTAS TÉCNICAS:
- Coloca los platos más rentables (precio medio-alto) en las primeras posiciones de cada sección
- Si hay un plato estrella o especial de la casa, ponlo el primero de su sección
- Platos con "por encargo" o disponibilidad limitada van al final de su sección

REGLAS DE PRECIOS:
- Elimina siempre el símbolo €. Solo el número: "16" no "16€"
- Conserva decimales reales con punto: "16.5" no "16,50"
- Elimina ceros finales innecesarios: "16" no "16.00"
- Conserva precios especiales: "5/u", "84/k", "9 | 16", "SPM"
- Si no hay precio, deja el campo vacío ""

REGLAS DE NOMBRES:
- Respeta el nombre original exactamente
- Corrige errores ortográficos evidentes
- Conserva indicadores: (V), (VG), (80g), (6 uds), (por encargo), (2 pax)

REGLAS DE DESCRIPCIONES:
- SOLO puedes usar texto que aparezca literalmente en la carta original
- Si hay texto descriptivo bajo el nombre del plato, cópialo exactamente
- Si no hay descripción, deja vacío ""

REGLAS DE ALÉRGENOS:
- Si aparecen, consérvelos sin la palabra "Alérgenos:"
- Formato: "Gluten, lácteos, huevo"
- Si no hay, deja vacío ""

NOTAS AL PIE: textos legales o comerciales van en "nota_pie"
NOMBRE DEL RESTAURANTE: solo si aparece claramente, si no deja vacío ""

NUNCA: no inventes platos, precios ni descripciones. No añadas €.

CRÍTICO — FORMATO:
- Devuelve ÚNICAMENTE el JSON válido
- Sin texto antes ni después, sin comillas de bloque

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

const PROMPT_BASE_SIN_NEURO = `Eres un experto en diseño de cartas de restaurante. Tu misión es digitalizar y mejorar el formato de la carta respetando el orden original.

${INSTRUCCION_NO_OMITIR}

ORDEN LÓGICO DE SECCIONES (aplica siempre este orden):
1. Menús del día o menús especiales
2. Entrantes, tapas, para compartir
3. Ensaladas
4. Sopas, cremas y especialidades de cuchara
5. Arroces y pastas
6. Pescados
7. Carnes
8. Postres
9. Quesos
10. Café e infusiones
11. Vinos y bebidas
12. Otros

ORDEN DE PLATOS: respeta EXACTAMENTE el orden original. NO reordenes.

REGLAS DE PRECIOS: elimina €, decimales con punto, sin ceros finales, sin precio = ""
REGLAS DE NOMBRES: respeta exactamente, corrige errores evidentes
REGLAS DE DESCRIPCIONES: copia literal si existe, si no deja ""
REGLAS DE ALÉRGENOS: sin "Alérgenos:", si no hay deja ""
NOTAS AL PIE: textos legales en "nota_pie"
NOMBRE DEL RESTAURANTE: solo si aparece claramente

NUNCA inventes nada. CRÍTICO: devuelve ÚNICAMENTE JSON válido.

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

const PROMPT_DESCRIPCIONES = `Eres un experto en diseño de cartas de restaurante, psicología del consumidor y neuromarketing gastronómico. Tu misión es reorganizar la carta y redactar descripciones atractivas para cada plato.

${INSTRUCCION_NO_OMITIR}

ORDEN LÓGICO DE SECCIONES:
1. Menús especiales, 2. Entrantes/tapas, 3. Ensaladas, 4. Sopas/cuchara, 5. Arroces/pastas, 6. Pescados, 7. Carnes, 8. Postres, 9. Quesos, 10. Café, 11. Bebidas, 12. Otros

NEUROMARKETING: platos más rentables primero, plato estrella al inicio, "por encargo" al final.

REGLAS DE PRECIOS: elimina €, decimales con punto, sin ceros finales.
REGLAS DE NOMBRES: respeta exactamente, corrige errores evidentes.

REGLAS DE DESCRIPCIONES:
- Si tiene descripción en la carta: cópiala exactamente
- Si NO tiene: escribe 1 línea elegante, tono hostelería premium
- Bebidas, pan, extras: descripción siempre vacía ""
- NUNCA menciones ingredientes que contradigan el nombre

EJEMPLOS DE ESTILO HOSTELERÍA:
- "Calamares fritos" → "Calamares en su punto, dorados y crujientes"
- "Jamón ibérico" → "Finas lonchas de jamón ibérico, listas para degustar"
- "Tarta de queso" → "Cremosa tarta de queso al horno, con base crujiente"
- "Pulpo a la brasa" → "Pulpo tierno cocinado sobre brasas, con pimentón de la Vera"
- "Tartar de atún" → "Dados de atún rojo aliñados al momento, servidos fríos"

REGLAS DE ALÉRGENOS: sin "Alérgenos:", si no hay deja ""
NOTAS AL PIE: textos legales en "nota_pie"
NOMBRE DEL RESTAURANTE: solo si aparece claramente

CRÍTICO: devuelve ÚNICAMENTE JSON válido.

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

const PROMPT_DESCRIPCIONES_SIN_NEURO = `Eres un experto en diseño de cartas de restaurante. Digitaliza la carta respetando el orden original y añade descripciones atractivas.

${INSTRUCCION_NO_OMITIR}

ORDEN DE SECCIONES: menús especiales, entrantes, ensaladas, sopas, arroces/pastas, pescados, carnes, postres, quesos, café, bebidas, otros.
ORDEN DE PLATOS: respeta EXACTAMENTE el orden original, NO reordenes.

REGLAS DE PRECIOS: elimina €, decimales con punto, sin ceros finales.
REGLAS DE NOMBRES: respeta exactamente.

REGLAS DE DESCRIPCIONES:
- Si tiene: cópiala exactamente
- Si no tiene: 1 línea elegante, tono hostelería premium
- Bebidas/pan/extras: vacío ""

REGLAS DE ALÉRGENOS: sin "Alérgenos:", vacío si no hay.
NOTAS AL PIE: en "nota_pie". NOMBRE: solo si aparece.

CRÍTICO: ÚNICAMENTE JSON válido.

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

function getPrompt(conDescripciones, conNeuro) {
  if (conDescripciones && conNeuro) return PROMPT_DESCRIPCIONES;
  if (conDescripciones && !conNeuro) return PROMPT_DESCRIPCIONES_SIN_NEURO;
  if (!conDescripciones && conNeuro) return PROMPT_BASE;
  return PROMPT_BASE_SIN_NEURO;
}

function getInstruccionEstilo(estilo) {
  if (estilo === 'gourmet') return `

ESTILO DE CARTA: GOURMET
- Tono elegante, refinado y gastronómico. Alta cocina española.
- CRÍTICO: Respeta EXACTAMENTE los nombres de secciones que aparecen en la carta original. NO los cambies ni los traduzcas bajo ningún concepto.
- CRÍTICO: NO OMITAS ABSOLUTAMENTE NINGÚN PLATO NI SECCIÓN. Cada sección y cada plato del original debe aparecer en el resultado sin excepción.
- Descripciones elegantes y precisas que transmitan calidad
- Tono sofisticado pero accesible, evocador sin ser recargado
- Nota al pie discreta si corresponde`;

  if (estilo === 'minimalista') return `

ESTILO DE CARTA: MINIMALISTA
- CRÍTICO: Respeta EXACTAMENTE los nombres de secciones que aparecen en la carta original. NO los cambies ni los traduzcas bajo ningún concepto.
- CRÍTICO: NO OMITAS ABSOLUTAMENTE NINGÚN PLATO NI SECCIÓN. Cada sección y cada plato del original debe aparecer en el resultado sin excepción.
- Descripciones de máximo 5 palabras o vacías — solo si aportan información esencial
- Sin notas al pie salvo obligación legal
- Sin adjetivos innecesarios. Tono seco, preciso y contemporáneo.
- El nombre del plato debe bastarse solo siempre que sea posible.`;

  return `

ESTILO DE CARTA: CLÁSICO
- Tono elegante, formal y profesional. Alta hostelería española.
- CRÍTICO: Respeta EXACTAMENTE los nombres de secciones que aparecen en la carta original. NO los cambies.
- CRÍTICO: NO OMITAS NINGÚN PLATO NI SECCIÓN. Cada sección y cada plato del original debe aparecer en el resultado.
- Descripciones elegantes con terminología de hostelería tradicional
- Transmite calidad, tradición y cuidado en cada detalle
- Nota al pie formal y discreta si corresponde`;
}

function getInstruccionTraduccion(codigoIdioma) {
  const nombreIdioma = IDIOMAS[codigoIdioma] || codigoIdioma;
  return `

TRANSLATION INSTRUCTION — CRITICAL:
You must translate the ENTIRE menu into ${nombreIdioma}. This is mandatory.

TRANSLATE EVERYTHING:
- ALL dish names (every single one, no exceptions)
- ALL descriptions
- ALL section names
- The "nota_pie" field
- Set the "idioma" field to "${codigoIdioma}"

TRANSLATION STYLE — HOSPITALITY PROFESSIONAL:
- Use professional hospitality terminology in ${nombreIdioma}
- Maintain the elegant and appetizing tone of a premium restaurant
- For well-known Spanish dishes with no direct translation, keep the Spanish name but add a brief description in ${nombreIdioma}
- For dishes that have a standard translation, use the correct culinary term

DO NOT TRANSLATE: prices, quantities, (V), (VG), SPM, restaurant name.

IMPORTANT: Every dish name and section name MUST be in ${nombreIdioma}.`;
}

function limpiarYParsearJSON(texto) {
  let limpio = texto
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();

  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio !== -1 && fin !== -1 && fin > inicio) {
    limpio = limpio.substring(inicio, fin + 1);
  }

  try {
    return JSON.parse(limpio);
  } catch (e1) {
    try {
      limpio = limpio
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");
      return JSON.parse(limpio);
    } catch (e2) {
      console.error('JSON inválido recibido de la IA:');
      console.error(limpio.substring(0, 500));
      throw new Error('La IA devolvió un formato inesperado. Inténtalo de nuevo.');
    }
  }
}

app.post('/procesar', checkRateLimit, upload.any(), async (req, res) => {
  try {
    const textoManual = req.body.texto || '';
    const conDescripciones = req.body.descripciones === 'si';
    const conNeuro = req.body.neuromarketing !== 'no';
    const idioma = req.body.idioma || 'es';
    const conTraduccion = idioma !== 'es';
    const estilo = req.body.estilo || 'clasico';

    let PROMPT = getPrompt(conDescripciones, conNeuro);
    PROMPT += getInstruccionEstilo(estilo);
    if (conTraduccion) PROMPT += getInstruccionTraduccion(idioma);

    console.log(`Modo: desc=${conDescripciones} neuro=${conNeuro} idioma=${idioma} estilo=${estilo}`);

    const todosLosArchivos = (req.files || []);
    const fotos = todosLosArchivos.filter(f => f.fieldname.startsWith('foto'));
    const logoFile = todosLosArchivos.find(f => f.fieldname === 'logo');

    let logoBase64 = null;
    let logoMime = null;
    if (logoFile) {
      if (logoFile.mimetype === 'application/pdf') {
        fs.unlinkSync(logoFile.path);
        return res.json({ ok: false, error: 'El logotipo debe ser una imagen JPG o PNG.' });
      }
      const logoBuffer = fs.readFileSync(logoFile.path);
      fs.unlinkSync(logoFile.path);
      logoBase64 = logoBuffer.toString('base64');
      logoMime = logoFile.mimetype;
    }

    let messages;

    if (fotos.length > 0) {
      const content = [];
      fotos.forEach(foto => {
        const imageData = fs.readFileSync(foto.path);
        const base64 = imageData.toString('base64');
        const mimeType = foto.mimetype;
        fs.unlinkSync(foto.path);
        content.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } });
      });

      const textoPrompt = fotos.length > 1
        ? `${PROMPT}\n\nEsta carta tiene ${fotos.length} páginas. Analiza TODAS las imágenes. No omitas ningún plato. Unifica todo en un único JSON.`
        : PROMPT;

      content.push({ type: 'text', text: textoPrompt });
      messages = [{ role: 'user', content }];

    } else if (textoManual) {
      messages = [{ role: 'user', content: PROMPT + '\n\nCarta:\n' + textoManual }];
    } else {
      return res.json({ ok: false, error: 'No se recibió imagen ni texto' });
    }

    const response = await openai.chat.completions.create({ model: 'gpt-4o', max_tokens: 8000, messages });
    const texto = response.choices[0].message.content;
    console.log('RESPUESTA IA:', texto.substring(0, 300));
    const json = limpiarYParsearJSON(texto);

    res.json({ ok: true, carta: json, logo: logoBase64 ? `data:${logoMime};base64,${logoBase64}` : null });

  } catch (error) {
    console.error('ERROR:', error.message);
    let mensajeError = error.message;
    if (mensajeError.includes('unsupported image') || mensajeError.includes('image_parse_error')) {
      mensajeError = 'Formato de imagen no compatible. Por favor, usa JPG, PNG o WEBP.';
    }
    res.json({ ok: false, error: mensajeError });
  }
});

app.post('/rehacer', async (req, res) => {
  try {
    const { carta, ajuste } = req.body;
    if (!carta || !ajuste) return res.json({ ok: false, error: 'Faltan datos' });

    const prompt = `Eres un experto en diseño de cartas de restaurante. Tienes una carta ya procesada en formato JSON y el cliente quiere hacer un ajuste específico.

CARTA ACTUAL EN JSON:
${JSON.stringify(carta, null, 2)}

AJUSTE SOLICITADO POR EL CLIENTE:
"${ajuste}"

INSTRUCCIONES:
- Aplica EXACTAMENTE el ajuste solicitado
- No cambies nada que no haya pedido el cliente
- Conserva todos los platos, precios y descripciones tal como están, salvo lo que el ajuste indique
- Si pide traducir, traduce todo con terminología profesional de hostelería
- Si pide cambiar el orden, reordena según lo indicado
- Si pide añadir o cambiar algo concreto, hazlo con precisión
- NUNCA omitas platos — todos los platos deben aparecer en el resultado
- Devuelve ÚNICAMENTE el JSON corregido, sin texto adicional, sin comillas de bloque

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }]
    });

    const texto = response.choices[0].message.content;
    console.log('REHACER IA:', texto.substring(0, 300));
    const json = limpiarYParsearJSON(texto);

    res.json({ ok: true, carta: json });

  } catch (error) {
    console.error('ERROR REHACER:', error.message);
    res.json({ ok: false, error: error.message });
  }
});

app.post('/guardar-email', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.json({ ok: false, error: 'Email no válido' });
    }
    const fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    console.log(`LEAD: ${email} | ${fecha}`);
    res.json({ ok: true });
  } catch (error) {
    console.error('ERROR EMAIL:', error.message);
    res.json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});