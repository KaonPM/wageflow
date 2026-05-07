"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Employee = {
  id: string;
  business_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  physical_address?: string | null;
  employee_number?: string | null;
  department?: string | null;
  position?: string | null;
  salary_type?: string | null;
  pay_frequency?: string | null;
  payment_method?: string | null;
  basic_salary?: number | null;
  hourly_rate?: number | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_type?: string | null;
  tax_number?: string | null;
  uif_number?: string | null;
  employment_status?: string | null;
  start_date?: string | null;
  leave_balance?: number | null;
  overtime_enabled?: boolean | null;
  overtime_rate?: number | null;
  notes?: string | null;
};

type EmployeeForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  physical_address: string;
  employee_number: string;
  department: string;
  position: string;
  salary_type: string;
  pay_frequency: string;
  payment_method: string;
  basic_salary: string;
  hourly_rate: string;
  bank_name: string;
  account_number: string;
  account_type: string;
  tax_number: string;
  uif_number: string;
  employment_status: string;
  start_date: string;
  leave_balance: string;
  overtime_enabled: boolean;
  overtime_rate: string;
  notes: string;
};

const emptyForm: EmployeeForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  physical_address: "",
  employee_number: "",
  department: "",
  position: "",
  salary_type: "monthly",
  pay_frequency: "monthly",
  payment_method: "Bank Transfer",
  basic_salary: "",
  hourly_rate: "",
  bank_name: "",
  account_number: "",
  account_type: "Savings",
  tax_number: "",
  uif_number: "",
  employment_status: "active",
  start_date: "",
  leave_balance: "0",
  overtime_enabled: false,
  overtime_rate: "",
  notes: "",
};

export default function EmployerEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function getEmployerBusinessId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (error || !profile?.business_id) {
      console.error("Profile business lookup failed", error);
      return null;
    }

    return profile.business_id as string;
  }

  async function fetchEmployees() {
    setLoading(true);
    setMessage("");

    const resolvedBusinessId = await getEmployerBusinessId();

    if (!resolvedBusinessId) {
      setBusinessId(null);
      setEmployees([]);
      setMessage("Business profile not found. Please complete employer settings first.");
      setLoading(false);
      return;
    }

    setBusinessId(resolvedBusinessId);

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", resolvedBusinessId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }

    setLoading(false);
  }

  function buildPayload(activeBusinessId: string) {
    return {
      business_id: activeBusinessId,
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      full_name: `${form.first_name} ${form.last_name}`.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      physical_address: form.physical_address.trim(),
      employee_number: form.employee_number.trim(),
      department: form.department.trim(),
      position: form.position.trim(),
      salary_type: form.salary_type,
      pay_frequency: form.pay_frequency,
      payment_method: form.payment_method,
      basic_salary: Number(form.basic_salary || 0),
      hourly_rate: Number(form.hourly_rate || 0),
      bank_name: form.payment_method === "Cash" ? "" : form.bank_name.trim(),
      account_number:
        form.payment_method === "Cash" ? "" : form.account_number.trim(),
      account_type: form.payment_method === "Cash" ? "" : form.account_type,
      tax_number: form.tax_number.trim(),
      uif_number: form.uif_number.trim(),
      employment_status: form.employment_status,
      start_date: form.start_date || null,
      leave_balance: Number(form.leave_balance || 0),
      overtime_enabled: form.overtime_enabled,
      overtime_rate: Number(form.overtime_rate || 0),
      notes: form.notes.trim(),
    };
  }

  async function saveEmployee() {
    setSaving(true);
    setMessage("");

    const activeBusinessId = businessId || (await getEmployerBusinessId());

    if (!activeBusinessId) {
      setMessage("Business profile not found for this employer.");
      setSaving(false);
      return;
    }

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setMessage("Please enter the employee first name and last name.");
      setSaving(false);
      return;
    }

    if (!form.email.trim()) {
      setMessage("Please enter the employee email address. This will be used for employee login later.");
      setSaving(false);
      return;
    }

    if (editingId) {
      const { error } = await supabase
        .from("employees")
        .update(buildPayload(activeBusinessId))
        .eq("id", editingId)
        .eq("business_id", activeBusinessId);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage("Employee updated successfully.");
    } else {
      const { error } = await supabase
        .from("employees")
        .insert(buildPayload(activeBusinessId));

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage("Employee added successfully.");
    }

    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    setSaving(false);
    fetchEmployees();
  }

  function startAddEmployee() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMessage("");

    setTimeout(() => {
      document
        .getElementById("employee-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function editEmployee(employee: Employee) {
    setEditingId(employee.id);
    setShowForm(true);
    setMessage("");

    setForm({
      first_name: employee.first_name || "",
      last_name: employee.last_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      physical_address: employee.physical_address || "",
      employee_number: employee.employee_number || "",
      department: employee.department || "",
      position: employee.position || "",
      salary_type: employee.salary_type || "monthly",
      pay_frequency: employee.pay_frequency || "monthly",
      payment_method: employee.payment_method || "Bank Transfer",
      basic_salary: String(employee.basic_salary || ""),
      hourly_rate: String(employee.hourly_rate || ""),
      bank_name: employee.bank_name || "",
      account_number: employee.account_number || "",
      account_type: employee.account_type || "Savings",
      tax_number: employee.tax_number || "",
      uif_number: employee.uif_number || "",
      employment_status: employee.employment_status || "active",
      start_date: employee.start_date || "",
      leave_balance: String(employee.leave_balance || 0),
      overtime_enabled: Boolean(employee.overtime_enabled),
      overtime_rate: String(employee.overtime_rate || ""),
      notes: employee.notes || "",
    });

    setTimeout(() => {
      document
        .getElementById("employee-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const text = `${employee.first_name || ""} ${employee.last_name || ""} ${
        employee.email || ""
      } ${employee.phone || ""} ${employee.employee_number || ""} ${
        employee.department || ""
      } ${employee.position || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || employee.employment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  const visibleEmployees = filteredEmployees.slice(0, 5);

  const activeEmployees = employees.filter(
    (employee) =>
      !employee.employment_status || employee.employment_status === "active"
  ).length;

  const monthlyPayroll = employees.reduce(
    (sum, employee) => sum + Number(employee.basic_salary || 0),
    0
  );

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>Employer Records</p>
          <h1 style={title}>Employees</h1>
          <p style={subtitle}>
            Add employees, manage contact details, employment status and payroll
            information.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      <section style={summaryGrid}>
        <SummaryCard label="Total Employees" value={String(employees.length)} />
        <SummaryCard label="Active Employees" value={String(activeEmployees)} />
        <SummaryCard
          label="Monthly Payroll"
          value={`R ${monthlyPayroll.toFixed(2)}`}
        />
      </section>

      {message && <div style={notice}>{message}</div>}

      <section style={card}>
        <div style={toolbar}>
          <h2 style={sectionTitle}>Employee Records</h2>

          <div style={filters}>
            <input
              style={filterInput}
              placeholder="Search employee"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              style={filterInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="terminated">Terminated</option>
            </select>

            <button type="button" style={secondaryButton} onClick={fetchEmployees}>
              Refresh
            </button>

            <button
              type="button"
              style={primaryButton}
              onClick={showForm ? closeForm : startAddEmployee}
            >
              {showForm ? "Close Form" : "+ Add Employee"}
            </button>
          </div>
        </div>

        {showForm && (
          <section id="employee-form" style={formBox}>
            <div style={formHeader}>
              <div>
                <p style={formEyebrow}>
                  {editingId ? "Edit Employee" : "New Employee"}
                </p>
                <h3 style={formTitle}>
                  {editingId ? "Update Employee Details" : "Add Employee"}
                </h3>
              </div>

              <button type="button" style={smallButton} onClick={closeForm}>
                Close
              </button>
            </div>

            <div style={formGrid}>
              <Field label="First Name">
                <input
                  style={input}
                  value={form.first_name}
                  onChange={(e) =>
                    setForm({ ...form, first_name: e.target.value })
                  }
                />
              </Field>

              <Field label="Last Name">
                <input
                  style={input}
                  value={form.last_name}
                  onChange={(e) =>
                    setForm({ ...form, last_name: e.target.value })
                  }
                />
              </Field>

              <Field label="Email Address">
                <input
                  style={input}
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </Field>

              <Field label="Contact Number">
                <input
                  style={input}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </Field>

              <Field label="Employee Number">
                <input
                  style={input}
                  value={form.employee_number}
                  onChange={(e) =>
                    setForm({ ...form, employee_number: e.target.value })
                  }
                />
              </Field>

              <Field label="Start Date">
                <input
                  style={input}
                  type="date"
                  value={form.start_date}
                  onChange={(e) =>
                    setForm({ ...form, start_date: e.target.value })
                  }
                />
              </Field>

              <Field label="Department">
                <input
                  style={input}
                  value={form.department}
                  onChange={(e) =>
                    setForm({ ...form, department: e.target.value })
                  }
                />
              </Field>

              <Field label="Position">
                <input
                  style={input}
                  value={form.position}
                  onChange={(e) =>
                    setForm({ ...form, position: e.target.value })
                  }
                />
              </Field>
            </div>

            <Field label="Physical Address">
              <textarea
                style={textarea}
                rows={3}
                value={form.physical_address}
                onChange={(e) =>
                  setForm({ ...form, physical_address: e.target.value })
                }
              />
            </Field>

            <div style={formGrid}>
              <Field label="Employment Status">
                <select
                  style={input}
                  value={form.employment_status}
                  onChange={(e) =>
                    setForm({ ...form, employment_status: e.target.value })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="terminated">Terminated</option>
                </select>
              </Field>

              <Field label="Salary Type">
                <select
                  style={input}
                  value={form.salary_type}
                  onChange={(e) =>
                    setForm({ ...form, salary_type: e.target.value })
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </Field>

              <Field label="Pay Frequency">
                <select
                  style={input}
                  value={form.pay_frequency}
                  onChange={(e) =>
                    setForm({ ...form, pay_frequency: e.target.value })
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                </select>
              </Field>

              <Field label="Payment Method">
                <select
                  style={input}
                  value={form.payment_method}
                  onChange={(e) =>
                    setForm({ ...form, payment_method: e.target.value })
                  }
                >
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="EFT">EFT</option>
                  <option value="Mobile Payment">Mobile Payment</option>
                  <option value="Other">Other</option>
                </select>
              </Field>

              <Field label="Basic Salary">
                <input
                  style={input}
                  type="number"
                  value={form.basic_salary}
                  onChange={(e) =>
                    setForm({ ...form, basic_salary: e.target.value })
                  }
                />
              </Field>

              <Field label="Hourly Rate">
                <input
                  style={input}
                  type="number"
                  value={form.hourly_rate}
                  onChange={(e) =>
                    setForm({ ...form, hourly_rate: e.target.value })
                  }
                />
              </Field>

              <Field label="Tax Number">
                <input
                  style={input}
                  value={form.tax_number}
                  onChange={(e) =>
                    setForm({ ...form, tax_number: e.target.value })
                  }
                />
              </Field>

              <Field label="UIF Number">
                <input
                  style={input}
                  value={form.uif_number}
                  onChange={(e) =>
                    setForm({ ...form, uif_number: e.target.value })
                  }
                />
              </Field>
            </div>

            {form.payment_method !== "Cash" && (
              <div style={formGrid}>
                <Field label="Bank Name">
                  <input
                    style={input}
                    value={form.bank_name}
                    onChange={(e) =>
                      setForm({ ...form, bank_name: e.target.value })
                    }
                  />
                </Field>

                <Field label="Account Number">
                  <input
                    style={input}
                    value={form.account_number}
                    onChange={(e) =>
                      setForm({ ...form, account_number: e.target.value })
                    }
                  />
                </Field>

                <Field label="Account Type">
                  <select
                    style={input}
                    value={form.account_type}
                    onChange={(e) =>
                      setForm({ ...form, account_type: e.target.value })
                    }
                  >
                    <option value="Savings">Savings</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Current">Current</option>
                    <option value="Transmission">Transmission</option>
                  </select>
                </Field>
              </div>
            )}

            <div style={formGrid}>
              <Field label="Leave Balance">
                <input
                  style={input}
                  type="number"
                  value={form.leave_balance}
                  onChange={(e) =>
                    setForm({ ...form, leave_balance: e.target.value })
                  }
                />
              </Field>

              <Field label="Overtime Rate">
                <input
                  style={input}
                  type="number"
                  value={form.overtime_rate}
                  onChange={(e) =>
                    setForm({ ...form, overtime_rate: e.target.value })
                  }
                />
              </Field>

              <div style={toggleBox}>
                <span style={label}>Overtime Enabled</span>
                <button
                  type="button"
                  style={{
                    ...toggleButton,
                    background: form.overtime_enabled ? "#0f766e" : "#e2e8f0",
                    color: form.overtime_enabled ? "#ffffff" : "#334155",
                  }}
                  onClick={() =>
                    setForm({
                      ...form,
                      overtime_enabled: !form.overtime_enabled,
                    })
                  }
                >
                  {form.overtime_enabled ? "Enabled" : "Disabled"}
                </button>
              </div>
            </div>

            <Field label="Notes">
              <textarea
                style={textarea}
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>

            <div style={formActions}>
              <button type="button" style={secondaryButton} onClick={closeForm}>
                Cancel
              </button>

              <button
                type="button"
                style={primaryButton}
                onClick={saveEmployee}
                disabled={saving}
              >
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Employee"
                  : "Save Employee"}
              </button>
            </div>
          </section>
        )}

        {loading ? (
          <div style={emptyState}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={emptyState}>No employees found.</div>
        ) : (
          <>
            <div style={tableWrap}>
              <table style={table}>
                <thead>
                  <tr>
                    <th style={th}>Employee</th>
                    <th style={th}>Contact</th>
                    <th style={th}>Department</th>
                    <th style={th}>Position</th>
                    <th style={th}>Salary</th>
                    <th style={th}>Pay</th>
                    <th style={th}>Payment Method</th>
                    <th style={th}>Status</th>
                    <th style={th}>Start Date</th>
                    <th style={th}>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td style={td}>
                        <strong>
                          {employee.first_name || ""} {employee.last_name || ""}
                        </strong>
                        <br />
                        <span style={muted}>
                          {employee.employee_number || "No employee number"}
                        </span>
                      </td>

                      <td style={td}>
                        <span>{employee.email || "-"}</span>
                        <br />
                        <span style={muted}>{employee.phone || "-"}</span>
                      </td>

                      <td style={td}>{employee.department || "-"}</td>
                      <td style={td}>{employee.position || "-"}</td>
                      <td style={td}>
                        R {Number(employee.basic_salary || 0).toFixed(2)}
                      </td>
                      <td style={td}>{employee.pay_frequency || "monthly"}</td>
                      <td style={td}>
                        {employee.payment_method || "Bank Transfer"}
                      </td>
                      <td style={td}>
                        <span style={statusBadge}>
                          {employee.employment_status || "active"}
                        </span>
                      </td>
                      <td style={td}>{employee.start_date || "-"}</td>
                      <td style={td}>
                        <button
                          type="button"
                          style={editButton}
                          onClick={() => editEmployee(employee)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length > 5 && (
              <p style={limitText}>
                Showing 5 of {filteredEmployees.length} employees. Use search or
                filters to narrow the list.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCard}>
      <span style={summaryValue}>{value}</span>
      <p style={summaryLabel}>{label}</p>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  padding: "38px",
  fontFamily: "Arial, sans-serif",
  background: "#f4f8fb",
  color: "#0f172a",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "20px",
  marginBottom: "28px",
};

const eyebrow = {
  color: "#0f766e",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  fontSize: "12px",
  marginBottom: "8px",
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 10px",
  fontWeight: 900,
};

const subtitle = {
  maxWidth: "760px",
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

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "16px",
  marginBottom: "22px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "20px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const summaryValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "26px",
  fontWeight: 900,
  marginBottom: "6px",
};

const summaryLabel = {
  margin: 0,
  color: "#475569",
  fontSize: "13px",
  fontWeight: 800,
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
  borderRadius: "22px",
  padding: "22px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  marginBottom: "18px",
};

const sectionTitle = {
  color: "#0f172a",
  fontSize: "22px",
  margin: 0,
};

const filters = {
  display: "flex",
  flexWrap: "wrap" as const,
  justifyContent: "flex-end",
  gap: "10px",
};

const filterInput = {
  minWidth: "160px",
  padding: "10px 11px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  background: "#ffffff",
  color: "#0f172a",
};

const primaryButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const secondaryButton = {
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const smallButton = {
  background: "#f8fafc",
  color: "#0f766e",
  border: "1px solid #dbeafe",
  padding: "8px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const formBox = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "20px",
  marginBottom: "22px",
};

const formHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  marginBottom: "18px",
};

const formEyebrow = {
  color: "#0f766e",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  margin: "0 0 6px",
};

const formTitle = {
  color: "#0f172a",
  fontSize: "20px",
  margin: 0,
};

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
};

const labelStyle = {
  display: "block",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "6px",
};

const label = {
  display: "block",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "8px",
};

const input = {
  width: "100%",
  padding: "11px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  marginBottom: "14px",
  color: "#0f172a",
  background: "#ffffff",
};

const textarea = {
  width: "100%",
  padding: "11px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  marginBottom: "14px",
  color: "#0f172a",
  background: "#ffffff",
  resize: "vertical" as const,
  fontFamily: "Arial, sans-serif",
};

const toggleBox = {
  marginBottom: "14px",
};

const toggleButton = {
  width: "100%",
  padding: "11px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const formActions = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "10px",
  marginTop: "10px",
};

const emptyState = {
  background: "#f8fafc",
  border: "1px dashed #cbd5e1",
  borderRadius: "16px",
  padding: "22px",
  color: "#64748b",
  fontWeight: 700,
};

const tableWrap = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "1050px",
};

const th = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.05em",
};

const td = {
  padding: "13px 12px",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
  fontSize: "14px",
  verticalAlign: "top" as const,
};

const muted = {
  color: "#64748b",
  fontSize: "12px",
};

const statusBadge = {
  display: "inline-block",
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #a5f3fc",
  borderRadius: "999px",
  padding: "5px 9px",
  fontSize: "12px",
  fontWeight: 800,
};

const editButton = {
  background: "#f8fafc",
  color: "#0f766e",
  border: "1px solid #dbeafe",
  padding: "8px 10px",
  borderRadius: "9px",
  cursor: "pointer",
  fontWeight: 800,
};

const limitText = {
  margin: "14px 0 0",
  color: "#64748b",
  fontSize: "13px",
  fontWeight: 700,
};