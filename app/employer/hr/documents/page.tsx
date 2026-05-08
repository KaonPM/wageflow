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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAll, setShowAll] = useState(false);

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

  const filteredDocuments = useMemo(() => {
    return documents.filter((document) => {
      const employee = employeeName(document.employee_id).toLowerCase();

      const text = `${document.document_name || ""} ${
        document.document_category || ""
      } ${employee}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "all" ||
        document.document_category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [documents, employees, search, categoryFilter]);

  const visibleDocuments = showAll
    ? filteredDocuments
    : filteredDocuments.slice(0, 5);

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

    setEmployeeId("");
    setDocumentName("");
    setDocumentCategory("Contract");
    setNotes("");
    setFile(null);
    setFileInputKey((current) => current + 1);
    setShowAll(false);

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
        <h2 style={sectionTitle}>Upload Document</h2>

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
            />
          </div>

          <div>
            <label style={label}>Document Category</label>

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
        />

        <button style={button} onClick={uploadDocument} disabled={saving}>
          {saving ? "Uploading..." : "Upload Document"}
        </button>
      </section>

      <section style={card}>
        <div style={toolbar}>
          <div>
            <h2 style={sectionTitleNoMargin}>Recent Uploads</h2>
            <p style={smallText}>Showing five documents by default.</p>
          </div>

          <div style={filters}>
            <input
              style={filterInput}
              placeholder="Search document or employee"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              style={filterInput}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              <option value="Contract">Contract</option>
              <option value="ID Document">ID Document</option>
              <option value="Proof of Address">Proof of Address</option>
              <option value="Certificate">Certificate</option>
              <option value="Warning">Warning</option>
              <option value="Other">Other</option>
            </select>

            <button
              style={outlineButton}
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
                setShowAll(false);
              }}
            >
              Clear
            </button>

            <button style={outlineButton} onClick={fetchDocuments}>
              Refresh
            </button>
          </div>
        </div>

        {visibleDocuments.length === 0 ? (
          <div style={emptyState}>No documents uploaded yet.</div>
        ) : (
          <>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Employee</th>
                    <th style={th}>Document</th>
                    <th style={th}>Category</th>
                    <th style={th}>Uploaded</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleDocuments.map((document) => (
                    <tr key={document.id}>
                      <td style={td}>{employeeName(document.employee_id)}</td>

                      <td style={td}>{document.document_name}</td>

                      <td style={td}>{document.document_category}</td>

                      <td style={td}>
                        {new Date(document.uploaded_at).toLocaleDateString(
                          "en-ZA"
                        )}
                      </td>

                      <td style={td}>
                        <a
                          href={document.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={viewButton}
                        >
                          View
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDocuments.length > 5 && (
              <button
                style={viewMoreButton}
                onClick={() => setShowAll((current) => !current)}
              >
                {showAll ? "Show Less" : "View More"}
              </button>
            )}
          </>
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

const sectionTitle = {
  margin: "0 0 18px",
  color: "#0f172a",
  fontSize: "22px",
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

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap" as const,
  marginBottom: "18px",
};

const filters = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const filterInput = {
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  minWidth: "180px",
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
};

const viewButton = {
  background: "#ecfeff",
  color: "#155e75",
  padding: "8px 12px",
  borderRadius: "8px",
  textDecoration: "none",
  fontWeight: 700,
};

const viewMoreButton = {
  marginTop: "14px",
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "9px 14px",
  fontWeight: 800,
  cursor: "pointer",
};