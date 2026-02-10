"use client";

import { useState, useEffect } from 'react';
import ChatBox from '@/components/ChatBox';
import ConnectorCard from '@/components/ConnectorCard';
import styles from './page.module.css';
import { GoogleTokens, ShopifyCredentials, MicrosoftTokens } from '@/lib/types';

// ✅ 1. IMPORT MEET SDK
import { meet } from "@googleworkspace/meet-addons/meet.addons";

// ✅ 2. DEFINE SESSION TYPE
type AddonSession = Awaited<ReturnType<typeof meet.addon.createAddonSession>>;

export default function Home() {
  // --- Existing State ---
  const [googleTokens, setGoogleTokens] = useState<GoogleTokens | null>(null);
  const [shopifyConfig, setShopifyConfig] = useState<ShopifyCredentials | null>(null);
  const [microsoftTokens, setMicrosoftTokens] = useState<MicrosoftTokens | null>(null);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [discordGuildId, setDiscordGuildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string>('');

  // ✅ 3. NEW MEET STATE
  const [meetSession, setMeetSession] = useState<AddonSession | null>(null);
  const [meetStatus, setMeetStatus] = useState("Initializing...");

  // ✅ 4. MEET HANDSHAKE (The Key logic)
  useEffect(() => {
    async function initMeet() {
      try {
        const newSession = await meet.addon.createAddonSession({
          cloudProjectNumber: "897893086910", // Your Project Number
        });
        
        // This tells Google Meet "I have loaded successfully"
        await newSession.createSidePanelClient();

        setMeetSession(newSession);
        setMeetStatus("Meet Connected ✅");
      } catch (error: unknown) {
        console.error("Meet Add-on Error:", error);
        setMeetStatus("Meet Error ❌");
      }
    }
    initMeet();
  }, []);

  // --- Existing Auth Logic ---
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleTokensParam = urlParams.get('google_tokens');
    const microsoftTokensParam = urlParams.get('microsoft_tokens');
    const discordSuccess = urlParams.get('discord_success');
    const guildId = urlParams.get('guild_id');
    const error = urlParams.get('error');

    if (googleTokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(googleTokensParam)) as GoogleTokens;
        setGoogleTokens(tokens);
        showNotification('Google connected successfully!');
      } catch (err) { console.error(err); }
    }

    if (microsoftTokensParam) {
      try {
        const tokens = JSON.parse(decodeURIComponent(microsoftTokensParam)) as MicrosoftTokens;
        setMicrosoftTokens(tokens);
        showNotification('Microsoft Teams connected successfully!');
      } catch (err) { console.error(err); }
    }

    if (discordSuccess === 'true' && guildId) {
      setDiscordGuildId(guildId);
      showNotification('Discord Server linked successfully!');
    }

    if (error) {
      showNotification('Authentication failed');
    }

    if (googleTokensParam || microsoftTokensParam || discordSuccess || error) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(''), 3000);
  };

  /* ----------------- HANDLERS ----------------- */

  const handleGoogleConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/google/auth');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      showNotification('Failed to initiate Google connection');
      setLoading(false);
    }
  };

  const handleMicrosoftConnect = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/microsoft/auth');
      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      showNotification('Failed to initiate Microsoft connection');
      setLoading(false);
    }
  };

  const handleDiscordConnect = () => {
    setLoading(true);
    window.location.href = '/api/discord/connect';
  };

  const handleShopifyConnect = async (data: { storeUrl: string; accessToken: string }) => {
    setLoading(true);
    try {
      const response = await fetch('/api/shopify/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok && result.config) {
        setShopifyConfig(result.config);
        showNotification('Shopify connected successfully!');
      } else {
        showNotification(result.error || 'Failed to connect Shopify');
      }
    } catch (error) {
      showNotification('Failed to connect Shopify');
    } finally { setLoading(false); }
  };

  const handleTelegramConnect = async (data: any) => {
    if (data.botToken) {
      setTelegramToken(data.botToken);
      showNotification('Telegram Bot connected!');
    } else {
      showNotification('Invalid Telegram Token');
    }
  };

  return (
    <div className={styles.container}>
      {notification && <div className={styles.notification}>{notification}</div>}

      <header className={styles.header}>
        <h1 className={styles.title}>🤖 AI Agent Dashboard</h1>
        <p className={styles.subtitle}>Connect your services and let AI help you</p>
        
        {/* ✅ SMALL MEET STATUS INDICATOR */}
        <div style={{ fontSize: '0.75rem', marginTop: '5px', opacity: 0.7 }}>
             Status: {meetStatus}
        </div>
      </header>

      <div className={styles.content}>
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Connected Services</h2>
          <div className={styles.connectors}>
            
            <ConnectorCard
              title="Google"
              description="Access Classroom, Forms, Meet, Gmail, Drive, etc."
              icon="📧"
              connected={!!googleTokens}
              onConnect={handleGoogleConnect}
            />

            <ConnectorCard
              title="Microsoft 365"
              description="Access Teams, Outlook, OneDrive, Word & Excel"
              icon="🟦"
              connected={!!microsoftTokens}
              onConnect={handleMicrosoftConnect}
            />

            <ConnectorCard
              title="Discord"
              description="Connect your server to manage members & chat"
              icon="👾"
              connected={!!discordGuildId}
              onConnect={handleDiscordConnect}
            />

            <ConnectorCard
              title="Shopify"
              description="Manage your store and orders"
              icon="🛍️"
              connected={!!shopifyConfig}
              onConnect={() => {}}
              requiresInput={true}
              serviceType="shopify"
              onInputSubmit={handleShopifyConnect}
            />

            <ConnectorCard
              title="Telegram Bot"
              description="Manage groups & read messages"
              icon="✈️"
              connected={!!telegramToken}
              onConnect={() => {}}
              requiresInput={true}
              serviceType="telegram"
              onInputSubmit={handleTelegramConnect}
            />

          </div>
        </aside>

        <main className={styles.main}>
          <ChatBox 
            googleTokens={googleTokens}
            shopifyConfig={shopifyConfig}
            microsoftTokens={microsoftTokens}
            telegramToken={telegramToken}
            userGuildId={discordGuildId}
          />
        </main>
      </div>
    </div>
  );
}