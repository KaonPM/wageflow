"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Business = { id: string; business_name: string; trading_name: string | null; email: string | null; address: string | null; registration_number: string | null; status: string };
type Subscription = { id: string; plan_name: string; monthly_fee: number; setup_fee: number; setup_paid: boolean; subscription_status: string; created_at: string };
type Statement = { id: string; statement_type: "setup" | "monthly"; statement_month: string; amount: number; status: string; recipient_email: string | null; paid_at: string | null; emailed_at: string | null; payment_reference: string | null; created_at: string; payment_provider: string | null };
type InitialPayment = { id: string; subscription_id: string | null; setup_amount: number; first_month_amount: number; total_amount: number; currency: string; covered_month: string; status: string; verified_at: string | null; created_at: string };
type BillingData = { business: Business; subscription: Subscription | null; statements: Statement[]; initialPayments: InitialPayment[]; employeeCount: number; openBalance: number; nextInvoiceDate: string; membershipRole: string };

export default function EmployerBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Statement | null>(null);
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");

  const authenticatedRequest = useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("Your session has expired. Please sign in again.");
    const response = await fetch(path, { ...init, headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers, Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Billing could not be updated.");
    return result;
  }, []);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const result = await authenticatedRequest("/api/employer/billing") as BillingData;
      setData(result);
      setEmail(result.business.email || "");
      setAddress(result.business.address || "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Billing details could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [authenticatedRequest]);

  useEffect(() => { void loadBilling(); }, [loadBilling]);

  const openStatements = useMemo(() => data?.statements.filter((statement) => !statement.paid_at && Number(statement.amount) > 0) || [], [data]);
  const paidStatements = useMemo(() => data?.statements.filter((statement) => Boolean(statement.paid_at)) || [], [data]);
  const signupPayment = data?.initialPayments.find((payment) => payment.subscription_id === data.subscription?.id);
  const planLimit = getPlanLimit(data?.subscription?.plan_name || null);

  async function saveBillingContact() {
    setSaving(true);
    setMessage("");
    try {
      await authenticatedRequest("/api/employer/billing", { method: "PATCH", body: JSON.stringify({ email, address }) });
      setMessage("Billing details saved.");
      await loadBilling();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Billing details could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function pay(statement: Statement) {
    setPayingId(statement.id);
    setMessage("");
    try {
      const result = await authenticatedRequest("/api/billing/paystack/initialize", { method: "POST", body: JSON.stringify({ statementId: statement.id }) });
      if (!result.authorizationUrl) throw new Error("Paystack checkout could not be opened.");
      window.location.assign(result.authorizationUrl);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Paystack checkout could not be opened.");
      setPayingId(null);
    }
  }

  if (loading) return <main style={statePage}><section style={stateCard}><div className="app-loading-mark" /><h1>Loading billing</h1><p>Retrieving the subscription for your active business…</p></section></main>;
  if (!data) return <main style={statePage}><section style={stateCard}><h1>Billing unavailable</h1><p>{message || "No billing account is linked to the active business."}</p><div style={actions}><button style={primaryButton} onClick={loadBilling}>Try again</button><Link href="/employer" style={secondaryLink}>Back to overview</Link></div></section></main>;

  const businessName = data.business.trading_name || data.business.business_name;
  const subscription = data.subscription;

  return <main style={page}>
    <header style={header}>
      <div><p style={eyebrow}>Account & billing</p><h1 style={title}>Billing</h1><p style={subtitle}>Manage {businessName}&apos;s subscription, settle open statements and keep billing details current.</p></div>
      <div style={actions}><button style={secondaryButton} onClick={loadBilling}>Refresh</button><Link href="/employer" style={secondaryLink}>Overview</Link></div>
    </header>

    {message && <div style={notice}>{message}</div>}

    <section style={summaryGrid} aria-label="Billing summary">
      <Summary label="Current plan" value={subscription?.plan_name || "Not assigned"} note={subscription ? `${statusLabel(subscription.subscription_status)} subscription` : "Contact WageFlow to select a plan"} />
      <Summary label="Monthly subscription" value={money(subscription?.monthly_fee || 0)} note="Billed monthly" />
      <Summary label="Next statement" value={formatDate(data.nextInvoiceDate)} note="Expected billing date" />
      <Summary label="Amount outstanding" value={money(data.openBalance)} note={openStatements.length ? `${openStatements.length} open statement${openStatements.length === 1 ? "" : "s"}` : "Your account is up to date"} accent={data.openBalance > 0} />
    </section>

    <div style={layout}>
      <div style={stack}>
        <section style={card}>
          <div style={cardHeader}><div><p style={sectionEyebrow}>Subscription</p><h2 style={cardTitle}>Your WageFlow plan</h2></div><StatusPill status={subscription?.subscription_status || "not assigned"} /></div>
          {subscription ? <>
            <div style={planHero}><div><strong style={planName}>{subscription.plan_name}</strong><p style={muted}>{money(subscription.monthly_fee)} per month</p></div><div style={price}>{money(subscription.monthly_fee)}<small>/month</small></div></div>
            <div style={detailGrid}>
              <Detail label="Employees" value={planLimit ? `${data.employeeCount} of ${planLimit}` : String(data.employeeCount)} />
              <Detail label="Setup fee" value={subscription.setup_paid ? "Paid" : `${money(subscription.setup_fee)} due`} />
              <Detail label="Started" value={formatDate(subscription.created_at)} />
              <Detail label="Billing cycle" value="Monthly" />
              {signupPayment && <Detail label="First month covered at signup" value={formatMonth(signupPayment.covered_month)} />}
            </div>
            <div style={included}><strong>Included with your plan</strong><p>Payroll processing, employee records, payslips, HR tools, reports and secure account access.</p></div>
            <p style={helpText}>Need to change or cancel your plan? Contact WageFlow support so access, employee limits and final billing are handled safely.</p>
          </> : <div style={empty}>No subscription is assigned to this business yet. Contact WageFlow support to activate a plan.</div>}
        </section>

        <section style={card}>
          <div style={cardHeader}><div><p style={sectionEyebrow}>Payments</p><h2 style={cardTitle}>Open statements</h2><p style={muted}>Secure payment is completed through Paystack.</p></div></div>
          {openStatements.length === 0 ? <div style={successBox}><strong>You&apos;re all paid up</strong><span>There are no outstanding subscription statements.</span></div> : <div style={statementList}>{openStatements.map((statement) => <article key={statement.id} style={openStatement}>
            <div><strong>{statementTitle(statement)}</strong><p style={muted}>{formatMonth(statement.statement_month)} · {statement.recipient_email || "Billing email not set"}</p></div>
            <strong style={statementAmount}>{money(statement.amount)}</strong>
            <button style={primaryButton} disabled={payingId === statement.id} onClick={() => pay(statement)}>{payingId === statement.id ? "Opening Paystack…" : "Pay securely"}</button>
          </article>)}</div>}
        </section>
      </div>

      <aside style={stack}>
        <section style={card}>
          <p style={sectionEyebrow}>Billing details</p><h2 style={cardTitle}>Invoice contact</h2><p style={muted}>Statements and payment confirmations are sent to this address.</p>
          <label style={label}>Billing email<input style={input} type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="accounts@company.co.za" /></label>
          <label style={label}>Billing address<textarea style={textarea} value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Company billing address" /></label>
          {data.business.registration_number && <Detail label="Registration number" value={data.business.registration_number} />}
          <button style={{ ...primaryButton, width: "100%" }} disabled={saving} onClick={saveBillingContact}>{saving ? "Saving…" : "Save billing details"}</button>
        </section>

        <section style={card}>
          <p style={sectionEyebrow}>Payment method</p><h2 style={cardTitle}>Paystack checkout</h2><p style={muted}>Card and bank details are entered securely on Paystack. WageFlow does not store your full card details.</p>
          <div style={provider}><span style={providerMark}>P</span><div><strong>Paystack</strong><span>Secure once-off statement payments</span></div></div>
        </section>
      </aside>
    </div>

    <section style={{ ...card, marginTop: 18 }}>
      <div style={cardHeader}><div><p style={sectionEyebrow}>History</p><h2 style={cardTitle}>Statements & payments</h2><p style={muted}>{paidStatements.length + data.initialPayments.length} paid · {data.statements.length + data.initialPayments.length} total</p></div></div>
      {data.initialPayments.length > 0 && <div style={statementList}>{data.initialPayments.map((payment) => <article key={payment.id} style={openStatement}>
        <div><strong>Signup payment</strong><p style={muted}>Setup {money(payment.setup_amount)} · First month {money(payment.first_month_amount)} ({formatMonth(payment.covered_month)}) · Paid {formatDate(payment.verified_at || payment.created_at)}</p></div>
        <strong style={statementAmount}>{money(payment.total_amount)}</strong><StatusPill status="paid" />
      </article>)}</div>}
      {selected && <StatementDetail statement={selected} businessName={businessName} onClose={() => setSelected(null)} onPay={pay} paying={payingId === selected.id} />}
      {data.statements.length === 0 ? data.initialPayments.length === 0 && <div style={empty}>No billing payments have been recorded yet.</div> : <div style={tableWrap}><table style={table}><thead><tr><th style={th}>Statement</th><th style={th}>Billing month</th><th style={th}>Amount</th><th style={th}>Status</th><th style={th}>Action</th></tr></thead><tbody>{data.statements.map((statement) => <tr key={statement.id}><td style={td}><strong>{statementTitle(statement)}</strong><span style={subText}>{statement.payment_reference || statement.recipient_email || "No reference yet"}</span></td><td style={td}>{formatMonth(statement.statement_month)}</td><td style={td}>{money(statement.amount)}</td><td style={td}><StatusPill status={statement.paid_at ? "paid" : statement.status} /></td><td style={td}><button style={smallButton} onClick={() => setSelected(statement)}>View</button></td></tr>)}</tbody></table></div>}
    </section>
  </main>;
}

function Summary({ label, value, note, accent = false }: { label: string; value: string; note: string; accent?: boolean }) { return <article style={{ ...summaryCard, ...(accent ? summaryAlert : {}) }}><span style={summaryLabel}>{label}</span><strong style={summaryValue}>{value}</strong><small style={summaryNote}>{note}</small></article>; }
function Detail({ label, value }: { label: string; value: string }) { return <div style={detail}><span>{label}</span><strong>{value}</strong></div>; }
function StatusPill({ status }: { status: string }) { const positive = ["active", "paid", "emailed"].includes(status.toLowerCase()); return <span style={{ ...pill, ...(positive ? positivePill : {}) }}>{statusLabel(status)}</span>; }
function StatementDetail({ statement, businessName, onClose, onPay, paying }: { statement: Statement; businessName: string; onClose: () => void; onPay: (statement: Statement) => void; paying: boolean }) { return <aside style={statementDetail}><div><p style={sectionEyebrow}>Statement detail</p><h3 style={{ margin: 0 }}>{statementTitle(statement)}</h3></div><button style={smallButton} onClick={onClose}>Close</button><Detail label="Business" value={businessName} /><Detail label="Billing month" value={formatMonth(statement.statement_month)} /><Detail label="Amount" value={money(statement.amount)} /><Detail label="Status" value={statement.paid_at ? `Paid ${formatDate(statement.paid_at)}` : statusLabel(statement.status)} />{statement.payment_reference && <Detail label="Payment reference" value={statement.payment_reference} />}{!statement.paid_at && <button style={primaryButton} disabled={paying} onClick={() => onPay(statement)}>{paying ? "Opening Paystack…" : "Pay this statement"}</button>}</aside>; }
function statementTitle(statement: Statement) { return statement.statement_type === "setup" ? "Business Setup & Activation Fee" : "Monthly subscription payment"; }
function statusLabel(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase()); }
function money(value: number) { return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(Number(value || 0)); }
function formatDate(value: string) { const date = new Date(value.includes("T") ? value : `${value}T00:00:00Z`); return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleDateString("en-ZA", { day: "2-digit", month: "short", year: "numeric" }); }
function formatMonth(value: string) { const date = new Date(`${value}T00:00:00Z`); return date.toLocaleDateString("en-ZA", { month: "long", year: "numeric", timeZone: "UTC" }); }
function getPlanLimit(plan: string | null) { const normalized = String(plan || "").toLowerCase(); return normalized.includes("growth") ? 20 : normalized.includes("starter") ? 10 : null; }

const page: CSSProperties = { minHeight: "100vh", padding: 38, background: "#f4f8fb", color: "#0f172a", fontFamily: "Arial, sans-serif" };
const header: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap", marginBottom: 24 };
const eyebrow: CSSProperties = { margin: "0 0 7px", color: "#b7791f", fontWeight: 900, textTransform: "uppercase", letterSpacing: ".09em", fontSize: 11 };
const sectionEyebrow: CSSProperties = { ...eyebrow, color: "#0f766e", marginBottom: 5 };
const title: CSSProperties = { margin: "0 0 8px", color: "#0b6158", fontSize: 34, fontWeight: 900 };
const subtitle: CSSProperties = { margin: 0, maxWidth: 720, color: "#64748b", lineHeight: 1.6 };
const actions: CSSProperties = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const summaryGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 18 };
const summaryCard: CSSProperties = { display: "grid", gap: 6, padding: 18, background: "#fff", border: "1px solid #dce6ee", borderRadius: 14, boxShadow: "0 8px 24px rgba(15,23,42,.04)" };
const summaryAlert: CSSProperties = { borderColor: "#f59e0b", background: "#fffbeb" };
const summaryLabel: CSSProperties = { color: "#64748b", fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".05em" };
const summaryValue: CSSProperties = { color: "#0b6158", fontSize: 24 };
const summaryNote: CSSProperties = { color: "#94a3b8", fontSize: 12 };
const layout: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1.65fr) minmax(280px,.85fr)", gap: 18, alignItems: "start" };
const stack: CSSProperties = { display: "grid", gap: 18 };
const card: CSSProperties = { padding: 21, background: "#fff", border: "1px solid #dce6ee", borderRadius: 16, boxShadow: "0 8px 24px rgba(15,23,42,.04)" };
const cardHeader: CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 16 };
const cardTitle: CSSProperties = { margin: "0 0 5px", color: "#173d3a", fontSize: 20 };
const muted: CSSProperties = { margin: "4px 0 0", color: "#64748b", fontSize: 13, lineHeight: 1.5 };
const planHero: CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", padding: 18, borderRadius: 13, background: "linear-gradient(135deg,#ecfdf5,#ecfeff)", border: "1px solid #99f6e4", marginBottom: 14 };
const planName: CSSProperties = { color: "#0f4f49", fontSize: 21 };
const price: CSSProperties = { color: "#0f766e", fontSize: 24, fontWeight: 900, textAlign: "right" };
const detailGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10 };
const detail: CSSProperties = { display: "grid", gap: 3, padding: "10px 0", borderBottom: "1px solid #e2e8f0" };
const included: CSSProperties = { marginTop: 16, padding: 14, background: "#f8fafc", borderRadius: 11, color: "#334155" };
const helpText: CSSProperties = { margin: "14px 0 0", color: "#64748b", fontSize: 12, lineHeight: 1.5 };
const statementList: CSSProperties = { display: "grid", gap: 10 };
const openStatement: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto auto", gap: 14, alignItems: "center", padding: 14, border: "1px solid #fed7aa", background: "#fff7ed", borderRadius: 12 };
const statementAmount: CSSProperties = { color: "#9a3412", fontSize: 17 };
const successBox: CSSProperties = { display: "grid", gap: 4, padding: 16, background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0", borderRadius: 12 };
const label: CSSProperties = { display: "grid", gap: 6, marginTop: 14, color: "#334155", fontWeight: 800 };
const input: CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid #cbd5e1", borderRadius: 9, fontWeight: 500 };
const textarea: CSSProperties = { ...input, minHeight: 88, resize: "vertical" };
const provider: CSSProperties = { display: "flex", alignItems: "center", gap: 12, marginTop: 15, padding: 13, border: "1px solid #e2e8f0", borderRadius: 11 };
const providerMark: CSSProperties = { display: "grid", placeItems: "center", width: 38, height: 38, borderRadius: 10, background: "#0f766e", color: "#fff", fontWeight: 900 };
const primaryButton: CSSProperties = { border: 0, borderRadius: 9, padding: "10px 14px", background: "#0f766e", color: "#fff", fontWeight: 800, cursor: "pointer" };
const secondaryButton: CSSProperties = { ...primaryButton, border: "1px solid #0f766e", background: "#fff", color: "#0f766e" };
const secondaryLink: CSSProperties = { ...secondaryButton, display: "inline-block", textDecoration: "none", fontSize: 13 };
const smallButton: CSSProperties = { ...secondaryButton, padding: "7px 10px", fontSize: 11 };
const pill: CSSProperties = { display: "inline-flex", width: "fit-content", padding: "5px 9px", borderRadius: 999, background: "#f1f5f9", color: "#475569", fontSize: 11, fontWeight: 900 };
const positivePill: CSSProperties = { background: "#dcfce7", color: "#166534" };
const notice: CSSProperties = { marginBottom: 16, padding: 12, borderRadius: 10, background: "#ecfeff", color: "#155e75", fontWeight: 700 };
const empty: CSSProperties = { padding: 22, textAlign: "center", color: "#64748b", background: "#f8fafc", borderRadius: 11 };
const tableWrap: CSSProperties = { overflowX: "auto" };
const table: CSSProperties = { width: "100%", borderCollapse: "collapse" };
const th: CSSProperties = { padding: "10px", textAlign: "left", color: "#64748b", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", textTransform: "uppercase", fontSize: 11 };
const td: CSSProperties = { padding: "12px 10px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top" };
const subText: CSSProperties = { display: "block", marginTop: 4, color: "#94a3b8", fontSize: 11, maxWidth: 240 };
const statementDetail: CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, padding: 16, marginBottom: 16, background: "#f0fdfa", border: "1px solid #99f6e4", borderRadius: 12 };
const statePage: CSSProperties = { minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f4f8fb" };
const stateCard: CSSProperties = { width: "min(100%,520px)", padding: 30, textAlign: "center", background: "#fff", border: "1px solid #dce6ee", borderRadius: 18 };
