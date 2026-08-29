"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";
import { Pagination } from "@/components/Pagination";

type AuditEvent = { id: string; actor_id: string | null; entity_type: string; entity_id: string | null; action: string; before_data: Record<string, unknown> | null; after_data: Record<string, unknown> | null; created_at: string };
type Profile = { id: string; full_name: string | null; email: string | null };

export default function MasterAuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  async function load() {
    setLoading(true); setMessage("");
    const [eventResult, profileResult] = await Promise.all([
      supabase.from("master_audit_log").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("profiles").select("id,full_name,email"),
    ]);
    if (eventResult.error) setMessage(eventResult.error.message); else setEvents(eventResult.data || []);
    if (!profileResult.error) setProfiles(profileResult.data || []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  const actorNames = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile.full_name || profile.email || "System"])), [profiles]);
  const totalPages = Math.max(1, Math.ceil(events.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visibleEvents = events.slice((safePage - 1) * pageSize, safePage * pageSize);
  return <main style={page}><section style={header}><div><p style={eyebrow}>Platform control</p><h1 style={title}>Audit Trail</h1><p style={subtitle}>The latest access and subscription changes across WageFlow.</p></div><div style={actions}><Link href="/master" style={back}>Back to overview</Link><button onClick={load} style={refresh}>Refresh</button></div></section>{message && <div style={notice}>{message}</div>}<section style={card}>{loading ? <p>Loading audit events…</p> : events.length === 0 ? <p style={muted}>No tracked changes yet. New access and subscription changes will appear here.</p> : <><div style={tableWrap}><table style={table}><thead><tr><th style={th}>When</th><th style={th}>Who</th><th style={th}>Area</th><th style={th}>Action</th><th style={th}>Summary</th></tr></thead><tbody>{visibleEvents.map((event) => <tr key={event.id}><td style={td}>{new Date(event.created_at).toLocaleString("en-ZA")}</td><td style={td}>{event.actor_id ? actorNames.get(event.actor_id) || "User" : "System"}</td><td style={td}>{event.entity_type}</td><td style={td}>{event.action}</td><td style={td}>{summary(event)}</td></tr>)}</tbody></table></div><Pagination page={safePage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={events.length} pageSize={pageSize} /></>}</section></main>;
}

function summary(event: AuditEvent) { const after = event.after_data || {}; const before = event.before_data || {}; const keys = ["role", "business_id", "access_status", "plan_name", "monthly_fee", "setup_fee", "subscription_status"].filter((key) => before[key] !== after[key]); return keys.length ? keys.map((key) => `${key.replaceAll("_", " ")}: ${String(before[key] ?? "—")} → ${String(after[key] ?? "—")}`).join(" · ") : "Record updated"; }
const page={minHeight:"100vh",padding:38,fontFamily:"Arial, sans-serif",background:"#f4f8fb",color:"#0f172a"}; const header={display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:20,flexWrap:"wrap" as const,marginBottom:24}; const eyebrow={margin:"0 0 7px",color:"#b7791f",fontWeight:900,textTransform:"uppercase" as const,fontSize:11}; const title={margin:"0 0 8px",fontSize:34,color:"#0b6158"}; const subtitle={margin:0,color:"#64748b"}; const actions={display:"flex",alignItems:"center",gap:10,flexWrap:"wrap" as const}; const back={height:40,display:"inline-flex",alignItems:"center",padding:"0 14px",border:"1px solid #0f766e",borderRadius:10,color:"#0f766e",textDecoration:"none",fontWeight:800}; const refresh={height:40,padding:"0 14px",border:"none",borderRadius:10,background:"#0f766e",color:"#fff",fontWeight:800,cursor:"pointer"}; const card={padding:22,border:"1px solid #dfe7ed",borderRadius:18,background:"#fff"}; const notice={padding:12,marginBottom:16,borderRadius:10,background:"#fff7ed",color:"#9a3412"}; const muted={color:"#64748b"}; const tableWrap={overflowX:"auto" as const}; const table={width:"100%",borderCollapse:"collapse" as const,minWidth:820}; const th={padding:11,textAlign:"left" as const,background:"#f8fafc",fontSize:11,textTransform:"uppercase" as const}; const td={padding:12,borderBottom:"1px solid #e2e8f0",verticalAlign:"top" as const,fontSize:13};
