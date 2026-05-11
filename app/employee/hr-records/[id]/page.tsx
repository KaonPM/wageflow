"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  business_id: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  employee_number?: string | null;
  id_number?: string | null;
  position?: string | null;
  job_title?: string | null;
  role?: string | null;
  department?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  employment_start_date?: string | null;
  date_started?: string | null;
  salary_payment_date?: string | null;
  status?: string | null;
  employment_status?: string | null;
};

type BusinessProfile = {
  id: string;
  business_name?: string | null;
  trading_name?: string | null;
  name?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
  company_logo_url?: string | null;
  business_logo_url?: string | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contact_person?: string | null;
};

type DocumentRecord = {
  id: string;
  business_id: string;
  employee_id: string;
  document_name?: string | null;
  document_category?: string | null;
  file_url?: string | null;
  notes?: string | null;
  uploaded_at?: string | null;
  created_at?: string | null;
};

export default function EmployeeHrRecordViewPage() {
  const params = useParams();
  const router = useRouter();
  const letterRef = useRef<HTMLDivElement | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [record, setRecord] = useState<DocumentRecord | null>(null);

  useEffect(() => {
    if (params?.id) {
      loadRecord(params.id as string);
    }
  }, [params]);

  async function loadRecord(recordId: string) {
    setLoading(true);
    setMessage("");

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

    const { data: documentData, error: documentError } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("id", recordId)
      .eq("employee_id", employeeData.id)
      .maybeSingle();

    if (documentError || !documentData) {
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
    setRecord(documentData);
    setBusiness(businessData || null);
    setLoading(false);
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
    return (
      record?.document_category ||
      record?.document_name ||
      "HR Record"
    );
  }

  function isConfirmationLetter() {
    const text = `${record?.document_category || ""} ${
      record?.document_name || ""
    }`.toLowerCase();

    return text.includes("confirmation of employment");
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

  return (
    <main style={page}>
      <div style={shell}>
        <section style={topBar}>
          <a href="/employee/hr-records" style={primaryButton}>
            ← Back to HR Records
          </a>

          <div style={buttonGroup}>
            {record.file_url && !isConfirmationLetter() && (
              <a
                href={record.file_url}
                target="_blank"
                rel="noreferrer"
                style={secondaryButton}
              >
                Open File
              </a>
            )}

            <button onClick={handlePrint} style={secondaryButton}>
              Download / Print
            </button>
          </div>
        </section>

        <section style={pageHeader}>
          <h1 style={businessTitle}>{businessName()}</h1>
          <h2 style={pageTitle}>{documentTitle()}</h2>

          <p style={pageText}>
            This record is linked to your employee profile and was issued by
            your employer.
          </p>
        </section>

        <section style={letterCard}>
          {isConfirmationLetter() ? (
            <div ref={letterRef} style={letterPaper}>
              <div style={letterHeader}>
                {businessLogo() && (
                  <img
                    src={businessLogo()}
                    alt="Company logo"
                    style={letterLogo}
                  />
                )}

                <div>
                  <h2 style={letterBusinessName}>{businessName()}</h2>

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
                  This letter serves to confirm that{" "}
                  <strong>{employeeName()}</strong> is currently employed by{" "}
                  <strong>{businessName()}</strong>.
                </p>

                <p>Employee details are as follows:</p>

                <p>
                  Employee Name: {employeeName()}
                  <br />
                  ID Number: {employee?.id_number || "-"}
                  <br />
                  Position: {employeePosition()}
                  <br />
                  Employment Type: {employee?.employment_type || "-"}
                  <br />
                  Employment Start Date: {employeeStartDate()}
                  <br />
                  Salary Payment Date: {employeeSalaryPaymentDate()}
                </p>

                <p>The employee is currently active on our records.</p>

                <p>
                  This letter is issued upon request for confirmation purposes.
                </p>

                <p style={kindRegards}>Kind regards,</p>

                <div style={signatureLine} />

                <p style={signatureText}>
                  {business?.contact_person || "Signatory Name"}
                  <br />
                  Signatory Position
                  <br />
                  {businessName()}
                </p>
              </div>
            </div>
          ) : (
            <div style={genericRecord}>
              <h2 style={genericTitle}>{record.document_name || "HR Record"}</h2>

              <div style={genericGrid}>
                <Info label="Document Type" value={record.document_category} />
                <Info label="Employee" value={employeeName()} />
                <Info label="Employee Number" value={employee.employee_number} />
                <Info label="Date" value={formatDate(record.uploaded_at || record.created_at)} />
              </div>

              {record.notes && (
                <div style={notesBox}>
                  <p style={notesLabel}>Notes</p>
                  <p style={notesText}>{record.notes}</p>
                </div>
              )}

              {record.file_url ? (
                <a
                  href={record.file_url}
                  target="_blank"
                  rel="noreferrer"
                  style={primaryButton}
                >
                  Open attached file
                </a>
              ) : (
                <p style={pageText}>No file is attached to this record.</p>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Info({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div style={infoItem}>
      <p style={infoLabel}>{label}</p>
      <p style={infoValue}>{value || "Not provided"}</p>
    </div>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Not provided";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
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

const buttonGroup: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
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

const letterCard: CSSProperties = {
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

const genericRecord: CSSProperties = {
  padding: "8px",
};

const genericTitle: CSSProperties = {
  margin: "0 0 18px",
  fontSize: "24px",
  fontWeight: 800,
  color: "#111827",
};

const genericGrid: CSSProperties = {
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

const notesBox: CSSProperties = {
  padding: "16px",
  borderRadius: "18px",
  background: "#f8fafc",
  border: "1px solid #e5e7eb",
  marginBottom: "18px",
};

const notesLabel: CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  fontWeight: 800,
  color: "#64748b",
};

const notesText: CSSProperties = {
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