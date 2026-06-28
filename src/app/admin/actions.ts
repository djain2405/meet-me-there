"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/auth";
import {
  assignSignupToGroup,
  createEvent,
  createGroup,
  updateEvent,
  updateGroup,
  updateSignup,
} from "@/lib/store";
import type { EventStatus, Group, PilotEvent, SignupStatus } from "@/lib/types";

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setAdminSession();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminSession();
  redirect("/admin/login");
}

export async function createEventAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const meetingPoint = String(formData.get("meetingPoint") ?? "").trim();
  const ticketUrl = String(formData.get("ticketUrl") ?? "").trim();

  if (!name || !slug || !date || !venue || !meetingPoint) {
    redirect("/admin?error=missing-fields");
  }

  await createEvent({
    name,
    slug,
    date,
    startTime,
    venue,
    meetingPoint,
    scheduleNotes: "",
    ticketUrl,
    organizerContactName: "",
    organizerContactEmail: "",
    attendeeInstructions: "",
    status: "recruiting",
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateEventStatusAction(
  eventId: string,
  status: EventStatus,
) {
  await updateEvent(eventId, { status });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function assignSignupAction(
  signupId: string,
  groupId: string | null,
) {
  await assignSignupToGroup(signupId, groupId);
  revalidatePath("/admin");
}

export async function createGroupAction(
  eventId: string,
  data: Omit<Group, "id" | "eventId">,
) {
  await createGroup({ ...data, eventId });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function updateGroupAction(
  groupId: string,
  patch: Partial<Group>,
) {
  await updateGroup(groupId, patch);
  revalidatePath("/admin");
}

export async function updateSignupStatusAction(
  signupId: string,
  status: SignupStatus,
) {
  await updateSignup(signupId, { status });
  revalidatePath("/admin");
}

export async function updateEventDetailsAction(
  eventId: string,
  patch: Partial<PilotEvent>,
) {
  await updateEvent(eventId, patch);
  revalidatePath(`/admin/events/${eventId}`);
}
