"use client";

import { useState } from "react";

export default function WageFlowLandingPage() {
  const [form, setForm] = useState({
    name: "",
    business: "",
    email: "",
    phone: "",
    message: "",
  });

  const [openContact, setOpenContact] = useState<"form" | "details" | null>(
    null
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const subject = encodeURIComponent("WageFlow Enquiry");
    const body = encodeURIComponent(
      `Name: ${form.name}
Business: ${form.business}
Email: ${form.email}
Phone: ${form.phone}

Message:
${form.message}`
    );

    window.location.href = `mailto:info@wageflow.co.za?subject=${subject}&body=${body}`;
  }

  return (
    <main style={page}>
      <nav style={nav}>
        <div style={brand}>
          <img src="/wageflow-logo.png" alt="WageFlow Logo" style={logo} />
        </div>

        <div style={navLinks}>
          <a href="#home" style={navLink}>
            Home
          </a>
          <a href="#how-it-works" style={navLink}>
            How It Works
          </a>
          <a href="#pricing" style={navLink}>
            Pricing
          </a>
          <a href="#contact" style={navLink}>
            Contact
          </a>
          <a href="/login" style={loginButton}>
            Login
          </a>
        </div>
      </nav>

      <section id="home" style={hero}>
        <p style={eyebrow}>Staff Management Simplified</p>

        <h1 style={heroTitle}>
          Simple payslips, staff records and payroll organisation for small
          businesses.
        </h1>

        <p style={heroText}>
          WageFlow helps South African small businesses keep employee records,
          generate payslips and stay more organised without complicated payroll
          systems.
        </p>

        <div style={heroActions}>
          <a href="/signup" style={primaryButton}>
            Get Started
          </a>
          <a href="/example-payslip" style={secondaryButton}>
            View Example Payslip
          </a>
        </div>
      </section>

      <section id="how-it-works" style={section}>
        <h2 style={sectionTitle}>How WageFlow Works</h2>

        <div style={grid}>
          <div style={card}>
            <h3 style={cardTitle}>1. Set up your business</h3>
            <p style={cardText}>
              Add your business details, contact information and company logo
              for branded payslips.
            </p>
          </div>

          <div style={card}>
            <h3 style={cardTitle}>2. Add your employees</h3>
            <p style={cardText}>
              Capture staff details, employment records, pay information and
              basic employee history.
            </p>
          </div>

          <div style={card}>
            <h3 style={cardTitle}>3. Generate payslips</h3>
            <p style={cardText}>
              Create clear monthly payslips that employees can download and
              businesses can keep for records.
            </p>
          </div>
        </div>
      </section>

      <section id="pricing" style={sectionAlt}>
        <h2 style={sectionTitle}>Simple Pricing</h2>

        <p style={sectionIntro}>
          Built for small teams that need structure, records and professional
          payslips.
        </p>

        <div style={pricingGrid}>
          <div style={priceCard}>
            <h3 style={planName}>WageFlow Starter</h3>
            <p style={price}>
              R149 <span style={small}>per month</span>
            </p>
            <p style={planRange}>For 1 to 10 employees</p>

            <ul style={list}>
              <li>Staff records management</li>
              <li>Monthly payslip generation</li>
              <li>Downloadable payslips</li>
              <li>Basic employee record keeping</li>
              <li>Employer dashboard access</li>
            </ul>
          </div>

          <div style={priceCard}>
            <h3 style={planName}>WageFlow Growth</h3>
            <p style={price}>
              R249 <span style={small}>per month</span>
            </p>
            <p style={planRange}>For 11 to 20 employees</p>

            <ul style={list}>
              <li>Everything in Starter</li>
              <li>Expanded employee capacity</li>
              <li>Payslip history tracking</li>
              <li>Reports and summaries</li>
              <li>Staff record organisation</li>
            </ul>
          </div>
        </div>

        <div style={setupBox}>
          <h3 style={setupTitle}>Once-off Setup Fee: R499</h3>
          <p style={cardText}>
            Setup includes business profile setup, company logo upload for the
            payslip watermark, employer account configuration, employee
            structure setup, payslip template setup, and guided onboarding
            support.
          </p>
        </div>
      </section>

      <section id="contact" style={section}>
        <h2 style={sectionTitle}>Contact WageFlow</h2>

        <p style={sectionIntro}>
          Ready to organise your staff records and payslips? Choose an option
          below.
        </p>

        <div style={contactToggleWrap}>
          <button
            type="button"
            style={openContact === "form" ? contactToggleActive : contactToggle}
            onClick={() =>
              setOpenContact(openContact === "form" ? null : "form")
            }
          >
            Send Enquiry
          </button>

          <button
            type="button"
            style={
              openContact === "details" ? contactToggleActive : contactToggle
            }
            onClick={() =>
              setOpenContact(openContact === "details" ? null : "details")
            }
          >
            Contact Details
          </button>
        </div>

        {openContact === "form" && (
          <form onSubmit={handleSubmit} style={formStyle}>
            <input
              style={input}
              placeholder="Your name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />

            <input
              style={input}
              placeholder="Business name"
              value={form.business}
              onChange={(e) => setForm({ ...form, business: e.target.value })}
              required
            />

            <input
              style={input}
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />

            <input
              style={input}
              placeholder="Phone number"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />

            <textarea
              style={textarea}
              placeholder="Tell us what you need help with"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
            />

            <button type="submit" style={primaryButton}>
              Send Enquiry
            </button>
          </form>
        )}

        {openContact === "details" && (
          <div style={contactCard}>
            <h3 style={cardTitle}>WageFlow Contact Details</h3>

            <div style={contactDetails}>
              <p style={contactText}>
                Email:{" "}
                <a href="mailto:info@wageflow.co.za" style={textLink}>
                  info@wageflow.co.za
                </a>
              </p>

              <p style={contactText}>
                Website:{" "}
                <a
                  href="https://www.wageflow.co.za"
                  target="_blank"
                  rel="noreferrer"
                  style={textLink}
                >
                  www.wageflow.co.za
                </a>
              </p>

              <p style={contactText}>
                Call:{" "}
                <a href="tel:+27763616044" style={textLink}>
                  076 361 6044
                </a>
              </p>

              <p style={contactText}>
                WhatsApp:{" "}
                <a
                  href="https://wa.me/27763616044"
                  target="_blank"
                  rel="noreferrer"
                  style={textLink}
                >
                  076 361 6044
                </a>
              </p>
            </div>
          </div>
        )}
      </section>

      <footer style={footer}>
        <p>© {new Date().getFullYear()} WageFlow. All rights reserved.</p>
        <p>Powered by Lesedi Smart Solutions</p>

        <p style={footerSmall}>
          Lesedi Smart Solutions Registration Number: 2026/315790/07
        </p>

        <p style={footerSmall}>
          Information Regulator Registration Number: 2026-010141
        </p>

        <p style={footerDisclaimer}>
          WageFlow is a staff record and payslip management tool. WageFlow does
          not act as a payroll bureau, tax practitioner, accountant, labour
          consultant or SARS submission agent. Employers remain responsible for
          verifying payroll information, statutory deductions, UIF, PAYE, SDL,
          employment records and any required submissions to SARS, the
          Department of Employment and Labour or other authorities.
        </p>
      </footer>
    </main>
  );
}

const page = {
  fontFamily: "Arial, sans-serif",
  color: "#102a43",
  background: "#f7fafc",
};

const nav = {
  position: "sticky" as const,
  top: 0,
  zIndex: 10,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "10px 5%",
  background: "#ffffff",
  borderBottom: "1px solid #d9e2ec",
  boxShadow: "0 4px 16px rgba(15, 118, 110, 0.10)",
};

const brand = {
  display: "flex",
  alignItems: "center",
  transform: "translateY(-2px)",
};

const logo = {
  width: 250,
  height: "auto",
  objectFit: "contain" as const,
  display: "block",
};

const navLinks = {
  display: "flex",
  gap: 18,
  alignItems: "center",
  flexWrap: "wrap" as const,
};

const navLink = {
  color: "#102a43",
  textDecoration: "none",
  fontSize: 16,
  fontWeight: 800,
};

const loginButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: 999,
  textDecoration: "none",
  fontWeight: 800,
  boxShadow: "0 8px 18px rgba(15, 118, 110, 0.22)",
};

const hero = {
  padding: "50px 7% 70px",
  textAlign: "center" as const,
  background: "linear-gradient(180deg, #ecfdf5 0%, #f7fafc 100%)",
};

const eyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  letterSpacing: 1,
  textTransform: "uppercase" as const,
};

const heroTitle = {
  maxWidth: 850,
  margin: "0 auto",
  fontSize: 38,
  lineHeight: 1.2,
  color: "#102a43",
};

const heroText = {
  maxWidth: 720,
  margin: "24px auto",
  fontSize: 18,
  lineHeight: 1.7,
  color: "#486581",
};

const heroActions = {
  display: "flex",
  justifyContent: "center",
  gap: 14,
  flexWrap: "wrap" as const,
};

const primaryButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "14px 24px",
  borderRadius: 999,
  border: "none",
  textDecoration: "none",
  fontWeight: 800,
  cursor: "pointer",
  display: "inline-block",
};

const secondaryButton = {
  background: "#ffffff",
  color: "#0f766e",
  padding: "14px 24px",
  borderRadius: 999,
  border: "1px solid #0f766e",
  textDecoration: "none",
  fontWeight: 800,
};

const section = {
  padding: "70px 7%",
};

const sectionAlt = {
  padding: "70px 7%",
  background: "#ffffff",
};

const sectionTitle = {
  textAlign: "center" as const,
  fontSize: 34,
  marginBottom: 12,
};

const sectionIntro = {
  textAlign: "center" as const,
  maxWidth: 700,
  margin: "0 auto 36px",
  color: "#486581",
  fontSize: 17,
  lineHeight: 1.7,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 20,
};

const card = {
  background: "#ffffff",
  padding: 28,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
};

const cardTitle = {
  marginTop: 0,
  color: "#102a43",
};

const cardText = {
  color: "#486581",
  lineHeight: 1.7,
};

const pricingGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 22,
  maxWidth: 900,
  margin: "0 auto",
};

const priceCard = {
  background: "#f7fafc",
  padding: 30,
  borderRadius: 20,
  border: "1px solid #d9e2ec",
};

const planName = {
  fontSize: 22,
  marginTop: 0,
};

const price = {
  fontSize: 38,
  fontWeight: 900,
  color: "#0f766e",
  margin: "12px 0",
};

const small = {
  fontSize: 15,
  color: "#486581",
};

const planRange = {
  fontWeight: 700,
  color: "#334e68",
};

const list = {
  lineHeight: 2,
  color: "#486581",
};

const setupBox = {
  maxWidth: 900,
  margin: "24px auto 0",
  background: "#ecfdf5",
  padding: 26,
  borderRadius: 18,
  border: "1px solid #99f6e4",
};

const setupTitle = {
  marginTop: 0,
  color: "#0f766e",
};

const formStyle = {
  display: "grid",
  gap: 14,
  background: "#ffffff",
  padding: 26,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  maxWidth: 720,
  margin: "0 auto",
};

const input = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 15,
};

const textarea = {
  padding: 14,
  borderRadius: 12,
  border: "1px solid #bcccdc",
  fontSize: 15,
  minHeight: 130,
};

const contactCard = {
  background: "#ffffff",
  padding: 28,
  borderRadius: 18,
  border: "1px solid #e2e8f0",
  maxWidth: 720,
  margin: "0 auto",
};

const contactToggleWrap = {
  display: "flex",
  justifyContent: "center",
  gap: 12,
  flexWrap: "wrap" as const,
  marginBottom: 24,
};

const contactToggle = {
  background: "#ffffff",
  color: "#0f766e",
  padding: "12px 22px",
  borderRadius: 999,
  border: "1px solid #0f766e",
  fontWeight: 800,
  cursor: "pointer",
};

const contactToggleActive = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "12px 22px",
  borderRadius: 999,
  border: "1px solid #0f766e",
  fontWeight: 800,
  cursor: "pointer",
};

const contactDetails = {
  marginTop: 18,
  padding: 18,
  borderRadius: 14,
  background: "#f7fafc",
  border: "1px solid #d9e2ec",
};

const contactText = {
  color: "#334e68",
  lineHeight: 1.7,
};

const textLink = {
  color: "#0f766e",
  fontWeight: 700,
};

const footer = {
  padding: "32px 7%",
  textAlign: "center" as const,
  background: "#102a43",
  color: "#ffffff",
  fontSize: 14,
};

const footerSmall = {
  fontSize: 13,
  opacity: 0.85,
  marginTop: 6,
};

const footerDisclaimer = {
  fontSize: 12,
  opacity: 0.75,
  maxWidth: 850,
  margin: "14px auto 0",
  lineHeight: 1.6,
};