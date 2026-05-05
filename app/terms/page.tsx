import Link from "next/link";

export default function TermsPage() {
  return (
    <main style={page}>
      <div style={card}>
        <Link href="/" style={back}>← Back</Link>

        <h1>WageFlow Terms & Conditions</h1>
        <p><strong>Last updated:</strong> 05 May 2026</p>

        <h3>1. Agreement</h3>
        <p>
          These Terms & Conditions constitute a binding agreement between
          WageFlow, a product of Lesedi Smart Solutions (Pty) Ltd and the
          subscribing employer ("the Client").
        </p>

        <h3>2. Nature of Service</h3>
        <p>
          WageFlow provides a digital platform for generating payslips and
          maintaining employee records. WageFlow does not act as a payroll
          bureau, accountant or registered tax practitioner.
        </p>

        <h3>3. Client Responsibilities</h3>
        <p>
          The Client is solely responsible for the accuracy of all employee,
          payroll and statutory information captured on the platform,
          including but not limited to salaries, deductions, UIF and tax data.
        </p>

        <h3>4. Compliance Disclaimer</h3>
        <p>
          WageFlow does not submit statutory returns to SARS, UIF or any
          regulatory authority. The Client remains fully responsible for all
          legal and regulatory compliance.
        </p>

        <h3>5. Fees and Payment</h3>
        <p>
          A once-off setup fee is payable upon onboarding. Monthly subscription
          fees are payable in advance. Services may be suspended if payment is
          not received within 14 days of the due date.
        </p>

        <h3>6. Limitation of Liability</h3>
        <p>
          WageFlow shall not be held liable for any loss, penalties, damages or
          compliance issues arising from incorrect data entered by the Client or
          misuse of the platform.
        </p>

        <h3>7. Data Usage</h3>
        <p>
          WageFlow processes employee and business data strictly for the purpose
          of providing the service and in accordance with applicable data
          protection laws.
        </p>

        <h3>8. Termination</h3>
        <p>
          Either party may terminate the service with 30 days written notice.
          Access may be revoked immediately in cases of non-payment or misuse.
        </p>

        <h3>9. Governing Law</h3>
        <p>
          This agreement is governed by the laws of the Republic of South Africa.
        </p>

        <h3>10. Acceptance</h3>
        <p>
          By proceeding to sign up and use WageFlow, the Client confirms that
          they have read, understood and agreed to these Terms & Conditions.
        </p>
      </div>
    </main>
  );
}

const page = { padding: 40 };
const card = { maxWidth: 800, margin: "0 auto" };
const back = { textDecoration: "none", color: "#0f766e" };