import type { ReactNode } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { EmployerBusinessSwitcher } from "@/components/EmployerBusinessSwitcher";
import { PlanAccessGate } from "@/components/PlanAccessGate";
import { EmployerPermissionGate } from "@/components/EmployerPermissionGate";

export default function EmployerLayout({children}:{children:ReactNode}) {
  return <RoleGuard allowedRoles={["employer", "employer_admin"]}><EmployerBusinessSwitcher /><EmployerPermissionGate><PlanAccessGate>{children}</PlanAccessGate></EmployerPermissionGate></RoleGuard>;
}
