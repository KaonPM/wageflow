"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  business_id: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  employee_name?: string | null;
  employee_number?: string | null;
  job_title?: string | null;
  position?: string | null;
  department?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Business = {
  id: string;
  name?: string | null;
  business_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

type DisciplinaryRecord = {
  id: string;
  business_id: string | null;
  employee_id: string;
  record_type: string;
  status: string;
  incident_date: string | null;
  record_date: string | null;
  incident_description: string;
  action_taken: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
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

const templates = ["Warning letter", "Disciplinary notice", "Hearing notice"];

export default function DisciplinaryRecordsPage() {
  const [business, setBusiness] = useState<Business | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<DisciplinaryRecord[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<DisciplinaryRecord | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("Warning letter");
  const [mode, setMode] = useState<"new" | "edit" | "letter" | null>(null);
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

  useEffect(() => {
    loadData();
  }, []);

  const employeeRecordCount = useMemo(() => {
    const countMap: Record<string, number> = {};

    records.forEach((record) => {
      countMap[record.employee_id] = (countMap[record.employee_id] || 0) + 1;
    });

    return countMap;
  }, [records]);

  function employeeName(employee: Employee | null | undefined) {
    if (!employee) return "Unknown employee";

    const fullName =
      employee.full_name ||
      employee.employee_name ||
      employee.name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim();

    return fullName || "Unnamed employee";
  }

  function employeeRole(employee: Employee | null | undefined) {
    if (!employee) return "No job title";
    return employee.job_title || employee.position || "No job title";
  }

  function businessName() {
    return (
      business?.business_name ||
      business?.company_name ||
      business?.name ||
      "Business name"
    );
  }

  async function loadData() {
    setLoading(true);

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (employeeError) {
      console.error("Employees error:", employeeError);
      alert(`Could not load employees: ${employeeError.message}`);
      setEmployees([]);
      setRecords([]);
      setLoading(false);
      return;
    }

    const loadedEmployees = employeeData || [];
    setEmployees(loadedEmployees);

    const businessId =
      loadedEmployees.find((employee) => employee.business_id)?.business_id || null;

    if (businessId) {
      const { data: businessData } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", businessId)
        .maybeSingle();

      setBusiness(businessData || { id: businessId });
    } else {
      setBusiness(null);
    }

    const { data: recordData, error: recordError } = await supabase
      .from("disciplinary_records")
      .select("*")
      .order("created_at", { ascending: false });

    if (recordError) {
      console.error("Disciplinary records error:", recordError);
      alert(`Could not load disciplinary records: ${recordError.message}`);
      setRecords([]);
      setLoading(false);
      return;
    }

    setRecords(recordData || []);
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

  function openEditLatest(employee: Employee) {
    const employeeRecords = records.filter((record) => record.employee_id === employee.id);

    if (employeeRecords.length === 0) {
      alert("No disciplinary record found for this employee yet. Create a new record first.");
      return;
    }

    const latestRecord = employeeRecords[0];
    openEdit(latestRecord);
  }

  function openViewRecords(employee: Employee) {
    const employeeRecords = records.filter((record) => record.employee_id === employee.id);

    if (employeeRecords.length === 0) {
      alert("No disciplinary records found for this employee yet.");
      return;
    }

    const summary = employeeRecords
      .map(
        (record, index) =>
          `${index + 1}. ${record.record_type} | ${record.status} | ${
            record.record_date || "No date"
          }\nAction: ${record.action_taken}`
      )
      .join("\n\n");

    alert(`${employeeName(employee)} disciplinary records:\n\n${summary}`);
  }

  function openEdit(record: DisciplinaryRecord) {
    const employee = employees.find((item) => item.id === record.employee_id) || null;

    setSelectedEmployee(employee);
    setSelectedRecord(record);
    setMode("edit");

    setForm({
      record_type: record.record_type,
      status: record.status,
      incident_date: record.incident_date || "",
      record_date: record.record_date || new Date().toISOString().slice(0, 10),
      incident_description: record.incident_description,
      action_taken: record.action_taken,
      notes: record.notes || "",
    });
  }

  function openLetterForLatest(employee: Employee) {
    const employeeRecords = records.filter((record) => record.employee_id === employee.id);

    if (employeeRecords.length === 0) {
      alert("No disciplinary record found for this employee yet. Create a record before generating a letter.");
      return;
    }

    const latestRecord = employeeRecords[0];

    setSelectedEmployee(employee);
    setSelectedRecord(latestRecord);
    setSelectedTemplate("Warning letter");
    setMode("letter");
  }

  async function saveRecord() {
    if (!selectedEmployee) {
      alert("Please select an employee first.");
      return;
    }

    if (!form.incident_date || !form.incident_description || !form.action_taken) {
      alert("Please complete incident date, description of incident and action taken.");
      return;
    }

    setSaving(true);

    const payload = {
      business_id: selectedEmployee.business_id,
      employee_id: selectedEmployee.id,
      record_type: form.record_type,
      status: form.status,
      incident_date: form.incident_date,
      record_date: form.record_date,
      incident_description: form.incident_description,
      action_taken: form.action_taken,
      notes: form.notes,
      created_by: "Employer admin",
      updated_at: new Date().toISOString(),
    };

    if (mode === "edit" && selectedRecord) {
      const { error } = await supabase
        .from("disciplinary_records")
        .update(payload)
        .eq("id", selectedRecord.id);

      if (error) {
        console.error("Update disciplinary record error:", error);
        alert(`Record was not updated: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("disciplinary_records").insert(payload);

      if (error) {
        console.error("Insert disciplinary record error:", error);
        alert(`Record was not saved: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    await loadData();
    setSaving(false);
    setSelectedEmployee(null);
    setSelectedRecord(null);
    setMode(null);
    alert("Disciplinary record saved successfully.");
  }

  function buildLetter() {
    if (!selectedEmployee || !selectedRecord) return "";

    const name = employeeName(selectedEmployee);

    if (selectedTemplate === "Warning letter") {
      return `${businessName()}

Date: ${selectedRecord.record_date || ""}

To: ${name}
Employee Number: ${selectedEmployee.employee_number || "N/A"}
Position: ${employeeRole(selectedEmployee)}
Department: ${selectedEmployee.department || "N/A"}

Subject: ${selectedRecord.record_type}

Dear ${name},

This letter serves as a formal record regarding the matter described below.

Incident date:
${selectedRecord.incident_date || "N/A"}

Details of incident:
${selectedRecord.incident_description}

Action taken:
${selectedRecord.action_taken}

Current status:
${selectedRecord.status}

This record is issued for internal HR traceability, fair workplace administration and compliance-focused recordkeeping.

Employee acknowledgement:
I acknowledge receipt of this letter. My signature does not necessarily mean that I agree with the contents.

Employee signature: ___________________________ Date: _______________

Employer representative: ______________________ Date: _______________`;
    }

    if (selectedTemplate === "Disciplinary notice") {
      return `${businessName()}

Date: ${selectedRecord.record_date || ""}

To: ${name}
Employee Number: ${selectedEmployee.employee_number || "N/A"}
Position: ${employeeRole(selectedEmployee)}
Department: ${selectedEmployee.department || "N/A"}

Subject: Notice of Disciplinary Record

Dear ${name},

This notice confirms that a disciplinary matter has been recorded for review and internal follow-up.

Incident date:
${selectedRecord.incident_date || "N/A"}

Nature of matter:
${selectedRecord.incident_description}

Action or next step:
${selectedRecord.action_taken}

Current status:
${selectedRecord.status}

This notice is issued to ensure that the matter is properly recorded, traceable and handled through a fair workplace process.

Employee signature: ___________________________ Date: _______________

Employer representative: ______________________ Date: _______________`;
    }

    return `${businessName()}

Date: ${selectedRecord.record_date || ""}

To: ${name}
Employee Number: ${selectedEmployee.employee_number || "N/A"}
Position: ${employeeRole(selectedEmployee)}
Department: ${selectedEmployee.department || "N/A"}

Subject: Notice to Attend Disciplinary Hearing

Dear ${name},

You are hereby notified that a disciplinary hearing may be required regarding the matter recorded below.

Incident date:
${selectedRecord.incident_date || "N/A"}

Allegation or matter to be discussed:
${selectedRecord.incident_description}

Purpose of hearing or proposed action:
${selectedRecord.action_taken}

You should be given a fair opportunity to respond to the matter and prepare where applicable according to workplace policy.

This notice is generated for internal HR recordkeeping, procedural fairness and traceability.

Employee signature: ___________________________ Date: _______________

Employer representative: ______________________ Date: _______________`;
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.muted}>Loading disciplinary records...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <h1 style={styles.title}>Disciplinary Records</h1>
          <p style={styles.subtitle}>
            Record disciplinary incidents, warnings, hearings, outcomes and traceable HR actions.
          </p>
        </div>

        <Link href="/employer/hr" style={styles.backButton}>
          ← Back to HR Records
        </Link>
      </section>

      <section style={styles.card}>
        <div style={styles.cardTop}>
          <div>
            <h2 style={styles.cardTitle}>Employees</h2>
            <p style={styles.muted}>
              View disciplinary records, create new records, edit actions and generate letters.
            </p>
          </div>

          <button style={styles.lightButton} onClick={loadData}>
            Refresh
          </button>
        </div>

        {employees.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No employees found</p>
            <p style={styles.muted}>
              No employees are currently available. Please check that employees have been added.
            </p>
            <Link href="/employer/employees" style={styles.primaryLink}>
              Go to Employees
            </Link>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.tableHeader}>
              <span>Employee</span>
              <span>Role</span>
              <span>Records</span>
              <span>Action</span>
            </div>

            {employees.map((employee) => {
              const count = employeeRecordCount[employee.id] || 0;

              return (
                <div key={employee.id} style={styles.tableRow}>
                  <div>
                    <strong>{employeeName(employee)}</strong>
                    <p style={styles.smallText}>
                      {employee.employee_number || "No employee number"}
                    </p>
                  </div>

                  <div>
                    <strong>{employeeRole(employee)}</strong>
                    <p style={styles.smallText}>{employee.department || "No department"}</p>
                  </div>

                  <div>
                    <strong>{count}</strong>
                    <p style={styles.smallText}>
                      {count === 1 ? "record created" : "records created"}
                    </p>
                  </div>

                  <div style={styles.actions}>
                    <button style={styles.viewButton} onClick={() => openViewRecords(employee)}>
                      View
                    </button>
                    <button style={styles.editButton} onClick={() => openNew(employee)}>
                      New
                    </button>
                    <button style={styles.editButton} onClick={() => openEditLatest(employee)}>
                      Edit
                    </button>
                    <button style={styles.letterButton} onClick={() => openLetterForLatest(employee)}>
                      Generate Letter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {(mode === "new" || mode === "edit") && selectedEmployee && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>
            {mode === "new" ? "Create Disciplinary Record" : "Edit Disciplinary Record"}
          </h2>
          <p style={styles.muted}>Employee: {employeeName(selectedEmployee)}</p>

          <div style={styles.formGrid}>
            <label style={styles.label}>
              Record Type
              <select
                style={styles.input}
                value={form.record_type}
                onChange={(event) => setForm({ ...form, record_type: event.target.value })}
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
                onChange={(event) => setForm({ ...form, status: event.target.value })}
              >
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>

            <label style={styles.label}>
              Incident Date
              <input
                type="date"
                style={styles.input}
                value={form.incident_date}
                onChange={(event) => setForm({ ...form, incident_date: event.target.value })}
              />
            </label>

            <label style={styles.label}>
              Record Date
              <input
                type="date"
                style={styles.input}
                value={form.record_date}
                onChange={(event) => setForm({ ...form, record_date: event.target.value })}
              />
            </label>
          </div>

          <label style={styles.label}>
            Description of Incident
            <textarea
              style={styles.textarea}
              value={form.incident_description}
              onChange={(event) =>
                setForm({ ...form, incident_description: event.target.value })
              }
            />
          </label>

          <label style={styles.label}>
            Action Taken
            <textarea
              style={styles.textarea}
              value={form.action_taken}
              onChange={(event) => setForm({ ...form, action_taken: event.target.value })}
            />
          </label>

          <label style={styles.label}>
            Notes
            <textarea
              style={styles.textarea}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </label>

          <div style={styles.actions}>
            <button
              style={styles.lightButton}
              onClick={() => {
                setSelectedEmployee(null);
                setSelectedRecord(null);
                setMode(null);
              }}
            >
              Cancel
            </button>
            <button style={styles.greenButton} onClick={saveRecord} disabled={saving}>
              {saving ? "Saving..." : "Save Record"}
            </button>
          </div>
        </section>
      )}

      {mode === "letter" && selectedEmployee && selectedRecord && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Generate Letter</h2>
          <p style={styles.muted}>
            Employee and business details are automatically inserted into the selected template.
          </p>

          <label style={styles.label}>
            Letter Template
            <select
              style={styles.input}
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template}>{template}</option>
              ))}
            </select>
          </label>

          <pre style={styles.letterPreview}>{buildLetter()}</pre>

          <div style={styles.actions}>
            <button
              style={styles.lightButton}
              onClick={() => {
                setSelectedEmployee(null);
                setSelectedRecord(null);
                setMode(null);
              }}
            >
              Back
            </button>
            <button
              style={styles.greenButton}
              onClick={() => navigator.clipboard.writeText(buildLetter())}
            >
              Copy Letter
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "38px 42px",
    background: "#f4f7f6",
    color: "#1f2937",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "flex-start",
    marginBottom: "26px",
  },
  title: {
    margin: 0,
    fontSize: "34px",
    color: "#2f7d6d",
    fontWeight: 800,
  },
  subtitle: {
    marginTop: "10px",
    color: "#667085",
    fontSize: "15px",
  },
  backButton: {
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "13px 18px",
    borderRadius: "12px",
    textDecoration: "none",
    fontWeight: 800,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(47, 125, 109, 0.22)",
  },
  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 12px 28px rgba(16, 24, 40, 0.06)",
    border: "1px solid #e6ecea",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "20px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#2c2333",
    fontWeight: 700,
  },
  muted: {
    margin: "6px 0 0",
    color: "#667085",
    fontSize: "14px",
    lineHeight: 1.5,
  },
  smallText: {
    margin: "5px 0 0",
    color: "#667085",
    fontSize: "13px",
  },
  emptyState: {
    background: "#f8fbfa",
    border: "1px dashed #bad8d1",
    borderRadius: "16px",
    padding: "20px",
  },
  emptyTitle: {
    margin: 0,
    fontWeight: 800,
    color: "#2c2333",
  },
  primaryLink: {
    display: "inline-block",
    marginTop: "14px",
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "11px 16px",
    borderRadius: "11px",
    textDecoration: "none",
    fontWeight: 800,
  },
  table: {
    width: "100%",
    overflowX: "auto",
  },
  tableHeader: {
    minWidth: "900px",
    display: "grid",
    gridTemplateColumns: "1.3fr 1.2fr 0.8fr 2.4fr",
    gap: "16px",
    padding: "14px 8px",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 800,
    color: "#2c2333",
  },
  tableRow: {
    minWidth: "900px",
    display: "grid",
    gridTemplateColumns: "1.3fr 1.2fr 0.8fr 2.4fr",
    gap: "16px",
    alignItems: "center",
    padding: "16px 8px",
    borderBottom: "1px solid #eef2f1",
  },
  actions: {
    display: "flex",
    gap: "9px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  viewButton: {
    border: "1px solid #c7e3de",
    background: "#e8f5f2",
    color: "#225f54",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  editButton: {
    border: "1px solid #cfd8d5",
    background: "#ffffff",
    color: "#2f7d6d",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  letterButton: {
    border: "1px solid #cfd8d5",
    background: "#ffffff",
    color: "#2f7d6d",
    padding: "10px 15px",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
  },
  lightButton: {
    border: "1px solid #cfd8d5",
    background: "#ffffff",
    color: "#35514c",
    padding: "11px 16px",
    borderRadius: "11px",
    fontWeight: 800,
    cursor: "pointer",
  },
  greenButton: {
    border: "none",
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "12px 17px",
    borderRadius: "11px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 18px rgba(47, 125, 109, 0.18)",
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "16px",
  },
  label: {
    display: "grid",
    gap: "8px",
    fontWeight: 800,
    color: "#2c2333",
    fontSize: "14px",
    marginBottom: "16px",
  },
  input: {
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "14px",
    background: "#ffffff",
    color: "#101828",
  },
  textarea: {
    border: "1px solid #d0d5dd",
    borderRadius: "12px",
    padding: "12px",
    fontSize: "14px",
    background: "#ffffff",
    color: "#101828",
    minHeight: "110px",
    resize: "vertical",
  },
  letterPreview: {
    whiteSpace: "pre-wrap",
    background: "#f8fbfa",
    border: "1px solid #d9e7e3",
    borderRadius: "16px",
    padding: "20px",
    color: "#1f2937",
    fontSize: "14px",
    lineHeight: 1.7,
  },
};