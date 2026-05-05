import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main style={page}>
      <div style={card}>
        <Link href="/" style={back}>← Back</Link>

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
      </div>
    </main>
  );
}

const page = { padding: 40 };
const card = { maxWidth: 800, margin: "0 auto" };
const back = { textDecoration: "none", color: "#0f766e" };