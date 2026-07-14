"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { AppMessageType } from "@/app/lib/appMessage";

type AppMessage = {
  id: number;
  message: string;
  type: AppMessageType;
};

export default function AppMessageHost() {
  const [notice, setNotice] = useState<AppMessage | null>(null);

  useEffect(() => {
    function handleMessage(event: Event) {
      const customEvent = event as CustomEvent<Partial<AppMessage>>;
      const message = customEvent.detail?.message;

      if (!message) return;

      setNotice({
        id: Date.now(),
        message,
        type: customEvent.detail?.type || "info",
      });
    }

    window.addEventListener("wageflow-message", handleMessage);

    return () => {
      window.removeEventListener("wageflow-message", handleMessage);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => {
      setNotice(null);
    }, 5200);

    return () => window.clearTimeout(timeout);
  }, [notice]);

  if (!notice) return null;

  return (
    <div style={wrapper} role="status" aria-live="polite">
      <div style={{ ...messageBox, ...messageTone(notice.type) }}>
        <span>{notice.message}</span>
        <button
          type="button"
          style={closeButton}
          onClick={() => setNotice(null)}
          aria-label="Dismiss message"
        >
          x
        </button>
      </div>
    </div>
  );
}

function messageTone(type: AppMessageType): CSSProperties {
  if (type === "success") {
    return {
      borderColor: "#86efac",
      background: "#f0fdf4",
      color: "#166534",
    };
  }

  if (type === "error") {
    return {
      borderColor: "#fecaca",
      background: "#fff1f2",
      color: "#991b1b",
    };
  }

  return {
    borderColor: "#99f6e4",
    background: "#f0fdfa",
    color: "#0f766e",
  };
}

const wrapper: CSSProperties = {
  position: "fixed",
  right: "18px",
  bottom: "18px",
  zIndex: 9999,
  width: "min(420px, calc(100vw - 36px))",
};

const messageBox: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
  border: "1px solid",
  borderRadius: "14px",
  padding: "14px 16px",
  boxShadow: "0 18px 45px rgba(15, 23, 42, 0.16)",
  fontFamily: "Arial, sans-serif",
  fontSize: "14px",
  fontWeight: 700,
  lineHeight: 1.45,
};

const closeButton: CSSProperties = {
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  fontSize: "16px",
  fontWeight: 900,
  lineHeight: 1,
  padding: "1px 0 0",
};