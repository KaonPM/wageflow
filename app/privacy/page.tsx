import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={page}>
      <div style={card}>
        <Link href="/" style={homeButton}>← Home</Link>

        <h1>WageFlow Privacy Policy</h1>
        <p><strong>Last updated:</strong> 05 May 2026</p>

        <h3>1. Introduction</h3>
        <p>
          WageFlow is operated by Lesedi Smart Solutions (Pty) Ltd. This policy
          explains how personal and business information is collected, used and
          protected in accordance with the Protection of Personal Information Act (POPIA).
        </p>

        <h3>2. Information Collected</h3>
        <p>
          We may collect business details, employer information, employee records,
          salary information and contact details necessary to provide the service.
        </p>

        <h3>3. Purpose of Collection</h3>
        <p>
          Information is collected solely to provide payslip generation, staff
          record management and related platform functionality.
        </p>

        <h3>4. Data Protection</h3>
        <p>
          WageFlow takes reasonable technical and organisational measures to
          protect personal information from loss, misuse or unauthorised access.
        </p>

        <h3>5. Sharing of Information</h3>
        <p>
          We do not sell or share personal information with third parties except
          where required by law or to provide essential platform services.
        </p>

        <h3>6. Client Responsibility</h3>
        <p>
          The Client is responsible for ensuring that they have the necessary
          consent to upload and process employee data on the platform.
        </p>

        <h3>7. Your Rights</h3>
        <p>
          You have the right to access, correct or request deletion of personal
          information, subject to legal and operational requirements.
        </p>

        <h3>8. Contact</h3>
        <p>
          For privacy-related queries, contact:
          <br />
          info@wageflow.co.za
        </p>

        <h3>9. Information Regulator</h3>
        <p>
          Information Regulator Registration Number: 2026-010141
        </p>

        <div style={actionRow}>
          <Link href="/get-started" style={secondaryButton}>
            ← Back to Get Started
          </Link>

          <Link href="/terms" style={continueButton}>
            Continue to Terms & Conditions
          </Link>
        </div>
      </div>
    </main>
  );
}

const page = {
  padding: 40,
  background: "#f7fafc",
  minHeight: "100vh",
  fontFamily: "Arial, sans-serif",
  color: "#102a43",
};

const card = {
  maxWidth: 800,
  margin: "0 auto",
  background: "#ffffff",
  padding: 34,
  borderRadius: 24,
  border: "1px solid #d9e2ec",
  boxShadow: "0 18px 45px rgba(15, 118, 110, 0.10)",
};

const homeButton = {
  display: "inline-block",
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
  marginBottom: 22,
};

const actionRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  flexWrap: "wrap" as const,
  marginTop: 30,
};

const secondaryButton = {
  display: "inline-block",
  background: "#ffffff",
  color: "#0f766e",
  padding: "12px 20px",
  borderRadius: 999,
  border: "1px solid #0f766e",
  textDecoration: "none",
  fontWeight: 800,
};

const continueButton = {
  display: "inline-block",
  background: "#0f766e",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
};