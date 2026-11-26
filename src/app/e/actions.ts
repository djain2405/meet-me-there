"use server";

import { cleanUtm } from "@/lib/attribution";
import { RegistrationClosedError, normalizeEmail } from "@/lib/registration";
import { consumeReturnLink, requestReturnLink, returnPrefill } from "@/lib/returning";
import { createSignup } from "@/lib/store";
import type { AttendanceCertainty } from "@/lib/types";

type State = {
  ok: boolean;
  error: string;
  firstName?: string;
  alreadyRegistered?: boolean;
};

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
  const futureEmailOptOut = formData.get("futureEmailOptOut") === "on";
  const returnToken = String(formData.get("returnToken") ?? "");

  if (!firstName || !email || !arrivalTime) {
    return { ok: false, error: "Please fill in all required fields." };
  }
  if (!ageAcknowledged || !conductAcknowledged) {
    return { ok: false, error: "Please acknowledge the safety expectations." };
  }

  try {
    if (returnToken) {
      const prefill = await returnPrefill(returnToken);
      if (
        !prefill ||
        prefill.eventId !== eventId ||
        normalizeEmail(prefill.signup.email) !== normalizeEmail(email)
      ) {
        return { ok: false, error: "This link is no longer valid." };
      }
    }
    const result = await createSignup(eventId, {
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
      utmSource: cleanUtm(formData.get("utmSource")),
      utmMedium: cleanUtm(formData.get("utmMedium")),
      utmCampaign: cleanUtm(formData.get("utmCampaign")),
      futureEmailOptOut,
    });
    if (returnToken) await consumeReturnLink(returnToken);
    if (result.outcome === "duplicate") {
      return {
        ok: true,
        error: "",
        firstName: result.signup.firstName,
        alreadyRegistered: true,
      };
    }
    return { ok: true, error: "", firstName: result.signup.firstName };
  } catch (error) {
    if (error instanceof RegistrationClosedError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function requestReturnLinkAction(
  _prev: { message: string },
  formData: FormData,
): Promise<{ message: string }> {
  const eventId = String(formData.get("eventId") ?? "");
  const email = String(formData.get("email") ?? "");
  return { message: await requestReturnLink(eventId, email) };
}
