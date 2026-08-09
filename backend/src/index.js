import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/api.js';
import { startGpsIngestion } from './services/gpsIngestor.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '200mb' }));

// Servir Rutas de la API
app.use('/api', apiRouter);

// Middleware de manejo de errores (debe ir después de las rutas)
app.use((err, req, res, next) => {
  console.error('[Backend Error]', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Ruta de Salud básica
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`=================================================`);
  console.log(` Servidor Backend de SILVIA corriendo en el puerto ${port}`);
  console.log(` URL de API: http://localhost:${port}/api`);
  console.log(`=================================================`);
  
  // Iniciar la ingesta/simulación de coordenadas de GPS cada 60s (con recarga automática)
  startGpsIngestion();

  // Programador automático para el Cierre de Día a las 8:00 PM (Hora de Lima, Perú)
  setupAutomaticCloseDay(port);

  // Configurar Webhook de Telegram
  setupTelegramWebhook();
});

async function setupTelegramWebhook() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const publicUrl = process.env.SERVER_PUBLIC_URL;
  if (!token) {
    console.log('[Telegram Webhook] Omitiendo registro de webhook: No se configuró TELEGRAM_BOT_TOKEN.');
    return;
  }
  if (!publicUrl) {
    console.log('[Telegram Webhook] SERVER_PUBLIC_URL no definida en .env. Activando Long Polling local para pruebas...');
    startTelegramLongPolling();
    return;
  }

  try {
    const webhookUrl = `${publicUrl.replace(/\/$/, '')}/api/telegram-webhook`;
    console.log(`[Telegram Webhook] Registrando webhook en Telegram: ${webhookUrl}`);
    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    const data = await response.json();
    if (data.ok) {
      console.log(`[Telegram Webhook] Webhook registrado exitosamente:`, data.description);
    } else {
      console.error(`[Telegram Webhook] Error al registrar webhook:`, data.description);
    }
  } catch (err) {
    console.error('[Telegram Webhook] Excepción al configurar webhook:', err.message);
  }
}

async function startTelegramLongPolling() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  
  try {
    // Eliminar el webhook de Telegram para habilitar getUpdates
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    console.log('[Telegram Long Polling] Webhook eliminado. Iniciando polling cada 3 segundos...');
  } catch (err) {
    console.error('[Telegram Long Polling] Error eliminando webhook anterior:', err.message);
  }

  let offset = 0;
  
  // Realizar polling de actualizaciones en segundo plano
  setInterval(async () => {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=5`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.ok && data.result && data.result.length > 0) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message && update.message.text) {
            const chatId = update.message.chat.id;
            const text = update.message.text;
            
            // Procesar el mensaje con el agente
            import('./services/telegramAgent.js').then(agent => {
              agent.processTelegramMessage(chatId, text);
            }).catch(err => {
              console.error('[Telegram Long Polling processing error]:', err);
            });
          }
        }
      }
    } catch (err) {
      // Ignorar excepciones de polling (ej: caídas temporales de red)
    }
  }, 3000);
}

function setupAutomaticCloseDay(serverPort) {
  const getLimaDateString = () => {
    const options = { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' };
    const formatter = new Intl.DateTimeFormat('en-CA', options); // Formato YYYY-MM-DD
    return formatter.format(new Date());
  };

  const getLimaHourAndMinute = () => {
    const options = { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('es-PE', options);
    const timeStr = formatter.format(new Date());
    const parts = timeStr.split(':');
    return {
      hour: parseInt(parts[0], 10),
      minute: parseInt(parts[1], 10)
    };
  };

  let lastClosedDate = '';

  console.log('[Auto Close Day] Scheduler inicializado para ejecutarse a las 8:00 PM (Lima).');

  setInterval(async () => {
    try {
      const { hour, minute } = getLimaHourAndMinute();
      
      // Ejecutar exactamente a las 8:00 PM (20:00)
      if (hour === 20 && minute === 0) {
        const limaDate = getLimaDateString();
        if (lastClosedDate !== limaDate) {
          console.log(`[Auto Close Day] Iniciando cierre automático para la fecha: ${limaDate}`);
          
          const response = await fetch(`http://localhost:${serverPort}/api/planning/close-day`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: limaDate })
          });
          const data = await response.json();
          if (data.success) {
            lastClosedDate = limaDate;
            console.log(`[Auto Close Day] Cierre de día completado con éxito: ${data.message}`);
          } else {
            console.error(`[Auto Close Day] Falló el cierre de día automático:`, data.error);
          }
        }
      }
    } catch (err) {
      console.error('[Auto Close Day] Error en validador automático:', err);
    }
  }, 30000); // Comprobar cada 30 segundos
}

