"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PaymentState = "checking" | "confirmed" | "pending" | "failed" | "resolution";

export default function PaymentReturnPage() {
  const [message, setMessage] = useState("Checking your payment with Paystack…");
  const [state, setState] = useState<PaymentState>("checking");
  const [returnTo, setReturnTo] = useState("/master/subscriptions");
  const [reference, setReference] = useState<string | null>(null);

  const verify = useCallback(async (paymentReference: string) => {
    setState("checking");
    setMessage("Checking your payment with Paystack…");
    try {
      const response = await fetch("/api/billing/paystack/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: paymentReference }) });
      const result = await response.json().catch(() => null);
      if (response.ok && result?.success === true) {
        setState("confirmed");
        setMessage("Payment confirmed. Your WageFlow billing record has been updated.");
      } else if (result?.paymentState === "failed") {
        setState("failed");
        setMessage(result.error);
      } else if (result?.result === "financial_resolution_required") {
        setState("resolution");
        setMessage(result.error);
      } else {
        setState("pending");
        setMessage("We could not confirm this payment yet. Check again shortly, or return to billing to see its current status.");
      }
    } catch {
      setState("pending");
      setMessage("We could not contact the payment service. Check again shortly, or return to billing to see its current status.");
    }
  }, []);

  useEffect(() => {
    const parameters = new URLSearchParams(window.location.search);
    const paymentReference = parameters.get("reference");
    setReturnTo(parameters.get("returnTo") === "employer-billing" ? "/employer/billing" : "/master/subscriptions");
    if (!paymentReference) { setState("failed"); setMessage("No payment reference was provided. Return to billing to check your statement."); return; }
    setReference(paymentReference);
    void verify(paymentReference);
  }, [verify]);

  const heading = state === "confirmed" ? "Payment confirmed" : state === "failed" ? "Checkout not completed" : state === "resolution" ? "Payment needs support" : state === "pending" ? "Payment not confirmed yet" : "Checking payment";
  return <main style={page}><section style={card} role="status" aria-live="polite"><p style={eyebrow}>WageFlow billing</p><h1 style={title}>{heading}</h1><p style={text}>{message}</p><div style={actions}>{state === "pending" && reference && <button type="button" style={secondaryButton} onClick={() => void verify(reference)}>Check again</button>}<Link href={returnTo} style={button}>Return to billing</Link></div></section></main>;
}

const page={minHeight:"100vh",display:"grid",placeItems:"center",padding:16,background:"#f4f8fb"};
const card={width:"min(100%,520px)",padding:"clamp(20px,5vw,32px)",borderRadius:20,background:"#fff",border:"1px solid #dfe7ed",textAlign:"center" as const,boxShadow:"0 12px 32px rgba(15,23,42,.06)"};
const eyebrow={color:"#b7791f",fontSize:12,fontWeight:800,textTransform:"uppercase" as const,letterSpacing:".08em"};
const title={margin:"0 0 14px",color:"#0b6158",fontSize:"clamp(24px,4vw,32px)"};
const text={margin:"0 0 24px",color:"#475569",lineHeight:1.6};
const actions={display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap" as const};
const button={display:"inline-flex",alignItems:"center",minHeight:44,padding:"12px 18px",borderRadius:10,background:"#0f766e",color:"#fff",textDecoration:"none",fontWeight:800};
const secondaryButton={...button,border:"1px solid #0f766e",background:"#fff",color:"#0f766e",cursor:"pointer"};
