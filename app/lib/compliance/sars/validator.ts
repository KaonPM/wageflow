import type { ComplianceEmployee, ComplianceIssue } from "../types";

export function validateSarsEmployees(employees: ComplianceEmployee[]): ComplianceIssue[] {
  return employees.flatMap((employee) => {
    const ref = employee.employee_number || "Employee";
    const issue = (code: string, message: string, field: string): ComplianceIssue => ({ code, severity: "blocking", employeeId: employee.id, employeeNumber: employee.employee_number, message: `${ref} – ${message}`, field });
    return [
      !employee.first_name?.trim() ? issue("SARS001", "first name missing", "first_name") : null,
      !employee.last_name?.trim() ? issue("SARS002", "surname missing", "last_name") : null,
      !employee.id_number?.trim() && !employee.passport_number?.trim() ? issue("SARS003", "ID/passport information incomplete", "id_number") : null,
      !employee.tax_number?.trim() ? issue("SARS004", "income tax number missing", "tax_number") : null,
    ].filter((item): item is ComplianceIssue => item !== null);
  });
}
