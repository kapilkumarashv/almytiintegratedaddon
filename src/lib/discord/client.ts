import { Client, GatewayIntentBits, Partials, TextChannel, ChannelType } from 'discord.js';

// 1. Initialize the internal Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required to see servers
    GatewayIntentBits.GuildMessages,    // Required to see messages
    GatewayIntentBits.MessageContent,   // Required to READ message text
    GatewayIntentBits.GuildMembers,     // Required to KICK/BAN users
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
 * ✅ NEW HELPER: Find the best channel to talk in
 * Prioritizes: System Channel -> #general -> Any visible text channel
 */
async function getDefaultChannel(guildId: string): Promise<TextChannel> {
  // Ensure the bot is ready before fetching
  if (!client.isReady()) {
      throw new Error("Discord client is not ready. Try again in a moment.");
  }

  const guild = await client.guilds.fetch(guildId);
  if (!guild) throw new Error("Server not found. Please reconnect Discord.");

  // 1. Try the "System Channel" (Default welcome channel)
  if (guild.systemChannel && guild.systemChannel.isTextBased()) {
    return guild.systemChannel as TextChannel;
  }

  // 2. Fallback: Find the first channel named "general"
  const general = guild.channels.cache.find(
    c => c.name === 'general' && c.type === ChannelType.GuildText
  );
  if (general) return general as TextChannel;

  // 3. Fallback: Find ANY text channel the bot can see
  const anyChannel = guild.channels.cache.find(
    c => c.type === ChannelType.GuildText && c.viewable
  );
  
  if (!anyChannel) throw new Error("No text channels found in this server.");
  return anyChannel as TextChannel;
}

/**
 * ✅ UPDATED: Fetches recent messages from the default channel
 * Now accepts 'guildId' instead of 'channelId'
 */
export async function getDiscordMessages(guildId: string, limit: number = 10) {
  const channel = await getDefaultChannel(guildId);

  const messages = await channel.messages.fetch({ limit });
  return messages.map(m => ({
    id: m.id,
    author: m.author.username,
    content: m.content,
    timestamp: m.createdAt,
    isBot: m.author.bot
  }));
}

/**
 * ✅ UPDATED: Sends a message to the default channel
 * Now accepts 'guildId' instead of 'channelId'
 */
export async function sendDiscordMessage(guildId: string, text: string) {
  const channel = await getDefaultChannel(guildId);
  await channel.send(text);
  return channel.name; // Return channel name so we can tell the user where we sent it
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