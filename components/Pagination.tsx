"use client";

import type { CSSProperties } from "react";

type PaginationProps = { page: number; totalPages: number; onPageChange: (page: number) => void; totalItems: number; pageSize: number };

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }: PaginationProps) {
  if (totalItems <= pageSize) return null;
  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
  const first = (safePage - 1) * pageSize + 1;
  const last = Math.min(safePage * pageSize, totalItems);
  return (
    <nav aria-label="Pagination" style={wrap}>
      <span style={summary}>Showing {first}&ndash;{last} of {totalItems}</span>
      <div style={controls}>
        <button type="button" style={button} disabled={safePage <= 1} onClick={() => onPageChange(safePage - 1)}>Previous</button>
        <span style={pageText}>Page {safePage} of {Math.max(1, totalPages)}</span>
        <button type="button" style={button} disabled={safePage >= totalPages} onClick={() => onPageChange(safePage + 1)}>Next</button>
      </div>
    </nav>
  );
}

const wrap: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", paddingTop: 18, marginTop: 18, borderTop: "1px solid #e2e8f0" };
const controls: CSSProperties = { display: "flex", alignItems: "center", gap: 10 };
const button: CSSProperties = { border: "1px solid #0f766e", background: "#fff", color: "#0f766e", borderRadius: 10, padding: "9px 15px", fontWeight: 700, cursor: "pointer" };
const summary: CSSProperties = { fontSize: 13, color: "#64748b" };
const pageText: CSSProperties = { fontSize: 13, color: "#334155", fontWeight: 700 };
