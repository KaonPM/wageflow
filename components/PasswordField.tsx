"use client";

import { useState, type CSSProperties, type InputHTMLAttributes } from "react";

type PasswordFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  inputStyle?: CSSProperties;
};

export function PasswordField({ inputStyle, style, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? "Hide password" : "Show password";

  return (
    <div style={fieldWrap}>
      <input {...props} type={visible ? "text" : "password"} style={{ ...inputStyle, ...style, width: "100%", boxSizing: "border-box", paddingRight: 48 }} />
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        style={iconButton}
      >
        {visible ? <EyeSlashIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.75"/></svg>;
}

function EyeSlashIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3l18 18"/><path d="M10.6 6.15A10.9 10.9 0 0 1 12 6c6 0 9.5 6 9.5 6a17.5 17.5 0 0 1-2.1 2.7M6.2 6.2C3.8 8 2.5 12 2.5 12s3.5 6 9.5 6a10.5 10.5 0 0 0 3.2-.5"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>;
}

const fieldWrap: CSSProperties = { position: "relative", width: "100%", display: "flex" };
const iconButton: CSSProperties = { position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, display: "grid", placeItems: "center", padding: 0, border: 0, borderRadius: 8, background: "transparent", color: "#64748b", cursor: "pointer" };
