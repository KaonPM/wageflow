"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Employee = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  basic_salary: number | null;
  salary: number | null;
  hourly_rate: number | null;
  pay_frequency: string | null;
  payment_method: string | null;
  phone: string | null;
  email: string | null;
  employer_id?: string | null;
  business_id?: string | null;
  employment_status?: string | null;
};

type Business = {
  id: string;
  employer_id: string | null;
  registered_name?: string | null;
  trading_name?: string | null;
  business_name?: string | null;
  name?: string | null;
};

const UIF_LIMIT = 17712;

export default function PayrollPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("Kaone Cleaning Services");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [payrollMonth, setPayrollMonth] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [basicPay, setBasicPay] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [overtimePay, setOvertimePay] = useState(0);
  const [otherDeductions, setOtherDeductions] = useState(0);
  const [ageCategory, setAgeCategory] = useState("under65");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);

  useEffect(() => {
    initialisePayroll();
  }, []);

  async function initialisePayroll() {
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    setPayrollMonth(currentMonth);
    setPaymentDate(today.toISOString().split("T")[0]);

    await fetchEmployees();
  }

  async function getEmployerBusiness(): Promise<Business | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.business_id) {
      const { data } = await supabase
        .from("businesses")
        .select("id, employer_id, registered_name, trading_name, business_name, name")
        .eq("id", profile.business_id)
        .maybeSingle();

      if (data?.id) return data;
    }

    const { data } = await supabase
      .from("businesses")
      .select("id, employer_id, registered_name, trading_name, business_name, name")
      .eq("employer_id", user.id)
      .maybeSingle();

    return data || null;
  }

  async function fetchEmployees() {
    setLoadingEmployees(true);
    setMessage("");

    const business = await getEmployerBusiness();

    if (!business?.id) {
      setEmployees([]);
      setBusinessId("");
      setMessage("Business profile not found for this employer.");
      setLoadingEmployees(false);
      return;
    }

    setBusinessId(business.id);
    setBusinessName(
      business.trading_name ||
        business.registered_name ||
        business.business_name ||
        business.name ||
        "Kaone Cleaning Services"
    );

    const { data: businessEmployees, error: businessError } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", business.id)
      .or("employment_status.eq.active,employment_status.is.null")
      .order("first_name", { ascending: true });

    if (businessError) {
      setEmployees([]);
      setMessage(businessError.message);
      setLoadingEmployees(false);
      return;
    }

    if (businessEmployees && businessEmployees.length > 0) {
      setEmployees(businessEmployees);
      setLoadingEmployees(false);
      return;
    }

    if (!business.employer_id) {
      setEmployees([]);
      setMessage("No active employees found for this business.");
      setLoadingEmployees(false);
      return;
    }

    const { data: employerEmployees, error: employerError } = await supabase
      .from("employees")
      .select("*")
      .eq("employer_id", business.employer_id)
      .or("employment_status.eq.active,employment_status.is.null")
      .order("first_name", { ascending: true });

    if (employerError) {
      setEmployees([]);
      setMessage(employerError.message);
      setLoadingEmployees(false);
      return;
    }

    if (employerEmployees && employerEmployees.length > 0) {
      const employeeIdsToRepair = employerEmployees
        .filter((employee) => employee.business_id !== business.id)
        .map((employee) => employee.id);

      if (employeeIdsToRepair.length > 0) {
        await supabase
          .from("employees")
          .update({ business_id: business.id, employment_status: "active" })
          .in("id", employeeIdsToRepair);
      }

      setEmployees(
        employerEmployees.map((employee) => ({
          ...employee,
          business_id: business.id,
          employment_status: employee.employment_status || "active",
        }))
      );

      setMessage("");
      setLoadingEmployees(false);
      return;
    }

    setEmployees([]);
    setMessage("No active employees found for this business.");
    setLoadingEmployees(false);
  }

  function getEmployeeName(employee: Employee | undefined) {
    if (!employee) return "Employee";

    return (
      employee.full_name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      "Employee"
    );
  }

  function calculatePaye(annualTaxableIncome: number, age: string) {
    let annualTax = 0;

    if (annualTaxableIncome <= 245100) {
      annualTax = annualTaxableIncome * 0.18;
    } else if (annualTaxableIncome <= 383100) {
      annualTax = 44118 + (annualTaxableIncome - 245100) * 0.26;
    } else if (annualTaxableIncome <= 530200) {
      annualTax = 79998 + (annualTaxableIncome - 383100) * 0.31;
    } else if (annualTaxableIncome <= 695800) {
      annualTax = 125599 + (annualTaxableIncome - 530200) * 0.36;
    } else if (annualTaxableIncome <= 887000) {
      annualTax = 185215 + (annualTaxableIncome - 695800) * 0.39;
    } else if (annualTaxableIncome <= 1878600) {
      annualTax = 259783 + (annualTaxableIncome - 887000) * 0.41;
    } else {
      annualTax = 666339 + (annualTaxableIncome - 1878600) * 0.45;
    }

    let rebate = 17820;

    if (age === "65to74") rebate = 27630;
    if (age === "75plus") rebate = 30735;

    return Number((Math.max(annualTax - rebate, 0) / 12).toFixed(2));
  }

  const calculations = useMemo(() => {
    const grossPay = basicPay + bonus + overtimePay;
    const uifSalary = Math.min(grossPay, UIF_LIMIT);

    const employeeUif = Number((uifSalary * 0.01).toFixed(2));
    const employerUif = Number((uifSalary * 0.01).toFixed(2));
    const totalUif = Number((employeeUif + employerUif).toFixed(2));
    const paye = calculatePaye(grossPay * 12, ageCategory);
    const totalEmployeeDeductions = employeeUif + paye + otherDeductions;
    const netPay = Number((grossPay - totalEmployeeDeductions).toFixed(2));
    const sarsPayable = Number((paye + employeeUif + employerUif).toFixed(2));

    return {
      grossPay: Number(grossPay.toFixed(2)),
      employeeUif,
      employerUif,
      totalUif,
      paye,
      totalEmployeeDeductions: Number(totalEmployeeDeductions.toFixed(2)),
      netPay,
      sarsPayable,
    };
  }, [basicPay, bonus, overtimePay, otherDeductions, ageCategory]);

  async function queuePayslipNotifications({
    payslipId,
    employee,
    activeBusinessId,
  }: {
    payslipId: string;
    employee: Employee | undefined;
    activeBusinessId: string;
  }) {
    const employeeName = getEmployeeName(employee);

    const smsMessage = `Hi ${employeeName}, your WageFlow payslip for ${payrollMonth} is now available. Please log in to your employee portal or check your email.`;

    const emailMessage = `Hi ${employeeName}, your WageFlow payslip for ${payrollMonth} is now available. Please log in to your employee portal to view or download it.`;

    const notificationRows = [];

    if (employee?.phone) {
      notificationRows.push({
        payslip_id: payslipId,
        employee_id: selectedEmployee,
        business_id: activeBusinessId,
        notification_type: "sms",
        recipient: employee.phone,
        message: smsMessage,
        status: "pending",
      });
    }

    if (employee?.email) {
      notificationRows.push({
        payslip_id: payslipId,
        employee_id: selectedEmployee,
        business_id: activeBusinessId,
        notification_type: "email",
        recipient: employee.email,
        message: emailMessage,
        status: "pending",
      });
    }

    if (notificationRows.length === 0) {
      notificationRows.push({
        payslip_id: payslipId,
        employee_id: selectedEmployee,
        business_id: activeBusinessId,
        notification_type: "manual",
        recipient: "",
        message: smsMessage,
        status: "missing_contact",
      });
    }

    await supabase.from("payslip_notifications").insert(notificationRows);
  }

  async function generatePayslip() {
    if (!selectedEmployee) {
      setMessage("Please select an employee first.");
      return;
    }

    if (!payrollMonth) {
      setMessage("Please select a payroll month.");
      return;
    }

    if (!paymentDate) {
      setMessage("Please select a payment date.");
      return;
    }

    setSaving(true);
    setMessage("Saving payroll and preparing employee notification...");

    const activeBusinessId = businessId || (await getEmployerBusiness())?.id;

    if (!activeBusinessId) {
      setMessage("Business profile not found for this employer.");
      setSaving(false);
      return;
    }

    const [year, month] = payrollMonth.split("-");
    const employee = employees.find((item) => item.id === selectedEmployee);

    const { data: payslipData, error } = await supabase
      .from("payslips")
      .insert([
        {
          employee_id: selectedEmployee,
          business_id: activeBusinessId,
          basic_pay: basicPay,
          bonus,
          overtime_pay: overtimePay,
          gross_pay: calculations.grossPay,
          taxable_income: calculations.grossPay,
          uif_employee: calculations.employeeUif,
          employer_uif: calculations.employerUif,
          total_uif: calculations.totalUif,
          paye: calculations.paye,
          other_deductions: otherDeductions,
          net_pay: calculations.netPay,
          sars_payable: calculations.sarsPayable,
          payment_method: paymentMethod,
          payroll_month: payrollMonth,
          payment_date: paymentDate,
          pay_period_month: Number(month),
          pay_period_year: Number(year),
          status: "generated",
        },
      ])
      .select()
      .single();

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    await queuePayslipNotifications({
      payslipId: payslipData.id,
      employee,
      activeBusinessId,
    });

    setMessage("Payslip generated successfully.");
    setSaving(false);
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <p style={eyebrow}>WageFlow Employer</p>
          <h1 style={title}>Payroll</h1>
          <p style={subtitle}>
            Calculate salary, UIF, PAYE, deductions and net pay before
            generating a payslip.
          </p>
          <p style={businessLine}>Current business: {businessName}</p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      <section style={grid}>
        <div style={card}>
          <div style={cardTop}>
            <h2 style={sectionTitle}>Payroll Details</h2>
            <button style={smallButton} onClick={fetchEmployees}>
              Refresh Employees
            </button>
          </div>

          <label style={label}>Payroll Month</label>
          <input
            style={input}
            type="month"
            value={payrollMonth}
            onChange={(e) => setPayrollMonth(e.target.value)}
          />

          <label style={label}>Payment Date</label>
          <input
            style={input}
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
          />

          <label style={label}>Employee</label>
          <select
            style={input}
            value={selectedEmployee}
            onChange={(e) => {
              const emp = employees.find((x) => x.id === e.target.value);

              setSelectedEmployee(e.target.value);

              if (emp) {
                setBasicPay(Number(emp.basic_salary || emp.salary || 0));
                setPaymentMethod(emp.payment_method || "Bank Transfer");
              } else {
                setBasicPay(0);
                setPaymentMethod("Bank Transfer");
              }
            }}
          >
            <option value="">
              {loadingEmployees ? "Loading employees..." : "Select Employee"}
            </option>

            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {getEmployeeName(emp)}
              </option>
            ))}
          </select>

          {!loadingEmployees && employees.length === 0 && (
            <p style={helperText}>
              No active employees found for this business. Add employees first,
              then return to payroll.
            </p>
          )}

          <label style={label}>Age Category for PAYE</label>
          <select
            style={input}
            value={ageCategory}
            onChange={(e) => setAgeCategory(e.target.value)}
          >
            <option value="under65">Under 65</option>
            <option value="65to74">65 to 74</option>
            <option value="75plus">75 and older</option>
          </select>

          <label style={label}>Payment Method</label>
          <select
            style={input}
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="EFT">EFT</option>
            <option value="Mobile Payment">Mobile Payment</option>
            <option value="Other">Other</option>
          </select>

          <label style={label}>Basic Pay</label>
          <input
            style={input}
            type="number"
            value={basicPay}
            onChange={(e) => setBasicPay(Number(e.target.value || 0))}
          />

          <label style={label}>Bonus</label>
          <input
            style={input}
            type="number"
            value={bonus}
            onChange={(e) => setBonus(Number(e.target.value || 0))}
          />

          <label style={label}>Overtime Pay</label>
          <input
            style={input}
            type="number"
            value={overtimePay}
            onChange={(e) => setOvertimePay(Number(e.target.value || 0))}
          />

          <label style={label}>Other Deductions</label>
          <input
            style={input}
            type="number"
            value={otherDeductions}
            onChange={(e) => setOtherDeductions(Number(e.target.value || 0))}
          />

          <button style={button} onClick={generatePayslip} disabled={saving}>
            {saving ? "Generating..." : "Generate Payslip"}
          </button>

          {message && <p style={messageStyle}>{message}</p>}
        </div>

        <div style={card}>
          <h2 style={sectionTitle}>Payroll Calculation</h2>

          <CalculationRow label="Basic Pay" value={basicPay} />
          <CalculationRow label="Bonus" value={bonus} />
          <CalculationRow label="Overtime Pay" value={overtimePay} />
          <CalculationRow label="Gross Pay" value={calculations.grossPay} strong />

          <div style={divider} />

          <CalculationRow
            label="Employee UIF Deduction"
            value={calculations.employeeUif}
          />
          <CalculationRow label="PAYE Deduction" value={calculations.paye} />
          <CalculationRow label="Other Deductions" value={otherDeductions} />
          <CalculationRow
            label="Total Employee Deductions"
            value={calculations.totalEmployeeDeductions}
            strong
          />

          <div style={divider} />

          <CalculationRow
            label="Employer UIF Contribution"
            value={calculations.employerUif}
          />
          <CalculationRow label="Total UIF Payable" value={calculations.totalUif} />
          <CalculationRow
            label="Total Payable to SARS/UIF"
            value={calculations.sarsPayable}
            strong
          />

          <div style={netBox}>
            <span>Net Pay to Employee</span>
            <strong>R {calculations.netPay.toFixed(2)}</strong>
          </div>
        </div>
      </section>
    </main>
  );
}

function CalculationRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div style={row}>
      <span>{label}</span>
      <strong style={strong ? rowStrong : undefined}>
        R {Number(value || 0).toFixed(2)}
      </strong>
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

const businessLine = {
  marginTop: "10px",
  color: "#0f766e",
  fontSize: "14px",
  fontWeight: 800,
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "20px",
};

const card = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  padding: "24px",
  borderRadius: "20px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const cardTop = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  marginBottom: "18px",
};

const sectionTitle = {
  fontSize: "22px",
  margin: 0,
  color: "#0f172a",
};

const label = {
  display: "block",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "6px",
};

const input = {
  padding: "11px",
  border: "1px solid #cbd5e1",
  borderRadius: "10px",
  marginBottom: "14px",
  width: "100%",
  color: "#0f172a",
  background: "#ffffff",
};

const button = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "12px 18px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
  marginTop: "6px",
};

const smallButton = {
  background: "#ecfeff",
  color: "#0f766e",
  border: "1px solid #99f6e4",
  padding: "8px 12px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
  fontSize: "12px",
};

const messageStyle = {
  marginTop: "14px",
  color: "#155e75",
  fontWeight: 700,
};

const helperText = {
  margin: "-6px 0 14px",
  color: "#b45309",
  fontSize: "13px",
  lineHeight: 1.5,
  fontWeight: 700,
};

const row = {
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  padding: "10px 0",
  borderBottom: "1px solid #f1f5f9",
  color: "#334155",
};

const rowStrong = {
  color: "#0f766e",
};

const divider = {
  height: "1px",
  background: "#e2e8f0",
  margin: "12px 0",
};

const netBox = {
  marginTop: "20px",
  background: "#ecfeff",
  border: "1px solid #a5f3fc",
  color: "#155e75",
  borderRadius: "16px",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  gap: "16px",
  fontSize: "18px",
};