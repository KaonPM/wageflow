"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type DashboardStats = {
  activeBusinesses: number;
  activeSubscriptions: number;
  suspendedBusinesses: number;
  pendingRequests: number;
};

const emptyStats: DashboardStats = {
  activeBusinesses: 0,
  activeSubscriptions: 0,
  suspendedBusinesses: 0,
  pendingRequests: 0,
};

export default function MasterDashboard() {
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchStats() {
    setLoading(true);
    setError("");
    const [businesses, subscriptions, suspended, requests] = await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }).eq("subscription_status", "active"),
      supabase.from("businesses").select("id", { count: "exact", head: true }).in("status", ["suspended", "archived"]),
      supabase.from("wageflow_setup_requests").select("id", { count: "exact", head: true }).ilike("status", "pending"),
    ]);
    const firstError = [businesses, subscriptions, suspended, requests].find((result) => result.error)?.error;
    if (firstError) setError(firstError.message);
    setStats({
      activeBusinesses: businesses.count ?? 0,
      activeSubscriptions: subscriptions.count ?? 0,
      suspendedBusinesses: suspended.count ?? 0,
      pendingRequests: requests.count ?? 0,
    });
    setLoading(false);
  }

  useEffect(() => { fetchStats(); }, []);

  return <main style={page}>
    <section style={header}>
      <div><p style={eyebrow}>Platform administration</p><h1 style={title}>Master Overview</h1><p style={subtitle}>Monitor client onboarding, billing and access without opening employee, payroll or payslip records.</p></div>
      <button onClick={fetchStats} style={refreshButton}>Refresh overview</button>
    </section>

    {error && <div style={notice}>{error}</div>}
    <section style={statsGrid}>
      <StatCard label="Active businesses" value={loading ? "..." : String(stats.activeBusinesses)} note="Client workspaces currently enabled" />
      <StatCard label="Active subscriptions" value={loading ? "..." : String(stats.activeSubscriptions)} note="Current active billing records" />
      <StatCard label="Pending setup" value={loading ? "..." : String(stats.pendingRequests)} note="Requests awaiting onboarding" />
      <StatCard label="Access paused" value={loading ? "..." : String(stats.suspendedBusinesses)} note="Suspended or archived clients" />
    </section>

    <section style={sectionHeader}><div><h2 style={sectionTitle}>Administration workspace</h2><p style={sectionText}>Only platform-level client metadata is shown here.</p></div></section>
    <section style={grid}>
      <DashboardCard title="Setup Requests" description="Review new client requests and complete controlled onboarding." href="/master/wageflow-requests" tag="Onboarding" />
      <DashboardCard title="Businesses" description="Manage client identity, branding and lifecycle access." href="/master/businesses" tag="Client Admin" />
      <DashboardCard title="Billing" description="Manage plans, fees, payment state and subscription access." href="/master/subscriptions" tag="Finance" />
      <DashboardCard title="User Access" description="Review roles, account status and business assignments." href="/master/users" tag="Security" />
    </section>
  </main>;
}

function StatCard({label,value,note}:{label:string;value:string;note:string}) { return <article style={statCard}><span style={statLabel}>{label}</span><strong style={statValue}>{value}</strong><small style={statNote}>{note}</small></article>; }
function DashboardCard({title,description,href,tag}:{title:string;description:string;href:string;tag:string}) { return <Link href={href} style={cardLink}><article style={card}><span style={tagStyle}>{tag}</span><h2 style={cardTitle}>{title}</h2><p style={cardText}>{description}</p><span style={openLink}>Open workspace <span aria-hidden="true">→</span></span></article></Link>; }

const page={minHeight:"100vh",padding:38,fontFamily:"Arial, sans-serif",background:"#f4f8fb",color:"#0f172a"};
const header={display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:20,flexWrap:"wrap" as const,marginBottom:26};
const eyebrow={margin:"0 0 7px",color:"#b7791f",fontWeight:900,textTransform:"uppercase" as const,letterSpacing:".09em",fontSize:11};
const title={margin:"0 0 9px",fontSize:34,color:"#0b6158",fontWeight:900};
const subtitle={margin:0,maxWidth:760,color:"#64748b",lineHeight:1.6};
const refreshButton={border:"1px solid #0f766e",borderRadius:10,padding:"10px 16px",background:"#fff",color:"#0f766e",fontWeight:800,cursor:"pointer"};
const notice={padding:12,marginBottom:18,borderRadius:10,background:"#fff7ed",color:"#9a3412",fontWeight:700,fontSize:13};
const statsGrid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:15,marginBottom:28};
const statCard={display:"grid",gap:7,padding:19,border:"1px solid #dfe7ed",borderRadius:16,background:"#fff",boxShadow:"0 8px 24px rgba(15,23,42,.04)"};
const statLabel={color:"#64748b",fontSize:11,fontWeight:900,textTransform:"uppercase" as const};const statValue={color:"#0b6158",fontSize:27};const statNote={color:"#94a3b8",fontSize:12};
const sectionHeader={display:"flex",justifyContent:"space-between",marginBottom:14};const sectionTitle={margin:"0 0 5px",fontSize:20};const sectionText={margin:0,color:"#64748b",fontSize:13};
const grid={display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:16};const cardLink={textDecoration:"none",color:"inherit"};
const card={height:"100%",boxSizing:"border-box" as const,padding:21,border:"1px solid #dfe7ed",borderRadius:17,background:"#fff",boxShadow:"0 10px 28px rgba(15,23,42,.045)"};
const tagStyle={display:"inline-block",marginBottom:25,padding:"6px 10px",borderRadius:999,background:"#fff7ed",color:"#b45309",fontSize:11,fontWeight:900,textTransform:"uppercase" as const};
const cardTitle={margin:"0 0 9px",fontSize:19};const cardText={minHeight:64,margin:"0 0 18px",color:"#64748b",lineHeight:1.55,fontSize:13};const openLink={color:"#0f766e",fontSize:13,fontWeight:900};
