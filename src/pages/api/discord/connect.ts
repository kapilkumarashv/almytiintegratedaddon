// pages/api/discord/connect.ts
import { NextApiRequest, NextApiResponse } from "next";

/**
 * DISCORD PERMISSIONS CALCULATOR:
 * We need: 
 * - View Channels (1024)
 * - Send Messages (2048)
 * - Read Message History (65536)
 * - Manage Messages [for Pinning] (8192)
 * - Kick Members (2)
 * * Total Integer: 76738
 * (Or use "8" for Administrator if you want full access for testing)
 */
const DISCORD_PERMISSIONS = "8"; 

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Get credentials from .env
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return res.status(500).json({ 
      error: "Discord Configuration Missing", 
      details: "Ensure DISCORD_CLIENT_ID and DISCORD_REDIRECT_URI are set in .env" 
    });
  }

  // 2. Define Scopes
  // 'bot' -> adds the bot user to the server
  // 'identify' -> allows us to see the user's Discord name/ID
  // 'applications.commands' -> allows the bot to use slash commands (optional but good)
  const scopes = encodeURIComponent("bot identify applications.commands");

  // 3. Construct the Authorization URL
  // response_type=code -> Starts the OAuth2 flow
  const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${scopes}&permissions=${DISCORD_PERMISSIONS}`;

  /**
   * 4. Redirect the User
   * This takes the user to the Discord "Add to Server" screen.
   * After they click 'Authorize', they will be sent to your /api/discord/callback
   */
  res.redirect(discordUrl);
}