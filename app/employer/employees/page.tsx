"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function EmployeesPage() {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("");
  const [salary, setSalary] = useState("");
  const [message, setMessage] = useState("");
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees() {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .single();

    const businessId = profile?.business_id;

    const { data } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", businessId);

    setEmployees(data || []);
  }

  async function addEmployee() {
    setMessage("Saving...");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .single();

    const businessId = profile?.business_id;

    const { error } = await supabase.from("employees").insert([
      {
        full_name: name,
        position,
        salary: Number(salary),
        business_id: businessId,
      },
    ]);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Employee added");
      setName("");
      setPosition("");
      setSalary("");
      fetchEmployees();
    }
  }

  return (
    <main style={page}>
      <h1 style={title}>Employees</h1>

      <div style={form}>
        <input
          style={input}
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          style={input}
          placeholder="Position"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />

        <input
          style={input}
          placeholder="Salary"
          value={salary}
          onChange={(e) => setSalary(e.target.value)}
        />

        <button style={button} onClick={addEmployee}>
          Add Employee
        </button>

        {message && <p>{message}</p>}
      </div>

      <div style={{ marginTop: "40px" }}>
        <h2>Employee List</h2>

        {employees.length === 0 ? (
          <p>No employees yet</p>
        ) : (
          employees.map((emp) => (
            <div key={emp.id} style={card}>
              <strong>{emp.full_name}</strong>
              <p>{emp.position}</p>
              <p>R {emp.salary}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}

const page = {
  padding: "40px",
  fontFamily: "Arial",
};

const title = {
  fontSize: "24px",
  marginBottom: "20px",
};

const form = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "10px",
  maxWidth: "300px",
};

const input = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
};

const button = {
  background: "#0f766e",
  color: "#fff",
  padding: "10px",
  border: "none",
  borderRadius: "6px",
};

const card = {
  border: "1px solid #eee",
  padding: "15px",
  borderRadius: "8px",
  marginTop: "10px",
};