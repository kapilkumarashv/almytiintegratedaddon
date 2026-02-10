import fs from 'fs';
import path from 'path';

// Define where the tokens will be stored
const TOKEN_FILE = path.join(process.cwd(), 'slack_tokens.json');

// Interface for the token data structure
export interface SlackUserToken {
  userId: string;       // Your app's user ID (e.g. 'user_123' or 'default_user')
  teamName: string;     // Slack Workspace Name
  teamId: string;       // Slack Workspace ID (e.g. T12345)
  accessToken: string;  // The OAuth Access Token (xoxb-...)
  botUserId: string;    // The Bot's User ID in that workspace
}

/**
 * Save a Slack token to the local JSON file.
 * Acts as a simple database "Upsert" (Update or Insert).
 */
export function saveSlackToken(tokenData: SlackUserToken) {
  let db: Record<string, SlackUserToken> = {};
  
  // 1. Load existing database if file exists
  if (fs.existsSync(TOKEN_FILE)) {
    try {
      const fileContent = fs.readFileSync(TOKEN_FILE, 'utf-8');
      db = JSON.parse(fileContent);
    } catch (e) {
      console.error("❌ Error reading slack_tokens.json:", e);
      // If error, we start with an empty db to avoid crashing
      db = {};
    }
  }

  // 2. Update the database (Key = userId)
  // This overwrites any existing token for this user
  db[tokenData.userId] = tokenData;
  
  // 3. Write back to file
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(db, null, 2));
    console.log(`✅ Saved Slack token for User: ${tokenData.userId} (Team: ${tokenData.teamName})`);
  } catch (e) {
    console.error("❌ Error writing to slack_tokens.json:", e);
    throw new Error("Failed to save Slack token.");
  }
}

/**
 * Retrieve the Slack Access Token for a specific user.
 * @param userId The ID of the user in your application
 * @returns The Access Token string (xoxb-...) or null if not found
 */
export function getSlackToken(userId: string): string | null {
  if (!fs.existsSync(TOKEN_FILE)) {
    console.warn(`⚠️ Slack token file not found at: ${TOKEN_FILE}`);
    return null;
  }
  
  try {
    const fileContent = fs.readFileSync(TOKEN_FILE, 'utf-8');
    const db: Record<string, SlackUserToken> = JSON.parse(fileContent);
    
    const userData = db[userId];
    
    if (!userData) {
      console.warn(`⚠️ No Slack token found for user: ${userId}`);
      return null;
    }

    return userData.accessToken;
  } catch (e) {
    console.error("❌ Error reading Slack token DB:", e);
    return null;
  }
}

/**
 * (Optional) Retrieve full token data if you need Team ID or Bot ID later
 */
export function getSlackTokenData(userId: string): SlackUserToken | null {
  if (!fs.existsSync(TOKEN_FILE)) return null;
  
  try {
    const db = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf-8'));
    return db[userId] || null;
  } catch {
    return null;
  }
}