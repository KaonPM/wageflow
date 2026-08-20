import type { ReactNode } from "react"; import { RoleGuard } from "@/components/RoleGuard"; import { PlanAccessGate } from "@/components/PlanAccessGate";
export default function EmployeeLayout({children}:{children:ReactNode}){return <RoleGuard allowedRoles={["employee"]}><PlanAccessGate>{children}</PlanAccessGate></RoleGuard>}
