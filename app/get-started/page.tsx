import Link from "next/link";

export default function GetStartedPage() {
  return (
    <main style={page}>
      <section style={card}>
        <Link href="/" style={homeButton}>← Home</Link>

        <img src="/wageflow-logo.png" alt="WageFlow Logo" style={logo} />

        <h1 style={title}>Before we start your WageFlow setup</h1>

        <p style={text}>
          WageFlow setup is completed by the WageFlow team after your request is submitted.
          Before submitting your setup request, please review the Privacy Policy and
          Terms & Conditions.
        </p>

        <p style={note}>
          The acceptance checkbox will appear after you have reviewed the Terms & Conditions.
        </p>

        <Link href="/privacy" style={button}>
          Review Privacy Policy
        </Link>
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #ecfdf5 0%, #f7fafc 100%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const card = {
  width: "100%",
  maxWidth: 620,
  background: "#ffffff",
  padding: 34,
  borderRadius: 24,
  border: "1px solid #d9e2ec",
  boxShadow: "0 18px 45px rgba(15, 118, 110, 0.12)",
  textAlign: "center" as const,
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

const logo = {
  width: 220,
  height: "auto",
  display: "block",
  margin: "0 auto 18px",
};

const title = {
  color: "#102a43",
  marginBottom: 12,
};

const text = {
  color: "#486581",
  lineHeight: 1.7,
};

const note = {
  background: "#ecfdf5",
  border: "1px solid #99f6e4",
  color: "#334e68",
  padding: 14,
  borderRadius: 14,
  lineHeight: 1.6,
  margin: "22px 0",
};

const button = {
  display: "inline-block",
  background: "#0f766e",
  color: "#ffffff",
  padding: "14px 24px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
};