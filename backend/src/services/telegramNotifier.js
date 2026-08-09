import dotenv from 'dotenv';
dotenv.config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

/**
 * Envía una notificación de alerta con formato HTML al chat de Telegram configurado
 * @param {string} text - El mensaje formateado en HTML para Telegram
 * @returns {Promise<boolean>} - true si se envió con éxito, false en caso contrario
 */
export async function sendTelegramAlert(text) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error('[Telegram Notifier] Error: TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID no están configurados en el archivo .env');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML'
      })
    });

    const result = await response.json();
    if (result.ok) {
      console.log(`[Telegram Notifier] Alerta enviada con éxito (ID: ${result.result.message_id})`);
      return true;
    } else {
      console.error('[Telegram Notifier] Error de la API de Telegram:', result.description);
      return false;
    }
  } catch (err) {
    console.error('[Telegram Notifier] Excepción al enviar alerta:', err.message);
    return false;
  }
}
