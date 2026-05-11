"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type RecordType = "confirmation" | "disciplinary" | "hr";

type Employee = Record<string, any>;
type Business = Record<string, any>;
type GenericRecord = Record<string, any>;

export default function EmployeeHrRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const letterRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [record, setRecord] = useState<GenericRecord | null>(null);
  const [recordType, setRecordType] = useState<RecordType>("confirmation");

  useEffect(() => {
    if (params?.id) {
      loadRecord(params.id as string);
    }
  }, [params]);

  async function loadRecord(recordId: string) {
    setLoading(true);
    setMessage("");

    const typeFromUrl = normaliseRecordType(searchParams.get("type"));
    setRecordType(typeFromUrl);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      router.push("/login");
      return;
    }

    const { data: account, error: accountError } = await supabase
      .from("employee_accounts")
      .select("employee_id, portal_enabled")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (accountError || !account || account.portal_enabled !== true) {
      setMessage("Employee portal access is not active.");
      setLoading(false);
      return;
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .eq("id", account.employee_id)
      .maybeSingle();

    if (employeeError || !employeeData) {
      setMessage("Employee record could not be loaded.");
      setLoading(false);
      return;
    }

    const tableName =
      typeFromUrl === "disciplinary"
        ? "disciplinary_records"
        : typeFromUrl === "hr"
        ? "hr_notes"
        : "employee_documents";

    const { data: recordData, error: recordError } = await supabase
      .from(tableName)
      .select("*")
      .eq("id", recordId)
      .eq("employee_id", employeeData.id)
      .maybeSingle();

    if (recordError || !recordData) {
      setMessage("This HR record could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: businessData } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", employeeData.business_id)
      .maybeSingle();

    setEmployee(employeeData);
    setBusiness(businessData || null);
    setRecord(recordData);
    setLoading(false);
  }

  function handlePrint() {
    if (!letterRef.current) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${documentTitle()}</title>
          <style>
            body {
              margin: 0;
              padding: 40px;
              font-family: Arial, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .print-shell {
              max-width: 760px;
              margin: 0 auto;
            }

            img {
              max-width: 90px;
              max-height: 90px;
              object-fit: contain;
            }

            @page {
              size: A4;
              margin: 18mm;
            }
          </style>
        </head>

        <body>
          <div class="print-shell">
            ${letterRef.current.innerHTML}
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  function businessName() {
    return (
      business?.trading_name ||
      business?.business_name ||
      business?.company_name ||
      business?.name ||
      "Business Name"
    );
  }

  function businessLogo() {
    return (
      business?.logo_url ||
      business?.company_logo_url ||
      business?.business_logo_url ||
      business?.logo ||
      ""
    );
  }

  function employeeName() {
    return (
      employee?.full_name ||
      `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
      "Employee"
    );
  }

  function employeePosition() {
    return employee?.position || employee?.job_title || employee?.role || "-";
  }

  function employeeStartDate() {
    return (
      employee?.start_date ||
      employee?.employment_start_date ||
      employee?.date_started ||
      "-"
    );
  }

  function employeeSalaryPaymentDate() {
    return employee?.salary_payment_date || "-";
  }

  function documentTitle() {
    if (!record) return "HR Record";

    if (recordType === "confirmation") {
      return record.document_name || "Confirmation of Employment";
    }

    if (recordType === "disciplinary") {
      return (
        record.title ||
        record.incident_type ||
        record.record_type ||
        "Disciplinary Record"
      );
    }

    return record.title || record.note_type || record.record_type || "HR Record";
  }

  function recordDate() {
    if (!record) return null;

    return (
      record.created_at ||
      record.uploaded_at ||
      record.issue_date ||
      record.incident_date ||
      record.record_date ||
      null
    );
  }

  function recordStatus() {
    if (!record) return "Recorded";
    return record.status || record.outcome || record.result || "Recorded";
  }

  if (loading) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={messageCard}>Loading HR record...</div>
        </div>
      </main>
    );
  }

  if (message || !employee || !record) {
    return (
      <main style={page}>
        <div style={shell}>
          <div style={messageCard}>{message || "HR record unavailable."}</div>
        </div>
      </main>
    );
  }

  const isConfirmation = recordType === "confirmation";

  return (
    <main style={page}>
      <div style={shell}>
        <section style={topBar}>
          <a href="/employee/hr-records" style={primaryButton}>
            ← Back to HR Records
          </a>

          {isConfirmation && (
            <button onClick={handlePrint} style={secondaryButton}>
              Print / Download
            </button>
          )}
        </section>

        <section style={pageHeader}>
          <h1 style={businessTitle}>{businessName()}</h1>
          <h2 style={pageTitle}>{documentTitle()}</h2>

          <p style={pageText}>
            This record is linked to your employee profile and was issued by
            your employer.
          </p>
        </section>

        <section style={recordCard}>
          {isConfirmation ? (
            <ConfirmationLetter
              refEl={letterRef}
              business={business}
              record={record}
              businessName={businessName()}
              businessLogo={businessLogo()}
              employeeName={employeeName()}
              employee={employee}
              employeePosition={employeePosition()}
              employeeStartDate={employeeStartDate()}
              employeeSalaryPaymentDate={employeeSalaryPaymentDate()}
            />
          ) : recordType === "disciplinary" ? (
            <DisciplinaryRecordView
              record={record}
              employee={employee}
              employeeName={employeeName()}
              businessName={businessName()}
            />
          ) : (
            <GeneralHrRecordView
              record={record}
              employee={employee}
              employeeName={employeeName()}
              businessName={businessName()}
            />
          )}
        </section>
      </div>
    </main>
  );
}

function ConfirmationLetter({
  refEl,
  business,
  businessName,
  businessLogo,
  employeeName,
  employee,
  employeePosition,
  employeeStartDate,
  employeeSalaryPaymentDate,
}: {
  refEl: React.RefObject<HTMLDivElement | null>;
  business: Business | null;
  record: GenericRecord;
  businessName: string;
  businessLogo: string;
  employeeName: string;
  employee: Employee;
  employeePosition: string;
  employeeStartDate: string;
  employeeSalaryPaymentDate: string;
}) {
  return (
    <div ref={refEl} style={letterPaper}>
      <div style={letterHeader}>
        {businessLogo && (
          <img src={businessLogo} alt="Company logo" style={letterLogo} />
        )}

        <div>
          <h2 style={letterBusinessName}>{businessName}</h2>

          <p style={letterContactDetails}>
            {business?.email && (
              <>
                Email: {business.email}
                <br />
              </>
            )}

            {business?.phone && (
              <>
                Phone: {business.phone}
                <br />
              </>
            )}

            {business?.address && <>Address: {business.address}</>}
          </p>

          <p style={letterDate}>
            Date:{" "}
            {new Date().toLocaleDateString("en-ZA", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}
          </p>
        </div>
      </div>

      <h1 style={letterTitle}>Confirmation of Employment</h1>

      <div style={letterBody}>
        <p>To Whom It May Concern</p>

        <p>
          This letter serves to confirm that <strong>{employeeName}</strong> is
          currently employed by <strong>{businessName}</strong>.
        </p>

        <p>Employee details are as follows:</p>

        <p>
          Employee Name: {employeeName}
          <br />
          ID Number: {employee?.id_number || "-"}
          <br />
          Position: {employeePosition}
          <br />
          Employment Type: {employee?.employment_type || "-"}
          <br />
          Employment Start Date: {formatDateValue(employeeStartDate)}
          <br />
          Salary Payment Date: {employeeSalaryPaymentDate}
        </p>

        <p>The employee is currently active on our records.</p>

        <p>This letter is issued upon request for confirmation purposes.</p>

        <p style={kindRegards}>Kind regards,</p>

        <div style={signatureLine} />

        <p style={signatureText}>
          {business?.contact_person || "Signatory Name"}
          <br />
          Signatory Position
          <br />
          {businessName}
        </p>
      </div>
    </div>
  );
}

function DisciplinaryRecordView({
  record,
  employee,
  employeeName,
  businessName,
}: {
  record: GenericRecord;
  employee: Employee;
  employeeName: string;
  businessName: string;
}) {
  return (
    <div>
      <h2 style={detailTitle}>
        {record.title || record.incident_type || "Disciplinary Record"}
      </h2>

      <div style={detailsGrid}>
        <Info label="Employer" value={businessName} />
        <Info label="Employee" value={employeeName} />
        <Info label="Employee Number" value={employee.employee_number} />
        <Info label="Department" value={employee.department} />
        <Info label="Position" value={employee.position} />
        <Info label="Record Date" value={formatDate(record.created_at)} />
        <Info label="Incident Date" value={formatDate(record.incident_date)} />
        <Info
          label="Status"
          value={record.status || record.outcome || record.result || "Recorded"}
        />
      </div>

      <TextBlock
        title="Incident Details"
        value={record.incident_description || record.description}
      />

      <TextBlock title="Action Taken" value={record.action_taken} />

      <TextBlock title="Additional Notes" value={record.notes || record.note} />
    </div>
  );
}

function GeneralHrRecordView({
  record,
  employee,
  employeeName,
  businessName,
}: {
  record: GenericRecord;
  employee: Employee;
  employeeName: string;
  businessName: string;
}) {
  return (
    <div>
      <h2 style={detailTitle}>
        {record.title || record.note_type || record.record_type || "HR Record"}
      </h2>

      <div style={detailsGrid}>
        <Info label="Employer" value={businessName} />
        <Info label="Employee" value={employeeName} />
        <Info label="Employee Number" value={employee.employee_number} />
        <Info label="Department" value={employee.department} />
        <Info label="Position" value={employee.position} />
        <Info label="Date" value={formatDate(record.created_at)} />
        <Info
          label="Status"
          value={record.status || record.outcome || record.result || "Recorded"}
        />
      </div>

      <TextBlock
        title="Record Details"
        value={
          record.notes ||
          record.note ||
          record.description ||
          record.reason ||
          "No additional notes provided."
        }
      />
    </div>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div style={infoItem}>
      <p style={infoLabel}>{label}</p>
      <p style={infoValue}>{value || "Not provided"}</p>
    </div>
  );
}

function TextBlock({ title, value }: { title: string; value?: string | null }) {
  return (
    <div style={textBlock}>
      <h3 style={textBlockTitle}>{title}</h3>
      <p style={textBlockText}>{value || "Not provided"}</p>
    </div>
  );
}

function normaliseRecordType(value: string | null): RecordType {
  if (value === "disciplinary") return "disciplinary";
  if (value === "hr") return "hr";
  return "confirmation";
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function formatDateValue(value?: string | null) {
  if (!value || value === "-") return "-";

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
  fontFamily: "Arial, sans-serif",
  background: "#f4f7fb",
  color: "#111827",
};

const shell: CSSProperties = {
  width: "100%",
  maxWidth: "980px",
  margin: "0 auto",
};

const topBar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const primaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#0f766e",
  border: "1px solid #0f766e",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
};

const secondaryButton: CSSProperties = {
  padding: "10px 16px",
  borderRadius: "14px",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  color: "#111827",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 700,
  cursor: "pointer",
};

const pageHeader: CSSProperties = {
  padding: "28px",
  borderRadius: "26px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  marginBottom: "18px",
  boxShadow: "0 16px 38px rgba(15, 23, 42, 0.06)",
};

const businessTitle: CSSProperties = {
  margin: 0,
  fontSize: "34px",
  lineHeight: 1.1,
  fontWeight: 800,
  color: "#0f766e",
};

const pageTitle: CSSProperties = {
  margin: "10px 0 0",
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const pageText: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "15px",
  lineHeight: 1.6,
  color: "#64748b",
};

const recordCard: CSSProperties = {
  background: "#ffffff",
  borderRadius: "28px",
  border: "1px solid #e5e7eb",
  padding: "28px",
  boxShadow: "0 18px 42px rgba(15, 23, 42, 0.07)",
};

const letterPaper: CSSProperties = {
  maxWidth: "760px",
  margin: "0 auto",
  background: "#ffffff",
  color: "#111827",
  padding: "20px",
};

const letterHeader: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: "22px",
  marginBottom: "34px",
};

const letterLogo: CSSProperties = {
  width: "86px",
  height: "86px",
  objectFit: "contain",
};

const letterBusinessName: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const letterContactDetails: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.55,
  color: "#374151",
};

const letterDate: CSSProperties = {
  margin: "14px 0 0",
  fontSize: "14px",
  color: "#374151",
};

const letterTitle: CSSProperties = {
  margin: "0 0 34px",
  textAlign: "center",
  fontSize: "28px",
  fontWeight: 500,
  color: "#111827",
};

const letterBody: CSSProperties = {
  fontSize: "16px",
  lineHeight: 1.75,
  color: "#1f2937",
};

const kindRegards: CSSProperties = {
  marginTop: "34px",
};

const signatureLine: CSSProperties = {
  width: "260px",
  height: "1px",
  background: "#111827",
  margin: "42px 0 12px",
};

const signatureText: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.7,
  color: "#1f2937",
};

const detailTitle: CSSProperties = {
  margin: "0 0 20px",
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const detailsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "12px",
  marginBottom: "18px",
};

const infoItem: CSSProperties = {
  padding: "14px",
  borderRadius: "16px",
  background: "#f8fafc",
  border: "1px solid #eef2f7",
};

const infoLabel: CSSProperties = {
  margin: "0 0 6px",
  fontSize: "12px",
  color: "#64748b",
  fontWeight: 800,
};

const infoValue: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#111827",
  lineHeight: 1.45,
};

const textBlock: CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  marginTop: "14px",
};

const textBlockTitle: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "14px",
  fontWeight: 800,
  color: "#334155",
};

const textBlockText: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.6,
  color: "#111827",
};

const messageCard: CSSProperties = {
  padding: "24px",
  borderRadius: "24px",
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  boxShadow: "0 14px 36px rgba(15, 23, 42, 0.06)",
};