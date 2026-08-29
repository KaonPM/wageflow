"use client";

import { Children, isValidElement, type CSSProperties, type ReactNode, useState } from "react";

type Props = {
  children: ReactNode;
  gridStyle: CSSProperties;
  className?: string;
  label?: string;
};

export function CollapsibleWorkspaceGrid({ children, gridStyle, className, label = "workspaces" }: Props) {
  const items = Children.toArray(children).filter(Boolean);
  const collapsible = items.length >= 3;

  if (!collapsible) return <section style={gridStyle} className={className}>{items}</section>;

  return <section aria-label={label} style={{ ...gridStyle, gap: 10 }} className={className}>
    {items.map((item, index) => <CollapsibleWorkspace key={index} label={getWorkspaceLabel(item, index)}>{item}</CollapsibleWorkspace>)}
  </section>;
}

function CollapsibleWorkspace({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);

  return <section style={workspace}>
    <button type="button" style={pill} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {open ? `Close ${label}` : `Open ${label}`}
    </button>
    {open && <div style={workspaceContent}>{children}</div>}
  </section>;
}

function getWorkspaceLabel(node: ReactNode, index: number): string {
  const heading = findHeading(node);
  return heading || `workspace ${index + 1}`;
}

function findHeading(node: ReactNode): string | null {
  if (typeof node === "string" || typeof node === "number") return String(node).trim() || null;
  if (!isValidElement<{ children?: ReactNode }>(node)) return null;

  if (typeof node.type === "string" && ["h2", "h3"].includes(node.type)) {
    return textContent(node.props.children) || null;
  }

  for (const child of Children.toArray(node.props.children)) {
    const heading = findHeading(child);
    if (heading) return heading;
  }

  return null;
}

function textContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (!isValidElement<{ children?: ReactNode }>(node)) return "";
  return Children.toArray(node.props.children).map(textContent).join("");
}

const pill: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  border: "1px solid #b9d9d5",
  borderRadius: 999,
  padding: "5px 10px",
  background: "#ffffff",
  color: "#0f766e",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 2px 7px rgba(15, 118, 110, 0.08)",
};

const workspace: CSSProperties = { minWidth: 0 };
const workspaceContent: CSSProperties = { marginTop: 8 };
