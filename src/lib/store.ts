import { promises as fs } from "fs";
import path from "path";
import { createDemoStore } from "./demo";
import type {
  Group,
  PilotEvent,
  Signup,
  Store,
  SurveyResponse,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "store.json");

async function ensureStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as Store;
  } catch {
    const demo = createDemoStore();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(STORE_PATH, JSON.stringify(demo, null, 2));
    return demo;
  }
}

async function saveStore(store: Store): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

export async function getStore(): Promise<Store> {
  return ensureStore();
}

export async function getEventBySlug(slug: string): Promise<PilotEvent | null> {
  const store = await ensureStore();
  return store.events.find((e) => e.slug === slug) ?? null;
}

export async function getEventById(id: string): Promise<PilotEvent | null> {
  const store = await ensureStore();
  return store.events.find((e) => e.id === id) ?? null;
}

export async function listEvents(): Promise<PilotEvent[]> {
  const store = await ensureStore();
  return [...store.events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export async function getSignupsForEvent(eventId: string): Promise<Signup[]> {
  const store = await ensureStore();
  return store.signups
    .filter((s) => s.eventId === eventId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export async function getGroupsForEvent(eventId: string): Promise<Group[]> {
  const store = await ensureStore();
  return store.groups.filter((g) => g.eventId === eventId);
}

export async function getSignupBySurveyToken(
  token: string,
): Promise<{ signup: Signup; event: PilotEvent } | null> {
  const store = await ensureStore();
  const signup = store.signups.find((s) => s.surveyToken === token);
  if (!signup) return null;
  const event = store.events.find((e) => e.id === signup.eventId);
  if (!event) return null;
  return { signup, event };
}

export async function getSurveyForSignup(
  signupId: string,
): Promise<SurveyResponse | null> {
  const store = await ensureStore();
  return store.surveys.find((s) => s.signupId === signupId) ?? null;
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function createSignup(
  eventId: string,
  data: Omit<
    Signup,
    "id" | "eventId" | "status" | "surveyToken" | "createdAt" | "groupId"
  >,
): Promise<Signup> {
  const store = await ensureStore();
  const signup: Signup = {
    ...data,
    id: newId("sig"),
    eventId,
    status: "pending",
    surveyToken: newId("survey"),
    createdAt: new Date().toISOString(),
  };
  store.signups.push(signup);
  await saveStore(store);
  return signup;
}

export async function createEvent(
  data: Omit<PilotEvent, "id" | "createdAt">,
): Promise<PilotEvent> {
  const store = await ensureStore();
  const event: PilotEvent = {
    ...data,
    id: newId("evt"),
    createdAt: new Date().toISOString(),
  };
  store.events.push(event);
  await saveStore(store);
  return event;
}

export async function updateEvent(
  id: string,
  patch: Partial<PilotEvent>,
): Promise<PilotEvent | null> {
  const store = await ensureStore();
  const idx = store.events.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  store.events[idx] = { ...store.events[idx], ...patch };
  await saveStore(store);
  return store.events[idx];
}

export async function updateSignup(
  id: string,
  patch: Partial<Signup>,
): Promise<Signup | null> {
  const store = await ensureStore();
  const idx = store.signups.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  store.signups[idx] = { ...store.signups[idx], ...patch };
  await saveStore(store);
  return store.signups[idx];
}

export async function createGroup(
  data: Omit<Group, "id">,
): Promise<Group> {
  const store = await ensureStore();
  const group: Group = { ...data, id: newId("grp") };
  store.groups.push(group);
  await saveStore(store);
  return group;
}

export async function updateGroup(
  id: string,
  patch: Partial<Group>,
): Promise<Group | null> {
  const store = await ensureStore();
  const idx = store.groups.findIndex((g) => g.id === id);
  if (idx === -1) return null;
  store.groups[idx] = { ...store.groups[idx], ...patch };
  await saveStore(store);
  return store.groups[idx];
}

export async function assignSignupToGroup(
  signupId: string,
  groupId: string | null,
): Promise<void> {
  const store = await ensureStore();
  const signup = store.signups.find((s) => s.id === signupId);
  if (!signup) return;
  signup.groupId = groupId ?? undefined;
  await saveStore(store);
}

export async function submitSurvey(
  data: Omit<SurveyResponse, "submittedAt">,
): Promise<SurveyResponse> {
  const store = await ensureStore();
  const existing = store.surveys.findIndex((s) => s.signupId === data.signupId);
  const response: SurveyResponse = {
    ...data,
    submittedAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    store.surveys[existing] = response;
  } else {
    store.surveys.push(response);
  }
  await saveStore(store);
  return response;
}

export type EventSummary = {
  event: PilotEvent;
  totalSignups: number;
  confirmedCount: number;
  groupCount: number;
  assignedCount: number;
  surveyCount: number;
  metGroupYes: number;
  easierYes: number;
  comfortableYes: number;
  wouldUseAgain: number;
};

export async function getEventSummary(eventId: string): Promise<EventSummary | null> {
  const store = await ensureStore();
  const event = store.events.find((e) => e.id === eventId);
  if (!event) return null;

  const signups = store.signups.filter((s) => s.eventId === eventId);
  const groups = store.groups.filter((g) => g.eventId === eventId);
  const surveys = store.surveys.filter((s) => s.eventId === eventId);

  return {
    event,
    totalSignups: signups.length,
    confirmedCount: signups.filter((s) => s.status === "confirmed").length,
    groupCount: groups.length,
    assignedCount: signups.filter((s) => s.groupId).length,
    surveyCount: surveys.length,
    metGroupYes: surveys.filter((s) => s.metGroup).length,
    easierYes: surveys.filter((s) => s.madeAttendanceEasier === "yes").length,
    comfortableYes: surveys.filter((s) => s.feltComfortableSafe === "yes").length,
    wouldUseAgain: surveys.filter((s) => s.wouldUseAgain).length,
  };
}
