"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  clearAdminSession,
  setAdminSession,
  verifyAdminPassword,
} from "@/lib/auth";
import { DEFAULT_TIMEZONE, slugify } from "@/lib/registration";
import {
  assignSignupToGroup,
  createEvent,
  createGroup,
  createNextEvent,
  createOrganizer,
  setEventOrganizer,
  updateEmailSettings,
  updateEvent,
  updateGroup,
  updateOrganizer,
  updateSignup,
} from "@/lib/store";
import { sendCrewIntroduction } from "@/lib/emailQueue";
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
  const slug = slugify(String(formData.get("slug") ?? ""));
  const date = String(formData.get("date") ?? "");
  const startTime = String(formData.get("startTime") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const meetingPoint = String(formData.get("meetingPoint") ?? "").trim();
  const ticketUrl = String(formData.get("ticketUrl") ?? "").trim();
  const organizerId = String(formData.get("organizerId") ?? "").trim();

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
    organizerId: organizerId || undefined,
    timezone: DEFAULT_TIMEZONE,
    status: "recruiting",
  });

  revalidatePath("/admin");
  redirect("/admin");
}

export async function updateEmailSettingsAction(formData: FormData) {
  const eventId = String(formData.get("eventId") ?? "");
  await updateEmailSettings(eventId, {
    emailSignupConfirmation: formData.get("emailSignupConfirmation") === "1",
    emailAttendanceAsk: formData.get("emailAttendanceAsk") === "1",
    emailAttendanceNudge: formData.get("emailAttendanceNudge") === "1",
    emailGroupReminder: formData.get("emailGroupReminder") === "1",
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function sendCrewIntroductionAction(groupId: string, eventId: string) {
  await sendCrewIntroduction(groupId);
  revalidatePath(`/admin/events/${eventId}`);
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

export async function createOrganizerAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = slugify(String(formData.get("slug") ?? ""));
  const description = String(formData.get("description") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const websiteUrl = String(formData.get("websiteUrl") ?? "").trim();
  const contactEmail = String(formData.get("contactEmail") ?? "").trim();
  if (!name || !slug) redirect("/admin/organizers?error=missing");
  try {
    const organizer = await createOrganizer({
      name,
      slug,
      description,
      city,
      websiteUrl,
      contactEmail,
    });
    revalidatePath("/admin/organizers");
    redirect(`/admin/organizers/${organizer.id}`);
  } catch (error) {
    if (error instanceof Error && error.message === "That URL is already in use.") {
      redirect("/admin/organizers?error=slug");
    }
    throw error;
  }
}

export async function updateOrganizerAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await updateOrganizer(id, {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    contactEmail: String(formData.get("contactEmail") ?? "").trim(),
  });
  revalidatePath(`/admin/organizers/${id}`);
  revalidatePath("/admin");
  redirect(`/admin/organizers/${id}`);
}

export async function attachEventAction(formData: FormData) {
  const organizerId = String(formData.get("organizerId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!organizerId || !eventId) redirect(`/admin/organizers/${organizerId}`);
  await setEventOrganizer(eventId, organizerId);
  revalidatePath(`/admin/organizers/${organizerId}`);
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  redirect(`/admin/organizers/${organizerId}`);
}

export async function detachEventAction(formData: FormData) {
  const organizerId = String(formData.get("organizerId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  await setEventOrganizer(eventId, null);
  revalidatePath(`/admin/organizers/${organizerId}`);
  revalidatePath("/admin");
  redirect(`/admin/organizers/${organizerId}`);
}

export async function createNextEventAction(formData: FormData) {
  const organizerId = String(formData.get("organizerId") ?? "");
  const sourceEventId = String(formData.get("sourceEventId") ?? "");
  const date = String(formData.get("date") ?? "");
  const slug = slugify(String(formData.get("slug") ?? ""));
  if (!sourceEventId || !date || !slug) {
    redirect(`/admin/organizers/${organizerId}?error=missing`);
  }
  try {
    await createNextEvent(sourceEventId, date, slug);
  } catch (error) {
    if (error instanceof Error && error.message === "That event URL is already in use.") {
      redirect(`/admin/organizers/${organizerId}?error=slug`);
    }
    throw error;
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/organizers/${organizerId}`);
  redirect(`/admin/organizers/${organizerId}`);
}
