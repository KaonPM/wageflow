"use client";

import { Children, type CSSProperties, type ReactNode, useState } from "react";

type Props = {
  children: ReactNode;
  gridStyle: CSSProperties;
  className?: string;
  label?: string;
};

export function CollapsibleWorkspaceGrid({ children, gridStyle, className, label = "workspaces" }: Props) {
  const items = Children.toArray(children).filter(Boolean);
  const collapsible = items.length >= 3;
  const [open, setOpen] = useState(false);

  if (!collapsible) return <section style={gridStyle} className={className}>{items}</section>;

  return <section aria-label={label}>
    <button type="button" style={pill} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <span>{open ? "Close" : "Open"} {label}</span>
      <span style={count}>{items.length}</span>
      <span aria-hidden="true" style={chevron}>{open ? "⌃" : "⌄"}</span>
    </button>
    {open && <div style={{ ...gridStyle, marginTop: 16 }} className={className}>{items}</div>}
  </section>;
}

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 9,
  border: "1px solid #99f6e4",
  borderRadius: 999,
  padding: "10px 14px",
  background: "linear-gradient(135deg, #ecfeff, #f0fdf4)",
  color: "#0f766e",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 6px 16px rgba(15, 118, 110, 0.10)",
};

const count: CSSProperties = { minWidth: 22, padding: "2px 6px", borderRadius: 999, background: "#0f766e", color: "#fff", fontSize: 12 };
const chevron: CSSProperties = { fontSize: 17, lineHeight: 1 };
