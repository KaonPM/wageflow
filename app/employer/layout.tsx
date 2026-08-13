import type { ReactNode } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { EmployerBusinessSwitcher } from "@/components/EmployerBusinessSwitcher";

export default function EmployerLayout({children}:{children:ReactNode}) {
  return <RoleGuard allowedRoles={["employer"]}><EmployerBusinessSwitcher />{children}</RoleGuard>;
}
