import Link from "next/link";

export default function SetupSubmittedPage() {
  return (
    <main style={page}>
      <section style={card}>
        <div style={iconWrap}>
          <div style={icon}>✓</div>
        </div>

        <h1 style={title}>Setup Request Submitted</h1>

        <p style={subtitle}>
          Thank you for choosing WageFlow.
        </p>

        <p style={text}>
          Your setup request has been received successfully. Our team will
          review your business details and contact you regarding onboarding,
          setup confirmation and activation.
        </p>

        <div style={infoBox}>
          <h3 style={infoTitle}>What happens next?</h3>

          <ul style={list}>
            <li>Review of your submitted business information</li>
            <li>Setup fee confirmation and onboarding process</li>
            <li>Business profile and employer account setup</li>
            <li>Payslip template configuration</li>
            <li>Activation email with login instructions</li>
          </ul>
        </div>

        <div style={notice}>
          Estimated onboarding turnaround:
          <strong> 1 to 2 business days</strong>
        </div>

        <div style={buttonWrap}>
          <Link href="/" style={homeButton}>
            Return Home
          </Link>
        </div>

        <p style={support}>
          Support: info@wageflow.co.za
        </p>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #ecfdf5 0%, #f8fafc 100%)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "40px 20px",
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "100%",
  maxWidth: 700,
  background: "#ffffff",
  borderRadius: 28,
  padding: 40,
  border: "1px solid #d9e2ec",
  boxShadow: "0 20px 50px rgba(15, 118, 110, 0.12)",
};

const iconWrap = {
  display: "flex",
  justifyContent: "center",
  marginBottom: 24,
};

const icon = {
  width: 80,
  height: 80,
  borderRadius: "50%",
  background: "#dcfce7",
  color: "#166534",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 36,
  fontWeight: 800,
};

const title = {
  textAlign: "center" as const,
  fontSize: 36,
  color: "#102a43",
  marginBottom: 10,
};

const subtitle = {
  textAlign: "center" as const,
  fontSize: 18,
  color: "#0f766e",
  marginBottom: 24,
  fontWeight: 700,
};

const text = {
  textAlign: "center" as const,
  color: "#486581",
  lineHeight: 1.8,
  marginBottom: 28,
};

const infoBox = {
  background: "#f8fafc",
  border: "1px solid #d9e2ec",
  borderRadius: 18,
  padding: 24,
  marginBottom: 24,
};

const infoTitle = {
  color: "#102a43",
  marginBottom: 14,
};

const list = {
  color: "#486581",
  lineHeight: 2,
  paddingLeft: 20,
};

const notice = {
  background: "#ecfdf5",
  border: "1px solid #99f6e4",
  borderRadius: 14,
  padding: 18,
  textAlign: "center" as const,
  color: "#134e4a",
  marginBottom: 30,
};

const buttonWrap = {
  display: "flex",
  justifyContent: "center",
};

const homeButton = {
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  padding: "14px 28px",
  borderRadius: 999,
  fontWeight: 800,
};

const support = {
  textAlign: "center" as const,
  marginTop: 28,
  color: "#64748b",
  fontSize: 14,
};