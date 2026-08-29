"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { supabase } from "@/app/lib/supabaseClient";
import { Pagination } from "@/components/Pagination";

const PAGE_SIZE = 10;
const CONTRACT_FIELD_LABELS: Record<keyof ContractSuggestions, string> = {
  first_name: "First name",
  last_name: "Last name",
  id_number: "ID number",
  position: "Position",
  employment_type: "Employment type",
  start_date: "Start date",
  basic_salary: "Basic salary",
  salary_payment_date: "Salary payment date",
};

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  id_number?: string | null;
  position?: string | null;
  job_title?: string | null;
  role?: string | null;
  employment_type?: string | null;
  start_date?: string | null;
  employment_start_date?: string | null;
  date_started?: string | null;
  salary_payment_date?: string | null;
  basic_salary?: number | null;
  [key: string]: unknown;
};

type BusinessProfile = {
  id?: string;
  business_name?: string | null;
  name?: string | null;
  company_name?: string | null;
  logo_url?: string | null;
  company_logo_url?: string | null;
  business_logo_url?: string | null;
  logo?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  registration_number?: string | null;
  [key: string]: unknown;
};

type DocumentRecord = {
  id: string;
  business_id: string;
  employee_id: string;
  document_name: string;
  document_category: string;
  file_url: string | null;
  notes: string | null;
  uploaded_at: string | null;
  created_at?: string | null;
};

export default function EmployeeDocumentsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessProfile, setBusinessProfile] =
    useState<BusinessProfile | null>(null);

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [employeeId, setEmployeeId] = useState("");
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Contract");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [contractSuggestions, setContractSuggestions] = useState<ContractSuggestions | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [letterEmployeeId, setLetterEmployeeId] = useState("");
  const [letterType, setLetterType] = useState("Confirmation of Employment");

  const [warningLevel, setWarningLevel] = useState("Written warning");
  const [warningReason, setWarningReason] = useState("");
  const [warningRequiredAction, setWarningRequiredAction] = useState("");
  const [warningReviewDate, setWarningReviewDate] = useState("");

  const [dismissalType, setDismissalType] = useState("Dismissal with notice");
  const [noticeDate, setNoticeDate] = useState("");
  const [dismissalReason, setDismissalReason] = useState("");
  const [finalWorkingDay, setFinalWorkingDay] = useState("");
  const [finalPaymentDate, setFinalPaymentDate] = useState("");
  const [propertyReturnNotes, setPropertyReturnNotes] = useState("");

  const [signatoryName, setSignatoryName] = useState("");
  const [signatoryPosition, setSignatoryPosition] = useState("");

  const letterPrintRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    initialisePage();
  }, []);

  async function initialisePage() {
    await fetchBusinessProfile();
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

  async function fetchBusinessProfile() {
    const businessId = await getBusinessId();

    if (!businessId) return;

    const { data } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();

    setBusinessProfile(data || null);
  }

  async function fetchEmployees() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setMessage("Your session has expired. Please sign in again.");
      setEmployees([]);
      return;
    }

    const response = await fetch("/api/employer/employees", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setMessage(result.error || "Employee records could not be loaded.");
      setEmployees([]);
      return;
    }

    setEmployees(result.employees || []);
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

  function businessName() {
    return (
      businessProfile?.business_name ||
      businessProfile?.company_name ||
      businessProfile?.name ||
      "Business Name"
    );
  }

  function businessLogo() {
    return (
      businessProfile?.logo_url ||
      businessProfile?.company_logo_url ||
      businessProfile?.business_logo_url ||
      businessProfile?.logo ||
      ""
    );
  }

  function selectedLetterEmployee() {
    return employees.find((employee) => employee.id === letterEmployeeId) || null;
  }

  function employeePosition(employee: Employee | null) {
    return employee?.position || employee?.job_title || employee?.role || "-";
  }

  function employeeStartDate(employee: Employee | null) {
    return (
      employee?.start_date ||
      employee?.employment_start_date ||
      employee?.date_started ||
      "-"
    );
  }

  function employeeSalaryPaymentDate(employee: Employee | null) {
    return employee?.salary_payment_date || "-";
  }

  function clearForm() {
    setEmployeeId("");
    setDocumentName("");
    setDocumentCategory("Contract");
    setNotes("");
    setFile(null);
    setFileInputKey((current) => current + 1);
    setContractSuggestions(null);
  }

  function businessDetails() {
    return [
      businessProfile?.address,
      businessProfile?.phone,
      businessProfile?.email,
      businessProfile?.registration_number
        ? `Registration no. ${businessProfile.registration_number}`
        : "",
    ]
      .filter(Boolean)
      .join(" | ");
  }

  async function extractContractDetails() {
    if (!employeeId || !file || documentCategory !== "Contract") {
      setMessage("Select an employee, choose Contract, and attach a PDF or DOCX file first.");
      return;
    }
    setExtracting(true);
    setMessage("Reading contract details for your review...");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("Your session has expired. Please sign in again.");
      setExtracting(false);
      return;
    }
    const extractionForm = new FormData();
    extractionForm.set("file", file);
    extractionForm.set("employeeId", employeeId);
    const response = await fetch("/api/employee-documents/extract", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: extractionForm,
    });
    const result = await response.json().catch(() => ({}));
    setExtracting(false);
    if (!response.ok) {
      setContractSuggestions(null);
      setMessage(result.error || "Contract details could not be extracted.");
      return;
    }
    setContractSuggestions(result.suggestions);
    setMessage("Contract details extracted. Review every field before applying it to the employee record.");
  }

  async function applyContractSuggestions() {
    if (!employeeId || !contractSuggestions) return;
    const entries = Object.entries(contractSuggestions).filter(([, value]) => String(value).trim());
    if (entries.length === 0) {
      setMessage("No reliable employee fields were found in this contract.");
      return;
    }
    setSaving(true);
    const updates: Record<string, string | number> = Object.fromEntries(entries);
    if (updates.basic_salary) updates.basic_salary = Number(updates.basic_salary);
    const { error } = await supabase.from("employees").update(updates).eq("id", employeeId);
    setSaving(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    setEmployees((items) => items.map((employee) => employee.id === employeeId ? { ...employee, ...updates } : employee));
    setMessage("Reviewed contract details applied to the employee record. You can now save the original contract.");
  }

  function printLetter() {
    if (!letterPrintRef.current) return;

    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(letterType)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #334155;
            }

            img {
              max-width: 90px;
              max-height: 90px;
              object-fit: contain;
            }

            h2 {
              margin: 0;
              color: #0f172a;
            }

            p {
              font-size: 14px;
              line-height: 1.8;
            }

            .letter-watermark {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #0f766e;
              font-size: 46px;
              font-weight: 800;
              opacity: 0.07;
              transform: rotate(-32deg);
              pointer-events: none;
              z-index: 0;
            }

            .letter-content {
              position: relative;
              z-index: 1;
            }
          </style>
        </head>

        <body>
          ${letterPrintRef.current.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function saveGeneratedLetterToEmployeeRecords() {
    setMessage("");

    if (!letterEmployeeId || !letterPrintRef.current) {
      setMessage("Please select an employee and generate the letter first.");
      return;
    }

    setSaving(true);

    const businessId = await getBusinessId();

    if (!businessId) {
      setMessage("Business profile not found.");
      setSaving(false);
      return;
    }

    const generatedLetterText = letterPrintRef.current.innerText || "";

    const { error } = await supabase.from("employee_documents").insert([
      {
        business_id: businessId,
        employee_id: letterEmployeeId,
        document_name: letterType,
        document_category: "HR Letter",
        file_url: "",
        notes: generatedLetterText,
      },
    ]);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setSelectedEmployeeId(letterEmployeeId);
    setMessage(`${letterType} saved to employee records successfully.`);

    await fetchDocuments();

    setSaving(false);
  }

  async function uploadDocument() {
    setMessage("");

    if (!employeeId || !documentName || !file) {
      setMessage("Please complete all required fields.");
      return;
    }

    setSaving(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setMessage("Your session has expired. Please log in again.");
      setSaving(false);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("employeeId", employeeId);
    formData.set("documentName", documentName);
    formData.set("documentCategory", documentCategory);
    formData.set("notes", notes);
    const response = await fetch("/api/employee-documents", { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` }, body: formData });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(result.error || "Document upload failed.");
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

  function isGeneratedLetter(document: DocumentRecord) {
    return !document.file_url && !!document.notes;
  }

  async function openStoredDocument(document: DocumentRecord, download = false) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return setMessage("Your session has expired. Please log in again.");
    const response = await fetch(`/api/employee-documents/${encodeURIComponent(document.id)}${download ? "?download=1" : ""}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.url) return setMessage(result.error || "Document could not be opened.");
    window.open(result.url, "_blank", "noopener,noreferrer");
  }

  function generatedDocumentHtml(document: DocumentRecord) {
    return `
      <html>
        <head>
          <title>${escapeHtml(document.document_name)}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #334155;
              background: #ffffff;
            }

            .sheet {
              max-width: 760px;
              margin: 0 auto;
              position: relative;
            }

            .header {
              display: flex;
              gap: 16px;
              align-items: center;
              margin-bottom: 28px;
            }

            img {
              max-width: 90px;
              max-height: 90px;
              object-fit: contain;
            }

            h2 {
              margin: 0;
              color: #0f172a;
              font-size: 22px;
            }

            .contact {
              color: #475569;
              font-size: 12px;
              line-height: 1.6;
              margin-top: 6px;
            }

            .content {
              white-space: pre-wrap;
              font-size: 14px;
              line-height: 1.8;
              position: relative;
              z-index: 1;
            }

            .watermark {
              position: fixed;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              color: #0f766e;
              font-size: 46px;
              font-weight: 800;
              opacity: 0.07;
              transform: rotate(-32deg);
              pointer-events: none;
              z-index: 0;
            }

            @page {
              size: A4;
              margin: 18mm;
            }
          </style>
        </head>

        <body>
          <div class="sheet">
            <div class="watermark">${escapeHtml(businessName())}</div>
            <div class="header">
              ${
                businessLogo()
                  ? `<img src="${escapeHtml(
                      businessLogo()
                    )}" alt="Company logo" />`
                  : ""
              }
              <div>
                <h2>${escapeHtml(businessName())}</h2>
                <div class="contact">${escapeHtml(businessDetails())}</div>
              </div>
            </div>

            <div class="content">${escapeHtml(document.notes || "")}</div>
          </div>
        </body>
      </html>
    `;
  }

  function openGeneratedDocument(document: DocumentRecord) {
    const previewWindow = window.open("", "_blank", "width=900,height=700");

    if (!previewWindow) return;

    previewWindow.document.write(generatedDocumentHtml(document));
    previewWindow.document.close();
    previewWindow.focus();
  }

  function printGeneratedDocument(document: DocumentRecord) {
    const printWindow = window.open("", "_blank", "width=900,height=700");

    if (!printWindow) return;

    printWindow.document.write(`
      ${generatedDocumentHtml(document)}
      <script>
        window.onload = function () {
          window.print();
        };
      </script>
    `);

    printWindow.document.close();
    printWindow.focus();
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

  const totalPages = Math.max(1, Math.ceil(employeeRows.length / PAGE_SIZE));
  const pagedEmployeeRows = employeeRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const letterEmployee = selectedLetterEmployee();

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>Employee Documents</h1>

          <p style={subtitle}>
            Upload documents, generate HR letters, and view saved employee
            records.
          </p>
        </div>

        <Link href="/employer/hr" style={backButton}>
           Back to HR Records
        </Link>
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={card}>
        <div style={cardHeader}>
          <div>
            <h2 style={sectionTitleNoMargin}>Supporting Document Upload</h2>

            <p style={smallText}>
              Upload source records such as contracts, identity documents, proof of address and certificates. HR letters are generated below.
            </p>
          </div>

          <button
            style={button}
            onClick={() => {
              setMessage("");
              setShowUploadForm((current) => !current);
            }}
          >
            {showUploadForm ? "Close Form" : "+ Upload Supporting Document"}
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

            {documentCategory === "Contract" && (
              <div style={contractAssistBox}>
                <div>
                  <strong>Contract autofill</strong>
                  <p style={smallText}>Extract suggested employee details from a text-based PDF or DOCX. Nothing changes until you review and apply the fields.</p>
                </div>
                <button style={outlineButton} onClick={extractContractDetails} disabled={extracting || saving}>
                  {extracting ? "Reading contract..." : "Extract & Review"}
                </button>
              </div>
            )}

            {contractSuggestions && (
              <div style={suggestionPanel}>
                <div><strong>Review extracted employee details</strong><p style={smallText}>Correct or clear any field that should not update the employee profile.</p></div>
                <div style={grid}>
                  {(Object.keys(CONTRACT_FIELD_LABELS) as (keyof ContractSuggestions)[]).map((field) => (
                    <label key={field} style={label}>
                      {CONTRACT_FIELD_LABELS[field]}
                      <input
                        style={input}
                        type={field === "start_date" ? "date" : field === "basic_salary" ? "number" : "text"}
                        value={contractSuggestions[field]}
                        onChange={(event) => setContractSuggestions((current) => current ? { ...current, [field]: event.target.value } : current)}
                      />
                    </label>
                  ))}
                </div>
                <button style={button} onClick={applyContractSuggestions} disabled={saving}>Apply reviewed details</button>
              </div>
            )}

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
              View saved documents and generated HR letters per employee.
            </p>
          </div>

          <button style={outlineButton} onClick={initialisePage}>
            Refresh
          </button>
        </div>

        {employees.length === 0 ? (
          <div style={emptyState}>No employee records found for this business yet. Add an employee first, then their uploaded documents and WageFlow-generated letters will appear here.</div>
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
                {pagedEmployeeRows.map(
                  ({ employee, latestDocument, documentCount }) => (
                    <tr key={employee.id}>
                      <td style={td}>
                        {employee.first_name} {employee.last_name}

                        <div style={mutedText}>
                          {documentCount === 0
                            ? "No documents yet — upload a supporting record or generate an HR letter"
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
                            {selectedEmployeeId === employee.id
                              ? "Hide"
                              : "View"}
                          </button>

                          <button
                            style={outlineButton}
                            onClick={() => {
                              setEmployeeId(employee.id);
                              setShowUploadForm(true);

                              setMessage(
                                `You can now upload or update documents for ${
                                  employee.first_name || ""
                                } ${employee.last_name || ""}.`.trim()
                              );
                            }}
                          >
                            Edit
                          </button>

                          <button
                            style={outlineButton}
                            onClick={() =>
                              setLetterEmployeeId((current) =>
                                current === employee.id ? "" : employee.id
                              )
                            }
                          >
                            {letterEmployeeId === employee.id
                              ? "Close Letter"
                              : "Generate Letter"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            <Pagination page={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={employeeRows.length} pageSize={PAGE_SIZE} />
          </div>
        )}

        {letterEmployeeId && (
          <div style={detailsPanel}>
            <div style={detailsHeader}>
              <div>
                <h3 style={detailsTitle}>
                  Generate Letter for {employeeName(letterEmployeeId)}
                </h3>

                <p style={smallText}>
                  WageFlow generates branded Warning, Confirmation of Employment and Dismissal Notice letters. Review before issuing or saving.
                </p>
              </div>

              <button
                style={outlineButton}
                onClick={() => setLetterEmployeeId("")}
              >
                Close
              </button>
            </div>

            <div style={grid}>
              <div>
                <label style={label}>Letter Type</label>

                <select
                  style={input}
                  value={letterType}
                  onChange={(e) => setLetterType(e.target.value)}
                >
                  <option>Warning</option>
                  <option>Confirmation of Employment</option>
                  <option>Dismissal Notice</option>
                </select>
              </div>

              <div>
                <label style={label}>Signatory Name</label>

                <input
                  style={input}
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  placeholder="Employer or manager name"
                />
              </div>

              <div>
                <label style={label}>Signatory Position</label>

                <input
                  style={input}
                  value={signatoryPosition}
                  onChange={(e) => setSignatoryPosition(e.target.value)}
                  placeholder="Example: Owner"
                />
              </div>
            </div>

            {letterType === "Dismissal Notice" && (
              <>
                <div style={grid}>
                  <div>
                    <label style={label}>Dismissal Type</label>

                    <select
                      style={input}
                      value={dismissalType}
                      onChange={(e) => setDismissalType(e.target.value)}
                    >
                      <option>Immediate dismissal</option>
                      <option>Dismissal with notice</option>
                      <option>End of fixed-term contract</option>
                      <option>Retrenchment</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={label}>Notice Date</label>

                    <input
                      style={input}
                      type="date"
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={label}>Final Working Day</label>

                    <input
                      style={input}
                      type="date"
                      value={finalWorkingDay}
                      onChange={(e) => setFinalWorkingDay(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={label}>Final Payment Date</label>

                    <input
                      style={input}
                      type="date"
                      value={finalPaymentDate}
                      onChange={(e) => setFinalPaymentDate(e.target.value)}
                    />
                  </div>
                </div>

                <label style={label}>Reason for Dismissal</label>

                <textarea
                  style={textarea}
                  value={dismissalReason}
                  onChange={(e) => setDismissalReason(e.target.value)}
                  placeholder="Write the factual reason for dismissal."
                />

                <label style={label}>Company Property Return Notes</label>

                <textarea
                  style={textarea}
                  value={propertyReturnNotes}
                  onChange={(e) => setPropertyReturnNotes(e.target.value)}
                  placeholder="Example: Uniform, keys, devices or access cards to be returned."
                />
              </>
            )}

            {letterType === "Warning" && (
              <>
                <div style={grid}>
                  <div>
                    <label style={label}>Warning Level</label>

                    <select
                      style={input}
                      value={warningLevel}
                      onChange={(e) => setWarningLevel(e.target.value)}
                    >
                      <option>Verbal warning</option>
                      <option>Written warning</option>
                      <option>Final written warning</option>
                    </select>
                  </div>

                  <div>
                    <label style={label}>Review Date</label>

                    <input
                      style={input}
                      type="date"
                      value={warningReviewDate}
                      onChange={(e) => setWarningReviewDate(e.target.value)}
                    />
                  </div>
                </div>

                <label style={label}>Reason for Warning</label>

                <textarea
                  style={textarea}
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="State the factual conduct or performance concern."
                />

                <label style={label}>Required Improvement or Action</label>

                <textarea
                  style={textarea}
                  value={warningRequiredAction}
                  onChange={(e) => setWarningRequiredAction(e.target.value)}
                  placeholder="Describe the improvement expected and any next steps."
                />
              </>
            )}

            <div style={letterPreview} ref={letterPrintRef}>
              <div className="letter-watermark" style={letterWatermark}>
                {businessName()}
              </div>

              <div className="letter-content" style={letterContent}>
                <div style={letterHeader}>
                  {businessLogo() && (
                    <img
                      src={businessLogo()}
                      alt="Company logo"
                      style={letterLogo}
                    />
                  )}

                  <div>
                    <strong style={letterBusinessName}>{businessName()}</strong>
                    {businessDetails() && <p style={letterBusinessDetails}>{businessDetails()}</p>}
                    <p style={letterDate}>
                      Date: {new Date().toLocaleDateString("en-ZA")}
                    </p>
                  </div>
                </div>

              {letterType === "Confirmation of Employment" ? (
                <div style={letterBody}>
                  <p>To Whom It May Concern</p>

                  <p>
                    This letter serves to confirm that{" "}
                    <strong>{employeeName(letterEmployeeId)}</strong> is
                    currently employed by <strong>{businessName()}</strong>.
                  </p>

                  <p>Employee details are as follows:</p>

                  <p>
                    Employee Name: {employeeName(letterEmployeeId)}
                    <br />
                    ID Number: {letterEmployee?.id_number || "-"}
                    <br />
                    Position: {employeePosition(letterEmployee)}
                    <br />
                    Employment Type: {letterEmployee?.employment_type || "-"}
                    <br />
                    Employment Start Date: {employeeStartDate(letterEmployee)}
                    <br />
                    Salary Payment Date:{" "}
                    {employeeSalaryPaymentDate(letterEmployee)}
                  </p>

                  <p>The employee is currently active on our records.</p>

                  <p>
                    This letter is issued upon request for confirmation purposes.
                  </p>
                </div>
              ) : letterType === "Warning" ? (
                <div style={letterBody}>
                  <p>Dear {employeeName(letterEmployeeId)},</p>

                  <p>
                    This letter records a <strong>{warningLevel.toLowerCase()}</strong> issued by <strong>{businessName()}</strong>.
                  </p>

                  <p>
                    Reason for warning:
                    <br />
                    <strong>{warningReason || "-"}</strong>
                  </p>

                  <p>
                    Required improvement or action:
                    <br />
                    <strong>{warningRequiredAction || "-"}</strong>
                  </p>

                  <p>
                    Review date: <strong>{warningReviewDate || "-"}</strong>
                  </p>

                  <p style={disclaimer}>
                    This document is a template. Confirm that the facts, process and wording comply with company policy and applicable labour law before issuing it.
                  </p>
                </div>
              ) : (
                <div style={letterBody}>
                  <p>Dear {employeeName(letterEmployeeId)},</p>

                  <p>
                    This letter serves as formal notice regarding your employment
                    with <strong>{businessName()}</strong>.
                  </p>

                  <p>
                    Employee details are as follows:
                    <br />
                    Employee Name: {employeeName(letterEmployeeId)}
                    <br />
                    Position: {employeePosition(letterEmployee)}
                    <br />
                    Employment Type: {letterEmployee?.employment_type || "-"}
                  </p>

                  <p>
                    Dismissal Type: <strong>{dismissalType}</strong>
                    <br />
                    Notice Date: <strong>{noticeDate || "-"}</strong>
                    <br />
                    Final Working Day:{" "}
                    <strong>{finalWorkingDay || "-"}</strong>
                    <br />
                    Final Payment Date:{" "}
                    <strong>{finalPaymentDate || "-"}</strong>
                  </p>

                  <p>
                    The reason for dismissal is recorded as follows:
                    <br />
                    <strong>{dismissalReason || "-"}</strong>
                  </p>

                  <p>
                    Your final payment will be processed on{" "}
                    <strong>{finalPaymentDate || "-"}</strong>, subject to normal
                    payroll processing and any lawful deductions.
                  </p>

                  <p>
                    Company property return notes:
                    <br />
                    {propertyReturnNotes || "-"}
                  </p>

                  <p style={disclaimer}>
                    This document is a template and should be reviewed for
                    compliance with applicable labour law and company policy
                    before being issued.
                  </p>
                </div>
              )}

              <div style={signatureBlock}>
                <p>Kind regards,</p>

                <div style={signatureLine}></div>

                <p>
                  {signatoryName || "Signatory Name"}
                  <br />
                  {signatoryPosition || "Signatory Position"}
                  <br />
                  {businessName()}
                </p>
              </div>
              </div>
            </div>

            <div style={formActions}>
              <button style={button} onClick={printLetter} disabled={saving}>
                Print / Save as PDF
              </button>

              <button
                style={outlineButton}
                onClick={saveGeneratedLetterToEmployeeRecords}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save to Employee Records"}
              </button>
            </div>
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
                  Open or download the documents saved for this employee.
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
                        {formatDate(document.uploaded_at || document.created_at)}
                      </div>
                    </div>

                    <div style={rowActions}>
                      {isGeneratedLetter(document) ? (
                        <>
                          <button
                            type="button"
                            style={viewLink}
                            onClick={() => openGeneratedDocument(document)}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            style={downloadLink}
                            onClick={() => printGeneratedDocument(document)}
                          >
                            Download
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => openStoredDocument(document, true)}
                            style={viewLink}
                          >
                            View
                          </button>

                          <button
                            type="button"
                            onClick={() => openStoredDocument(document)}
                            style={downloadLink}
                          >
                            Download
                          </button>
                        </>
                      )}
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

function formatDate(value?: string | null) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

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
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
};

const header: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const title: CSSProperties = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle: CSSProperties = {
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: 0,
};

const backButton: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const notice: CSSProperties = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "14px",
  padding: "14px 16px",
  marginBottom: "16px",
  fontWeight: 700,
};

const card: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "22px",
};

const cardHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap",
};

const sectionTitleNoMargin: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "22px",
};

const smallText: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const formArea: CSSProperties = {
  marginTop: "18px",
  borderTop: "1px solid #e2e8f0",
  paddingTop: "18px",
};

const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "14px",
};

const label: CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontSize: "12px",
  fontWeight: 800,
  color: "#475569",
};

const input: CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
};

const textarea: CSSProperties = {
  width: "100%",
  minHeight: "90px",
  padding: "10px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  marginBottom: "14px",
};

const button: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "10px 16px",
  fontWeight: 800,
  cursor: "pointer",
};

const outlineButton: CSSProperties = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const formActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const toolbar: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "18px",
};

const emptyState: CSSProperties = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "18px",
  fontWeight: 700,
};

const tableWrap: CSSProperties = {
  overflowX: "auto",
};

const table: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
};

const td: CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "top",
};

const mutedText: CSSProperties = {
  marginTop: "4px",
  color: "#64748b",
  fontSize: "12px",
};

const rowActions: CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const viewButton: CSSProperties = {
  background: "#ecfeff",
  color: "#155e75",
  border: "1px solid #a5f3fc",
  padding: "10px 14px",
  borderRadius: "10px",
  fontWeight: 800,
  cursor: "pointer",
};

const detailsPanel: CSSProperties = {
  marginTop: "22px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
};

const detailsHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap",
  marginBottom: "14px",
};

const detailsTitle: CSSProperties = {
  margin: 0,
  color: "#0f172a",
  fontSize: "18px",
};

const documentList: CSSProperties = {
  display: "grid",
  gap: "12px",
};

const documentCard: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  padding: "14px",
  flexWrap: "wrap",
};

const viewLink: CSSProperties = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "9px 12px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: 800,
  border: "none",
  cursor: "pointer",
};

const downloadLink: CSSProperties = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  padding: "9px 12px",
  borderRadius: "9px",
  textDecoration: "none",
  fontWeight: 800,
  cursor: "pointer",
};

const letterPreview: CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "24px",
  margin: "18px 0",
  position: "relative",
  overflow: "hidden",
};

const letterWatermark: CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#0f766e",
  fontSize: "42px",
  fontWeight: 800,
  opacity: 0.07,
  transform: "rotate(-32deg)",
  pointerEvents: "none",
  textAlign: "center",
  padding: "24px",
};

const letterContent: CSSProperties = {
  position: "relative",
  zIndex: 1,
};

const letterHeader: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  marginBottom: "20px",
};

const letterLogo: CSSProperties = {
  width: "72px",
  height: "72px",
  objectFit: "contain",
};

const letterDate: CSSProperties = {
  margin: "6px 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const letterBody: CSSProperties = {
  color: "#334155",
  fontSize: "14px",
  lineHeight: 1.8,
};

const signatureBlock: CSSProperties = {
  marginTop: "34px",
  color: "#334155",
  fontSize: "14px",
};

const signatureLine: CSSProperties = {
  width: "240px",
  borderTop: "1px solid #334155",
  margin: "36px 0 10px",
};

const disclaimer: CSSProperties = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  borderRadius: "12px",
  padding: "12px",
  fontSize: "12px",
  lineHeight: 1.5,
};

const letterBusinessName: CSSProperties = {
  color: "#0f172a",
  fontSize: "18px",
};

const letterBusinessDetails: CSSProperties = {
  margin: "5px 0 0",
  color: "#64748b",
  fontSize: "12px",
  lineHeight: 1.5,
};

const contractAssistBox: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  padding: "16px",
  marginBottom: "16px",
  border: "1px solid #99f6e4",
  borderRadius: "12px",
  background: "#f0fdfa",
};

const suggestionPanel: CSSProperties = {
  display: "grid",
  gap: "16px",
  padding: "18px",
  marginBottom: "16px",
  border: "1px solid #cbd5e1",
  borderRadius: "14px",
  background: "#ffffff",
};

type ContractSuggestions = {
  first_name: string;
  last_name: string;
  id_number: string;
  position: string;
  employment_type: string;
  start_date: string;
  basic_salary: string;
  salary_payment_date: string;
};
