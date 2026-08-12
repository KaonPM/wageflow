import type { ReactNode } from "react"; import { RoleGuard } from "@/components/RoleGuard";
export default function EmployerLayout({children}:{children:ReactNode}){return <RoleGuard allowedRoles={["employer"]}>{children}</RoleGuard>}
