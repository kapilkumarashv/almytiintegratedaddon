import { NextApiRequest, NextApiResponse } from 'next';
// Adjust the import path if your folder structure is different
import { saveSlackToken } from '../../../../lib/slack/storage';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. Get the code and state (userId) from the URL
  const { code, state, error } = req.query;

  // Handle User Cancellation or Errors
  if (error) {
    console.error('Slack OAuth Error:', error);
    return res.redirect('/?slack_connected=false&error=' + error);
  }

  if (!code) {
    return res.status(400).send('Error: Missing code from Slack.');
  }

  try {
    console.log('🔄 Exchanging Slack code for token...');

    // 2. Exchange Code for Access Token
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,     // From .env
        client_secret: process.env.SLACK_CLIENT_SECRET!, // From .env
        code: code as string,
        // ⚠️ This URL must match EXACTLY what you set in the Slack Dashboard
        redirect_uri: 'http://localhost:3000/api/auth/slack/callback', 
      }),
    });

    const data = await response.json();

    // 3. Handle Slack API Errors
    if (!data.ok) {
      console.error('Slack API Error:', data);
      return res.status(500).json({ error: data.error });
    }

    // 4. Identify the User
    // 'state' is passed from the frontend button. If missing, we use 'default_user'.
    const userId = (state as string) || 'default_user'; 

    // 5. Save the Token to your JSON file (or DB)
    saveSlackToken({
      userId: userId,
      teamName: data.team.name,
      teamId: data.team.id,
      accessToken: data.access_token,
      botUserId: data.bot_user_id,
    });

    // 6. Success! Redirect user back to the homepage
    console.log(`✅ Successfully connected Slack for ${data.team.name}`);
    res.redirect('/?slack_connected=true');

  } catch (err: any) {
    console.error('Callback Failed:', err);
    res.status(500).send('Authentication failed: ' + err.message);
  }
}