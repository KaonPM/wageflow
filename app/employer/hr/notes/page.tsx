"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  full_name?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  employee_number?: string | null;
  department?: string | null;
  job_title?: string | null;
};

type HRNote = {
  id: string;
  business_id: string | null;
  employee_id: string;
  note_title: string;
  note_category: string | null;
  note_body: string;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
};

const noteCategories = [
  "General HR note",
  "Attendance note",
  "Performance note",
  "Conduct note",
  "Follow-up note",
  "Admin note",
];

export default function HRNotesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [notes, setNotes] = useState<HRNote[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editingNote, setEditingNote] = useState<HRNote | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteCategory, setNoteCategory] = useState("General HR note");
  const [noteBody, setNoteBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPageData();
  }, []);

  const selectedEmployeeNotes = useMemo(() => {
    if (!selectedEmployee) return [];
    return notes.filter((note) => note.employee_id === selectedEmployee.id);
  }, [notes, selectedEmployee]);

  async function loadPageData() {
    setLoading(true);

    const { data: employeeData, error: employeeError } = await supabase
      .from("employees")
      .select("*")
      .order("created_at", { ascending: false });

    if (employeeError) {
      alert(`Could not load employees: ${employeeError.message}`);
      setLoading(false);
      return;
    }

    const { data: noteData, error: noteError } = await supabase
      .from("hr_notes")
      .select("*")
      .order("created_at", { ascending: false });

    if (noteError) {
      alert(`Could not load HR notes: ${noteError.message}`);
      setLoading(false);
      return;
    }

    setEmployees((employeeData || []) as Employee[]);
    setNotes((noteData || []) as HRNote[]);
    setLoading(false);
  }

  function getEmployeeName(employee: Employee | null | undefined) {
    if (!employee) return "Unknown employee";
    if (employee.full_name) return employee.full_name;
    if (employee.name) return employee.name;

    const combinedName = `${employee.first_name || ""} ${employee.last_name || ""}`.trim();
    return combinedName || "Unnamed employee";
  }

  function getEmployeeNotes(employeeId: string) {
    return notes.filter((note) => note.employee_id === employeeId);
  }

  function getLatestNote(employeeId: string) {
    return getEmployeeNotes(employeeId)[0] || null;
  }

  function viewNotes(employee: Employee) {
    setSelectedEmployee(employee);
    clearForm();
  }

  function startNewNote(employee: Employee) {
    setSelectedEmployee(employee);
    clearForm();
  }

  function editLatestNote(employee: Employee) {
    const latestNote = getLatestNote(employee.id);
    setSelectedEmployee(employee);

    if (!latestNote) {
      alert("This employee does not have any HR notes yet.");
      clearForm();
      return;
    }

    editNote(latestNote);
  }

  function editNote(note: HRNote) {
    setEditingNote(note);
    setNoteTitle(note.note_title);
    setNoteCategory(note.note_category || "General HR note");
    setNoteBody(note.note_body);
  }

  function clearForm() {
    setEditingNote(null);
    setNoteTitle("");
    setNoteCategory("General HR note");
    setNoteBody("");
  }

  async function saveNote() {
    if (!selectedEmployee) {
      alert("Please select an employee first.");
      return;
    }

    if (!noteTitle.trim() || !noteBody.trim()) {
      alert("Please enter a note title and note details.");
      return;
    }

    setSaving(true);

    if (editingNote) {
      const { error } = await supabase
        .from("hr_notes")
        .update({
          note_title: noteTitle.trim(),
          note_category: noteCategory,
          note_body: noteBody.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingNote.id);

      if (error) {
        alert(`Could not update HR note: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("hr_notes").insert({
        employee_id: selectedEmployee.id,
        note_title: noteTitle.trim(),
        note_category: noteCategory,
        note_body: noteBody.trim(),
        created_by: "Employer admin",
      });

      if (error) {
        alert(`Could not save HR note: ${error.message}`);
        setSaving(false);
        return;
      }
    }

    await loadPageData();
    clearForm();
    setSaving(false);
    alert("HR note saved successfully.");
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <p style={styles.muted}>Loading HR notes...</p>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <h1 style={styles.title}>HR Notes</h1>
          <p style={styles.subtitle}>
            Keep internal employee HR notes, observations and follow-up records.
          </p>
        </div>

        <Link href="/employer/hr" style={styles.backButton}>
          ← Back to HR Records
        </Link>
      </section>

      <section style={styles.card}>
        <div style={styles.cardTop}>
          <div>
            <h2 style={styles.cardTitle}>Employee Notes Overview</h2>
            <p style={styles.muted}>Select an employee to view or add HR notes.</p>
          </div>

          <button style={styles.smallButton} onClick={loadPageData}>
            Refresh
          </button>
        </div>

        {employees.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>No employees found</p>
            <p style={styles.muted}>Employees must be added before HR notes can be recorded.</p>
          </div>
        ) : (
          <div style={styles.table}>
            <div style={styles.employeeTableHeader}>
              <span>Employee</span>
              <span>Notes</span>
              <span>Latest Note</span>
              <span>Action</span>
            </div>

            {employees.map((employee) => {
              const employeeNotes = getEmployeeNotes(employee.id);
              const latestNote = getLatestNote(employee.id);

              return (
                <div key={employee.id} style={styles.employeeTableRow}>
                  <div>
                    <strong>{getEmployeeName(employee)}</strong>
                    <p style={styles.smallText}>{employee.employee_number || "No employee number"}</p>
                    <p style={styles.smallText}>{employee.department || "No department"}</p>
                  </div>

                  <div>
                    <span style={styles.noteBadge}>{employeeNotes.length}</span>
                  </div>

                  <div>
                    {latestNote ? (
                      <>
                        <strong>{latestNote.note_title}</strong>
                        <p style={styles.smallText}>{latestNote.note_category || "General HR note"}</p>
                      </>
                    ) : (
                      <p style={styles.smallText}>No notes yet</p>
                    )}
                  </div>

                  <div style={styles.actions}>
                    <button style={styles.primarySmallButton} onClick={() => viewNotes(employee)}>
                      View
                    </button>

                    <button style={styles.smallButton} onClick={() => startNewNote(employee)}>
                      Add
                    </button>

                    <button style={styles.smallButton} onClick={() => editLatestNote(employee)}>
                      Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {selectedEmployee && (
        <section style={styles.card}>
          <div style={styles.cardTop}>
            <div>
              <h2 style={styles.cardTitle}>Notes for {getEmployeeName(selectedEmployee)}</h2>
              <p style={styles.muted}>View note history and manage internal HR notes.</p>
            </div>

            <button
              style={styles.smallButton}
              onClick={() => {
                setSelectedEmployee(null);
                clearForm();
              }}
            >
              Close
            </button>
          </div>

          {selectedEmployeeNotes.length === 0 ? (
            <div style={styles.emptyState}>
              <p style={styles.emptyTitle}>No HR notes for this employee</p>
              <p style={styles.muted}>Use the form below to add the first note.</p>
            </div>
          ) : (
            <div style={styles.noteList}>
              {selectedEmployeeNotes.map((note) => (
                <div key={note.id} style={styles.noteCard}>
                  <div>
                    <div style={styles.noteTopLine}>
                      <strong>{note.note_title}</strong>
                      <span style={styles.categoryBadge}>
                        {note.note_category || "General HR note"}
                      </span>
                    </div>

                    <p style={styles.noteBody}>{note.note_body}</p>
                    <p style={styles.smallText}>
                      Created: {formatDate(note.created_at)}
                      {note.updated_at ? ` • Updated: ${formatDate(note.updated_at)}` : ""}
                    </p>
                  </div>

                  <button style={styles.primarySmallButton} onClick={() => editNote(note)}>
                    Edit
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {selectedEmployee && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>{editingNote ? "Edit HR Note" : "Add HR Note"}</h2>
          <p style={styles.muted}>Employee: {getEmployeeName(selectedEmployee)}</p>

          <div style={styles.formGrid}>
            <label style={styles.label}>
              Note Title
              <input
                style={styles.input}
                value={noteTitle}
                onChange={(event) => setNoteTitle(event.target.value)}
                placeholder="Example: Attendance follow-up"
              />
            </label>

            <label style={styles.label}>
              Note Category
              <select
                style={styles.input}
                value={noteCategory}
                onChange={(event) => setNoteCategory(event.target.value)}
              >
                {noteCategories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>

          <label style={styles.label}>
            Note Details
            <textarea
              style={styles.textarea}
              value={noteBody}
              onChange={(event) => setNoteBody(event.target.value)}
              placeholder="Capture the internal HR note clearly..."
            />
          </label>

          <div style={styles.actions}>
            <button style={styles.primarySmallButton} onClick={saveNote} disabled={saving}>
              {saving ? "Saving..." : editingNote ? "Update" : "Save"}
            </button>

            <button style={styles.smallButton} onClick={clearForm}>
              Clear
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

function formatDate(value: string | null) {
  if (!value) return "N/A";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "32px 38px",
    background: "#f4f7f6",
    color: "#1f2937",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
    marginBottom: "22px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "32px",
    color: "#2f7d6d",
    fontWeight: 800,
  },
  subtitle: {
    marginTop: "8px",
    color: "#667085",
    fontSize: "14px",
  },
  backButton: {
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "12px 16px",
    borderRadius: "11px",
    textDecoration: "none",
    fontWeight: 800,
    whiteSpace: "nowrap",
    boxShadow: "0 8px 18px rgba(47, 125, 109, 0.22)",
  },
  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow: "0 10px 24px rgba(16, 24, 40, 0.05)",
    border: "1px solid #e6ecea",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    marginBottom: "16px",
    flexWrap: "wrap",
  },
  cardTitle: {
    margin: 0,
    fontSize: "20px",
    color: "#2c2333",
    fontWeight: 800,
  },
  muted: {
    margin: "5px 0 0",
    color: "#667085",
    fontSize: "13px",
    lineHeight: 1.45,
  },
  smallText: {
    margin: "4px 0 0",
    color: "#667085",
    fontSize: "12px",
  },
  emptyState: {
    background: "#f8fbfa",
    border: "1px dashed #bad8d1",
    borderRadius: "14px",
    padding: "16px",
  },
  emptyTitle: {
    margin: 0,
    fontWeight: 800,
    color: "#2c2333",
  },
  table: {
    width: "100%",
    overflowX: "auto",
  },
  employeeTableHeader: {
    minWidth: "820px",
    display: "grid",
    gridTemplateColumns: "2fr 0.6fr 1.7fr 1.3fr",
    gap: "14px",
    padding: "12px 8px",
    borderBottom: "1px solid #e5e7eb",
    fontWeight: 800,
    color: "#2c2333",
    fontSize: "14px",
  },
  employeeTableRow: {
    minWidth: "820px",
    display: "grid",
    gridTemplateColumns: "2fr 0.6fr 1.7fr 1.3fr",
    gap: "14px",
    alignItems: "center",
    padding: "13px 8px",
    borderBottom: "1px solid #eef2f1",
  },
  noteBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "30px",
    height: "30px",
    background: "#e8f5f2",
    color: "#225f54",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "13px",
  },
  categoryBadge: {
    display: "inline-block",
    background: "#e8f5f2",
    color: "#225f54",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: 800,
  },
  actions: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    alignItems: "center",
  },
  primarySmallButton: {
    border: "none",
    background: "#2f7d6d",
    color: "#ffffff",
    padding: "9px 13px",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "13px",
    boxShadow: "0 6px 14px rgba(47, 125, 109, 0.16)",
  },
  smallButton: {
    border: "1px solid #cfd8d5",
    background: "#ffffff",
    color: "#35514c",
    padding: "9px 13px",
    borderRadius: "10px",
    fontWeight: 800,
    cursor: "pointer",
    fontSize: "13px",
  },
  noteList: {
    display: "grid",
    gap: "10px",
  },
  noteCard: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "14px",
    alignItems: "center",
    background: "#f8fbfa",
    border: "1px solid #e6ecea",
    borderRadius: "14px",
    padding: "14px",
  },
  noteTopLine: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    flexWrap: "wrap",
    color: "#2c2333",
  },
  noteBody: {
    margin: "8px 0 0",
    color: "#1f2937",
    fontSize: "13px",
    lineHeight: 1.5,
  },
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "14px",
    marginTop: "16px",
    marginBottom: "14px",
  },
  label: {
    display: "grid",
    gap: "7px",
    fontWeight: 800,
    color: "#2c2333",
    fontSize: "13px",
    marginBottom: "14px",
  },
  input: {
    border: "1px solid #d0d5dd",
    borderRadius: "11px",
    padding: "10px",
    fontSize: "13px",
    background: "#ffffff",
    color: "#101828",
  },
  textarea: {
    border: "1px solid #d0d5dd",
    borderRadius: "11px",
    padding: "10px",
    fontSize: "13px",
    background: "#ffffff",
    color: "#101828",
    minHeight: "100px",
    resize: "vertical",
  },
};