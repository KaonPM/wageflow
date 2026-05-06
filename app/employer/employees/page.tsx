"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/app/lib/supabaseClient";

type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  employee_number: string;
  job_title: string;
  department: string;
  basic_salary: number;
  status: string;
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    employee_number: "",
    job_title: "",
    department: "",
    basic_salary: "",
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("employer_id", user.id)
      .single();

    if (!business) return;

    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    setEmployees(data || []);
    setLoading(false);
  }

  async function addEmployee() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: business } = await supabase
      .from("businesses")
      .select("id")
      .eq("employer_id", user.id)
      .single();

    if (!business) {
      alert("Business not found");
      return;
    }

    const { error } = await supabase.from("employees").insert({
      business_id: business.id,
      first_name: form.first_name,
      last_name: form.last_name,
      employee_number: form.employee_number,
      job_title: form.job_title,
      department: form.department,
      basic_salary: Number(form.basic_salary),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setForm({
      first_name: "",
      last_name: "",
      employee_number: "",
      job_title: "",
      department: "",
      basic_salary: "",
    });

    fetchEmployees();
  }

  return (
    <main style={page}>
      <div style={header}>
        <h1 style={title}>Employee Management</h1>
        <p style={subtitle}>
          Add and manage employees linked to your business.
        </p>
      </div>

      <section style={card}>
        <h2 style={sectionTitle}>Add Employee</h2>

        <div style={grid}>
          <input
            placeholder="First Name"
            value={form.first_name}
            onChange={(e) =>
              setForm({ ...form, first_name: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Last Name"
            value={form.last_name}
            onChange={(e) =>
              setForm({ ...form, last_name: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Employee Number"
            value={form.employee_number}
            onChange={(e) =>
              setForm({ ...form, employee_number: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Job Title"
            value={form.job_title}
            onChange={(e) =>
              setForm({ ...form, job_title: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Department"
            value={form.department}
            onChange={(e) =>
              setForm({ ...form, department: e.target.value })
            }
            style={input}
          />

          <input
            placeholder="Basic Salary"
            type="number"
            value={form.basic_salary}
            onChange={(e) =>
              setForm({ ...form, basic_salary: e.target.value })
            }
            style={input}
          />
        </div>

        <button onClick={addEmployee} style={button}>
          Add Employee
        </button>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Employees</h2>

        {loading ? (
          <p>Loading employees...</p>
        ) : employees.length === 0 ? (
          <p>No employees added yet.</p>
        ) : (
          <div style={tableWrapper}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Employee</th>
                  <th style={th}>Employee No.</th>
                  <th style={th}>Job Title</th>
                  <th style={th}>Department</th>
                  <th style={th}>Salary</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td style={td}>
                      {employee.first_name} {employee.last_name}
                    </td>

                    <td style={td}>
                      {employee.employee_number}
                    </td>

                    <td style={td}>
                      {employee.job_title}
                    </td>

                    <td style={td}>
                      {employee.department}
                    </td>

                    <td style={td}>
                      R {Number(employee.basic_salary).toFixed(2)}
                    </td>

                    <td style={td}>
                      {employee.status}
                    </td>
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

const page = {
  padding: "32px",
  background: "#f8fafc",
  minHeight: "100vh",
};

const header = {
  marginBottom: "24px",
};

const title = {
  fontSize: "32px",
  fontWeight: 700,
  color: "#0f172a",
};

const subtitle = {
  color: "#475569",
  marginTop: "8px",
};

const card = {
  background: "#ffffff",
  borderRadius: "16px",
  padding: "24px",
  marginBottom: "24px",
  border: "1px solid #e2e8f0",
};

const sectionTitle = {
  fontSize: "20px",
  fontWeight: 600,
  marginBottom: "20px",
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const input = {
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
};

const button = {
  background: "#0f766e",
  color: "#ffffff",
  border: "none",
  padding: "12px 20px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 600,
};

const tableWrapper = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  textAlign: "left" as const,
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const td = {
  padding: "14px",
  borderBottom: "1px solid #e2e8f0",
};