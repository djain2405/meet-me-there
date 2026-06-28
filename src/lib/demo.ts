import type { Group, PilotEvent, Signup, Store } from "./types";

const DEMO_EVENT_ID = "evt_demo_riverside";

export const DEMO_EVENT: PilotEvent = {
  id: DEMO_EVENT_ID,
  slug: "riverside-summer-social",
  name: "Riverside Summer Social",
  date: "2026-07-18",
  startTime: "6:00 PM",
  venue: "Riverside Community Hall, 42 Oak Street",
  meetingPoint: "Main entrance. Look for the Meet Me There sign near registration",
  scheduleNotes:
    "6:00 PM doors · 6:30 PM welcome · 7:00 PM breakout sessions · 8:30 PM social hour",
  ticketUrl: "https://example.com/tickets/riverside-social",
  organizerContactName: "Jordan Lee",
  organizerContactEmail: "events@riversidecommunity.org",
  attendeeInstructions:
    "Bring your ticket QR code. Street parking is available on Oak and Maple.",
  status: "recruiting",
  createdAt: "2026-06-01T10:00:00.000Z",
};

const DEMO_SIGNUPS: Signup[] = [
  {
    id: "sig_demo_1",
    eventId: DEMO_EVENT_ID,
    firstName: "Maya",
    email: "maya@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredSession: "Creative breakout",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: true,
    conductAcknowledged: true,
    ageAcknowledged: true,
    status: "confirmed",
    groupId: "grp_demo_1",
    surveyToken: "survey_demo_maya",
    createdAt: "2026-06-10T14:00:00.000Z",
  },
  {
    id: "sig_demo_2",
    eventId: DEMO_EVENT_ID,
    firstName: "Alex",
    email: "alex@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:50 PM",
    preferredGroupSize: "no-preference",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
    status: "confirmed",
    groupId: "grp_demo_1",
    surveyToken: "survey_demo_alex",
    createdAt: "2026-06-11T09:30:00.000Z",
  },
  {
    id: "sig_demo_3",
    eventId: DEMO_EVENT_ID,
    firstName: "Priya",
    email: "priya@example.com",
    attendanceCertainty: "considering",
    arrivalTime: "6:00 PM",
    preferredGroupSize: "5",
    comfortPreferences: ["women-only"],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
    status: "pending",
    surveyToken: "survey_demo_priya",
    createdAt: "2026-06-12T18:00:00.000Z",
  },
  {
    id: "sig_demo_4",
    eventId: DEMO_EVENT_ID,
    firstName: "Sam",
    email: "sam@example.com",
    attendanceCertainty: "definitely",
    arrivalTime: "5:45 PM",
    preferredSession: "Creative breakout",
    preferredGroupSize: "4",
    comfortPreferences: [],
    willingConnector: false,
    conductAcknowledged: true,
    ageAcknowledged: true,
    status: "confirmed",
    groupId: "grp_demo_1",
    surveyToken: "survey_demo_sam",
    createdAt: "2026-06-13T11:00:00.000Z",
  },
];

const DEMO_GROUPS: Group[] = [
  {
    id: "grp_demo_1",
    eventId: DEMO_EVENT_ID,
    name: "Group 1",
    meetingTime: "5:45 PM",
    meetingLocation:
      "Main entrance. Look for the Meet Me There sign near registration",
    arrivalInstructions:
      "Meet 15 minutes before doors open. Maya is your group connector. She'll be wearing a green lanyard.",
    chatLink: "https://chat.example.com/group-1",
    connectorSignupId: "sig_demo_1",
  },
];

export function createDemoStore(): Store {
  return {
    events: [DEMO_EVENT],
    signups: DEMO_SIGNUPS,
    groups: DEMO_GROUPS,
    surveys: [],
  };
}

export const DEMO_EVENT_SLUG = DEMO_EVENT.slug;
