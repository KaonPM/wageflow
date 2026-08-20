"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { supabase } from "@/app/lib/supabaseClient";

type OneSignalSdk = {
  init: (options: Record<string, unknown>) => Promise<void>;
  login: (externalId: string) => Promise<void>;
  logout: () => Promise<void>;
};

declare global {
  interface Window { OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void>; }
}

const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "3a95bd72-096e-4295-b39b-cdd0ef5814d3";

function enqueue(callback: (sdk: OneSignalSdk) => void) {
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(callback);
}

export function OneSignalIdentity() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!appId || !ready) return;
    const syncIdentity = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      enqueue((oneSignal) => user ? void oneSignal.login(user.id) : void oneSignal.logout());
    };
    void syncIdentity();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => { void syncIdentity(); });
    return () => subscription.subscription.unsubscribe();
  }, [ready]);

  if (!appId) return null;
  return <Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" onReady={() => {
    enqueue(async (oneSignal) => {
      await oneSignal.init({ appId, allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== "production" });
      setReady(true);
    });
  }} />;
}
