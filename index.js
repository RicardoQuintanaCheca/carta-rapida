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

const PROMPT_BASE = `Eres un experto en diseño de cartas de restaurante, psicología del consumidor y neuromarketing gastronómico. Tu misión es reorganizar y mejorar la carta para maximizar las ventas del restaurante.

INSTRUCCIÓN MÁS IMPORTANTE: NO OMITAS NINGÚN PLATO, SECCIÓN NI ELEMENTO DE LA CARTA. Es preferible tardar más tiempo en analizar que saltarse cualquier contenido. Revisa cada imagen con máximo detalle antes de responder.

ORDEN LÓGICO DE SECCIONES (aplica siempre este orden, independientemente del orden en que aparezcan en las imágenes):
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

Si una sección no existe en la carta, no la incluyas. Si hay secciones que no encajan claramente, colócalas donde tenga más sentido gastronómicamente.

NEUROMARKETING — APLICA ESTAS TÉCNICAS:
- Coloca los platos más rentables (precio medio-alto) en las primeras posiciones de cada sección
- Si hay un plato estrella o especial de la casa, ponlo el primero de su sección
- Platos con "por encargo" o disponibilidad limitada van al final de su sección
- No reordenes por precio de menor a mayor

REGLAS DE PRECIOS:
- Elimina siempre el símbolo €. Solo el número: "16" no "16€"
- Conserva decimales reales con punto: "16.5" no "16,50"
- Elimina ceros finales innecesarios: "16" no "16.00", "16.5" no "16.50"
- Conserva precios por unidad: "5/u"
- Conserva precios por kilo: "84/k"
- Conserva precios dobles media/entera: "9 | 16"
- Si el precio es SPM o consultar, conserva "SPM"
- Si no hay precio, deja el campo vacío ""

REGLAS DE NOMBRES:
- Respeta el nombre original exactamente
- Corrige errores ortográficos evidentes
- Conserva indicadores: (V), (VG)
- Conserva pesos y cantidades: (80g), (6 uds), (por encargo), (2 pax)

REGLAS DE DESCRIPCIONES:
- SOLO puedes usar texto que aparezca literalmente en la carta original
- Si hay texto descriptivo bajo el nombre del plato en la carta, cópialo exactamente
- Si no hay descripción en la carta, el campo debe ser siempre ""
- NUNCA escribas nada que no esté copiado literalmente de la carta
- NUNCA resumas, reescribas ni parafrasees — copia literal o deja vacío

REGLAS DE ALÉRGENOS:
- Si aparecen, consérvelos sin la palabra "Alérgenos:"
- Formato: "Gluten, lácteos, huevo"
- Si no hay, deja vacío ""

NOTAS AL PIE:
- Si aparece IVA incluido, notas legales, notas comerciales o cualquier texto que no sea un plato, ponlo en "nota_pie"

NOMBRE DEL RESTAURANTE:
- Solo ponlo si aparece claramente en la carta
- Si no aparece, deja el campo vacío ""

NUNCA:
- No inventes platos, precios ni descripciones
- No añadas el símbolo € en ningún caso
- No omitas ningún plato, sección ni nota aunque parezca secundaria

CRÍTICO — FORMATO DE RESPUESTA:
- Devuelve ÚNICAMENTE el JSON
- Sin texto antes ni después
- Sin comillas de bloque tipo \`\`\`
- Sin comentarios dentro del JSON
- Todos los campos de texto deben usar comillas dobles
- Las comillas dentro de los valores deben escaparse así: \\"
- El JSON debe ser válido y parseable directamente

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

const PROMPT_DESCRIPCIONES = `Eres un experto en diseño de cartas de restaurante, psicología del consumidor y neuromarketing gastronómico. Tu misión es reorganizar y mejorar la carta para maximizar las ventas del restaurante, y redactar descripciones atractivas para cada plato.

INSTRUCCIÓN MÁS IMPORTANTE: NO OMITAS NINGÚN PLATO, SECCIÓN NI ELEMENTO DE LA CARTA. Es preferible tardar más tiempo en analizar que saltarse cualquier contenido. Revisa cada imagen con máximo detalle antes de responder.

ORDEN LÓGICO DE SECCIONES (aplica siempre este orden, independientemente del orden en que aparezcan en las imágenes):
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

Si una sección no existe en la carta, no la incluyas. Si hay secciones que no encajan claramente, colócalas donde tenga más sentido gastronómicamente.

NEUROMARKETING — APLICA ESTAS TÉCNICAS:
- Coloca los platos más rentables (precio medio-alto) en las primeras posiciones de cada sección
- Si hay un plato estrella o especial de la casa, ponlo el primero de su sección
- Platos con "por encargo" o disponibilidad limitada van al final de su sección
- No reordenes por precio de menor a mayor

REGLAS DE PRECIOS:
- Elimina siempre el símbolo €. Solo el número: "16" no "16€"
- Conserva decimales reales con punto: "16.5" no "16,50"
- Elimina ceros finales innecesarios: "16" no "16.00", "16.5" no "16.50"
- Conserva precios por unidad: "5/u"
- Conserva precios por kilo: "84/k"
- Conserva precios dobles media/entera: "9 | 16"
- Si el precio es SPM o consultar, conserva "SPM"
- Si no hay precio, deja el campo vacío ""

REGLAS DE NOMBRES:
- Respeta el nombre original exactamente
- Corrige errores ortográficos evidentes
- Conserva indicadores: (V), (VG)
- Conserva pesos y cantidades: (80g), (6 uds), (por encargo), (2 pax)

REGLAS DE DESCRIPCIONES — MODO CREATIVO ACTIVADO:
Tu objetivo es que cada plato tenga una descripción que despierte el apetito y ayude a vender.

PASO 1 — Si el plato ya tiene descripción escrita en la carta original:
- Cópiala exactamente, sin cambiar ni una palabra

PASO 2 — Si el plato NO tiene descripción en la carta:
- Escribe una descripción corta, elegante y apetecible de máximo 1 línea
- Usa tu conocimiento gastronómico para describir el plato de forma honesta y atractiva
- Puedes usar adjetivos sensoriales apropiados para el tipo de plato
- El tono debe ser elegante, como en un restaurante de nivel medio-alto
- NUNCA menciones ingredientes que contradigan el nombre del plato
- NUNCA hagas afirmaciones que no puedas sostener como "el mejor de Madrid", "único en España"
- Para platos muy simples como "Ración de pan" o bebidas: descripción vacía ""

EJEMPLOS DE BUEN ESTILO para guiarte:
- "Calamares fritos" → "Calamares en su punto, dorados y crujientes"
- "Jamón ibérico" → "Finas lonchas de jamón ibérico, listas para degustar"
- "Tarta de queso" → "Cremosa tarta de queso al horno, con base crujiente"
- "Croquetas caseras" → "Croquetas de elaboración propia, cremosas por dentro"
- "Arroz con leche" → "Arroz con leche cremoso, aromatizado con canela"
- "Gamoneo del Valle" → "Queso asturiano de pasta azul, sabor intenso y profundo"

REGLAS ABSOLUTAS:
- Máximo 1 línea por descripción
- Tono elegante, neutro, sin exageraciones
- Bebidas, pan y extras: descripción siempre vacía ""

REGLAS DE ALÉRGENOS:
- Si aparecen, consérvelos sin la palabra "Alérgenos:"
- Formato: "Gluten, lácteos, huevo"
- Si no hay, deja vacío ""

NOTAS AL PIE:
- Si aparece IVA incluido, notas legales, notas comerciales o cualquier texto que no sea un plato, ponlo en "nota_pie"

NOMBRE DEL RESTAURANTE:
- Solo ponlo si aparece claramente en la carta
- Si no aparece, deja el campo vacío ""

NUNCA:
- No inventes platos ni precios
- No añadas el símbolo € en ningún caso
- No omitas ningún plato, sección ni nota aunque parezca secundaria

CRÍTICO — FORMATO DE RESPUESTA:
- Devuelve ÚNICAMENTE el JSON
- Sin texto antes ni después
- Sin comillas de bloque tipo \`\`\`
- Sin comentarios dentro del JSON
- Todos los campos de texto deben usar comillas dobles
- Las comillas dentro de los valores deben escaparse así: \\"
- El JSON debe ser válido y parseable directamente

{"nombre_restaurante":"","idioma":"es","nota_pie":"","secciones":[{"nombre":"","platos":[{"nombre":"","descripcion":"","precio":"","alergenos":""}]}]}`;

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
    const PROMPT = conDescripciones ? PROMPT_DESCRIPCIONES : PROMPT_BASE;

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
          error: 'El logotipo debe ser una imagen JPG o PNG. Si solo tienes PDF, haz una captura de pantalla del logo y súbela como imagen.'
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
        ? `${PROMPT}\n\nEsta carta tiene ${fotos.length} páginas. Analiza TODAS las imágenes con máximo detalle. No omitas ningún plato de ninguna página. Unifica todo en un único JSON ordenado.`
        : PROMPT;

      content.push({ type: 'text', text: textoPrompt });
      messages = [{ role: 'user', content }];

    } else if (textoManual) {
      messages = [{
        role: 'user',
        content: PROMPT + '\n\nCarta:\n' + textoManual
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
    console.log('Modo descripciones:', conDescripciones ? 'ACTIVADO' : 'desactivado');

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