"use client";

import Link from "next/link";

export default function SarsReconciliationPage() {
  return <main style={page}><Link href="/employer/payroll/compliance" style={back}>← Compliance Summary</Link><h1 style={title}>SARS Reconciliation</h1><p style={text}>This area will reconcile payroll totals by tax year once the SARS Business Requirement Specification mapping has been verified.</p><section style={card}><h2 style={heading}>Not ready for export</h2><p style={text}>WageFlow will not create an EMP501 or employee tax-certificate import file until the applicable SARS BRS version, source codes and file layout are confirmed. Monthly PAYE and UIF figures remain available on the Compliance Summary.</p></section></main>;
}
const page={minHeight:"100vh",padding:38,fontFamily:"Arial, sans-serif",background:"#f4f8fb",color:"#0f172a"};
const title={fontSize:34,color:"#0f766e",margin:"22px 0 10px"};
const text={maxWidth:760,color:"#64748b",lineHeight:1.6};
const card={maxWidth:760,background:"#fff",border:"1px solid #e2e8f0",borderRadius:18,padding:24,marginTop:24};
const heading={margin:0,color:"#0f172a",fontSize:20};
const back={color:"#0f766e",fontWeight:800,textDecoration:"none"};
