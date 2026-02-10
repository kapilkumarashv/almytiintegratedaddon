"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { meet } from "@googleworkspace/meet-addons/meet.addons";

// Helper type to get the session type automatically
type AddonSession = Awaited<ReturnType<typeof meet.addon.createAddonSession>>;

export default function Home() {
  const [status, setStatus] = useState("Initializing Add-on...");
  
  // FIX: Replaced <any> with the actual inferred type <AddonSession | null>
  const [session, setSession] = useState<AddonSession | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const newSession = await meet.addon.createAddonSession({
          cloudProjectNumber: "897893086910", // Your Project Number
        });

        await newSession.createSidePanelClient();

        setSession(newSession);
        setStatus("Connected to Meet ✅");
      } catch (error: unknown) {
        console.error("Meet Add-on Error:", error);
        setStatus("Connection Failed ❌");
      }
    }

    init();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-zinc-950 selection:bg-indigo-500/30">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[120px] rounded-full" />

      <main className="relative flex flex-col items-center justify-center p-8 sm:p-20 z-10 w-full max-w-md">
        <div className="flex flex-col items-center gap-8 text-center">
          
          {/* Logo Section */}
          <div className="relative w-24 h-24 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl flex items-center justify-center border border-zinc-200 dark:border-zinc-800">
             <Image 
               src="/globe.svg" 
               alt="App Logo"
               width={50}
               height={50}
               className="dark:invert opacity-80"
             />
          </div>

          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 dark:from-indigo-400 dark:to-cyan-400">
              Hello World
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 text-lg leading-relaxed">
              Testing the add-on feature in GMeet with updated code.
            </p>
            
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <span className={`w-2 h-2 rounded-full mr-2 ${status.includes("Connected") ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                {status}
              </span>
            </div>
          </div>

          <button 
            className="group relative px-8 py-3 w-full rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 hover:scale-[1.02] transition-all duration-200 ease-out active:scale-95"
            onClick={() => alert("AI Agent Clicked!")}
          >
            Ask AI Help
            <div className="absolute inset-0 rounded-xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all" />
          </button>

        </div>
      </main>
    </div>
  );
}