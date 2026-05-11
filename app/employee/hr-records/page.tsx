"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import { supabase } from "../../lib/supabaseClient";

type Employee = {
  id: string;
  business_id: string;
  full_name: string | null;
  employee_number: string | null;
  department: string | null;
  position: string | null;
};

type Business = {
  id: string;
  business_name: string | null;
  trading_name: string | null;
};

type GenericRecord = Record<string, any>;

export default function EmployeeHRRecordsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);

  const [documents, setDocuments] = useState<GenericRecord[]>([]);
  const [disciplinaryRecords, setDisciplinaryRecords] = useState<
    GenericRecord[]
  >([]);
  const [notes, setNotes] = useState<GenericRecord[]>([]);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: account } = await supabase
      .from("employee_accounts")
      .select("employee_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (!account?.employee_id) {
      setLoading(false);
      return;
    }

    const { data: employeeData } = await supabase
      .from("employees")
      .select(
        `
        id,
        business_id,
        full_name,
        employee_number,
        department,
        position
      `
      )
      .eq("id", account.employee_id)
      .maybeSingle();

    if (!employeeData) {
      setLoading(false);
      return;
    }

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id, business_name, trading_name")
      .eq("id", employeeData.business_id)
      .maybeSingle();

    const { data: documentData } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("employee_id", employeeData.id)
      .order("created_at", { ascending: false });

    const { data: disciplinaryData } = await supabase
      .from("disciplinary_records")
      .select("*")
      .eq("employee_id", employeeData.id)
      .order("created_at", { ascending: false });

    const { data: notesData } = await supabase
      .from("hr_notes")
      .select("*")
      .eq("employee_id", employeeData.id)
      .order("created_at", { ascending: false });

    setEmployee(employeeData as Employee);
    setBusiness((businessData || null) as Business | null);

    setDocuments(documentData || []);
    setDisciplinaryRecords(disciplinaryData || []);
    setNotes(notesData || []);

    setLoading(false);
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={loadingCard}>Loading HR records...</div>
        </div>
      </main>
    );
  }

  if (!employee) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={loadingCard}>Employee record could not be found.</div>
        </div>
      </main>
    );
  }

  const employerName =
    business?.trading_name || business?.business_name || "Your Employer";

  return (
    <main style={page}>
      <div style={shell}>
        <section style={pageHeader}>
          <div>
            <h1 style={companyTitle}>{employerName}</h1>

            <h2 style={pageTitle}>HR Records</h2>

            <p style={pageSubtitle}>
              View employee documents, disciplinary records, and employer HR
              notes linked to your profile.
            </p>
          </div>

          <div style={headerActions}>
            <Link href="/employee" style={backDashboardButton}>
              ← Back to Dashboard
            </Link>
          </div>
        </section>

        <section style={summaryGrid}>
          <SummaryCard
            label="Employee"
            value={employee.full_name || "Employee"}
            text={`${employee.employee_number || "No employee number"} · ${
              employee.department || "No department"
            }`}
          />
        </section>

        <section style={recordsGrid}>
          <RecordSection
            title="Employee Documents"
            description="Contracts, ID copies, onboarding documents, confirmations, and uploaded employee files."
            emptyText="No employee documents have been shared yet."
            records={documents}
            type="document"
            employerName={employerName}
            employee={employee}
          />

          <RecordSection
            title="Disciplinary Records"
            description="Warnings, disciplinary notes, incident outcomes, and employer comments."
            emptyText="No disciplinary records have been shared yet."
            records={disciplinaryRecords}
            type="disciplinary"
            employerName={employerName}
            employee={employee}
          />

          <RecordSection
            title="General HR Records"
            description="Employer HR notes, confirmations, and additional HR-related records."
            emptyText="No HR notes or records have been shared yet."
            records={notes}
            type="hr"
            employerName={employerName}
            employee={employee}
          />
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div style={summaryCard}>
      <p style={summaryLabel}>{label}</p>
      <h2 style={summaryValue}>{value}</h2>
      <p style={summaryText}>{text}</p>
    </div>
  );
}

function RecordSection({
  title,
  description,
  emptyText,
  records,
  type,
  employerName,
  employee,
}: {
  title: string;
  description: string;
  emptyText: string;
  records: GenericRecord[];
  type: "document" | "disciplinary" | "hr";
  employerName: string;
  employee: Employee;
}) {
  return (
    <section style={sectionCard}>
      <div style={sectionHeader}>
        <div>
          <h2 style={sectionTitle}>{title}</h2>
          <p style={sectionDescription}>{description}</p>
        </div>

        <span style={countBadge}>{records.length}</span>
      </div>

      {records.length === 0 ? (
        <div style={emptyState}>{emptyText}</div>
      ) : (
        <div style={recordList}>
          {records.map((record) => (
            <RecordCard
              key={record.id || JSON.stringify(record)}
              record={record}
              type={type}
              employerName={employerName}
              employee={employee}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RecordCard({
  record,
  type,
  employerName,
  employee,
}: {
  record: GenericRecord;
  type: "document" | "disciplinary" | "hr";
  employerName: string;
  employee: Employee;
}) {
  const title =
    record.title ||
    record.document_name ||
    record.document_title ||
    record.document_type ||
    record.document_category ||
    record.category ||
    record.note_type ||
    record.incident_type ||
    record.record_type ||
    fallbackTitle(type);

  const status =
    record.status || record.outcome || record.result || "Recorded";

  const date =
    record.created_at ||
    record.uploaded_at ||
    record.issue_date ||
    record.incident_date ||
    record.record_date ||
    null;

  const note =
    record.notes ||
    record.note ||
    record.description ||
    record.reason ||
    record.incident_description ||
    record.action_taken ||
    "No additional notes provided.";

  const fileUrl =
    record.file_url ||
    record.document_url ||
    record.attachment_url ||
    null;

  const recordContent = buildRecordContent({
    record,
    type,
    title,
    status,
    date,
    note,
    employerName,
    employee,
  });

  function printRecord() {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 48px;
              color: #334155;
            }

            .sheet {
              max-width: 780px;
              margin: 0 auto;
            }

            h1 {
              text-align: center;
              color: #0f172a;
              margin-bottom: 28px;
              font-size: 24px;
            }

            .meta {
              margin-bottom: 28px;
              font-size: 14px;
              line-height: 1.7;
            }

            .content {
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.8;
            }

            .footer {
              margin-top: 42px;
              padding-top: 18px;
              border-top: 1px solid #cbd5e1;
              font-size: 12px;
              color: #64748b;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <h1>${escapeHtml(title)}</h1>
            <div class="meta">
              <strong>${escapeHtml(employerName)}</strong><br />
              Employee: ${escapeHtml(employee.full_name || "Employee")}<br />
              Employee Number: ${escapeHtml(
                employee.employee_number || "N/A"
              )}<br />
              Department: ${escapeHtml(employee.department || "N/A")}<br />
              Date: ${escapeHtml(formatDate(date))}<br />
              Status: ${escapeHtml(status)}
            </div>
            <div class="content">${escapeHtml(recordContent)}</div>
            <div class="footer">
              Generated from WageFlow employee HR records.
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function downloadPdf() {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const left = 18;
    const top = 20;
    const width = 174;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text(String(title), 105, top, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    const metaLines = [
      employerName,
      `Employee: ${employee.full_name || "Employee"}`,
      `Employee Number: ${employee.employee_number || "N/A"}`,
      `Department: ${employee.department || "N/A"}`,
      `Date: ${formatDate(date)}`,
      `Status: ${status}`,
    ];

    let y = 34;

    metaLines.forEach((line) => {
      pdf.text(line, left, y);
      y += 6;
    });

    y += 6;

    const contentLines = pdf.splitTextToSize(recordContent, width);

    pdf.setFontSize(11);

    contentLines.forEach((line: string) => {
      if (y > 280) {
        pdf.addPage();
        y = 20;
      }

      pdf.text(line, left, y);
      y += 6;
    });

    if (y > 260) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFontSize(9);
    pdf.setTextColor(100);
    pdf.text("Generated from WageFlow employee HR records.", left, y + 14);

    pdf.save(`${String(title).replace(/\s+/g, "-")}.pdf`);
  }

  return (
    <article style={recordCard}>
      <div style={recordTop}>
        <div>
          <h3 style={recordTitle}>{title}</h3>
          <p style={recordDate}>{formatDate(date)}</p>
        </div>

        <span style={statusBadge}>{status}</span>
      </div>

      <p style={recordNote}>{note}</p>

      <div style={recordActions}>
        {fileUrl ? (
          <a href={fileUrl} target="_blank" style={viewButton}>
            View
          </a>
        ) : null}

        <button type="button" style={secondaryButton} onClick={printRecord}>
          Print
        </button>

        <button type="button" style={secondaryButton} onClick={downloadPdf}>
          Download PDF
        </button>
      </div>
    </article>
  );
}

function buildRecordContent({
  record,
  type,
  title,
  status,
  date,
  note,
  employerName,
  employee,
}: {
  record: GenericRecord;
  type: "document" | "disciplinary" | "hr";
  title: string;
  status: string;
  date: string | null;
  note: string;
  employerName: string;
  employee: Employee;
}) {
  if (type === "disciplinary") {
    return `${title}

Employer: ${employerName}
Employee: ${employee.full_name || "Employee"}
Employee Number: ${employee.employee_number || "N/A"}
Department: ${employee.department || "N/A"}
Position: ${employee.position || "N/A"}

Record Date: ${formatDate(date)}
Incident Date: ${formatDate(record.incident_date || null)}
Status: ${status}

Incident Details:
${record.incident_description || "No incident details provided."}

Action Taken:
${record.action_taken || "No action recorded."}

Additional Notes:
${record.notes || "No additional notes provided."}`;
  }

  return `${title}

Employer: ${employerName}
Employee: ${employee.full_name || "Employee"}
Employee Number: ${employee.employee_number || "N/A"}
Department: ${employee.department || "N/A"}
Position: ${employee.position || "N/A"}

Date: ${formatDate(date)}
Status: ${status}

${note}`;
}

function fallbackTitle(type: "document" | "disciplinary" | "hr") {
  if (type === "document") return "Employee Document";
  if (type === "disciplinary") return "Disciplinary Record";
  return "HR Record";
}

function formatDate(value: string | null) {
  if (!value) return "No date recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const page: CSSProperties = {
  minHeight: "100vh",
  padding: "32px",
  background: "#f4f7fb",
  fontFamily: "Arial, sans-serif",
};

const shell: CSSProperties = {
  width: "100%",
  maxWidth: "1180px",
  margin: "0 auto",
};

const loadingCard: CSSProperties = {
  padding: "24px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e3e8ef",
};

const pageHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  padding: "34px",
  borderRadius: "22px",
  background: "#ffffff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
  marginBottom: "24px",
};

const companyTitle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "34px",
  lineHeight: 1.1,
  color: "#0f766e",
  fontWeight: 900,
};

const pageTitle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "22px",
  color: "#172033",
};

const pageSubtitle: CSSProperties = {
  margin: 0,
  fontSize: "15px",
  color: "#52616f",
  lineHeight: 1.5,
};

const headerActions: CSSProperties = {
  display: "flex",
  gap: "10px",
};

const backDashboardButton: CSSProperties = {
  padding: "11px 16px",
  borderRadius: "12px",
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 800,
};

const summaryGrid: CSSProperties = {
  display: "flex",
  gap: "16px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const summaryCard: CSSProperties = {
  padding: "18px",
  borderRadius: "16px",
  background: "#ffffff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 6px 18px rgba(16, 42, 67, 0.05)",
  maxWidth: "320px",
  minWidth: "260px",
};

const summaryLabel: CSSProperties = {
  margin: "0 0 6px",
  color: "#60758a",
  fontSize: "12px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.3px",
};

const summaryValue: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "16px",
  color: "#102a43",
  fontWeight: 700,
  lineHeight: 1.3,
};

const summaryText: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  lineHeight: 1.4,
  color: "#60758a",
};

const recordsGrid: CSSProperties = {
  display: "grid",
  gap: "18px",
};

const sectionCard: CSSProperties = {
  padding: "22px",
  borderRadius: "18px",
  background: "#ffffff",
  border: "1px solid #e3e8ef",
  boxShadow: "0 10px 24px rgba(16, 42, 67, 0.06)",
};

const sectionHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  marginBottom: "18px",
};

const sectionTitle: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "22px",
  color: "#172033",
};

const sectionDescription: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#60758a",
  lineHeight: 1.5,
};

const countBadge: CSSProperties = {
  minWidth: "34px",
  height: "34px",
  borderRadius: "999px",
  background: "#eef7f6",
  color: "#0f766e",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
};

const emptyState: CSSProperties = {
  padding: "18px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  color: "#60758a",
  fontSize: "14px",
};

const recordList: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "14px",
};

const recordCard: CSSProperties = {
  padding: "16px",
  borderRadius: "16px",
  border: "1px solid #e3e8ef",
  background: "#ffffff",
};

const recordTop: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "10px",
};

const recordTitle: CSSProperties = {
  margin: "0 0 4px",
  fontSize: "16px",
  color: "#172033",
};

const recordDate: CSSProperties = {
  margin: 0,
  fontSize: "13px",
  color: "#60758a",
};

const statusBadge: CSSProperties = {
  padding: "7px 11px",
  borderRadius: "999px",
  background: "#eef7f6",
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 800,
};

const recordNote: CSSProperties = {
  margin: "0 0 12px",
  fontSize: "14px",
  lineHeight: 1.5,
  color: "#334e68",
};

const recordActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  marginTop: "16px",
  flexWrap: "wrap",
};

const viewButton: CSSProperties = {
  display: "inline-flex",
  padding: "9px 13px",
  borderRadius: "11px",
  background: "#0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "13px",
  fontWeight: 800,
};

const secondaryButton: CSSProperties = {
  border: "1px solid #d7e5e4",
  background: "#ffffff",
  color: "#176f7a",
  borderRadius: "10px",
  padding: "9px 13px",
  fontSize: "13px",
  fontWeight: 800,
  cursor: "pointer",
};