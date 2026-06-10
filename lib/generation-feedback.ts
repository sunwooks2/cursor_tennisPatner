import type { GeneratedSchedule } from "@/lib/types";

export type GenerationFeedbackType = "create" | "regenerate";

export function getGenerationFeedbackMessage(
  type: GenerationFeedbackType,
  generated: GeneratedSchedule
): string {
  const matchCount = generated.schedule.filter((match) => !match.empty).length;

  if (type === "create") {
    return `대진 완료! 총 ${matchCount}경기`;
  }

  return `새 대진 완료! 총 ${matchCount}경기`;
}
