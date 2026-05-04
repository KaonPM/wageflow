"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function PayrollPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [salary, setSalary] = useState(0);
  const [employeeUif, setEmployeeUif] = useState(0);
  const [employerUif, setEmployerUif] = useState(0);
  const [totalUif, setTotalUif] = useState(0);
  const [net, setNet] = useState(0);
  const [message, setMessage] = useState("");

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

  function calculate(salaryValue: number) {
    const UIF_LIMIT = 17712;
    const uifSalary = Math.min(salaryValue, UIF_LIMIT);

    const employeeContribution = Number((uifSalary * 0.01).toFixed(2));
    const employerContribution = Number((uifSalary * 0.01).toFixed(2));
    const totalContribution = Number(
      (employeeContribution + employerContribution).toFixed(2)
    );

    const netAmount = Number((salaryValue - employeeContribution).toFixed(2));

    setSalary(salaryValue);
    setEmployeeUif(employeeContribution);
    setEmployerUif(employerContribution);
    setTotalUif(totalContribution);
    setNet(netAmount);
  }

  async function generatePayslip() {
    if (!selectedEmployee) {
      setMessage("Please select an employee first.");
      return;
    }

    setMessage("Saving...");

    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", userId)
      .single();

    const businessId = profile?.business_id;

    const { error } = await supabase.from("payslips").insert([
      {
        employee_id: selectedEmployee,
        business_id: businessId,
        basic_pay: salary,
        gross_pay: salary,
        uif_employee: employeeUif,
        other_deductions: 0,
        net_pay: net,
        pay_period_month: new Date().getMonth() + 1,
        pay_period_year: new Date().getFullYear(),
        status: "generated",
      },
    ]);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Payslip generated");
    }
  }

  return (
    <main style={page}>
      <h1 style={title}>Payroll</h1>

      <select
        style={input}
        value={selectedEmployee}
        onChange={(e) => {
          const emp = employees.find((x) => x.id === e.target.value);
          setSelectedEmployee(e.target.value);

          if (emp) {
            calculate(Number(emp.salary));
          }
        }}
      >
        <option value="">Select Employee</option>

        {employees.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.full_name}
          </option>
        ))}
      </select>

      {salary > 0 && (
        <div style={card}>
          <p>Gross Salary: R {salary.toFixed(2)}</p>
          <p>Employee UIF Deduction: R {employeeUif.toFixed(2)}</p>
          <p>Employer UIF Contribution: R {employerUif.toFixed(2)}</p>
          <p>Total UIF Payable: R {totalUif.toFixed(2)}</p>
          <p>
            <strong>Net Salary: R {net.toFixed(2)}</strong>
          </p>
        </div>
      )}

      <button style={button} onClick={generatePayslip}>
        Generate Payslip
      </button>

      {message && <p style={messageStyle}>{message}</p>}
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
  color: "#0f766e",
};

const input = {
  padding: "10px",
  border: "1px solid #ccc",
  borderRadius: "6px",
  marginBottom: "20px",
  width: "300px",
};

const card = {
  border: "1px solid #eee",
  padding: "20px",
  borderRadius: "8px",
  marginBottom: "20px",
  maxWidth: "360px",
  background: "#fff",
};

const button = {
  background: "#0f766e",
  color: "#fff",
  padding: "12px",
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

const messageStyle = {
  marginTop: "14px",
};