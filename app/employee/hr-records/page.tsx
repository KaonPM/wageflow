"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
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

  const confirmationRecords = documents.filter((record) =>
    isConfirmationOfEmployment(record)
  );

  return (
    <main style={page}>
      <div style={shell}>
        <section style={pageHeader}>
          <div>
            <h1 style={companyTitle}>{employerName}</h1>

            <h2 style={pageTitle}>HR Records</h2>

            <p style={pageSubtitle}>
              View HR records shared by your employer. Confirmation letters can
              be opened for printing or saving from the record view.
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
            title="Confirmation of Employment"
            description="Employment confirmation letters saved to your employee records."
            emptyText="No confirmation of employment letters have been shared yet."
            records={confirmationRecords}
            type="confirmation"
          />

          <RecordSection
            title="Disciplinary Records"
            description="Disciplinary records linked to your employee profile."
            emptyText="No disciplinary records have been shared yet."
            records={disciplinaryRecords}
            type="disciplinary"
          />

          <RecordSection
            title="General HR Records"
            description="General HR notes and records linked to your profile."
            emptyText="No general HR records have been shared yet."
            records={notes}
            type="hr"
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
}: {
  title: string;
  description: string;
  emptyText: string;
  records: GenericRecord[];
  type: "confirmation" | "disciplinary" | "hr";
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
          {records.map((record, index) => (
            <RecordCard
              key={record.id || JSON.stringify(record)}
              record={record}
              type={type}
              index={index}
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
  index,
}: {
  record: GenericRecord;
  type: "confirmation" | "disciplinary" | "hr";
  index: number;
}) {
  const title = getRecordTitle(record, type, index);

  const date =
    record.created_at ||
    record.uploaded_at ||
    record.issue_date ||
    record.incident_date ||
    record.record_date ||
    null;

  return (
    <article style={recordCard}>
      <div style={recordTop}>
        <div>
          <h3 style={recordTitle}>{title}</h3>
          <p style={recordDate}>{formatDate(date)}</p>
        </div>

        <span style={statusBadge}>Recorded</span>
      </div>

      <div style={recordActions}>
        <a href={`/employee/hr-records/${record.id}`} style={viewButton}>
          View Record
        </a>
      </div>
    </article>
  );
}

function getRecordTitle(
  record: GenericRecord,
  type: "confirmation" | "disciplinary" | "hr",
  index: number
) {
  if (type === "confirmation") {
    return record.document_name || `Confirmation of Employment ${index + 1}`;
  }

  if (type === "disciplinary") {
    return record.title || record.incident_type || `Disciplinary Record ${index + 1}`;
  }

  return record.title || record.note_type || record.record_type || `HR Record ${index + 1}`;
}

function isConfirmationOfEmployment(record: GenericRecord) {
  const text = `${record.document_name || ""} ${
    record.document_category || ""
  } ${record.document_type || ""}`.toLowerCase();

  return text.includes("confirmation of employment");
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