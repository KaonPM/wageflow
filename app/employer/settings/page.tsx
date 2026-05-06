"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function EmployerSettingsPage() {
  const router = useRouter();

  const [settings, setSettings] = useState({
    primaryColor: "#0f766e",
    secondaryColor: "#f59e0b",
    payeEnabled: true,
    uifEnabled: true,
    pensionEnabled: false,
    medicalAidEnabled: false,
    showLeaveBalances: true,
    defaultPaymentMethod: "Bank Transfer",
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function handleToggle(field: keyof typeof settings) {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field],
    }));
  }

  function handleSave() {
    setSaving(true);
    setMessage("Settings saved successfully.");

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
            Configure branding, payroll behaviour and payslip preferences for your
            business.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={grid}>
        <div style={card}>
          <div style={cardHeader}>
            <div style={iconCircle}>🎨</div>

            <div>
              <h2 style={cardTitle}>Payslip Branding</h2>
              <p style={cardSubtitle}>
                Personalise your payslip appearance and company identity.
              </p>
            </div>
          </div>

          <div style={field}>
            <label style={label}>Primary Colour</label>
            <input
              type="color"
              value={settings.primaryColor}
              onChange={(e) =>
                setSettings({ ...settings, primaryColor: e.target.value })
              }
              style={colorInput}
            />
          </div>

          <div style={field}>
            <label style={label}>Secondary Colour</label>
            <input
              type="color"
              value={settings.secondaryColor}
              onChange={(e) =>
                setSettings({ ...settings, secondaryColor: e.target.value })
              }
              style={colorInput}
            />
          </div>

          <div style={field}>
            <label style={label}>Company Logo</label>
            <input type="file" style={fileInput} />
          </div>
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div style={iconCircle}>💰</div>

            <div>
              <h2 style={cardTitle}>Payroll Settings</h2>
              <p style={cardSubtitle}>
                Configure payroll deductions and payslip behaviour.
              </p>
            </div>
          </div>

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
        </div>

        <div style={card}>
          <div style={cardHeader}>
            <div style={iconCircle}>🏦</div>

            <div>
              <h2 style={cardTitle}>Payment Preferences</h2>
              <p style={cardSubtitle}>
                Select the default payment method for payroll processing.
              </p>
            </div>
          </div>

          <div style={field}>
            <label style={label}>Default Payment Method</label>

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
              <option value="Mobile Money">Mobile Money</option>
            </select>
          </div>
        </div>
      </section>

      <div style={buttonRow}>
        <button onClick={handleSave} style={saveButton} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </main>
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
  maxWidth: "720px",
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
  marginBottom: "18px",
  fontWeight: 700,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "24px",
};

const card = {
  background: "#ffffff",
  borderRadius: "18px",
  padding: "26px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 10px 30px rgba(15, 118, 110, 0.08)",
};

const cardHeader = {
  display: "flex",
  gap: "16px",
  alignItems: "flex-start",
  marginBottom: "26px",
};

const iconCircle = {
  width: "48px",
  height: "48px",
  borderRadius: "14px",
  background: "#ecfeff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const cardTitle = {
  margin: "0 0 6px",
  color: "#0f172a",
  fontSize: "20px",
};

const cardSubtitle = {
  margin: 0,
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const field = {
  marginBottom: "18px",
};

const label = {
  display: "block",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
  marginBottom: "8px",
};

const colorInput = {
  width: "100%",
  height: "46px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  padding: "4px",
  background: "#ffffff",
};

const fileInput = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
};

const select = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const toggleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  padding: "14px 0",
  borderBottom: "1px solid #e2e8f0",
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
  background: "#ffffff",
  borderRadius: "50%",
  display: "block",
  transition: "0.2s",
};

const buttonRow = {
  marginTop: "26px",
  display: "flex",
  justifyContent: "flex-end",
};

const saveButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "12px",
  padding: "13px 22px",
  fontWeight: 800,
  cursor: "pointer",
};