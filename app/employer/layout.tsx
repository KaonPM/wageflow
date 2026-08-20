import type { ReactNode } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { EmployerBusinessSwitcher } from "@/components/EmployerBusinessSwitcher";
import { PlanAccessGate } from "@/components/PlanAccessGate";

export default function EmployerLayout({children}:{children:ReactNode}) {
  return <RoleGuard allowedRoles={["employer"]}><EmployerBusinessSwitcher /><PlanAccessGate>{children}</PlanAccessGate></RoleGuard>;
}
