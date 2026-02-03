import 'isomorphic-fetch';
import { TelegramMessage, TelegramUpdate, TelegramUser } from '../types';

const BASE_URL = 'https://api.telegram.org/bot';

/* ===================== HELPER: TOKEN CLEANER ===================== */
/**
 * Handles common paste errors like "bot 1234..." or leading/trailing spaces.
 */
function sanitizeToken(token: string): string {
  return token.replace(/^bot\s+/i, '').trim();
}

/* ===================== HELPER: API CALLER ===================== */
async function telegramRequest<T>(token: string, method: string, body?: any): Promise<T> {
  const cleanToken = sanitizeToken(token);
  if (!cleanToken) throw new Error('Telegram Bot Token is missing.');

  const url = `${BASE_URL}${cleanToken}/${method}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });

  const data = await response.json();
  
  if (!data.ok) {
    // Specific error mapping for user clarity
    if (data.error_code === 401) throw new Error('❌ Invalid Telegram Token.');
    if (data.error_code === 403) throw new Error('❌ Bot lacks permissions (Must be Admin for this action).');
    throw new Error(`Telegram API Error: ${data.description}`);
  }
  
  return data.result as T;
}

/* ===================== CONNECT / VERIFY ===================== */
export async function getMe(token: string): Promise<TelegramUser> {
  return await telegramRequest<TelegramUser>(token, 'getMe');
}

/* ===================== FETCH MESSAGES ===================== */
/**
 * Fetches recent updates. Supports Private, Group, and Channel posts.
 */
export async function getTelegramUpdates(token: string, limit: number = 10): Promise<TelegramMessage[]> {
  try {
    const cleanToken = token.replace(/^bot\s+/i, '').trim();
    const url = `https://api.telegram.org/bot${cleanToken}/getUpdates`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 100,
        // ✅ Ensure we ask for both standard messages and channel posts
        allowed_updates: ['message', 'channel_post']
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);

    const updates: TelegramUpdate[] = data.result;

    // ✅ Combine results: Use 'message' OR 'channel_post'
    const messages = updates
      .filter(u => (u.message && u.message.text) || (u.channel_post && u.channel_post.text))
      .map(u => (u.message || u.channel_post) as TelegramMessage)
      .reverse(); 

    return messages.slice(0, limit);
  } catch (error) {
    console.error('Error fetching Telegram updates:', error);
    return [];
  }
}
/* ===================== SEND MESSAGE ===================== */
export async function sendTelegramMessage(token: string, chatId: string | number, text: string): Promise<TelegramMessage> {
  return await telegramRequest<TelegramMessage>(token, 'sendMessage', {
    chat_id: chatId,
    text: text,
    parse_mode: 'Markdown' 
  });
}

/* ===================== GROUP MANAGEMENT ===================== */
export async function kickChatMember(token: string, chatId: string | number, userId: number): Promise<boolean> {
  return await telegramRequest<boolean>(token, 'banChatMember', {
    chat_id: chatId,
    user_id: userId
  });
}

export async function pinChatMessage(token: string, chatId: string | number, messageId: number): Promise<boolean> {
  return await telegramRequest<boolean>(token, 'pinChatMessage', {
    chat_id: chatId,
    message_id: messageId
  });
}

export async function setChatTitle(token: string, chatId: string | number, title: string): Promise<boolean> {
  return await telegramRequest<boolean>(token, 'setChatTitle', {
    chat_id: chatId,
    title: title
  });
}