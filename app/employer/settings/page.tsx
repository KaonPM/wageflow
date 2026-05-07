"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Settings = {
  businessName: string;
  tradingName: string;
  registrationNumber: string;
  payeReference: string;
  uifReference: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  payeEnabled: boolean;
  uifEnabled: boolean;
  pensionEnabled: boolean;
  medicalAidEnabled: boolean;
  showLeaveBalances: boolean;
  defaultPaymentMethod: string;
};

type BusinessRecord = {
  id: string;
  business_name?: string | null;
  trading_name?: string | null;
  registration_number?: string | null;
  paye_reference?: string | null;
  uif_reference?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  paye_enabled?: boolean | null;
  uif_enabled?: boolean | null;
  pension_enabled?: boolean | null;
  medical_aid_enabled?: boolean | null;
  show_leave_balances?: boolean | null;
  default_payment_method?: string | null;
};

const defaultSettings: Settings = {
  businessName: "",
  tradingName: "",
  registrationNumber: "",
  payeReference: "",
  uifReference: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
  primaryColor: "#0f766e",
  secondaryColor: "#f59e0b",
  payeEnabled: true,
  uifEnabled: true,
  pensionEnabled: false,
  medicalAidEnabled: false,
  showLeaveBalances: true,
  defaultPaymentMethod: "Bank Transfer",
};

export default function EmployerSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [employerId, setEmployerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("You are not logged in.");
      setLoading(false);
      return;
    }

    setEmployerId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    let foundBusinessId = profile?.business_id || null;
    let businessQuery: BusinessRecord | null = null;

    if (foundBusinessId) {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", foundBusinessId)
        .maybeSingle();

      businessQuery = data;
    }

    if (!businessQuery) {
      const { data } = await supabase
        .from("businesses")
        .select("*")
        .eq("employer_id", user.id)
        .maybeSingle();

      businessQuery = data;
      foundBusinessId = data?.id || null;
    }

    if (businessQuery) {
      setBusinessId(foundBusinessId);

      setSettings({
        businessName: businessQuery.business_name || "",
        tradingName: businessQuery.trading_name || "",
        registrationNumber: businessQuery.registration_number || "",
        payeReference: businessQuery.paye_reference || "",
        uifReference: businessQuery.uif_reference || "",
        address: businessQuery.address || "",
        phone: businessQuery.phone || "",
        email: businessQuery.email || "",
        logoUrl: businessQuery.logo_url || "",
        primaryColor: businessQuery.primary_color || "#0f766e",
        secondaryColor: businessQuery.secondary_color || "#f59e0b",
        payeEnabled: businessQuery.paye_enabled ?? true,
        uifEnabled: businessQuery.uif_enabled ?? true,
        pensionEnabled: businessQuery.pension_enabled ?? false,
        medicalAidEnabled: businessQuery.medical_aid_enabled ?? false,
        showLeaveBalances: businessQuery.show_leave_balances ?? true,
        defaultPaymentMethod:
          businessQuery.default_payment_method || "Bank Transfer",
      });
    }

    setLoading(false);
  }

  function handleToggle(field: keyof Settings) {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    if (!employerId) {
      setMessage("Employer account not found.");
      setSaving(false);
      return;
    }

    const payload = {
      employer_id: employerId,
      business_name: settings.businessName,
      trading_name: settings.tradingName,
      registration_number: settings.registrationNumber,
      paye_reference: settings.payeReference,
      uif_reference: settings.uifReference,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      logo_url: settings.logoUrl,
      primary_color: settings.primaryColor,
      secondary_color: settings.secondaryColor,
      paye_enabled: settings.payeEnabled,
      uif_enabled: settings.uifEnabled,
      pension_enabled: settings.pensionEnabled,
      medical_aid_enabled: settings.medicalAidEnabled,
      show_leave_balances: settings.showLeaveBalances,
      default_payment_method: settings.defaultPaymentMethod,
    };

    let savedBusinessId = businessId;
    let error = null;

    if (businessId) {
      const result = await supabase
        .from("businesses")
        .update(payload)
        .eq("id", businessId);

      error = result.error;
    } else {
      const result = await supabase
        .from("businesses")
        .insert(payload)
        .select("id")
        .single();

      error = result.error;
      savedBusinessId = result.data?.id || null;

      if (savedBusinessId) {
        setBusinessId(savedBusinessId);
      }
    }

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    if (savedBusinessId) {
      await supabase
        .from("profiles")
        .update({ business_id: savedBusinessId })
        .eq("id", employerId);
    }

    setMessage("Settings saved successfully.");
    setSaving(false);

    setTimeout(() => {
      router.push("/employer");
    }, 1000);
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>WageFlow Employer</p>
          <h1 style={title}>Employer Settings</h1>
          <p style={subtitle}>
            Configure business identity, payroll behaviour and payslip branding.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      {message && <div style={notice}>{message}</div>}

      {loading ? (
        <div style={emptyState}>Loading employer settings...</div>
      ) : (
        <>
          <section style={grid}>
            <div style={card}>
              <div style={cardHeader}>
                <div style={iconCircle}>🏢</div>

                <div>
                  <h2 style={cardTitle}>Business Details</h2>
                  <p style={cardSubtitle}>
                    These details appear on the payslip employer section.
                  </p>
                </div>
              </div>

              <Field label="Registered Business Name">
                <input
                  style={input}
                  value={settings.businessName}
                  onChange={(e) =>
                    setSettings({ ...settings, businessName: e.target.value })
                  }
                />
              </Field>

              <Field label="Trading Name">
                <input
                  style={input}
                  value={settings.tradingName}
                  onChange={(e) =>
                    setSettings({ ...settings, tradingName: e.target.value })
                  }
                />
              </Field>

              <Field label="Company Registration Number">
                <input
                  style={input}
                  value={settings.registrationNumber}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      registrationNumber: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Business Address">
                <textarea
                  style={textarea}
                  value={settings.address}
                  onChange={(e) =>
                    setSettings({ ...settings, address: e.target.value })
                  }
                />
              </Field>
            </div>

            <div style={card}>
              <div style={cardHeader}>
                <div style={iconCircle}>📞</div>

                <div>
                  <h2 style={cardTitle}>Contact Details</h2>
                  <p style={cardSubtitle}>
                    These details are displayed on employee payslips.
                  </p>
                </div>
              </div>

              <Field label="Business Phone">
                <input
                  style={input}
                  value={settings.phone}
                  onChange={(e) =>
                    setSettings({ ...settings, phone: e.target.value })
                  }
                />
              </Field>

              <Field label="Business Email">
                <input
                  style={input}
                  type="email"
                  value={settings.email}
                  onChange={(e) =>
                    setSettings({ ...settings, email: e.target.value })
                  }
                />
              </Field>

              <Field label="Logo URL">
                <input
                  style={input}
                  placeholder="/wageflow-logo.png or hosted logo URL"
                  value={settings.logoUrl}
                  onChange={(e) =>
                    setSettings({ ...settings, logoUrl: e.target.value })
                  }
                />
              </Field>

              <div style={colourGrid}>
                <Field label="Primary Colour">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        primaryColor: e.target.value,
                      })
                    }
                    style={colorInput}
                  />
                </Field>

                <Field label="Secondary Colour">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        secondaryColor: e.target.value,
                      })
                    }
                    style={colorInput}
                  />
                </Field>
              </div>
            </div>

            <div style={card}>
              <div style={cardHeader}>
                <div style={iconCircle}>🧾</div>

                <div>
                  <h2 style={cardTitle}>SARS and UIF References</h2>
                  <p style={cardSubtitle}>
                    These references support payroll record keeping.
                  </p>
                </div>
              </div>

              <Field label="PAYE Reference Number">
                <input
                  style={input}
                  value={settings.payeReference}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      payeReference: e.target.value,
                    })
                  }
                />
              </Field>

              <Field label="UIF Reference Number">
                <input
                  style={input}
                  value={settings.uifReference}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      uifReference: e.target.value,
                    })
                  }
                />
              </Field>

              <Toggle
                label="Enable PAYE"
                checked={settings.payeEnabled}
                onChange={() => handleToggle("payeEnabled")}
              />

              <Toggle
                label="Enable UIF"
                checked={settings.uifEnabled}
                onChange={() => handleToggle("uifEnabled")}
              />
            </div>

            <div style={card}>
              <div style={cardHeader}>
                <div style={iconCircle}>💰</div>

                <div>
                  <h2 style={cardTitle}>Payslip Preferences</h2>
                  <p style={cardSubtitle}>
                    Control optional payslip and payroll items.
                  </p>
                </div>
              </div>

              <Toggle
                label="Enable Pension Fund"
                checked={settings.pensionEnabled}
                onChange={() => handleToggle("pensionEnabled")}
              />

              <Toggle
                label="Enable Medical Aid"
                checked={settings.medicalAidEnabled}
                onChange={() => handleToggle("medicalAidEnabled")}
              />

              <Toggle
                label="Show Leave Balances on Payslip"
                checked={settings.showLeaveBalances}
                onChange={() => handleToggle("showLeaveBalances")}
              />

              <Field label="Default Payment Method">
                <select
                  value={settings.defaultPaymentMethod}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      defaultPaymentMethod: e.target.value,
                    })
                  }
                  style={select}
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="EFT">EFT</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Mobile Payment">Mobile Payment</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </div>
          </section>

          <div style={buttonRow}>
            <button onClick={handleSave} style={saveButton} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div style={field}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div style={toggleRow}>
      <p style={toggleLabel}>{label}</p>

      <label style={switchLabel}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ display: "none" }}
        />

        <span
          style={{
            ...switchSlider,
            background: checked ? "#0f766e" : "#cbd5e1",
          }}
        >
          <span
            style={{
              ...switchCircle,
              transform: checked ? "translateX(24px)" : "translateX(0px)",
            }}
          />
        </span>
      </label>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  background: "#f4f8fb",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  color: "#0f172a",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "28px",
};

const eyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "12px",
  marginBottom: "8px",
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle = {
  maxWidth: "760px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const notice = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const emptyState = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "22px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  marginBottom: "20px",
};

const iconCircle = {
  width: "44px",
  height: "44px",
  borderRadius: "14px",
  background: "#ecfeff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "21px",
};

const cardTitle = {
  margin: "0 0 4px",
  color: "#0f172a",
  fontSize: "20px",
};

const cardSubtitle = {
  color: "#64748b",
  lineHeight: 1.5,
  margin: 0,
  fontSize: "13px",
};

const field = {
  marginBottom: "14px",
};

const labelStyle = {
  display: "block",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "6px",
};

const input = {
  width: "100%",
  padding: "10px 11px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const textarea = {
  width: "100%",
  minHeight: "92px",
  padding: "10px 11px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
  fontFamily: "Arial, sans-serif",
};

const select = {
  width: "100%",
  padding: "10px 11px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const colourGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "14px",
};

const colorInput = {
  width: "100%",
  height: "42px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  background: "#ffffff",
  cursor: "pointer",
};

const toggleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "12px 0",
  borderBottom: "1px solid #f1f5f9",
};

const toggleLabel = {
  margin: 0,
  color: "#334155",
  fontWeight: 700,
};

const switchLabel = {
  cursor: "pointer",
};

const switchSlider = {
  width: "52px",
  height: "28px",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  padding: "2px",
  transition: "0.2s",
};

const switchCircle = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  background: "#ffffff",
  transition: "0.2s",
};

const buttonRow = {
  marginTop: "24px",
  display: "flex",
  justifyContent: "flex-end",
};

const saveButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "12px 20px",
  fontWeight: 800,
  cursor: "pointer",
};