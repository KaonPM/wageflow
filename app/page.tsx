"use client";

import Image from "next/image";

export default function Home() {
  return (
    <main style={container}>
      <nav style={nav}>
        <div>
          <Image src="/wageflow-logo.png" alt="WageFlow" width={140} height={40} />
        </div>

        <div style={navLinks}>
          <a href="#" style={link}>Home</a>
          <a href="#how" style={link}>How It Works</a>
          <a href="#pricing" style={link}>Pricing</a>
          <a href="#contact" style={link}>Contact</a>

          <a href="/login" style={buttonLink}>
            <button style={cta}>Get Started</button>
          </a>
        </div>
      </nav>

      <section style={hero}>
        <h1 style={headline}>Simple payslips and staff records for small businesses</h1>

        <p style={tagline}>STAFF MANAGEMENT SIMPLIFIED</p>

        <p style={subtext}>
          WageFlow helps you create payslips, keep staff records, manage UIF,
          and keep your team organised without complicated payroll systems.
        </p>

        <div style={buttons}>
          <a href="/login" style={buttonLink}>
            <button style={primaryBtn}>Get Started</button>
          </a>

          <button style={secondaryBtn}>View Example Payslip</button>
        </div>
      </section>

      <section style={features}>
        <h2 style={sectionTitle}>What WageFlow helps you do</h2>

        <div style={grid}>
          <div style={card}>Create simple payslips</div>
          <div style={card}>Keep employee records</div>
          <div style={card}>Calculate UIF deductions</div>
          <div style={card}>Track leave and absence</div>
          <div style={card}>Record disciplinary actions</div>
          <div style={card}>Store payslip history</div>
        </div>
      </section>

      <section id="how" style={howSection}>
        <h2 style={sectionTitle}>How WageFlow works</h2>

        <div style={steps}>
          <div style={step}>Add your business and staff</div>
          <div style={step}>Capture earnings and deductions</div>
          <div style={step}>Generate payslips instantly</div>
          <div style={step}>Employees access payslips anytime</div>
        </div>
      </section>

      <section id="pricing" style={pricingSection}>
        <h2 style={sectionTitle}>Simple pricing</h2>

        <div style={pricingCard}>
          <p style={planName}>WageFlow Starter</p>
          <p style={price}>R99/month</p>
          <p style={setup}>R499 once-off setup fee required</p>

          <p style={pricingText}>
            Includes business setup, payslip branding, staff setup guidance,
            employee access, and simple payroll record keeping.
          </p>

          <a href="/login" style={buttonLink}>
            <button style={primaryBtn}>Start Setup</button>
          </a>
        </div>
      </section>

      <section id="contact" style={contactSection}>
        <h2 style={sectionTitle}>Ready to organise your staff records?</h2>

        <p style={contactText}>
          Start with WageFlow and keep payslips, staff details, leave records,
          disciplinary notes, and payroll history in one place.
        </p>

        <a href="/login" style={buttonLink}>
          <button style={primaryBtn}>Get Started</button>
        </a>
      </section>

      <section style={complianceSection}>
        <p style={complianceText}>
          WageFlow provides tools for payslip generation, staff record management,
          UIF calculations, and basic payroll record keeping. Employers remain
          responsible for ensuring compliance with SARS, UIF, and applicable
          labour regulations.
        </p>
      </section>

      <footer style={footer}>
        <p>© WageFlow. Staff Management Simplified</p>
        <p style={footerLine}>Powered by Lesedi Smart Solutions (Pty) Ltd</p>
        <p style={footerSmall}>Registration No: 2026/315790/07</p>
        <p style={footerSmall}>
          Information Regulator Registration No: 2027-010141
        </p>
      </footer>
    </main>
  );
}

const container = {
  fontFamily: "Arial, sans-serif",
  backgroundColor: "#ffffff",
};

const nav = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "20px 40px",
  borderBottom: "1px solid #eee",
  position: "sticky" as const,
  top: 0,
  backgroundColor: "#ffffff",
  zIndex: 10,
};

const navLinks = {
  display: "flex",
  gap: "20px",
  alignItems: "center",
};

const link = {
  fontSize: "14px",
  color: "#333",
  cursor: "pointer",
  textDecoration: "none",
};

const buttonLink = {
  textDecoration: "none",
};

const cta = {
  backgroundColor: "#0f766e",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
};

const hero = {
  textAlign: "center" as const,
  padding: "80px 20px",
};

const headline = {
  fontSize: "32px",
  fontWeight: "600",
  color: "#0f766e",
  maxWidth: "640px",
  margin: "0 auto",
};

const tagline = {
  fontSize: "12px",
  letterSpacing: "3px",
  marginTop: "10px",
  color: "#888",
};

const subtext = {
  marginTop: "20px",
  fontSize: "16px",
  color: "#555",
  maxWidth: "560px",
  marginLeft: "auto",
  marginRight: "auto",
  lineHeight: "1.6",
};

const buttons = {
  marginTop: "30px",
  display: "flex",
  justifyContent: "center",
  gap: "15px",
  flexWrap: "wrap" as const,
};

const primaryBtn = {
  backgroundColor: "#0f766e",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: "6px",
  border: "none",
  cursor: "pointer",
};

const secondaryBtn = {
  backgroundColor: "#fff",
  color: "#0f766e",
  padding: "12px 20px",
  borderRadius: "6px",
  border: "1px solid #0f766e",
  cursor: "pointer",
};

const features = {
  padding: "60px 20px",
  textAlign: "center" as const,
  backgroundColor: "#fafafa",
};

const sectionTitle = {
  fontSize: "22px",
  marginBottom: "30px",
  color: "#1f2937",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
  maxWidth: "850px",
  margin: "0 auto",
};

const card = {
  padding: "20px",
  border: "1px solid #eee",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#374151",
};

const howSection = {
  padding: "60px 20px",
  textAlign: "center" as const,
};

const steps = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "20px",
  maxWidth: "850px",
  margin: "0 auto",
};

const step = {
  padding: "20px",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  backgroundColor: "#ffffff",
  color: "#374151",
};

const pricingSection = {
  padding: "60px 20px",
  textAlign: "center" as const,
  backgroundColor: "#fafafa",
};

const pricingCard = {
  maxWidth: "420px",
  margin: "0 auto",
  padding: "30px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  backgroundColor: "#ffffff",
};

const planName = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#0f766e",
};

const price = {
  fontSize: "30px",
  fontWeight: "700",
  marginTop: "10px",
  color: "#111827",
};

const setup = {
  fontSize: "14px",
  marginTop: "6px",
  color: "#b8860b",
};

const pricingText = {
  fontSize: "14px",
  lineHeight: "1.6",
  color: "#555",
  marginTop: "18px",
  marginBottom: "22px",
};

const contactSection = {
  padding: "60px 20px",
  textAlign: "center" as const,
};

const contactText = {
  maxWidth: "560px",
  margin: "0 auto 24px",
  color: "#555",
  lineHeight: "1.6",
};

const complianceSection = {
  padding: "40px 20px",
  textAlign: "center" as const,
};

const complianceText = {
  fontSize: "13px",
  color: "#777",
  maxWidth: "680px",
  margin: "0 auto",
  lineHeight: "1.6",
};

const footer = {
  textAlign: "center" as const,
  padding: "30px",
  borderTop: "1px solid #eee",
  fontSize: "14px",
  color: "#888",
};

const footerLine = {
  marginTop: "6px",
};

const footerSmall = {
  marginTop: "4px",
  fontSize: "12px",
  color: "#aaa",
};