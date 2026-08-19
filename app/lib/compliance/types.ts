export type ComplianceIssue = {
  code: string;
  severity: "blocking" | "warning";
  employeeId?: string;
  employeeNumber?: string | null;
  message: string;
  field?: string;
};

export type ComplianceEmployee = {
  id: string;
  employee_number?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  id_number?: string | null;
  passport_number?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  termination_reason?: string | null;
  tax_number?: string | null;
  uif_registered?: boolean | null;
  uif_contributor?: boolean | null;
  uif_non_contributor_reason?: string | null;
  monthly_hours_worked?: number | null;
  monthly_gross_remuneration?: number | null;
  monthly_uif_employee?: number | null;
  monthly_uif_employer?: number | null;
};

export type ComplianceBusiness = {
  registered_name?: string | null;
  business_name?: string | null;
  paye_reference?: string | null;
  uif_reference?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  sdl_applicable?: boolean | null;
};
