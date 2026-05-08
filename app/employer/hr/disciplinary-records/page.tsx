"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
  job_title: string | null;
  department: string | null;
  status: string | null;
};

type Business = {
  id: string;
  business_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
};

type DisciplinaryRecord = {
  id: string;
  business_id: string;
  employee_id: string;
  record_type: string;
  status: string;
  incident_date: string;
  record_date: string;
  incident_description: string;
  action_taken: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
};

const recordTypes = [
  "Verbal warning",
  "Written warning",
  "Final written warning",
  "Disciplinary notice",
  "Hearing notice",
  "Misconduct record",
  "Performance-related record",
  "Other",
];

const statuses = ["Open", "Pending", "Resolved", "Dismissed", "Closed"];

export default function DisciplinaryRecordsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DisciplinaryRecord | null>(null);
  const [mode, setMode] = useState<"view" | "new" | "edit" | "letter" | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    record_type: "Written warning",
    status: "Open",
    incident_date: "",
    record_date: new Date().toISOString().slice(0, 10),
    incident_description: "",
    action_taken: "",
    notes: "",
  });

  const employeeName = (employee: Employee | null) =>
    employee ? `${employee.first_name || ""} ${employee.last_name || ""}`.trim() : "";

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setLoading(true);

    const { data: businessData } = await supabase
      .from("businesses")
      .select("id, business_name, email, phone, address")
      .limit(1)
      .single();

    if (businessData) {
      setBusiness(businessData);

      const { data: employeeData } = await supabase
        .from("employees")
        .select("id, first_name, last_name, employee_number, job_title, department, status")
        .eq("business_id", businessData.id)
        .order("first_name", { ascending: true });

      const { data: recordData } = await supabase
        .from("disciplinary_records")
        .select("*")
        .eq("business_id", businessData.id)
        .order("created_at", { ascending: false });

      setEmployees(employeeData || []);
      setRecords(recordData || []);
    }

    setLoading(false);
  }

  function openNew(employee: Employee) {
    setSelectedEmployee(employee);
    setSelectedRecord(null);
    setMode("new");
    setForm({
      record_type: "Written warning",
      status: "Open",
      incident_date: "",
      record_date: new Date().toISOString().slice(0, 10),
      incident_description: "",
      action_taken: "",
      notes: "",
    });
  }

  function openEdit(record: DisciplinaryRecord) {
    const employee = employees.find((item) => item.id === record.employee_id) || null;
    setSelectedEmployee(employee);
    setSelectedRecord(record);
    setMode("edit");
    setForm({
      record_type: record.record_type,
      status: record.status,
      incident_date: record.incident_date,
      record_date: record.record_date,
      incident_description: record.incident_description,
      action_taken: record.action_taken,
      notes: record.notes || "",
    });
  }

  function openView(employee: Employee) {
    setSelectedEmployee(employee);
    setSelectedRecord(null);
    setMode("view");
  }

  async function saveRecord() {
    if (!business || !selectedEmployee) return;

    setSaving(true);

    const payload = {
      business_id: business.id,
      employee_id: selectedEmployee.id,
      record_type: form.record_type,
      status: form.status,
      incident_date: form.incident_date,
      record_date: form.record_date,
      incident_description: form.incident_description,
      action_taken: form.action_taken,
      notes: form.notes,
      created_by: "Business admin",
    };

    if (mode === "edit" && selectedRecord) {
      await supabase
        .from("disciplinary_records")
        .update(payload)
        .eq("id", selectedRecord.id);
    } else {
      await supabase.from("disciplinary_records").insert(payload);
    }

    await loadPageData();
    setSaving(false);
    setMode("view");
  }

  const employeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    return records.filter((record) => record.employee_id === selectedEmployee.id);
  }, [records, selectedEmployee]);

  function buildLetter(templateType: string) {
    if (!business || !selectedEmployee || !selectedRecord) return "";

    const name = employeeName(selectedEmployee);

    if (templateType === "Warning letter") {
      return `
${business.business_name || "Business Name"}
${business.address || ""}
${business.email || ""}
${business.phone || ""}

Date: ${selectedRecord.record_date}

To: ${name}
Employee Number: ${selectedEmployee.employee_number || "N/A"}
Position: ${selectedEmployee.job_title || "N/A"}

Subject: ${selectedRecord.record_type}

Dear ${name},

This letter serves as a formal record regarding the matter described below.

Incident Date: ${selectedRecord.incident_date}

Details of Incident:
${selectedRecord.incident_description}

Action Taken:
${selectedRecord.action_taken}

Current Status:
${selectedRecord.status}

You are required to take note of this matter and ensure that the conduct or issue recorded above is addressed. This record is kept for traceability, workplace fairness, and internal HR compliance purposes.

Employee Acknowledgement:
I acknowledge receipt of this letter. My signature does not necessarily mean that I agree with the contents.

Employee Signature: ______________________ Date: _______________

Employer Representative: __________________ Date: _______________
`;
    }

    if (templateType === "Disciplinary notice") {
      return `
${business.business_name || "Business Name"}
${business.address || ""}
${business.email || ""}
${business.phone || ""}

Date: ${selectedRecord.record_date}

To: ${name}
Employee Number: ${selectedEmployee.employee_number || "N/A"}
Position: ${selectedEmployee.job_title || "N/A"}

Subject: Notice of Disciplinary Record

Dear ${name},

This notice confirms that a disciplinary matter has been recorded for review and internal follow-up.

Incident Date: ${selectedRecord.incident_date}

Nature of Matter:
${selectedRecord.incident_description}

Action or Next Step:
${selectedRecord.action_taken}

Status:
${selectedRecord.status}

This notice is issued to ensure that the matter is properly recorded, traceable, and handled in line with fair workplace procedure.

Employee Signature: ______________________ Date: _______________

Employer Representative: __________________ Date: _______________
`;
    }

    return `
${business.business_name || "Business Name"}
${business.address || ""}
${business.email || ""}
${business.phone || ""}

Date: ${selectedRecord.record_date}

To: ${name}
Employee Number: ${selectedEmployee.employee_number || "N/A"}
Position: ${selectedEmployee.job_title || "N/A"}

Subject: Notice to Attend Disciplinary Hearing

Dear ${name},

You are hereby notified that a disciplinary hearing may be required regarding the matter recorded below.

Incident Date: ${selectedRecord.incident_date}

Allegation or Matter to Be Discussed:
${selectedRecord.incident_description}

Proposed Action or Hearing Purpose:
${selectedRecord.action_taken}

You may be given a fair opportunity to respond to the matter. You may also be allowed to prepare and bring a representative where applicable according to workplace policy.

This notice is generated for internal HR recordkeeping and procedural traceability.

Employee Signature: ______________________ Date: _______________

Employer Representative: __________________ Date: _______________
`;
  }

  if (loading) {
    return <main style={styles.page}>Loading disciplinary records...</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.eyebrow}>HR Records</p>
          <h1 style={styles.title}>Disciplinary Records</h1>
          <p style={styles.subtitle}>
            Manage employee disciplinary records, statuses, actions and letters in one traceable place.
          </p>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Employees</h2>

        <div style={styles.employeeList}>
          {employees.map((employee) => (
            <div key={employee.id} style={styles.employeeRow}>
              <div>
                <strong>{employeeName(employee)}</strong>
                <p style={styles.muted}>
                  {employee.employee_number || "No employee number"} ·{" "}
                  {employee.job_title || "No job title"} ·{" "}
                  {employee.department || "No department"}
                </p>
              </div>

              <div style={styles.actions}>
                <button style={styles.secondaryButton} onClick={() => openView(employee)}>
                  View
                </button>
                <button style={styles.primaryButton} onClick={() => openNew(employee)}>
                  New
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedEmployee && mode === "view" && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            Records for {employeeName(selectedEmployee)}
          </h2>

          {employeeRecords.length === 0 ? (
            <p style={styles.muted}>No disciplinary records found for this employee.</p>
          ) : (
            <div style={styles.table}>
              <div style={styles.tableHeader}>
                <span>Record type</span>
                <span>Status</span>
                <span>Date</span>
                <span>Action</span>
                <span>Options</span>
              </div>

              {employeeRecords.map((record) => (
                <div key={record.id} style={styles.tableRow}>
                  <span>{record.record_type}</span>
                  <span>{record.status}</span>
                  <span>{record.record_date}</span>
                  <span>{record.action_taken}</span>
                  <span style={styles.inlineActions}>
                    <button style={styles.smallButton} onClick={() => openEdit(record)}>
                      Edit
                    </button>
                    <button
                      style={styles.smallButton}
                      onClick={() => {
                        setSelectedRecord(record);
                        setMode("letter");
                      }}
                    >
                      Generate letter
                    </button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(mode === "new" || mode === "edit") && selectedEmployee && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>
            {mode === "new" ? "New Disciplinary Record" : "Edit Disciplinary Record"}
          </h2>

          <p style={styles.muted}>
            Employee: <strong>{employeeName(selectedEmployee)}</strong>
          </p>

          <div style={styles.formGrid}>
            <label style={styles.label}>
              Record type
              <select
                style={styles.input}
                value={form.record_type}
                onChange={(e) => setForm({ ...form, record_type: e.target.value })}
              >
                {recordTypes.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Status
              <select
                style={styles.input}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Incident date
              <input
                type="date"
                style={styles.input}
                value={form.incident_date}
                onChange={(e) => setForm({ ...form, incident_date: e.target.value })}
              />
            </label>

            <label style={styles.label}>
              Record date
              <input
                type="date"
                style={styles.input}
                value={form.record_date}
                onChange={(e) => setForm({ ...form, record_date: e.target.value })}
              />
            </label>
          </div>

          <label style={styles.label}>
            Description of incident
            <textarea
              style={styles.textarea}
              value={form.incident_description}
              onChange={(e) =>
                setForm({ ...form, incident_description: e.target.value })
              }
            />
          </label>

          <label style={styles.label}>
            Action taken
            <textarea
              style={styles.textarea}
              value={form.action_taken}
              onChange={(e) => setForm({ ...form, action_taken: e.target.value })}
            />
          </label>

          <label style={styles.label}>
            Notes
            <textarea
              style={styles.textarea}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </label>

          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={() => setMode("view")}>
              Cancel
            </button>
            <button style={styles.primaryButton} onClick={saveRecord} disabled={saving}>
              {saving ? "Saving..." : "Save record"}
            </button>
          </div>
        </section>
      )}

      {mode === "letter" && selectedRecord && selectedEmployee && (
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>Generate Letter</h2>

          <div style={styles.letterGrid}>
            {["Warning letter", "Disciplinary notice", "Hearing notice"].map((template) => (
              <div key={template} style={styles.letterCard}>
                <h3>{template}</h3>
                <pre style={styles.letterPreview}>{buildLetter(template)}</pre>
              </div>
            ))}
          </div>

          <button style={styles.secondaryButton} onClick={() => setMode("view")}>
            Back to records
          </button>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    padding: "32px",
    background: "#f7f7f5",
    minHeight: "100vh",
    color: "#1f2933",
  },
  header: {
    marginBottom: "24px",
  },
  eyebrow: {
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: "12px",
    color: "#6b7280",
    marginBottom: "6px",
  },
  title: {
    fontSize: "30px",
    margin: 0,
  },
  subtitle: {
    color: "#6b7280",
    marginTop: "8px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    marginBottom: "22px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: "16px",
    fontSize: "20px",
  },
  employeeList: {
    display: "grid",
    gap: "12px",
  },
  employeeRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
  },
  muted: {
    color: "#6b7280",
    margin: "4px 0 0",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    border: "none",
    borderRadius: "999px",
    padding: "10px 16px",
    background: "#111827",
    color: "#ffffff",
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #d1d5db",
    borderRadius: "999px",
    padding: "10px 16px",
    background: "#ffffff",
    color: "#111827",
    cursor: "pointer",
  },
  smallButton: {
    border: "1px solid #d1d5db",
    borderRadius: "999px",
    padding: "7px 10px",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginBottom: "14px",
  },
  label: {
    display: "grid",
    gap: "7px",
    fontSize: "14px",
    fontWeight: 600,
    marginBottom: "14px",
  },
  input: {
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px",
    fontSize: "14px",
  },
  textarea: {
    border: "1px solid #d1d5db",
    borderRadius: "12px",
    padding: "11px",
    fontSize: "14px",
    minHeight: "100px",
    resize: "vertical",
  },
  table: {
    display: "grid",
    gap: "8px",
  },
  tableHeader: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.4fr 1.2fr",
    gap: "10px",
    fontWeight: 700,
    fontSize: "13px",
    color: "#4b5563",
    padding: "10px",
  },
  tableRow: {
    display: "grid",
    gridTemplateColumns: "1.2fr 0.8fr 0.8fr 1.4fr 1.2fr",
    gap: "10px",
    alignItems: "center",
    padding: "12px 10px",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "14px",
  },
  inlineActions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  letterGrid: {
    display: "grid",
    gap: "18px",
  },
  letterCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "16px",
    background: "#fafafa",
  },
  letterPreview: {
    whiteSpace: "pre-wrap",
    fontFamily: "inherit",
    fontSize: "14px",
    lineHeight: 1.6,
    background: "#ffffff",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },
};