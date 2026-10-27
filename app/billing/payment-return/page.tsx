"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PaymentReturnPage() {
  const [message, setMessage] = useState("Confirming your Paystack payment…");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const reference = new URLSearchParams(window.location.search).get("reference");
    if (!reference) { setMessage("We could not find a Paystack payment reference."); return; }
    fetch("/api/billing/paystack/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference }) })
      .then(async (response) => ({ ok: response.ok, result: await response.json().catch(() => null) }))
      .then(({ ok, result }) => { setSuccess(ok); setMessage(ok ? "Payment confirmed. Your WageFlow billing record has been updated." : result?.error || "Your payment could not be confirmed yet. Please try again shortly."); })
      .catch(() => setMessage("Your payment could not be confirmed yet. Please try again shortly."));
  }, []);

  return <main style={page}><section style={card}><h1 style={title}>{success ? "Payment received" : "Confirming payment"}</h1><p style={text}>{message}</p><Link href="/" style={button}>Return to WageFlow</Link></section></main>;
}

const page={minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f4f8fb",fontFamily:"Arial, sans-serif"};
const card={maxWidth:520,padding:32,borderRadius:20,background:"#fff",border:"1px solid #dfe7ed",textAlign:"center" as const};
const title={margin:"0 0 14px",color:"#0b6158"}; const text={margin:"0 0 24px",color:"#475569",lineHeight:1.6}; const button={display:"inline-block",padding:"12px 18px",borderRadius:10,background:"#0f766e",color:"#fff",textDecoration:"none",fontWeight:800};
