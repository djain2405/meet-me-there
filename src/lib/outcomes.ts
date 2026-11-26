import type { Signup, SurveyResponse } from "./types";

export type AttendanceOutcome = "attended" | "absent" | "unknown";
export type MeetupOutcome = "met" | "not-met" | "unknown";

export function attendanceOutcome(
  signup: Pick<Signup, "status">,
  survey?: Pick<SurveyResponse, "attended"> | null,
): AttendanceOutcome {
  if (signup.status === "attended") return "attended";
  if (signup.status === "no-show") return "absent";
  if (survey?.attended === true) return "attended";
  if (survey?.attended === false) return "absent";
  return "unknown";
}

export function meetupOutcome(
  survey?: Pick<SurveyResponse, "metGroup"> | null,
): MeetupOutcome {
  if (!survey) return "unknown";
  return survey.metGroup ? "met" : "not-met";
}
