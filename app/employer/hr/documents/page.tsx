"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type DocumentRecord = {
  id: string;
  business_id: string;
  employee_id: string;
  document_name: string;
  document_category: string;
  file_url: string;
  notes: string | null;
  uploaded_at: string;
};

export default function EmployeeDocumentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Contract");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  useEffect(() => {
    initialisePage();
  }, []);

  async function initialisePage() {
    await fetchEmployees();
    await fetchDocuments();
  }

  async function getBusinessId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.business_id) return profile.business_id;

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("employer_id", user.id)
      .maybeSingle();

    return business?.id || null;
  }

  async function fetchEmployees() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data } = await supabase
      .from("employees")
      .select("id, first_name, last_name")
      .eq("business_id", businessId)
      .order("first_name");

    setEmployees(data || []);
  }

  async function fetchDocuments() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data, error } = await supabase
      .from("employee_documents")
      .select("*")
      .eq("business_id", businessId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setDocuments([]);
      return;
    }

    setDocuments(data || []);
  }

  function employeeName(employee_id: string) {
    const employee = employees.find((item) => item.id === employee_id);

    return (
      `${employee?.first_name || ""} ${employee?.last_name || ""}`.trim() ||
      "Employee"
    );
  }

  function clearForm() {
    setEmployeeId("");
    setDocumentName("");
    setDocumentCategory("Contract");
    setNotes("");
    setFile(null);
    setFileInputKey((current) => current + 1);
  }

  const employeeRows = useMemo(() => {
    return employees.map((employee) => {
      const employeeDocuments = documents.filter(
        (document) => document.employee_id === employee.id
      );

      const latestDocument = employeeDocuments[0] || null;

      return {
        employee,
        latestDocument,
        documentCount: employeeDocuments.length,
      };
    });
  }, [employees, documents]);

  const selectedEmployeeDocuments = useMemo(() => {
    if (!selectedEmployeeId) return [];

    return documents.filter(
      (document) => document.employee_id === selectedEmployeeId
    );
  }, [documents, selectedEmployeeId]);

  async function uploadDocument() {
    setMessage("");

    if (!employeeId || !documentName || !file) {
      setMessage("Please complete all required fields.");
      return;
    }

    setSaving(true);

    const businessId = await getBusinessId();

    if (!businessId) {
      setMessage("Business profile not found.");
      setSaving(false);
      return;
    }

    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${businessId}/${employeeId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("employee-documents")
      .upload(filePath, file);

    if (uploadError) {
      setMessage(uploadError.message);
      setSaving(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("employee-documents")
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase
      .from("employee_documents")
      .insert([
        {
          business_id: businessId,
          employee_id: employeeId,
          document_name: documentName,
          document_category: documentCategory,
          file_url: urlData.publicUrl,
          notes,
        },
      ]);

    if (insertError) {
      setMessage(insertError.message);
      setSaving(false);
      return;
    }

    clearForm();
    setShowUploadForm(false);
    setSelectedEmployeeId(employeeId);
    setMessage("Document uploaded successfully.");
    await fetchDocuments();

    setSaving(false);
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>Employee Documents</h1>

          <p style={subtitle}>
            Upload contracts, IDs, certificates and employee HR documents.
          </p>
        </div>

        <Link href="/employer/hr" style={backButton}>
          ← Back to HR Records
        </Link>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <h2 style={sectionTitleNoMargin}>Document Upload</h2>
            <p style={smallText}>
              Keep the form closed until you need to add a new document.
            </p>
          </div>

          <button
            style={button}
            onClick={() => {
              setMessage("");
              setShowUploadForm((current) => !current);
            }}
          >
            {showUploadForm ? "Close Form" : "+ Upload Document"}
          </button>
        </div>

        {showUploadForm && (
          <div style={formArea}>
            <div style={grid}>
              <div>
                <label style={label}>Employee</label>

                <select
                  style={input}
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                >
                  <option value="">Select employee</option>

                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.first_name} {employee.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={label}>Document Name</label>

                <input
                  style={input}
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Example: Employment contract"
                />
              </div>

              <div>
                <label style={label}>Document Type</label>

                <select
                  style={input}
                  value={documentCategory}
                  onChange={(e) => setDocumentCategory(e.target.value)}
                >
                  <option>Contract</option>
                  <option>ID Document</option>
                  <option>Proof of Address</option>
                  <option>Certificate</option>
                  <option>Warning</option>
                  <option>Disciplinary Record</option>
                  <option>Confirmation of Employment</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label style={label}>Upload File</label>

                <input
                  key={fileInputKey}
                  style={input}
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <label style={label}>Notes</label>

            <textarea
              style={textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes for this document"
            />

            <div style={formActions}>
              <button style={button} onClick={uploadDocument} disabled={saving}>
                {saving ? "Uploading..." : "Save Document"}
              </button>

              <button
                style={outlineButton}
                onClick={() => {
                  clearForm();
                  setShowUploadForm(false);
                }}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <section style={card}>
        <div style={toolbar}>
          <div>
            <h2 style={sectionTitleNoMargin}>Employees</h2>
            <p style={smallText}>
              View and manage documents uploaded for each employee.
            </p>
          </div>

          <button style={outlineButton} onClick={initialisePage}>
            Refresh
          </button>
        </div>

        {employees.length === 0 ? (
          <div style={emptyState}>No employees found for this business.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>Last Upload Date</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {employeeRows.map(({ employee, latestDocument, documentCount }) => (
                  <tr key={employee.id}>
                    <td style={td}>
                      {employee.first_name} {employee.last_name}
                      <div style={mutedText}>
                        {documentCount === 0
                          ? "No documents uploaded"
                          : `${documentCount} document${
                              documentCount === 1 ? "" : "s"
                            } uploaded`}
                      </div>
                    </td>

                    <td style={td}>
                      {latestDocument?.uploaded_at
                        ? new Date(
                            latestDocument.uploaded_at
                          ).toLocaleDateString("en-ZA")
                        : "-"}
                    </td>

                    <td style={td}>
                      <div style={rowActions}>
                        <button
                          style={viewButton}
                          onClick={() =>
                            setSelectedEmployeeId((current) =>
                              current === employee.id ? "" : employee.id
                            )
                          }
                        >
                          {selectedEmployeeId === employee.id ? "Hide" : "View"}
                        </button>

                        <button
                          style={outlineButton}
                          onClick={() => {
                            setEmployeeId(employee.id);
                            setShowUploadForm(true);
                            setMessage(
                              `You can now upload or update documents for ${employee.first_name || ""} ${
                                employee.last_name || ""
                              }.`.trim()
                            );
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedEmployeeId && (
          <div style={detailsPanel}>
            <div style={detailsHeader}>
              <div>
                <h3 style={detailsTitle}>
                  {employeeName(selectedEmployeeId)} Documents
                </h3>

                <p style={smallText}>
                  Open or download the uploaded documents for this employee.
                </p>
              </div>

              <button
                style={outlineButton}
                onClick={() => setSelectedEmployeeId("")}
              >
                Close
              </button>
            </div>

            {selectedEmployeeDocuments.length === 0 ? (
              <div style={emptyState}>
                No documents uploaded for this employee yet.
              </div>
            ) : (
              <div style={documentList}>
                {selectedEmployeeDocuments.map((document) => (
                  <div key={document.id} style={documentCard}>
                    <div>
                      <strong>{document.document_name}</strong>

                      <div style={mutedText}>
                        {document.document_category} ·{" "}
                        {document.uploaded_at
                          ? new Date(document.uploaded_at).toLocaleDateString(
                              "en-ZA"
                            )
                          : "-"}
                      </div>

                      {document.notes && (
                        <p style={documentNotes}>{document.notes}</p>
                      )}
                    </div>

                    <div style={rowActions}>
                      <a
                        href={document.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={viewLink}
                      >
                        View
                      </a>

                      <a href={document.file_url} download style={downloadLink}>
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "24px",
  flexWrap: "wrap" as const,
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle = {
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const notice = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "22px",
};

const cardHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const sectionTitleNoMargin = {
  margin: 0,
  color: "#0f172a",
  fontSize: "22px",
};

const smallText = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const formArea = {
  marginTop: "18px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "18px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "14px",
};

const label = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#475569",
};

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
};

const textarea = {
  width: "100%",
  minHeight: "90px",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  marginBottom: "14px",
};

const button = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const outlineButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const formActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap" as const,
  marginBottom: "18px",
};

const emptyState = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "18px",
  fontWeight: 700,
};

const tableWrap = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top" as const,
};

const mutedText = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "12px",
};

const rowActions = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const viewButton = {
  background: "#ecfeff",
  color: "#155e75",
  border: "1px solid #a5f3fc",
  padding: "10px 14px",
  borderRadius: "10px",
  fontWeight: 800,
  cursor: "pointer",
};

const detailsPanel = {
  marginTop: "22px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
};

const detailsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap" as const,
  marginBottom: "14px",
};

const detailsTitle = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
};

const documentList = {
  display: "grid",
  gap: "12px",
};

const documentCard = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  flexWrap: "wrap" as const,
};

const documentNotes = {
  margin: "8px 0 0",
  color: "#475569",
  fontSize: "13px",
  lineHeight: 1.5,
};

const viewLink = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "9px 12px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: 800,
};

const downloadLink = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  padding: "9px 12px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: 800,
};