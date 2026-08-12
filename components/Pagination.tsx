"use client";

import type { CSSProperties } from "react";

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize }: { page:number; totalPages:number; onPageChange:(page:number)=>void; totalItems:number; pageSize:number }) {
  if (totalItems <= pageSize) return null;
  const first=(page-1)*pageSize+1; const last=Math.min(page*pageSize,totalItems);
  return <nav aria-label="Pagination" style={wrap}>
    <span style={summary}>Showing {first}–{last} of {totalItems}</span>
    <div style={controls}>
      <button type="button" style={button} disabled={page<=1} onClick={()=>onPageChange(page-1)}>Previous</button>
      <span style={pageText}>Page {page} of {totalPages}</span>
      <button type="button" style={button} disabled={page>=totalPages} onClick={()=>onPageChange(page+1)}>Next</button>
    </div>
  </nav>;
}
const wrap:CSSProperties={display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap",paddingTop:18,marginTop:18,borderTop:"1px solid #e2e8f0"};
const controls:CSSProperties={display:"flex",alignItems:"center",gap:10};
const button:CSSProperties={border:"1px solid #0f766e",background:"#fff",color:"#0f766e",borderRadius:999,padding:"9px 15px",fontWeight:700,cursor:"pointer"};
const summary:CSSProperties={fontSize:13,color:"#64748b"}; const pageText:CSSProperties={fontSize:13,color:"#334155",fontWeight:700};
