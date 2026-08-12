import type { ReactNode } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { MasterShell } from "@/components/MasterShell";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["master", "master_admin"]}><MasterShell>{children}</MasterShell></RoleGuard>;
}
