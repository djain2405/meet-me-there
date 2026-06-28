"use server";

import { submitSurvey } from "@/lib/store";

type State = { ok: boolean; error: string };

export async function submitSurveyAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const signupId = String(formData.get("signupId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const metGroup = formData.get("metGroup") === "yes";
  const madeAttendanceEasier = String(
    formData.get("madeAttendanceEasier"),
  ) as "yes" | "somewhat" | "no";
  const feltComfortableSafe = String(
    formData.get("feltComfortableSafe"),
  ) as "yes" | "somewhat" | "no";
  const wouldUseAgain = formData.get("wouldUseAgain") === "on";
  const interestedInFutureEvent =
    formData.get("interestedInFutureEvent") === "on";
  const comments = String(formData.get("comments") ?? "").trim() || undefined;

  if (!signupId || !eventId || !madeAttendanceEasier || !feltComfortableSafe) {
    return { ok: false, error: "Please answer all required questions." };
  }

  try {
    await submitSurvey({
      signupId,
      eventId,
      metGroup,
      madeAttendanceEasier,
      feltComfortableSafe,
      wouldUseAgain,
      interestedInFutureEvent,
      comments,
    });
    return { ok: true, error: "" };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
