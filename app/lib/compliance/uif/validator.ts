import type { ComplianceBusiness, ComplianceEmployee, ComplianceIssue } from "../types";

export function validateUifDeclaration(
  business: ComplianceBusiness,
  employees: ComplianceEmployee[]
): ComplianceIssue[] {
  const issues: ComplianceIssue[] = [];
  const businessName = business.registered_name || business.business_name;
  if (!business.uif_reference?.trim()) issues.push({ code: "UIF001", severity: "blocking", message: "Employer UIF reference is required." });
  if (!businessName?.trim()) issues.push({ code: "UIF002", severity: "blocking", message: "Employer registered name is required." });
  if (!business.phone?.trim() && !business.email?.trim()) issues.push({ code: "UIF003", severity: "blocking", message: "Employer contact information is required." });

  for (const employee of employees) {
    const ref = employee.employee_number || "Employee";
    const add = (code: string, message: string, field: string) => issues.push({ code, severity: "blocking", employeeId: employee.id, employeeNumber: employee.employee_number, message: `${ref} – ${message}`, field });
    if (!employee.uif_contributor && employee.uif_contributor !== false && employee.uif_registered == null) add("UIF004", "UIF contributor status missing", "uif_contributor");
    if (!employee.first_name?.trim()) add("UIF005", "first name missing", "first_name");
    if (!employee.last_name?.trim()) add("UIF006", "surname missing", "last_name");
    if (!employee.id_number?.trim() && !employee.passport_number?.trim()) add("UIF007", "ID/passport information incomplete", "id_number");
    if (!employee.date_of_birth?.trim()) add("UIF008", "date of birth missing", "date_of_birth");
    if (!employee.start_date?.trim()) add("UIF009", "employment start date missing", "start_date");
    if (employee.end_date?.trim() && !employee.termination_reason?.trim()) add("UIF010", "termination reason required", "termination_reason");
  }
  return issues;
}
