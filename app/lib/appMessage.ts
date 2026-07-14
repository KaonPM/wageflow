export type AppMessageType = "info" | "success" | "error";

export function showAppMessage(
  message: unknown,
  type: AppMessageType = "info"
) {
  if (typeof window === "undefined") return;

  const text =
    message instanceof Error
      ? message.message
      : typeof message === "string"
      ? message
      : "Something went wrong.";

  window.dispatchEvent(
    new CustomEvent("wageflow-message", {
      detail: {
        message: text,
        type,
      },
    })
  );
}