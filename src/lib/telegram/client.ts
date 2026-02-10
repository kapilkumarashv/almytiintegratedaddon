import 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import { TelegramMessage, TelegramUpdate, TelegramUser } from '../types';

const BASE_URL = 'https://api.telegram.org/bot';
const MEMORY_FILE = path.join(process.cwd(), 'telegram_chats.json');

/* ===================== 🧠 MEMORY SYSTEM (The Phonebook) ===================== */

interface SavedChat {
  id: number;
  type: string;
  title?: string;
  username?: string;
  lastSeen: string;
}

// Helper: Load memory from JSON file
function loadMemory(): Record<string, SavedChat> {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("⚠️ Failed to load Telegram memory:", e);
  }
  return {};
}

// Helper: Save memory to JSON file
function saveMemory(data: Record<string, SavedChat>) {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("⚠️ Failed to save Telegram memory:", e);
  }
}

// Helper: Find Chat ID by Name (Case-insensitive)
function findChatIdByName(name: string): string | null {
  // If it's already a number, return it directly
  if (/^-?\d+$/.test(name)) return name;

  const memory = loadMemory();
  const lowerName = name.toLowerCase().trim();

  const match = Object.values(memory).find(chat => 
    (chat.title && chat.title.toLowerCase().includes(lowerName)) || 
    (chat.username && chat.username.toLowerCase().includes(lowerName))
  );

  return match ? match.id.toString() : null;
}

/* ===================== HELPER: TOKEN CLEANER ===================== */
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

/* ===================== FETCH MESSAGES (With Memory Learning) ===================== */
export async function getTelegramUpdates(token: string, limit: number = 10): Promise<TelegramMessage[]> {
  try {
    const cleanToken = sanitizeToken(token);
    const url = `${BASE_URL}${cleanToken}/getUpdates`;
    
    // Fetch generic updates
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: 100,
        allowed_updates: ['message', 'channel_post', 'edited_message']
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);

    const updates = data.result; // Use 'any' here to allow flexible parsing for memory

    // 🧠 SMART LEARN: Save every chat we see to memory
    const memory = loadMemory();
    let newChatsFound = false;

    updates.forEach((u: any) => {
      const msg = u.message || u.channel_post || u.edited_message;
      if (!msg || !msg.chat) return;

      const chat = msg.chat;
      const chatId = chat.id.toString();

      // Update memory if new or info changed
      if (!memory[chatId] || memory[chatId].title !== chat.title) {
        memory[chatId] = {
          id: chat.id,
          type: chat.type,
          title: chat.title || chat.first_name || 'Unknown',
          username: chat.username,
          lastSeen: new Date().toISOString()
        };
        console.log(`✅ Learned Telegram Chat: "${memory[chatId].title}" (ID: ${chatId})`);
        newChatsFound = true;
      }
    });

    if (newChatsFound) saveMemory(memory);

    // Filter and return messages as before
    const messages = updates
      .filter((u: any) => (u.message && u.message.text) || (u.channel_post && u.channel_post.text))
      .map((u: any) => (u.message || u.channel_post) as TelegramMessage)
      .reverse(); 

    return messages.slice(0, limit);
  } catch (error) {
    console.error('Error fetching Telegram updates:', error);
    return [];
  }
}

/* ===================== SEND MESSAGE (Smart Name Resolution) ===================== */
export async function sendTelegramMessage(token: string, chatIdOrName: string | number, text: string): Promise<TelegramMessage> {
  const targetId = findChatIdByName(chatIdOrName.toString());

  if (!targetId) {
    throw new Error(`❌ I don't know a group named "${chatIdOrName}". Please send a message in that group first so I can learn it.`);
  }

  return await telegramRequest<TelegramMessage>(token, 'sendMessage', {
    chat_id: targetId,
    text: text,
    parse_mode: 'Markdown' 
  });
}

/* ===================== GROUP MANAGEMENT (Smart Name Resolution) ===================== */

export async function kickChatMember(token: string, chatIdOrName: string | number, userId: number): Promise<boolean> {
  const targetId = findChatIdByName(chatIdOrName.toString());
  if (!targetId) throw new Error(`❌ Unknown group "${chatIdOrName}"`);

  return await telegramRequest<boolean>(token, 'banChatMember', {
    chat_id: targetId,
    user_id: userId
  });
}

export async function pinChatMessage(token: string, chatIdOrName: string | number, messageId: number): Promise<boolean> {
  const targetId = findChatIdByName(chatIdOrName.toString());
  if (!targetId) throw new Error(`❌ Unknown group "${chatIdOrName}"`);

  return await telegramRequest<boolean>(token, 'pinChatMessage', {
    chat_id: targetId,
    message_id: messageId
  });
}

export async function setChatTitle(token: string, chatIdOrName: string | number, title: string): Promise<boolean> {
  const targetId = findChatIdByName(chatIdOrName.toString());
  if (!targetId) throw new Error(`❌ Unknown group "${chatIdOrName}"`);

  return await telegramRequest<boolean>(token, 'setChatTitle', {
    chat_id: targetId,
    title: title
  });
}