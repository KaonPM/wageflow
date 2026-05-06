"use client";

import { useState } from "react";

export default function EmployerSettingsPage() {
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

  function handleToggle(field: keyof typeof settings) {
    setSettings((prev) => ({
      ...prev,
      [field]: !prev[field as keyof typeof prev],
    }));
  }

  function handleSave() {
    alert("Settings saved successfully.");
  }

  return (
    <main style={page}>
      <div style={headerSection}>
        <h1 style={title}>Employer Settings</h1>

        <p style={subtitle}>
          Configure branding, payroll behaviour and payslip preferences for your
          business.
        </p>
      </div>

      <div style={grid}>
        <section style={card}>
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
        </section>

        <section style={card}>
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
        </section>

        <section style={card}>
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
              <option>Bank Transfer</option>
              <option>Cash</option>
              <option>Cheque</option>
              <option>Mobile Money</option>
            </select>
          </div>
        </section>
      </div>

      <div style={buttonRow}>
        <button onClick={handleSave} style={saveButton}>
          Save Settings
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
      <div>
        <p style={toggleLabel}>{label}</p>
      </div>

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
              transform: checked
                ? "translateX(24px)"
                : "translateX(0px)",
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
  padding: "40px",
  fontFamily: "Arial, sans-serif",
};

const headerSection = {
  marginBottom: "32px",
};

const title = {
  fontSize: "32px",
  color: "#0f766e",
  marginBottom: "10px",
  fontWeight: "bold",
};

const subtitle = {
  color: "#64748b",
  fontSize: "15px",
  maxWidth: "700px",
  lineHeight: 1.6,
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
  width: "50px",
  height: "50px",
  borderRadius: "14px",
  background: "#e6fffb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "22px",
};

const cardTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "20px",
};

const cardSubtitle = {
  marginTop: "6px",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const field = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
  marginBottom: "22px",
};

const label = {
  fontWeight: 600,
  color: "#334155",
};

const colorInput = {
  width: "90px",
  height: "50px",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  background: "transparent",
};

const fileInput = {
  padding: "12px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  background: "#fff",
};

const toggleRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 0",
  borderBottom: "1px solid #f1f5f9",
};

const toggleLabel = {
  margin: 0,
  color: "#0f172a",
  fontWeight: 600,
};

const switchLabel = {
  position: "relative" as const,
  display: "inline-block",
};

const switchSlider = {
  width: "52px",
  height: "28px",
  borderRadius: "999px",
  position: "relative" as const,
  transition: "0.3s",
  display: "flex",
  alignItems: "center",
  padding: "2px",
};

const switchCircle = {
  width: "22px",
  height: "22px",
  background: "#ffffff",
  borderRadius: "50%",
  transition: "0.3s",
};

const select = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  fontSize: "15px",
};

const buttonRow = {
  marginTop: "34px",
  display: "flex",
  justifyContent: "flex-end",
};

const saveButton = {
  background: "linear-gradient(135deg, #0f766e, #14b8a6)",
  color: "#ffffff",
  border: "none",
  padding: "14px 24px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: "15px",
  boxShadow: "0 10px 25px rgba(15, 118, 110, 0.25)",
};