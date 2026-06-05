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
  business_id?: string | null;
  employment_status?: string | null;
  status?: string | null;
};

type Business = {
  id: string;
  business_name?: string | null;
  trading_name?: string | null;
  registered_name?: string | null;
  name?: string | null;
};

type SalaryReceipt = {
  id: string;
  employee_id: string;
  payroll_month: string | null;
  net_pay: number | null;
  status: string | null;
  received_confirmed: boolean | null;
  received_confirmed_at: string | null;
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
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [salaryReceipts, setSalaryReceipts] = useState<SalaryReceipt[]>([]);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.business_id) {
      console.error("Profile lookup failed", profileError);
      return null;
    }

    const { data: businessRecord, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", profile.business_id)
      .single();

    if (businessError) {
      console.error("Business lookup failed", businessError);
      return null;
    }

    return businessRecord;
  }

  function isActiveEmployee(employee: Employee) {
    const employeeStatus =
      employee.status || employee.employment_status || "active";

    return employeeStatus.trim().toLowerCase() === "active";
  }

  async function fetchSalaryReceipts(activeBusinessId: string) {
    setLoadingReceipts(true);

    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
        id,
        employee_id,
        payroll_month,
        net_pay,
        status,
        received_confirmed,
        received_confirmed_at
      `
      )
      .eq("business_id", activeBusinessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Salary receipt lookup failed", error);
      setSalaryReceipts([]);
      setLoadingReceipts(false);
      return;
    }

    setSalaryReceipts(data || []);
    setLoadingReceipts(false);
  }

  async function fetchEmployees() {
    setLoadingEmployees(true);
    setMessage("");

    const business = await getEmployerBusiness();

    if (!business?.id) {
      setEmployees([]);
      setBusinessId("");
      setSalaryReceipts([]);
      setMessage("Business profile not found for this employer.");
      setLoadingEmployees(false);
      setLoadingReceipts(false);
      return;
    }

    setBusinessId(business.id);
    setBusinessName(
      business.trading_name ||
        business.business_name ||
        business.registered_name ||
        business.name ||
        "Kaone Cleaning Services"
    );

    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("business_id", business.id)
      .order("first_name", { ascending: true });

    if (error) {
      setEmployees([]);
      setMessage(error.message);
      setLoadingEmployees(false);
      setLoadingReceipts(false);
      return;
    }

    const activeEmployees = (data || []).filter(isActiveEmployee);

    setEmployees(activeEmployees);
    setLoadingEmployees(false);

    await fetchSalaryReceipts(business.id);
  }

  function getEmployeeName(employee: Employee | undefined) {
    if (!employee) return "Employee";

    return (
      employee.full_name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      "Employee"
    );
  }

  function getReceiptEmployeeName(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);
    return getEmployeeName(employee);
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

  const confirmedReceipts = salaryReceipts.filter(
    (item) => item.received_confirmed === true
  );

  const pendingReceipts = salaryReceipts.filter(
    (item) => item.received_confirmed !== true
  );

  const recentConfirmedReceipts = confirmedReceipts.slice(0, 5);

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

    const { data: existingPayslip, error: existingPayslipError } =
      await supabase
        .from("payslips")
        .select("id")
        .eq("business_id", activeBusinessId)
        .eq("employee_id", selectedEmployee)
        .eq("payroll_month", payrollMonth)
        .maybeSingle();

    if (existingPayslipError) {
      setMessage(existingPayslipError.message);
      setSaving(false);
      return;
    }

    if (existingPayslip?.id) {
      setMessage(
        "A payslip has already been generated for this employee and payroll month."
      );
      setSaving(false);
      return;
    }

    let payrollRunId: string | null = null;

    const { data: existingRun, error: existingRunError } = await supabase
      .from("payroll_runs")
      .select("*")
      .eq("business_id", activeBusinessId)
      .eq("payroll_month", payrollMonth)
      .maybeSingle();

    if (existingRunError) {
      setMessage(existingRunError.message);
      setSaving(false);
      return;
    }

    if (existingRun?.id) {
      payrollRunId = existingRun.id;

      const { error: updateRunError } = await supabase
        .from("payroll_runs")
        .update({
          employee_count: Number(existingRun.employee_count || 0) + 1,
          total_basic_pay:
            Number(existingRun.total_basic_pay || 0) + Number(basicPay || 0),
          total_gross_pay:
            Number(existingRun.total_gross_pay || 0) +
            Number(calculations.grossPay || 0),
          total_paye:
            Number(existingRun.total_paye || 0) + Number(calculations.paye || 0),
          total_uif_employee:
            Number(existingRun.total_uif_employee || 0) +
            Number(calculations.employeeUif || 0),
          total_uif_employer:
            Number(existingRun.total_uif_employer || 0) +
            Number(calculations.employerUif || 0),
          total_uif:
            Number(existingRun.total_uif || 0) +
            Number(calculations.totalUif || 0),
          total_other_deductions:
            Number(existingRun.total_other_deductions || 0) +
            Number(otherDeductions || 0),
          total_net_pay:
            Number(existingRun.total_net_pay || 0) +
            Number(calculations.netPay || 0),
          sars_payable:
            Number(existingRun.sars_payable || 0) +
            Number(calculations.sarsPayable || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingRun.id);

      if (updateRunError) {
        setMessage(updateRunError.message);
        setSaving(false);
        return;
      }
    } else {
      const { data: newRun, error: payrollRunError } = await supabase
        .from("payroll_runs")
        .insert([
          {
            business_id: activeBusinessId,
            payroll_month: payrollMonth,
            employee_count: 1,
            total_basic_pay: basicPay,
            total_gross_pay: calculations.grossPay,
            total_paye: calculations.paye,
            total_uif_employee: calculations.employeeUif,
            total_uif_employer: calculations.employerUif,
            total_uif: calculations.totalUif,
            total_other_deductions: otherDeductions,
            total_net_pay: calculations.netPay,
            sars_payable: calculations.sarsPayable,
            status: "generated",
          },
        ])
        .select("id")
        .single();

      if (payrollRunError) {
        setMessage(payrollRunError.message);
        setSaving(false);
        return;
      }

      payrollRunId = newRun.id;
    }

    const { data: payslipData, error } = await supabase
      .from("payslips")
      .insert([
        {
          employee_id: selectedEmployee,
          business_id: activeBusinessId,
          payroll_run_id: payrollRunId,
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
          received_confirmed: false,
          received_confirmed_at: null,
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

    await fetchSalaryReceipts(activeBusinessId);

    setMessage("Payslip generated successfully and linked to payroll run.");
    setSaving(false);
  }

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>Payroll</h1>
          <p style={businessLine}>{businessName}</p>
          <p style={subtitle}>
            Generate payslips, review payroll runs, and access payroll records
            from one compact workspace.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      <section style={actionGrid}>
        <button
          style={actionCard}
          onClick={() => setShowGenerateForm((current) => !current)}
        >
          <span style={actionIcon}>＋</span>
          <strong style={actionTitle}>Generate Payslip</strong>
          <span style={actionText}>
            Calculate payroll and issue an employee payslip.
          </span>
        </button>

        <Link href="/employer/payroll/history" style={actionCardLink}>
          <span style={actionIcon}>📊</span>
          <strong style={actionTitle}>Payroll History</strong>
          <span style={actionText}>
            View payroll runs, monthly totals, and batches.
          </span>
        </Link>

        <Link href="/employer/payslips" style={actionCardLink}>
          <span style={actionIcon}>📄</span>
          <strong style={actionTitle}>Payslip Records</strong>
          <span style={actionText}>
            Search and manage generated employee payslips.
          </span>
        </Link>

        <Link href="/employer/payroll/compliance" style={actionCardLink}>
          <span style={actionIcon}>🧾</span>
          <strong style={actionTitle}>Compliance Summary</strong>
          <span style={actionText}>
            Review PAYE, UIF and EMP201-ready monthly totals.
          </span>
        </Link>
      </section>

      <section style={receiptCard}>
        <div style={receiptHeader}>
          <div>
            <h2 style={sectionTitle}>Salary Receipt Confirmations</h2>
            <p style={receiptSubtitle}>
              Track employees who confirmed that they received their salary.
            </p>
          </div>

          <button
            style={smallButton}
            onClick={() => {
              if (businessId) fetchSalaryReceipts(businessId);
            }}
          >
            Refresh
          </button>
        </div>

        <div style={receiptStatsGrid}>
          <div style={receiptStatBox}>
            <span style={receiptStatLabel}>Confirmed</span>
            <strong style={receiptStatValue}>{confirmedReceipts.length}</strong>
          </div>

          <div style={receiptStatBox}>
            <span style={receiptStatLabel}>Pending</span>
            <strong style={receiptStatValue}>{pendingReceipts.length}</strong>
          </div>

          <div style={receiptStatBox}>
            <span style={receiptStatLabel}>Total Payslips</span>
            <strong style={receiptStatValue}>{salaryReceipts.length}</strong>
          </div>
        </div>

        {loadingReceipts ? (
          <p style={helperText}>Loading salary confirmations...</p>
        ) : recentConfirmedReceipts.length === 0 ? (
          <p style={helperText}>No employee has confirmed salary receipt yet.</p>
        ) : (
          <div style={receiptList}>
            {recentConfirmedReceipts.map((receipt) => (
              <div key={receipt.id} style={receiptItem}>
                <div>
                  <strong style={receiptEmployee}>
                    {getReceiptEmployeeName(receipt.employee_id)}
                  </strong>

                  <p style={receiptMeta}>
                    {receipt.payroll_month || "Unknown period"} · R{" "}
                    {Number(receipt.net_pay || 0).toFixed(2)}
                  </p>
                </div>

                <span style={confirmedPill}>
                  Confirmed {formatDate(receipt.received_confirmed_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {showGenerateForm && (
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
                No active employees found for this business.
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
            <CalculationRow
              label="Gross Pay"
              value={calculations.grossPay}
              strong
            />

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
            <CalculationRow
              label="Total UIF Payable"
              value={calculations.totalUif}
            />
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
      )}
    </main>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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
  marginBottom: "22px",
  flexWrap: "wrap" as const,
};

const title = {
  fontSize: "34px",
  color: "#0f766e",
  margin: "0 0 6px",
  fontWeight: 900,
};

const businessLine = {
  margin: 0,
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: 800,
};

const subtitle = {
  maxWidth: "760px",
  color: "#64748b",
  fontSize: "15px",
  lineHeight: 1.6,
  margin: "8px 0 0",
};

const backButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 18px",
  borderRadius: "12px",
  textDecoration: "none",
  fontWeight: 700,
};

const actionGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const actionCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
  textAlign: "left" as const,
  cursor: "pointer",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const actionCardLink = {
  ...actionCard,
  display: "block",
  color: "inherit",
  textDecoration: "none",
};

const actionIcon = {
  display: "inline-flex",
  width: "34px",
  height: "34px",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "12px",
  background: "#ecfeff",
  color: "#0f766e",
  marginBottom: "10px",
};

const actionTitle = {
  display: "block",
  color: "#0f172a",
  fontSize: "16px",
  marginBottom: "6px",
};

const actionText = {
  display: "block",
  color: "#64748b",
  fontSize: "13px",
  lineHeight: 1.45,
};

const receiptCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "20px",
  padding: "22px",
  marginBottom: "20px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const receiptHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "14px",
  flexWrap: "wrap" as const,
  marginBottom: "16px",
};

const receiptSubtitle = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const receiptStatsGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "12px",
  marginBottom: "16px",
};

const receiptStatBox = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: "16px",
  padding: "16px",
};

const receiptStatLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "8px",
};

const receiptStatValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "26px",
  fontWeight: 900,
};

const receiptList = {
  display: "grid",
  gap: "10px",
};

const receiptItem = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: "14px",
  border: "1px solid #e2e8f0",
  borderRadius: "14px",
  background: "#ffffff",
  flexWrap: "wrap" as const,
};

const receiptEmployee = {
  color: "#0f172a",
  fontSize: "14px",
};

const receiptMeta = {
  margin: "4px 0 0",
  color: "#64748b",
  fontSize: "13px",
};

const confirmedPill = {
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
  gap: "20px",
  marginBottom: "20px",
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