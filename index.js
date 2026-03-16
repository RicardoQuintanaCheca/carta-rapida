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

const IDIOMAS = {
  en: 'English',
  fr: 'French',
  de: 'German',
  it: 'Italian',
  pt: 'Portuguese',
  zh: 'Chinese'
};

const PROMPT_BASE = `Eres un experto en diseño de cartas de restaurante, psicología del consumidor y neuromarketing gastronómico. Tu misión es reorganizar y mejorar la carta para maximizar las ventas del restaurante.

INSTRUCCIÓN MÁS IMPORTANTE: NO OMITAS NINGÚN PLATO, SECCIÓN NI ELEMENTO DE LA CARTA. Es preferible tardar más tiempo en analizar que saltarse cualquier contenido. Revisa cada imagen con máximo detalle antes de responder.

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

INSTRUCCIÓN MÁS IMPORTANTE: NO OMITAS NINGÚN PLATO, SECCIÓN NI ELEMENTO DE LA CARTA.

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

INSTRUCCIÓN MÁS IMPORTANTE: NO OMITAS NINGÚN PLATO, SECCIÓN NI ELEMENTO DE LA CARTA.

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

INSTRUCCIÓN MÁS IMPORTANTE: NO OMITAS NINGÚN PLATO.

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
- For well-known Spanish dishes with no direct translation (paella, jamón ibérico, gazpacho, tortilla, croquetas, fabada, cocido), keep the Spanish name but add a brief description in ${nombreIdioma} if there is no description already
- For dishes that have a standard translation in ${nombreIdioma}, use the correct culinary term

DO NOT TRANSLATE:
- Prices and quantities (numbers)
- Indicators like (V), (VG)
- Abbreviations like SPM
- The restaurant name

IMPORTANT: Every dish name and section name MUST be in ${nombreIdioma}. If you leave any text in Spanish, that is an error.`;
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

app.post('/procesar', upload.any(), async (req, res) => {
  try {
    const textoManual = req.body.texto || '';
    const conDescripciones = req.body.descripciones === 'si';
    const conNeuro = req.body.neuromarketing !== 'no';
    const idioma = req.body.idioma || 'es';
    const conTraduccion = idioma !== 'es';

    let PROMPT = getPrompt(conDescripciones, conNeuro);
    if (conTraduccion) {
      PROMPT += getInstruccionTraduccion(idioma);
    }

    console.log(`Modo: desc=${conDescripciones} neuro=${conNeuro} idioma=${idioma}`);

    const todosLosArchivos = (req.files || []);
    const fotos = todosLosArchivos.filter(f => f.fieldname.startsWith('foto'));
    const logoFile = todosLosArchivos.find(f => f.fieldname === 'logo');

    let logoBase64 = null;
    let logoMime = null;
    if (logoFile) {
      if (logoFile.mimetype === 'application/pdf') {
        fs.unlinkSync(logoFile.path);
        return res.json({
          ok: false,
          error: 'El logotipo debe ser una imagen JPG o PNG.'
        });
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
        content.push({
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64}` }
        });
      });

      const textoPrompt = fotos.length > 1
        ? `${PROMPT}\n\nThis menu has ${fotos.length} pages. Analyze ALL images in maximum detail. Do not omit any dish from any page. Unify everything into a single ordered JSON.`
        : PROMPT;

      content.push({ type: 'text', text: textoPrompt });
      messages = [{ role: 'user', content }];

    } else if (textoManual) {
      messages = [{
        role: 'user',
        content: PROMPT + '\n\nMenu:\n' + textoManual
      }];
    } else {
      return res.json({ ok: false, error: 'No se recibió imagen ni texto' });
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 8000,
      messages
    });

    const texto = response.choices[0].message.content;
    console.log('RESPUESTA IA (primeros 300 chars):', texto.substring(0, 300));

    const json = limpiarYParsearJSON(texto);

    res.json({
      ok: true,
      carta: json,
      logo: logoBase64 ? `data:${logoMime};base64,${logoBase64}` : null
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    res.json({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor funcionando en puerto ${PORT}`);
});