import { App } from '@slack/bolt';

// Cache to store App instances per token (prevents creating a new connection for every request)
const appCache: Record<string, App> = {};

/**
 * 🔌 GET APP: Creates or retrieves an App instance for a specific User Token
 * @param token The Slack Access Token (xoxb-...) for a specific customer
 */
export async function getSlackApp(token: string) {
  // 1. If we already have an instance for this token, return it
  if (appCache[token]) return appCache[token];

  // 2. Otherwise, create a new instance
  const app = new App({
    token: token,
    // Signing secret is required by Bolt but not used for these REST API calls
    signingSecret: process.env.SLACK_SIGNING_SECRET || "invalid_secret_placeholder", 
    // ⚠️ Disable Socket Mode for OAuth apps (they use Webhooks usually, or just REST API)
    socketMode: false, 
  });

  // 3. Save to cache
  appCache[token] = app;
  return app;
}

/**
 * 📥 FETCH: Read the last X messages from a specific channel using a USER TOKEN
 * @param token The User's Slack Token
 * @param channelName The name of the channel (e.g. "general")
 * @param limit Number of messages to fetch
 */
export async function getSlackHistory(token: string, channelName: string, limit: number = 10) {
  const app = await getSlackApp(token);
  
  const cleanName = channelName.replace(/^#/, '');

  try {
    // 1. Find Channel ID from Name
    const list = await app.client.conversations.list({ 
      types: 'public_channel,private_channel',
      limit: 1000 
    });

    const channel = list.channels?.find(c => c.name === cleanName);

    if (!channel || !channel.id) {
      throw new Error(`Could not find channel "#${cleanName}". Make sure the bot is invited.`);
    }

    // 2. Fetch History
    const result = await app.client.conversations.history({
      channel: channel.id,
      limit: limit,
    });

    if (!result.messages) return [];

    // 3. Format nicely
    return result.messages.map(m => ({
      user: m.user || 'Unknown',
      text: m.text || '',
      ts: m.ts
    })).reverse();
    
  } catch (error: any) {
    console.error(`Slack Read Error (#${cleanName}): ${error.message}`);
    throw new Error(`Failed to read #${cleanName}: ${error.message}`);
  }
}

/**
 * 📤 SEND: Post a message using a USER TOKEN
 * @param token The User's Slack Token
 * @param channelName The name of the channel
 * @param text The message content
 */
export async function sendSlackMessage(token: string, channelName: string, text: string) {
  const app = await getSlackApp(token);
  const cleanName = channelName.replace(/^#/, '');

  try {
    // 1. Find Channel ID
    const list = await app.client.conversations.list({ 
      types: 'public_channel,private_channel',
      limit: 1000 
    });
    
    const channel = list.channels?.find(c => c.name === cleanName);

    if (!channel || !channel.id) {
      throw new Error(`Could not find channel "#${cleanName}". Make sure the bot is invited.`);
    }

    // 2. Post Message
    await app.client.chat.postMessage({
      channel: channel.id,
      text: text,
    });

    console.log(`✅ Sent message to #${cleanName} using user token`);
    return channel.name;

  } catch (error: any) {
    console.error(`Slack Send Error (#${cleanName}): ${error.message}`);
    throw new Error(`Failed to send to #${cleanName}: ${error.message}`);
  }
}