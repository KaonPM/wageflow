"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Script from "next/script";
import { supabase } from "@/app/lib/supabaseClient";

type SubscriptionState = "loading" | "off" | "on" | "blocked" | "unsupported" | "unavailable" | "error";
type PushSubscription = { id: string | null; token: string | null; optedIn: boolean; optIn: () => Promise<void>; addEventListener: (event: "change", listener: () => void) => void; removeEventListener: (event: "change", listener: () => void) => void };
type OneSignalSdk = { init: (options: Record<string, unknown>) => Promise<void>; login: (externalId: string) => Promise<void>; logout: () => Promise<void>; Notifications: { isPushSupported: () => boolean; requestPermission: () => Promise<void>; permission: boolean; addEventListener: (event: "permissionChange", listener: () => void) => void; removeEventListener: (event: "permissionChange", listener: () => void) => void }; User: { externalId: string | null; PushSubscription: PushSubscription } };
type OneSignalContextValue = { state: SubscriptionState; enable: () => Promise<void>; ready: boolean };

declare global { interface Window { OneSignalDeferred?: Array<(sdk: OneSignalSdk) => void>; __wageFlowOneSignalInitialised?: boolean; } }

const OneSignalContext = createContext<OneSignalContextValue>({ state: "unavailable", enable: async () => undefined, ready: false });
const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID || "3a95bd72-096e-4295-b39b-cdd0ef5814d3";

function logDiagnostics(label: string, sdk: OneSignalSdk | null, externalId?: string | null) {
  if (process.env.NODE_ENV !== "development") return;
  const push = sdk?.User.PushSubscription;
  console.info("WageFlow OneSignal", { label, notificationPermission: typeof Notification === "undefined" ? "unsupported" : Notification.permission, initialised: Boolean(sdk), optedIn: push?.optedIn ?? false, subscriptionId: push?.id ?? null, externalId: externalId ?? sdk?.User.externalId ?? null });
}

export function OneSignalProvider({ children }: { children: ReactNode }) {
  const sdkRef = useRef<OneSignalSdk | null>(null);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SubscriptionState>("loading");

  const refresh = useCallback((sdk = sdkRef.current) => {
    if (!sdk) { setState("unavailable"); return; }
    if (!sdk.Notifications.isPushSupported()) { setState("unsupported"); logDiagnostics("unsupported", sdk); return; }
    const permission = typeof Notification === "undefined" ? "default" : Notification.permission;
    const push = sdk.User.PushSubscription;
    if (permission === "denied") setState("blocked");
    else if (push.optedIn && Boolean(push.id) && Boolean(push.token)) setState("on");
    else setState("off");
    logDiagnostics("subscription-state", sdk);
  }, []);

  const syncIdentity = useCallback(async (sdk = sdkRef.current) => {
    if (!sdk) return;
    const { data: { user } } = await supabase.auth.getUser();
    try {
      if (user) await sdk.login(user.id);
      else await sdk.logout();
      logDiagnostics(user ? "identity-linked" : "identity-cleared", sdk, user?.id);
      refresh(sdk);
    } catch (error) {
      console.error("WageFlow OneSignal identity sync failed", error);
      setState("error");
    }
  }, [refresh]);

  useEffect(() => {
    if (!ready || !sdkRef.current) return;
    const sdk = sdkRef.current;
    const onChange = () => refresh(sdk);
    sdk.User.PushSubscription.addEventListener("change", onChange);
    sdk.Notifications.addEventListener("permissionChange", onChange);
    void syncIdentity(sdk);
    const { data: authSubscription } = supabase.auth.onAuthStateChange(() => { void syncIdentity(sdk); });
    return () => {
      sdk.User.PushSubscription.removeEventListener("change", onChange);
      sdk.Notifications.removeEventListener("permissionChange", onChange);
      authSubscription.subscription.unsubscribe();
    };
  }, [ready, refresh, syncIdentity]);

  const enable = useCallback(async () => {
    const sdk = sdkRef.current;
    if (!sdk) { setState("unavailable"); return; }
    if (!sdk.Notifications.isPushSupported()) { setState("unsupported"); return; }
    if (typeof Notification !== "undefined" && Notification.permission === "denied") { setState("blocked"); return; }
    try {
      await syncIdentity(sdk);
      if (!sdk.User.PushSubscription.optedIn || !sdk.User.PushSubscription.id || !sdk.User.PushSubscription.token) {
        await sdk.Notifications.requestPermission();
        await sdk.User.PushSubscription.optIn();
      }
      refresh(sdk);
    } catch (error) {
      console.error("WageFlow OneSignal subscription failed", error);
      refresh(sdk);
      if (typeof Notification !== "undefined" && Notification.permission !== "denied") setState("error");
    }
  }, [refresh, syncIdentity]);

  const value = useMemo(() => ({ state, enable, ready }), [state, enable, ready]);

  return <OneSignalContext.Provider value={value}>{children}<Script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" strategy="afterInteractive" onReady={() => {
    if (window.__wageFlowOneSignalInitialised) return;
    window.__wageFlowOneSignalInitialised = true;
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (sdk) => {
      try {
        await sdk.init({ appId, allowLocalhostAsSecureOrigin: process.env.NODE_ENV !== "production", serviceWorkerPath: "/OneSignalSDKWorker.js", serviceWorkerParam: { scope: "/" } });
        sdkRef.current = sdk;
        setReady(true);
        refresh(sdk);
        logDiagnostics("initialised", sdk);
      } catch (error) {
        console.error("WageFlow OneSignal initialisation failed", error);
        setState("error");
      }
    });
  }} /></OneSignalContext.Provider>;
}

export function useOneSignal() { return useContext(OneSignalContext); }
