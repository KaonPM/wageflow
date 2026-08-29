"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

export default function AddBusinessPage() {
  const router = useRouter();
  const [form, setForm] = useState({ businessName: "", tradingName: "", email: "", phone: "", employeeCount: "1", plan: "Starter", defaultEmployeePortalEnabled: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function save() {
    setSaving(true); setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch("/api/employer/businesses/create", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` }, body: JSON.stringify({ ...form, employeeCount: Number(form.employeeCount) }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(result.error || "Business could not be created."); setSaving(false); return; }
    router.replace("/employer"); router.refresh();
  }

  return <main style={page}><section style={card}><Link href="/employer" style={back}>← Back to dashboard</Link><p style={eyebrow}>Business owner controls</p><h1 style={title}>Add another business</h1><p style={subtitle}>Create a separate payroll workspace. Employees, payroll, reports and documents remain isolated from your other businesses.</p>{message && <p style={notice}>{message}</p>}<div style={grid}><Field label="Registered business name"><input style={input} value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></Field><Field label="Trading name (optional)"><input style={input} value={form.tradingName} onChange={(e) => setForm({ ...form, tradingName: e.target.value })} /></Field><Field label="Business email (optional)"><input style={input} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Business phone (optional)"><input style={input} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field><Field label="Expected employees"><input style={input} min="1" type="number" value={form.employeeCount} onChange={(e) => setForm({ ...form, employeeCount: e.target.value })} /></Field><Field label="Plan"><select style={input} value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}><option value="Starter">Starter — R199/month</option><option value="Growth">Growth — R299/month</option></select></Field></div><label style={choice}><input type="checkbox" checked={form.defaultEmployeePortalEnabled} onChange={(e) => setForm({ ...form, defaultEmployeePortalEnabled: e.target.checked })} /><span><strong>Enable employee portal by default</strong><br />Leave this off for paper-first staff. You can still enable a portal for an individual employee later.</span></label><button style={button} disabled={saving} onClick={() => void save()}>{saving ? "Creating..." : "Create business"}</button></section></main>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={field}><span style={labelStyle}>{label}</span>{children}</label>; }
const page={minHeight:"100vh",padding:"38px",background:"#f4f8fb",fontFamily:"Arial, sans-serif",color:"#0f172a"}; const card={maxWidth:760,margin:"0 auto",padding:28,background:"#fff",border:"1px solid #e2e8f0",borderRadius:20}; const back={color:"#0f766e",fontWeight:800,textDecoration:"none"}; const eyebrow={margin:"28px 0 6px",color:"#0f766e",fontSize:12,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em"}; const title={margin:0,fontSize:32}; const subtitle={color:"#64748b",lineHeight:1.55}; const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16,marginTop:24}; const field={display:"grid",gap:6}; const labelStyle={fontSize:12,fontWeight:800,color:"#475569"}; const input={width:"100%",padding:"11px",border:"1px solid #cbd5e1",borderRadius:10,boxSizing:"border-box" as const}; const choice={display:"flex",gap:10,alignItems:"flex-start",margin:"24px 0",lineHeight:1.5,color:"#334155"}; const button={border:0,borderRadius:10,background:"#0f766e",color:"#fff",padding:"12px 18px",fontWeight:800,cursor:"pointer"}; const notice={padding:12,borderRadius:10,background:"#fff7ed",color:"#9a3412"};
