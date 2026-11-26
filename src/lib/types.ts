export type EventStatus =
  | "draft"
  | "recruiting"
  | "matching"
  | "live"
  | "completed"
  | "cancelled";

export type AttendanceCertainty = "definitely" | "considering";

export type SignupStatus =
  | "pending"
  | "confirmed"
  | "declined"
  | "attended"
  | "no-show";

export type Organizer = {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  websiteUrl: string;
  contactEmail: string;
  createdAt: string;
  updatedAt: string;
};

export type PilotEvent = {
  id: string;
  slug: string;
  name: string;
  date: string;
  startTime: string;
  venue: string;
  meetingPoint: string;
  scheduleNotes: string;
  ticketUrl: string;
  organizerContactName: string;
  organizerContactEmail: string;
  attendeeInstructions: string;
  organizerId?: string;
  timezone: string;
  status: EventStatus;
  /** Unlisted shared survey URL. Attendees confirm with their signup email. */
  surveyEntryToken: string;
  /** Unlisted organizer report. Separate from the survey link. */
  reportToken: string;
  createdAt: string;
};

export type Signup = {
  id: string;
  eventId: string;
  firstName: string;
  email: string;
  phone?: string;
  attendanceCertainty: AttendanceCertainty;
  arrivalTime: string;
  preferredSession?: string;
  preferredGroupSize: "3" | "4" | "5" | "no-preference";
  comfortPreferences: string[];
  willingConnector: boolean;
  conductAcknowledged: boolean;
  ageAcknowledged: boolean;
  status: SignupStatus;
  groupId?: string;
  surveyToken: string;
  normalizedEmail: string;
  createdAt: string;
};

export type Group = {
  id: string;
  eventId: string;
  name: string;
  meetingTime: string;
  meetingLocation: string;
  arrivalInstructions: string;
  chatLink?: string;
  connectorSignupId?: string;
};

export type SurveyResponse = {
  signupId: string;
  eventId: string;
  metGroup: boolean;
  madeAttendanceEasier: "yes" | "somewhat" | "no";
  feltComfortableSafe: "yes" | "somewhat" | "no";
  wouldUseAgain: boolean;
  interestedInFutureEvent: boolean;
  comments?: string;
  submittedAt: string;
};

export type Store = {
  events: PilotEvent[];
  signups: Signup[];
  groups: Group[];
  surveys: SurveyResponse[];
};
