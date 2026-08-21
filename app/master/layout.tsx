import type { ReactNode } from "react";
import { RoleGuard } from "@/components/RoleGuard";
import { MasterPortalBar } from "@/components/MasterPortalBar";

export default function MasterLayout({ children }: { children: ReactNode }) {
  return <RoleGuard allowedRoles={["master", "master_admin"]}><MasterPortalBar />{children}</RoleGuard>;
}
