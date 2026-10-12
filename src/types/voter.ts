export type VoterPageKey =
  | "home"
  | "login"
  | "dashboard"
  | "voter-details"
  | "elections"
  | "candidates"
  | "vote"
  | "history"
  | "complaints"
  | "submit-complaint"
  | "help"
  | "settings";

export type VoterIconName =
  | "home"
  | "calendar"
  | "users"
  | "vote"
  | "history"
  | "complaint"
  | "help"
  | "profile"
  | "bell"
  | "menu"
  | "close"
  | "arrow"
  | "check"
  | "search"
  | "eye"
  | "info"
  | "document"
  | "location"
  | "chevron"
  | "logout"
  | "settings";

export type ElectionStatus = "Upcoming" | "Ongoing" | "Completed";
export type ComplaintStatus = "Submitted" | "Under Review" | "Resolved" | "Rejected";

export interface VoterRecord {
  id: string;
  name: string;
  voterId: string;
  maskedId: string;
  state: string;
  constituency: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  status: "Active" | "Inactive";
  email: string;
}

export interface PartyRecord {
  id: string;
  name: string;
  symbol: string;
}

export interface CandidateRecord {
  id: string;
  name: string;
  partyId: string;
  constituency: string;
  profile: string;
  age: number;
  profession: string;
  nomination: "Accepted" | "Pending" | "Rejected";
  electionId: string;
}

export interface ElectionRecord {
  id: string;
  name: string;
  type: string;
  state: string;
  constituency: string;
  startDate: string;
  endDate: string;
  pollingDate: string;
  status: ElectionStatus;
  description: string;
}

export interface ComplaintHistoryItem {
  date: string;
  label: string;
}

export interface ComplaintRecord {
  id: string;
  reference: string;
  voterId: string;
  subject: string;
  category: string;
  date: string;
  status: ComplaintStatus;
  electionId?: string;
  description: string;
  history: ComplaintHistoryItem[];
}

export interface AnnouncementRecord {
  id: string;
  date: string;
  title: string;
  tag: string;
}

export interface ParticipationRecord {
  id: string;
  voterId: string;
  electionName: string;
  date: string;
  constituency: string;
  status: "Participated" | "Not voted";
  receipt: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}
