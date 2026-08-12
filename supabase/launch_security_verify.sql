-- Every business-sensitive public table should show rowsecurity = true.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','businesses','employees','employee_accounts','payroll_runs','payslips','employee_documents','disciplinary_records','hr_notes','approval_requests','payslip_notifications','business_settings','subscriptions','wageflow_setup_requests','contact_enquiries')
order by tablename;

select schemaname, tablename, policyname, roles, cmd
from pg_policies
where (schemaname = 'public' and tablename in ('profiles','businesses','employees','employee_accounts','payroll_runs','payslips','employee_documents','disciplinary_records','hr_notes','approval_requests','payslip_notifications','business_settings','subscriptions','wageflow_setup_requests','contact_enquiries'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

select id, public from storage.buckets where id = 'employee-documents';
