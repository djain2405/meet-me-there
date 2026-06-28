"use server";

import { createSignup } from "@/lib/store";
import type { AttendanceCertainty } from "@/lib/types";

type State = { ok: boolean; error: string; firstName?: string };

export async function submitSignupAction(
  _prev: State,
  formData: FormData,
): Promise<State> {
  const eventId = String(formData.get("eventId") ?? "");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || undefined;
  const attendanceCertainty = String(
    formData.get("attendanceCertainty"),
  ) as AttendanceCertainty;
  const arrivalTime = String(formData.get("arrivalTime") ?? "").trim();
  const preferredSession =
    String(formData.get("preferredSession") ?? "").trim() || undefined;
  const preferredGroupSize = String(
    formData.get("preferredGroupSize") ?? "no-preference",
  ) as "3" | "4" | "5" | "no-preference";
  const comfortPreferences = formData
    .getAll("comfortPreferences")
    .map(String);
  const willingConnector = formData.get("willingConnector") === "on";
  const ageAcknowledged = formData.get("ageAcknowledged") === "on";
  const conductAcknowledged = formData.get("conductAcknowledged") === "on";

  if (!firstName || !email || !arrivalTime) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!ageAcknowledged || !conductAcknowledged) {
    return { ok: false, error: "Please acknowledge the safety expectations." };
  }

  try {
    await createSignup(eventId, {
      firstName,
      email,
      phone,
      attendanceCertainty,
      arrivalTime,
      preferredSession,
      preferredGroupSize,
      comfortPreferences,
      willingConnector,
      ageAcknowledged,
      conductAcknowledged,
    });
    return { ok: true, error: "", firstName };
  } catch {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
