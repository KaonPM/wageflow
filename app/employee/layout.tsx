import type { ReactNode } from "react"; import { RoleGuard } from "@/components/RoleGuard";
export default function EmployeeLayout({children}:{children:ReactNode}){return <RoleGuard allowedRoles={["employee"]}>{children}</RoleGuard>}
