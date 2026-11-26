"use server";

import {
  findSignupByEventEmail,
  getEventBySurveyEntryToken,
  getSurveyForSignup,
} from "@/lib/store";

export type SurveyMatch = {
  signupId: string;
  eventId: string;
  firstName: string;
  eventName: string;
  alreadySubmitted: boolean;
};

export type SurveyLookupState = {
  error: string;
  match: SurveyMatch | null;
};

export async function lookupSurveyByEmail(
  _prev: SurveyLookupState,
  formData: FormData,
): Promise<SurveyLookupState> {
  const token = String(formData.get("token") ?? "");
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Enter the email you signed up with.", match: null };
  }

  const event = await getEventBySurveyEntryToken(token);
  if (!event) {
    return { error: "This link is not active.", match: null };
  }

  const signup = await findSignupByEventEmail(event.id, email);
  if (!signup) {
    return { error: "We couldn't find that signup.", match: null };
  }

  const existing = await getSurveyForSignup(signup.id);
  return {
    error: "",
    match: {
      signupId: signup.id,
      eventId: event.id,
      firstName: signup.firstName,
      eventName: event.name,
      alreadySubmitted: !!existing,
    },
  };
}
