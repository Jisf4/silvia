import { VertexAI } from '@google-cloud/vertexai';
import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT || 'project-silvia-500416';
const datasetId = process.env.BQ_DATASET || 'silvia_dataset';

const bigquery = new BigQuery({ projectId });
const vertexAI = new VertexAI({ projectId, location: 'us-central1' });

// Cache de sesión en memoria
const sessionCache = {};

// Helper: Ejecutar query de BigQuery
async function runQuery(sql) {
  try {
    const formattedSql = sql.replaceAll('silvia_dataset', datasetId);
    const [rows] = await bigquery.query({ query: formattedSql });
    return rows;
  } catch (error) {
    console.error('[Telegram Agent BigQuery Error]:', error.message);
    return null;
  }
}

// Cargar prompt.txt
function getSystemPrompt() {
  try {
    // 1. Buscar en el directorio docs del contenedor (/app/docs/prompt.txt)
    let promptPath = path.join(process.cwd(), 'docs', 'prompt.txt');
    
    // 2. Si no existe, buscar en la ruta absoluta local
    if (!fs.existsSync(promptPath)) {
      promptPath = '/home/josue/Documents/SILVIA/docs/prompt.txt';
    }
    
    // 3. Fallback: buscar relativo a la carpeta raíz del proyecto local
    if (!fs.existsSync(promptPath)) {
      promptPath = path.join(process.cwd(), '..', 'docs', 'prompt.txt');
    }
    
    return fs.readFileSync(promptPath, 'utf8');
  } catch (err) {
    console.error('[Telegram Agent] Error al leer prompt.txt:', err.message);
    return 'Eres SILVIA, un asistente inteligente de flota y operaciones. Tienes acceso a BigQuery y debes generar consultas SQL exactas usando la herramienta execute_sql.';
  }
}

export async function processTelegramMessage(chatId, messageText) {
  try {
    const systemInstruction = getSystemPrompt();

    // Inicializar modelo con herramientas
    const model = 'gemini-2.5-flash';
    const generativeModel = vertexAI.getGenerativeModel({
      model,
      systemInstruction,
      tools: [
        {
          functionDeclarations: [
            {
              name: 'execute_sql',
              description: 'Genera y ejecuta consultas SQL en BigQuery para responder preguntas sobre la flota y operaciones.',
              parameters: {
                type: 'OBJECT',
                properties: {
                  sql: {
                    type: 'STRING',
                    description: 'La consulta SQL exacta a ejecutar en BigQuery.'
                  }
                },
                required: ['sql']
              }
            }
          ]
        }
      ]
    });

    // Obtener o inicializar historial de chat para esta sesión
    if (!sessionCache[chatId]) {
      sessionCache[chatId] = [];
    }
    
    // Mantener historial de máximo 20 interacciones
    if (sessionCache[chatId].length > 20) {
      sessionCache[chatId] = sessionCache[chatId].slice(-20);
    }

    const chat = generativeModel.startChat({
      history: sessionCache[chatId]
    });

    console.log(`[Telegram Agent] Enviando mensaje a Gemini de ChatID ${chatId}: "${messageText}"`);
    let result = await chat.sendMessage(messageText);

    // Bucle para procesar llamadas a funciones si Gemini decide usarlas
    let response = result.response;
    let functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);

    while (functionCalls && functionCalls.length > 0) {
      const functionCall = functionCalls[0].functionCall;
      if (functionCall.name === 'execute_sql') {
        const sql = functionCall.args.sql;
        console.log(`[Telegram Agent] Gemini solicitó ejecutar SQL:\n${sql}`);
        
        const queryResults = await runQuery(sql);
        console.log(`[Telegram Agent] BigQuery retornó ${queryResults ? queryResults.length : 0} filas.`);

        // Enviar respuesta de la función a Gemini
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: 'execute_sql',
              response: {
                result: queryResults || []
              }
            }
          }
        ]);
        response = result.response;
        functionCalls = response.candidates?.[0]?.content?.parts?.filter(p => p.functionCall);
      } else {
        break;
      }
    }

    // Actualizar historial local de la sesión
    sessionCache[chatId] = await chat.getHistory();

    const finalAnswer = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude procesar tu solicitud.';
    console.log(`[Telegram Agent] Respuesta final de Gemini: "${finalAnswer.substring(0, 100)}..."`);
    
    // Responder de vuelta a Telegram usando nuestro helper directo
    await sendTelegramMessageDirect(chatId, finalAnswer);

  } catch (err) {
    console.error('[Telegram Agent] Error procesando mensaje de Telegram:', err);
    await sendTelegramMessageDirect(chatId, `⚠️ Lo siento, ocurrió un error interno al procesar tu solicitud: ${err.message}`);
  }
}

// Helper para enviar mensaje directo al chatId emisor
async function sendTelegramMessageDirect(chatId, text) {
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    console.warn('[Telegram Agent] No se puede enviar la respuesta: TELEGRAM_BOT_TOKEN no está definido en las variables de entorno de la nube.');
    return;
  }
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  
  let retries = 3;
  while (retries > 0) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });
      const resJson = await response.json();
      if (resJson.ok) {
        return;
      } else {
        console.warn('[Telegram Agent] Error al enviar mensaje con Markdown, reintentando como texto plano:', resJson.description);
        // Reintentar sin parse_mode si falla por formateo incorrecto de Markdown
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: text
          })
        });
        return;
      }
    } catch (err) {
      retries--;
      console.warn(`[Telegram Agent] Error de conexión al enviar mensaje (${err.message}). Reintentos restantes: ${retries}`);
      if (retries === 0) {
        console.error('[Telegram Agent] Se agotaron los reintentos para enviar mensaje direct:', err.message);
      } else {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Esperar 2 segundos antes del reintento
      }
    }
  }
}
