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
  /** Off until an admin enables them. Nothing sends without an email provider. */
  emailSignupConfirmation: boolean;
  emailAttendanceAsk: boolean;
  emailAttendanceNudge: boolean;
  emailGroupReminder: boolean;
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
  /** Attendee choice from the secure link. Separate from the admin status. */
  attendanceReply?: "coming" | "declined";
  attendanceToken?: string;
  /** Crew they left when they declined. The active crew is groupId. */
  previousGroupId?: string;
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

export type CommunicationStatus = "queued" | "sent" | "failed";

export type CommunicationKind =
  | "signup_confirmation"
  | "attendance_ask"
  | "attendance_nudge"
  | "group_reminder"
  | "crew_introduction";

export type Communication = {
  id: string;
  eventId: string;
  signupId?: string;
  groupId?: string;
  kind: CommunicationKind;
  recipientEmail: string;
  subject: string;
  body: string;
  status: CommunicationStatus;
  failureReason?: string;
  createdAt: string;
  sentAt?: string;
};

export type Store = {
  events: PilotEvent[];
  signups: Signup[];
  groups: Group[];
  surveys: SurveyResponse[];
};
