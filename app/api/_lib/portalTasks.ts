import type { SupabaseClient } from "@supabase/supabase-js";

export async function createPortalTask(admin: SupabaseClient, task: { businessId: string; recipientUserId: string; recipientRole: "employer" | "employee"; title: string; message: string; href: string; taskType: string }) {
  const { error } = await admin.from("portal_tasks").insert({ business_id: task.businessId, recipient_user_id: task.recipientUserId, recipient_role: task.recipientRole, title: task.title, message: task.message, href: task.href, task_type: task.taskType });
  if (error) console.error("Portal task could not be saved", error.message);
}
