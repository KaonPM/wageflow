"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

type Employee = {
  id: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  status?: string | null;
  employment_status?: string | null;
};

type Business = {
  id: string;
  business_name?: string | null;
  trading_name?: string | null;
  registered_name?: string | null;
  name?: string | null;
};

type PayslipReportRow = {
  id: string;
  employee_id: string;
  payroll_month: string | null;
  payment_date: string | null;
  payment_method: string | null;
  basic_pay: number | null;
  gross_pay: number | null;
  paye: number | null;
  uif_employee: number | null;
  employer_uif: number | null;
  total_uif: number | null;
  other_deductions: number | null;
  net_pay: number | null;
  sars_payable: number | null;
  status: string | null;
  received_confirmed: boolean | null;
  received_confirmed_at: string | null;
  created_at: string | null;
};

const reportCategories = [
  {
    value: "payroll",
    label: "Payroll Reports",
  },
  {
    value: "employee",
    label: "Employee Reports",
  },
  {
    value: "compliance",
    label: "Compliance Reports",
  },
  {
    value: "business",
    label: "Business Reports",
  },
];

const reportTypesByCategory: Record<string, { value: string; label: string }[]> =
  {
    payroll: [
      {
        value: "salary_receipt_confirmations",
        label: "Salary Receipt Confirmation Report",
      },
      {
        value: "payroll_summary",
        label: "Payroll Summary Report",
      },
      {
        value: "employee_payment_history",
        label: "Employee Payment History Report",
      },
    ],
    employee: [
      {
        value: "employee_master_list",
        label: "Employee Master List",
      },
      {
        value: "employee_contact_report",
        label: "Employee Contact Report",
      },
    ],
    compliance: [
      {
        value: "uif_report",
        label: "UIF Report",
      },
      {
        value: "paye_report",
        label: "PAYE Report",
      },
      {
        value: "emp201_summary",
        label: "EMP201 Summary",
      },
    ],
    business: [
      {
        value: "company_payroll_overview",
        label: "Company Payroll Overview",
      },
      {
        value: "monthly_wage_cost_report",
        label: "Monthly Wage Cost Report",
      },
    ],
  };

export default function EmployerReportsPage() {
  const [businessId, setBusinessId] = useState("");
  const [businessName, setBusinessName] = useState("Employer");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payslips, setPayslips] = useState<PayslipReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [reportCategory, setReportCategory] = useState("payroll");
  const [reportType, setReportType] = useState("salary_receipt_confirmations");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodType, setPeriodType] = useState("monthly");
  const [monthFilter, setMonthFilter] = useState("");
  const [quarterFilter, setQuarterFilter] = useState("1");
  const [halfYearFilter, setHalfYearFilter] = useState("1");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  useEffect(() => {
    initialiseReports();
  }, []);

  useEffect(() => {
    const availableTypes = reportTypesByCategory[reportCategory] || [];
    setReportType(availableTypes[0]?.value || "");
  }, [reportCategory]);

  async function initialiseReports() {
    setLoading(true);
    setMessage("");

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}`;

    setMonthFilter(currentMonth);

    const business = await getEmployerBusiness();

    if (!business?.id) {
      setMessage("Business profile not found for this employer.");
      setLoading(false);
      return;
    }

    setBusinessId(business.id);
    setBusinessName(
      business.trading_name ||
        business.business_name ||
        business.registered_name ||
        business.name ||
        "Employer"
    );

    await Promise.all([fetchEmployees(business.id), fetchPayslips(business.id)]);

    setLoading(false);
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

  async function fetchEmployees(activeBusinessId: string) {
    const { data, error } = await supabase
      .from("employees")
      .select("id, full_name, first_name, last_name, email, phone, status, employment_status")
      .eq("business_id", activeBusinessId)
      .order("first_name", { ascending: true });

    if (error) {
      console.error("Employees report lookup failed", error);
      setEmployees([]);
      return;
    }

    setEmployees(data || []);
  }

  async function fetchPayslips(activeBusinessId: string) {
    const { data, error } = await supabase
      .from("payslips")
      .select(
        `
        id,
        employee_id,
        payroll_month,
        payment_date,
        payment_method,
        basic_pay,
        gross_pay,
        paye,
        uif_employee,
        employer_uif,
        total_uif,
        other_deductions,
        net_pay,
        sars_payable,
        status,
        received_confirmed,
        received_confirmed_at,
        created_at
      `
      )
      .eq("business_id", activeBusinessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Payslip report lookup failed", error);
      setPayslips([]);
      return;
    }

    setPayslips(data || []);
  }

  function getEmployeeName(employeeId: string) {
    const employee = employees.find((item) => item.id === employeeId);

    if (!employee) return "Employee";

    return (
      employee.full_name ||
      `${employee.first_name || ""} ${employee.last_name || ""}`.trim() ||
      "Employee"
    );
  }

  function getReceiptStatus(row: PayslipReportRow) {
    const rawStatus = (row.status || "").toLowerCase().trim();

    if (
      row.received_confirmed === true ||
      rawStatus === "received_confirmed" ||
      rawStatus === "received confirmed"
    ) {
      return "confirmed";
    }

    if (rawStatus === "generated") return "generated";

    return "pending";
  }

  function rowMatchesPeriod(row: PayslipReportRow) {
    const payrollMonth = row.payroll_month;

    if (!payrollMonth) return false;

    const [year, month] = payrollMonth.split("-").map(Number);

    if (periodType === "monthly") {
      return payrollMonth === monthFilter;
    }

    if (periodType === "quarterly") {
      const selectedQuarter = Number(quarterFilter);
      const rowQuarter = Math.ceil(month / 3);

      return String(year) === yearFilter && rowQuarter === selectedQuarter;
    }

    if (periodType === "half_year") {
      const selectedHalf = Number(halfYearFilter);
      const rowHalf = month <= 6 ? 1 : 2;

      return String(year) === yearFilter && rowHalf === selectedHalf;
    }

    if (periodType === "yearly") {
      return String(year) === yearFilter;
    }

    if (periodType === "custom") {
      if (!startDateFilter || !endDateFilter) return true;

      const issuedDate = row.created_at ? new Date(row.created_at) : null;

      if (!issuedDate) return false;

      const startDate = new Date(startDateFilter);
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999);

      return issuedDate >= startDate && issuedDate <= endDate;
    }

    return true;
  }

  const filteredPayslips = useMemo(() => {
    return payslips.filter((row) => {
      const matchesEmployee =
        employeeFilter === "all" || row.employee_id === employeeFilter;

      const receiptStatus = getReceiptStatus(row);

      const matchesStatus =
        statusFilter === "all" || statusFilter === receiptStatus;

      const matchesPeriod = rowMatchesPeriod(row);

      return matchesEmployee && matchesStatus && matchesPeriod;
    });
  }, [
    payslips,
    employeeFilter,
    statusFilter,
    periodType,
    monthFilter,
    quarterFilter,
    halfYearFilter,
    yearFilter,
    startDateFilter,
    endDateFilter,
  ]);

  const employeeReportRows = useMemo(() => {
    return employees.filter((employee) => {
      if (employeeFilter !== "all" && employee.id !== employeeFilter) {
        return false;
      }

      if (statusFilter === "all") return true;

      const employeeStatus = (
        employee.status ||
        employee.employment_status ||
        "active"
      )
        .trim()
        .toLowerCase();

      return employeeStatus === statusFilter;
    });
  }, [employees, employeeFilter, statusFilter]);

  const reportSummary = useMemo(() => {
    const confirmed = filteredPayslips.filter(
      (row) => getReceiptStatus(row) === "confirmed"
    ).length;

    const pending = filteredPayslips.filter(
      (row) => getReceiptStatus(row) === "pending"
    ).length;

    const generated = filteredPayslips.filter(
      (row) => getReceiptStatus(row) === "generated"
    ).length;

    const totalNetPay = filteredPayslips.reduce(
      (sum, row) => sum + Number(row.net_pay || 0),
      0
    );

    const totalPaye = filteredPayslips.reduce(
      (sum, row) => sum + Number(row.paye || 0),
      0
    );

    const totalUif = filteredPayslips.reduce(
      (sum, row) => sum + Number(row.total_uif || 0),
      0
    );

    const confirmationRate =
      filteredPayslips.length === 0
        ? 0
        : Math.round((confirmed / filteredPayslips.length) * 100);

    return {
      totalPayslips: filteredPayslips.length,
      confirmed,
      pending,
      generated,
      totalNetPay,
      totalPaye,
      totalUif,
      confirmationRate,
    };
  }, [filteredPayslips]);

  function getReportTitle() {
    const category = reportCategories.find((item) => item.value === reportCategory);
    const type = (reportTypesByCategory[reportCategory] || []).find(
      (item) => item.value === reportType
    );

    return `${category?.label || "Reports"} · ${type?.label || "Report"}`;
  }

  function exportCsv() {
    const rows = getCsvRows();

    if (rows.length === 0) {
      setMessage("There is no report data to export.");
      return;
    }

    const csv = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${getReportTitle()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")}.csv`;

    link.click();
    URL.revokeObjectURL(url);
  }

  function getCsvRows() {
    if (reportCategory === "employee") {
      return [
        ["Employee", "Email", "Phone", "Status"],
        ...employeeReportRows.map((employee) => [
          getEmployeeName(employee.id),
          employee.email || "",
          employee.phone || "",
          formatStatus(employee.status || employee.employment_status || "active"),
        ]),
      ];
    }

    if (reportType === "employee_payment_history") {
      return [
        ["Employee", "Payroll Month", "Payment Date", "Payment Method", "Net Pay", "Status"],
        ...filteredPayslips.map((row) => [
          getEmployeeName(row.employee_id),
          row.payroll_month || "",
          formatDate(row.payment_date),
          row.payment_method || "",
          Number(row.net_pay || 0).toFixed(2),
          formatStatus(row.status || "generated"),
        ]),
      ];
    }

    if (reportType === "payroll_summary") {
      return [
        [
          "Employee",
          "Payroll Month",
          "Gross Pay",
          "PAYE",
          "UIF",
          "Other Deductions",
          "Net Pay",
          "Status",
        ],
        ...filteredPayslips.map((row) => [
          getEmployeeName(row.employee_id),
          row.payroll_month || "",
          Number(row.gross_pay || 0).toFixed(2),
          Number(row.paye || 0).toFixed(2),
          Number(row.total_uif || 0).toFixed(2),
          Number(row.other_deductions || 0).toFixed(2),
          Number(row.net_pay || 0).toFixed(2),
          formatStatus(row.status || "generated"),
        ]),
      ];
    }

    return [
      [
        "Employee",
        "Payroll Month",
        "Net Pay",
        "Payment Method",
        "Payslip Status",
        "Receipt Status",
        "Confirmed Date",
        "Issued Date",
      ],
      ...filteredPayslips.map((row) => [
        getEmployeeName(row.employee_id),
        row.payroll_month || "",
        Number(row.net_pay || 0).toFixed(2),
        row.payment_method || "",
        formatStatus(row.status || "generated"),
        formatStatus(getReceiptStatus(row)),
        formatDate(row.received_confirmed_at),
        formatDate(row.created_at),
      ]),
    ];
  }

  function printReport() {
    window.print();
  }

  const isEmployeeReport = reportCategory === "employee";

  return (
    <main style={page}>
      <section style={header}>
        <div>
          <h1 style={title}>Employer Reports</h1>
          <p style={businessLine}>{businessName}</p>
          <p style={subtitle}>
            Generate payroll, employee, compliance, and business reports from one
            central reporting page.
          </p>
        </div>

        <Link href="/employer" style={backButton}>
          ← Back to Employer Dashboard
        </Link>
      </section>

      <section style={panel}>
        <div style={panelHeader}>
          <div>
            <h2 style={sectionTitle}>Report Generator</h2>
            <p style={mutedText}>
              Select a reporting category, choose filters, then export or print
              the report.
            </p>
          </div>

          <div style={buttonRow}>
            <button style={outlineButton} onClick={printReport}>
              Print / Save PDF
            </button>

            <button style={primaryButton} onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </div>

        <div style={filterGrid}>
          <div>
            <label style={label}>Report Category</label>
            <select
              style={input}
              value={reportCategory}
              onChange={(event) => setReportCategory(event.target.value)}
            >
              {reportCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Report Type</label>
            <select
              style={input}
              value={reportType}
              onChange={(event) => setReportType(event.target.value)}
            >
              {(reportTypesByCategory[reportCategory] || []).map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Company</label>
            <select style={input} value="company" disabled>
              <option value="company">{businessName}</option>
            </select>
          </div>

          <div>
            <label style={label}>Employee</label>
            <select
              style={input}
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
            >
              <option value="all">All Employees</option>

              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {getEmployeeName(employee.id)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={label}>Status</label>
            <select
              style={input}
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Statuses</option>

              {isEmployeeReport ? (
                <>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </>
              ) : (
                <>
                  <option value="generated">Generated</option>
                  <option value="pending">Pending Confirmation</option>
                  <option value="confirmed">Confirmed</option>
                </>
              )}
            </select>
          </div>

          {!isEmployeeReport && (
            <>
              <div>
                <label style={label}>Period Type</label>
                <select
                  style={input}
                  value={periodType}
                  onChange={(event) => setPeriodType(event.target.value)}
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_year">Half-Year</option>
                  <option value="yearly">Yearly</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>

              {periodType === "monthly" && (
                <div>
                  <label style={label}>Month</label>
                  <input
                    style={input}
                    type="month"
                    value={monthFilter}
                    onChange={(event) => setMonthFilter(event.target.value)}
                  />
                </div>
              )}

              {periodType === "quarterly" && (
                <>
                  <div>
                    <label style={label}>Quarter</label>
                    <select
                      style={input}
                      value={quarterFilter}
                      onChange={(event) => setQuarterFilter(event.target.value)}
                    >
                      <option value="1">Quarter 1</option>
                      <option value="2">Quarter 2</option>
                      <option value="3">Quarter 3</option>
                      <option value="4">Quarter 4</option>
                    </select>
                  </div>

                  <div>
                    <label style={label}>Year</label>
                    <input
                      style={input}
                      type="number"
                      value={yearFilter}
                      onChange={(event) => setYearFilter(event.target.value)}
                    />
                  </div>
                </>
              )}

              {periodType === "half_year" && (
                <>
                  <div>
                    <label style={label}>Half-Year</label>
                    <select
                      style={input}
                      value={halfYearFilter}
                      onChange={(event) => setHalfYearFilter(event.target.value)}
                    >
                      <option value="1">January to June</option>
                      <option value="2">July to December</option>
                    </select>
                  </div>

                  <div>
                    <label style={label}>Year</label>
                    <input
                      style={input}
                      type="number"
                      value={yearFilter}
                      onChange={(event) => setYearFilter(event.target.value)}
                    />
                  </div>
                </>
              )}

              {periodType === "yearly" && (
                <div>
                  <label style={label}>Year</label>
                  <input
                    style={input}
                    type="number"
                    value={yearFilter}
                    onChange={(event) => setYearFilter(event.target.value)}
                  />
                </div>
              )}

              {periodType === "custom" && (
                <>
                  <div>
                    <label style={label}>Start Date</label>
                    <input
                      style={input}
                      type="date"
                      value={startDateFilter}
                      onChange={(event) => setStartDateFilter(event.target.value)}
                    />
                  </div>

                  <div>
                    <label style={label}>End Date</label>
                    <input
                      style={input}
                      type="date"
                      value={endDateFilter}
                      onChange={(event) => setEndDateFilter(event.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {message && <p style={messageStyle}>{message}</p>}
      </section>

      {loading ? (
        <section style={panel}>
          <p style={mutedText}>Loading reports...</p>
        </section>
      ) : (
        <>
          {!isEmployeeReport && (
            <section style={summaryGrid}>
              <div style={summaryCard}>
                <span style={summaryLabel}>Total Payslips</span>
                <strong style={summaryValue}>{reportSummary.totalPayslips}</strong>
              </div>

              <div style={summaryCard}>
                <span style={summaryLabel}>Confirmed</span>
                <strong style={summaryValue}>{reportSummary.confirmed}</strong>
              </div>

              <div style={summaryCard}>
                <span style={summaryLabel}>Pending</span>
                <strong style={summaryValue}>{reportSummary.pending}</strong>
              </div>

              <div style={summaryCard}>
                <span style={summaryLabel}>Generated</span>
                <strong style={summaryValue}>{reportSummary.generated}</strong>
              </div>

              <div style={summaryCard}>
                <span style={summaryLabel}>Total Net Pay</span>
                <strong style={summaryValue}>
                  R {reportSummary.totalNetPay.toFixed(2)}
                </strong>
              </div>

              <div style={summaryCard}>
                <span style={summaryLabel}>Confirmation Rate</span>
                <strong style={summaryValue}>
                  {reportSummary.confirmationRate}%
                </strong>
              </div>
            </section>
          )}

          <section style={panel}>
            <div style={panelHeader}>
              <div>
                <h2 style={sectionTitle}>{getReportTitle()}</h2>
                <p style={mutedText}>
                  Generated for {businessName}. Use the filters above to refine
                  the report output.
                </p>
              </div>
            </div>

            {isEmployeeReport ? (
              <EmployeeReportTable
                rows={employeeReportRows}
                getEmployeeName={getEmployeeName}
              />
            ) : reportType === "payroll_summary" ||
              reportType === "uif_report" ||
              reportType === "paye_report" ||
              reportType === "emp201_summary" ||
              reportType === "company_payroll_overview" ||
              reportType === "monthly_wage_cost_report" ? (
              <PayrollSummaryTable rows={filteredPayslips} getEmployeeName={getEmployeeName} />
            ) : reportType === "employee_payment_history" ? (
              <EmployeePaymentHistoryTable
                rows={filteredPayslips}
                getEmployeeName={getEmployeeName}
              />
            ) : (
              <SalaryReceiptTable
                rows={filteredPayslips}
                getEmployeeName={getEmployeeName}
                getReceiptStatus={getReceiptStatus}
              />
            )}
          </section>
        </>
      )}
    </main>
  );
}

function SalaryReceiptTable({
  rows,
  getEmployeeName,
  getReceiptStatus,
}: {
  rows: PayslipReportRow[];
  getEmployeeName: (employeeId: string) => string;
  getReceiptStatus: (row: PayslipReportRow) => string;
}) {
  if (rows.length === 0) {
    return <p style={mutedText}>No records match the selected filters.</p>;
  }

  return (
    <div style={tableWrap}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Employee</th>
            <th style={th}>Payroll Month</th>
            <th style={th}>Net Pay</th>
            <th style={th}>Payment Method</th>
            <th style={th}>Payslip Status</th>
            <th style={th}>Receipt Status</th>
            <th style={th}>Confirmed Date</th>
            <th style={th}>Issued Date</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => {
            const receiptStatus = getReceiptStatus(row);

            return (
              <tr key={row.id}>
                <td style={td}>{getEmployeeName(row.employee_id)}</td>
                <td style={td}>{row.payroll_month || "Unknown"}</td>
                <td style={td}>R {Number(row.net_pay || 0).toFixed(2)}</td>
                <td style={td}>{row.payment_method || "Not set"}</td>
                <td style={td}>{formatStatus(row.status || "generated")}</td>
                <td style={td}>
                  <span style={getBadgeStyle(receiptStatus)}>
                    {formatStatus(receiptStatus)}
                  </span>
                </td>
                <td style={td}>{formatDate(row.received_confirmed_at)}</td>
                <td style={td}>{formatDate(row.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function PayrollSummaryTable({
  rows,
  getEmployeeName,
}: {
  rows: PayslipReportRow[];
  getEmployeeName: (employeeId: string) => string;
}) {
  if (rows.length === 0) {
    return <p style={mutedText}>No records match the selected filters.</p>;
  }

  return (
    <div style={tableWrap}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Employee</th>
            <th style={th}>Payroll Month</th>
            <th style={th}>Gross Pay</th>
            <th style={th}>PAYE</th>
            <th style={th}>UIF</th>
            <th style={th}>Other Deductions</th>
            <th style={th}>Net Pay</th>
            <th style={th}>SARS Payable</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={td}>{getEmployeeName(row.employee_id)}</td>
              <td style={td}>{row.payroll_month || "Unknown"}</td>
              <td style={td}>R {Number(row.gross_pay || 0).toFixed(2)}</td>
              <td style={td}>R {Number(row.paye || 0).toFixed(2)}</td>
              <td style={td}>R {Number(row.total_uif || 0).toFixed(2)}</td>
              <td style={td}>
                R {Number(row.other_deductions || 0).toFixed(2)}
              </td>
              <td style={td}>R {Number(row.net_pay || 0).toFixed(2)}</td>
              <td style={td}>R {Number(row.sars_payable || 0).toFixed(2)}</td>
              <td style={td}>{formatStatus(row.status || "generated")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeePaymentHistoryTable({
  rows,
  getEmployeeName,
}: {
  rows: PayslipReportRow[];
  getEmployeeName: (employeeId: string) => string;
}) {
  if (rows.length === 0) {
    return <p style={mutedText}>No records match the selected filters.</p>;
  }

  return (
    <div style={tableWrap}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Employee</th>
            <th style={th}>Payroll Month</th>
            <th style={th}>Payment Date</th>
            <th style={th}>Payment Method</th>
            <th style={th}>Net Pay</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td style={td}>{getEmployeeName(row.employee_id)}</td>
              <td style={td}>{row.payroll_month || "Unknown"}</td>
              <td style={td}>{formatDate(row.payment_date)}</td>
              <td style={td}>{row.payment_method || "Not set"}</td>
              <td style={td}>R {Number(row.net_pay || 0).toFixed(2)}</td>
              <td style={td}>{formatStatus(row.status || "generated")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeeReportTable({
  rows,
  getEmployeeName,
}: {
  rows: Employee[];
  getEmployeeName: (employeeId: string) => string;
}) {
  if (rows.length === 0) {
    return <p style={mutedText}>No employee records match the selected filters.</p>;
  }

  return (
    <div style={tableWrap}>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Employee</th>
            <th style={th}>Email</th>
            <th style={th}>Phone</th>
            <th style={th}>Status</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((employee) => (
            <tr key={employee.id}>
              <td style={td}>{getEmployeeName(employee.id)}</td>
              <td style={td}>{employee.email || "Not captured"}</td>
              <td style={td}>{employee.phone || "Not captured"}</td>
              <td style={td}>
                {formatStatus(
                  employee.status || employee.employment_status || "active"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function getBadgeStyle(status: string) {
  if (status === "confirmed") return confirmedBadge;
  if (status === "generated") return generatedBadge;
  return pendingBadge;
}

function formatDate(value?: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-ZA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatStatus(value: string) {
  return value
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
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

const panel = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  padding: "24px",
  borderRadius: "20px",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
  marginBottom: "20px",
};

const panelHeader = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: "14px",
  flexWrap: "wrap" as const,
  marginBottom: "18px",
};

const sectionTitle = {
  fontSize: "22px",
  margin: 0,
  color: "#0f172a",
};

const mutedText = {
  margin: "8px 0 0",
  color: "#64748b",
  fontSize: "14px",
  lineHeight: 1.5,
};

const filterGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "14px",
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
  width: "100%",
  color: "#0f172a",
  background: "#ffffff",
};

const buttonRow = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap" as const,
};

const primaryButton = {
  background: "#0f766e",
  color: "#ffffff",
  padding: "10px 16px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const outlineButton = {
  background: "#ffffff",
  color: "#0f766e",
  border: "1px solid #0f766e",
  padding: "10px 16px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 800,
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "14px",
  marginBottom: "20px",
};

const summaryCard = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: "18px",
  padding: "18px",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const summaryLabel = {
  display: "block",
  color: "#64748b",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "8px",
};

const summaryValue = {
  display: "block",
  color: "#0f766e",
  fontSize: "24px",
  fontWeight: 900,
};

const tableWrap = {
  overflowX: "auto" as const,
};

const table = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const th = {
  background: "#f8fafc",
  color: "#475569",
  fontSize: "12px",
  fontWeight: 900,
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "1px solid #e2e8f0",
};

const td = {
  color: "#0f172a",
  fontSize: "13px",
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
};

const confirmedBadge = {
  background: "#ecfdf5",
  border: "1px solid #bbf7d0",
  color: "#166534",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const pendingBadge = {
  background: "#fff7ed",
  border: "1px solid #fed7aa",
  color: "#9a3412",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const generatedBadge = {
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1d4ed8",
  padding: "7px 10px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const messageStyle = {
  marginTop: "14px",
  color: "#155e75",
  fontWeight: 700,
};