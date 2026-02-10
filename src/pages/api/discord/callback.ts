// pages/api/discord/callback.ts
import { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Extract the data sent by Discord
  // guild_id is the unique ID of the server the bot joined
  const { code, guild_id, error } = req.query;

  // Handle if the user clicked 'Cancel'
  if (error) {
    console.warn("Discord Authorization Error:", error);
    return res.redirect("/dashboard?error=discord_cancelled");
  }

  if (!code) {
    return res.status(400).json({ error: "Missing authorization code" });
  }

  try {
    // 2. Exchange the temporary 'code' for a User Access Token
    // We do this to verify who the user is and finalize the link
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: "authorization_code",
      code: code.toString(),
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    });

    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      params,
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }
    );

    const { access_token } = tokenResponse.data;

    // 3. (Optional) Get the User's Discord Profile Info
    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    
    const discordUser = userResponse.data;

    /* ==============================================================
       ✅ DATABASE SYNC: 
       This is where you save the connection.
       You now have:
       - guild_id: The Server ID (e.g. "116451...")
       - discordUser.id: The ID of the person who added it
       
       Example (Update your DB logic here):
       await db.user.update({
         where: { id: CURRENT_USER_ID },
         data: { discordGuildId: guild_id }
       });
       ============================================================== */

    console.log(`✅ Server ${guild_id} linked by user ${discordUser.username}`);

    // 4. Send the user back to your Dashboard
    // We pass success=true so you can show a "Connected!" notification
   res.redirect(`/?discord_success=true&guild_id=${guild_id}`);

  } catch (err: any) {
    console.error("Discord Callback Error:", err.response?.data || err.message);
    
    // Fallback error redirect
    res.redirect("/dashboard?error=discord_connection_failed");
  }
}