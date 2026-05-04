"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function PayslipsPage() {
  const [payslips, setPayslips] = useState<any[]>([]);

  useEffect(() => {
    fetchPayslips();
  }, []);

  async function fetchPayslips() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .single();

    const businessId = profile?.business_id;

    const { data } = await supabase
      .from("payslips")
      .select(`
        *,
        employees (full_name)
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    setPayslips(data || []);
  }

  return (
    <main style={page}>
      <h1 style={title}>Payslips</h1>

      {payslips.length === 0 ? (
        <p>No payslips yet</p>
      ) : (
        payslips.map((p) => (
          <div key={p.id} style={card}>
            <strong>{p.employees?.full_name}</strong>
            <p>Gross: R {p.gross_pay}</p>
            <p>UIF: R {p.uif_employee}</p>
            <p>Net: R {p.net_pay}</p>
            <p>
              Period: {p.pay_period_month}/{p.pay_period_year}
            </p>
          </div>
        ))
      )}
    </main>
  );
}

const page = {
  padding: "40px",
  fontFamily: "Arial",
};

const title = {
  fontSize: "24px",
  marginBottom: "20px",
  color: "#0f766e",
};

const card = {
  border: "1px solid #eee",
  padding: "15px",
  borderRadius: "8px",
  marginBottom: "10px",
};