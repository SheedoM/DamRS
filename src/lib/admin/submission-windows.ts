export type SubmissionWindowStateInput = {
  opens_at: string;
  closes_at: string;
} | null;

export function getSubmissionWindowState(
  windowData: SubmissionWindowStateInput,
  now = new Date(),
) {
  if (!windowData) {
    return {
      hasWindow: false,
      isOpen: false,
      label: "لا توجد نافذة تسليم",
    };
  }

  const opensAt = new Date(windowData.opens_at);
  const closesAt = new Date(windowData.closes_at);
  const isOpen = opensAt <= now && now <= closesAt;

  return {
    hasWindow: true,
    isOpen,
    label: isOpen ? "مفتوحة" : "مغلقة",
  };
}
