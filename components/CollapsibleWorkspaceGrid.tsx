"use client";

import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode, useState } from "react";

type Props = {
  children: ReactNode;
  gridStyle: CSSProperties;
  className?: string;
  label?: string;
  alwaysOpenCount?: number;
};

export function CollapsibleWorkspaceGrid({ children, gridStyle, className, label = "workspaces", alwaysOpenCount = 0 }: Props) {
  const items = Children.toArray(children).filter(Boolean);
  const openItems = items.slice(0, alwaysOpenCount);
  const workspaceItems = items.slice(alwaysOpenCount);
  const collapsible = workspaceItems.length >= 2;

  if (!collapsible) return <section style={gridStyle} className={className}>{items}</section>;

  return <section aria-label={label} style={{ ...gridStyle, gap: 10 }} className={className}>
    {openItems}
    {workspaceItems.map((item, index) => <CollapsibleWorkspace key={index} label={getWorkspaceLabel(item, index + alwaysOpenCount)}>{item}</CollapsibleWorkspace>)}
  </section>;
}

function CollapsibleWorkspace({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);

  return <section style={workspace}>
    <div style={workspaceHeader}>
      <h2 style={workspaceTitle}>{label}</h2>
      <button type="button" style={pill} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {open ? "Close" : "Open"}
      </button>
    </div>
    {open && <div style={workspaceContent}>{hideFirstHeading(children)}</div>}
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

function hideFirstHeading(node: ReactNode): ReactNode {
  let hidden = false;

  function visit(current: ReactNode): ReactNode {
    if (!isValidElement<{ children?: ReactNode; style?: CSSProperties }>(current)) return current;

    if (!hidden && typeof current.type === "string" && ["h2", "h3"].includes(current.type)) {
      hidden = true;
      return cloneElement(current, { style: { ...current.props.style, display: "none" } });
    }

    const childNodes = Children.toArray(current.props.children);
    if (childNodes.length === 0) return current;
    return cloneElement(current, undefined, childNodes.map(visit));
  }

  return visit(node);
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
const workspaceHeader: CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", padding: "8px 0", borderBottom: "1px solid #dce6ee" };
const workspaceTitle: CSSProperties = { margin: 0, color: "#173d3a", fontSize: 15, fontWeight: 800 };
const workspaceContent: CSSProperties = { marginTop: 10 };
