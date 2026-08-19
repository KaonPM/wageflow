import type { ReactNode } from "react";
import { RoleGuard } from "@/components/RoleGuard";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["master", "master_admin"]}>{children}</RoleGuard>;
}
