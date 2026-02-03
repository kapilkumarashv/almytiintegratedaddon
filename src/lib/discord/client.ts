// src/lib/discord/client.ts
import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';

// 1. Initialize the internal Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required to see servers
    GatewayIntentBits.GuildMessages,    // Required to see messages
    GatewayIntentBits.MessageContent,   // Required to READ message text
    GatewayIntentBits.GuildMembers,    // Required to KICK/BAN users
  ],
  partials: [Partials.Channel, Partials.Message]
});

let isReady = false;

/**
 * Logs the bot into Discord using the Token from .env
 */
export const initDiscord = async (token: string) => {
  if (isReady) return client;
  if (!token) throw new Error("Missing Discord Token");

  try {
    await client.login(token);
    return new Promise((resolve) => {
      client.once('ready', () => {
        console.log(`🤖 Discord Bot Logged In: ${client.user?.tag}`);
        isReady = true;
        resolve(client);
      });
    });
  } catch (error) {
    console.error("Discord Login Failed:", error);
    throw error;
  }
};

/**
 * Fetches recent messages from a specific channel
 */
export async function getDiscordMessages(channelId: string, limit: number = 10) {
  const channel = await client.channels.fetch(channelId);
  if (!channel || !channel.isTextBased()) {
    throw new Error("Channel not found or is not text-based.");
  }

  const messages = await (channel as TextChannel).messages.fetch({ limit });
  return messages.map(m => ({
    id: m.id,
    author: m.author.username,
    content: m.content,
    timestamp: m.createdAt,
    isBot: m.author.bot
  }));
}

/**
 * Sends a plain text message to a channel
 */
export async function sendDiscordMessage(channelId: string, text: string) {
  const channel = await client.channels.fetch(channelId);
  if (channel && channel.isTextBased()) {
    await (channel as TextChannel).send(text);
    return true;
  }
  return false;
}

/**
 * Kicks a user from a specific server (Guild)
 */
export async function kickDiscordUser(guildId: string, userId: string) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);
  if (member && member.kickable) {
    await member.kick("Kicked by AI Agent");
    return true;
  }
  throw new Error("User not found or bot lacks permission to kick them.");
}