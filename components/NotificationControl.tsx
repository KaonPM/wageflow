"use client";

import { useOneSignal } from "@/components/OneSignalProvider";

const labels = { loading: "Notifications: Checking", on: "Notifications: On", off: "Notifications: Off", blocked: "Notifications blocked", unsupported: "Notifications unavailable", unavailable: "Notifications unavailable", error: "Notifications need attention" } as const;

export function NotificationControl() {
  const { state, enable, ready } = useOneSignal();
  const canEnable = ready && (state === "off" || state === "error");
  return <div className="notification-control" data-state={state}>
    <span aria-live="polite">{labels[state]}</span>
    {canEnable && <button type="button" onClick={() => void enable()} aria-label="Enable push notifications">Enable Notifications</button>}
    {state === "blocked" && <small>Allow notifications in browser settings to receive updates.</small>}
  </div>;
}
