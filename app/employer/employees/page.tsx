"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  employee_number: string | null;
  department: string | null;
  position: string | null;
  salary_type: string | null;
  pay_frequency: string | null;
  payment_method: string | null;
  basic_salary: number | null;
  hourly_rate: number | null;
  bank_name: string | null;
  account_number: string | null;
  account_type: string | null;
  tax_number: string | null;
  uif_number: string | null;
  employment_status: string | null;
  start_date: string | null;
  leave_balance: number | null;
  overtime_enabled: boolean | null;
  overtime_rate: number | null;
  notes: string | null;
  created_at?: string | null;
};

const emptyForm = {
  first_name: "",
  last_name: "",
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
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function getEmployerBusinessId() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("employer_id", user.id)
      .single();

    return data?.id || null;
  }

  async function fetchEmployees() {
    setLoading(true);
    setMessage("");

    const businessId = await getEmployerBusinessId();

    if (!businessId) {
      setEmployees([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }

    setLoading(false);
  }

  async function addEmployee() {
    setSaving(true);
    setMessage("");

    const businessId = await getEmployerBusinessId();

    if (!businessId) {
      setMessage("Business profile not found for this employer.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("employees").insert({
      business_id: businessId,
      first_name: form.first_name,
      last_name: form.last_name,
      employee_number: form.employee_number,
      department: form.department,
      position: form.position,
      salary_type: form.salary_type,
      pay_frequency: form.pay_frequency,
      payment_method: form.payment_method,
      basic_salary: Number(form.basic_salary || 0),
      hourly_rate: Number(form.hourly_rate || 0),
      bank_name: form.payment_method === "Cash" ? "" : form.bank_name,
      account_number: form.payment_method === "Cash" ? "" : form.account_number,
      account_type: form.payment_method === "Cash" ? "" : form.account_type,
      tax_number: form.tax_number,
      uif_number: form.uif_number,
      employment_status: form.employment_status,
      start_date: form.start_date || null,
      leave_balance: Number(form.leave_balance || 0),
      overtime_enabled: form.overtime_enabled,
      overtime_rate: Number(form.overtime_rate || 0),
      notes: form.notes,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setMessage("Employee added successfully.");
    setSaving(false);
    fetchEmployees();
  }

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const text = `${employee.first_name || ""} ${employee.last_name || ""} ${
        employee.employee_number || ""
      } ${employee.department || ""} ${employee.position || ""}`.toLowerCase();

      const matchesSearch = text.includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || employee.employment_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [employees, search, statusFilter]);

  const activeEmployees = employees.filter(
    (employee) => employee.employment_status === "active"
  ).length;

  const monthlyPayroll = employees.reduce(
    (sum, employee) => sum + Number(employee.basic_salary || 0),
    0
  );

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>WageFlow Employer</p>
          <h1 style={title}>Employees</h1>
          <p style={subtitle}>
            Add employees, manage employment status, and capture payroll details.
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

      <section style={card}>
        <h2 style={sectionTitle}>Add Employee</h2>

        {message && <div style={notice}>{message}</div>}

        <div style={formGrid}>
          <Field label="First Name">
            <input
              style={input}
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
          </Field>

          <Field label="Last Name">
            <input
              style={input}
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
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

          <Field label="Department">
            <input
              style={input}
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
            />
          </Field>

          <Field label="Position">
            <input
              style={input}
              value={form.position}
              onChange={(e) => setForm({ ...form, position: e.target.value })}
            />
          </Field>

          <Field label="Salary Type">
            <select
              style={input}
              value={form.salary_type}
              onChange={(e) =>
                setForm({ ...form, salary_type: e.target.value })
              }
            >
              <option value="monthly">Monthly Salary</option>
              <option value="hourly">Hourly Employee</option>
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

          <Field label="Bank Name">
            <input
              style={input}
              disabled={form.payment_method === "Cash"}
              value={form.bank_name}
              onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            />
          </Field>

          <Field label="Account Number">
            <input
              style={input}
              disabled={form.payment_method === "Cash"}
              value={form.account_number}
              onChange={(e) =>
                setForm({ ...form, account_number: e.target.value })
              }
            />
          </Field>

          <Field label="Bank Account Type">
            <select
              style={input}
              disabled={form.payment_method === "Cash"}
              value={form.account_type}
              onChange={(e) =>
                setForm({ ...form, account_type: e.target.value })
              }
            >
              <option value="Savings">Savings</option>
              <option value="Cheque">Cheque</option>
              <option value="Transmission">Transmission</option>
            </select>
          </Field>

          <Field label="Tax Number">
            <input
              style={input}
              value={form.tax_number}
              onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
            />
          </Field>

          <Field label="UIF Number">
            <input
              style={input}
              value={form.uif_number}
              onChange={(e) => setForm({ ...form, uif_number: e.target.value })}
            />
          </Field>

          <Field label="Employment Start Date">
            <input
              style={input}
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            />
          </Field>

          <Field label="Available Leave Days">
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
        </div>

        <label style={checkboxRow}>
          <input
            type="checkbox"
            checked={form.overtime_enabled}
            onChange={(e) =>
              setForm({ ...form, overtime_enabled: e.target.checked })
            }
          />
          Overtime enabled
        </label>

        <textarea
          style={textarea}
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />

        <button style={primaryButton} onClick={addEmployee} disabled={saving}>
          {saving ? "Saving..." : "Add Employee"}
        </button>
      </section>

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

            <button style={secondaryButton} onClick={fetchEmployees}>
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={emptyState}>Loading employees...</div>
        ) : filteredEmployees.length === 0 ? (
          <div style={emptyState}>No employees found.</div>
        ) : (
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>Department</th>
                  <th style={th}>Position</th>
                  <th style={th}>Salary</th>
                  <th style={th}>Pay</th>
                  <th style={th}>Payment Method</th>
                  <th style={th}>Status</th>
                  <th style={th}>Start Date</th>
                </tr>
              </thead>

              <tbody>
                {filteredEmployees.map((employee) => (
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

                    <td style={td}>{employee.department || "-"}</td>
                    <td style={td}>{employee.position || "-"}</td>
                    <td style={td}>
                      R {Number(employee.basic_salary || 0).toFixed(2)}
                    </td>
                    <td style={td}>{employee.pay_frequency || "monthly"}</td>
                    <td style={td}>
                      {employee.payment_method || "Bank Transfer"}
                    </td>
                    <td style={td}>{employee.employment_status || "active"}</td>
                    <td style={td}>{employee.start_date || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
      <label style={fieldLabel}>{label}</label>
      {children}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCard}>
      <span style={summaryLabel}>{label}</span>
      <strong style={summaryValue}>{value}</strong>
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
  maxWidth: "720px",
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
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "18px",
};

const summaryLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  textTransform: "uppercase" as const,
  marginBottom: "7px",
};

const summaryValue = {
  color: "#0f766e",
  fontSize: "24px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "26px",
  marginBottom: "24px",
};

const sectionTitle = {
  margin: "0 0 18px",
  color: "#0f172a",
  fontSize: "22px",
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

const formGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "14px",
  marginBottom: "14px",
};

const fieldLabel = {
  display: "block",
  marginBottom: "6px",
  color: "#475569",
  fontSize: "13px",
  fontWeight: 700,
};

const input = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  color: "#0f172a",
};

const checkboxRow = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  margin: "12px 0",
  color: "#334155",
  fontWeight: 700,
};

const textarea = {
  width: "100%",
  minHeight: "90px",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  marginBottom: "14px",
  fontFamily: "Arial, sans-serif",
};

const primaryButton = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  borderRadius: "10px",
  padding: "12px 18px",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  borderRadius: "10px",
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const toolbar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
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
  minWidth: "170px",
};

const emptyState = {
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "22px",
};

const tableWrap = {
  width: "100%",
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
  minWidth: "1000px",
};

const th = {
  textAlign: "left" as const,
  padding: "12px",
  background: "#f8fafc",
  borderBottom: "1px solid #e2e8f0",
  color: "#475569",
  fontSize: "12px",
  textTransform: "uppercase" as const,
};

const td = {
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle" as const,
};

const muted = {
  color: "#64748b",
  fontSize: "13px",
};