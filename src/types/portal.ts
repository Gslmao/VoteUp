import { ReactNode } from "react";

export type ElectionStatus = "SCHEDULED" | "ONGOING" | "COMPLETED";
export type NominationStatus = "FILED" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type ComplaintStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export type Election = {
  id: string;
  name: string;
  type: string;
  start: string;
  end: string;
  status: ElectionStatus;
};

export type Constituency = {
  id: string;
  name: string;
  state: string;
  stateId?: number;
  voters: number;
};

export type Candidate = {
  id: string;
  name: string;
  dob: string;
  party: string;
  constituency: string;
  assets: number;
  status?: NominationStatus;
};

export type Nomination = {
  id: string;
  candidate: string;
  election: string;
  constituency: string;
  filed: string;
  status: NominationStatus;
};

export type Voter = {
  id: string;
  epic: string;
  name: string;
  constituency: string;
  dob: string;
  participation: "Recorded" | "Not recorded" | "Unavailable";
};

export type Complaint = {
  id: string;
  filed: string;
  constituency: string;
  election: string;
  description: string;
  status: ComplaintStatus;
};

export type Observer = {
  id: string;
  name: string;
  constituency: string;
  constituencyId?: number;
  election: string;
  electionId?: number;
};

export type Audit = {
  id: string;
  timestamp: string;
  entity: string;
  operation: string;
  reference: string;
  details: string;
};

export type Result = {
  id: string;
  election: string;
  constituency: string;
  candidate: string;
  party: string;
  votes: number;
  rank: number;
  declared: boolean;
  timestamp: string;
};

export type Party = {
  id: string;
  name: string;
  symbol: string;
  founded: string;
  type?: "National" | "State" | "Registered (Unrecognised)";
};

export type Store = {
  elections: Election[];
  constituencies: Constituency[];
  parties: Party[];
  candidates: Candidate[];
  nominations: Nomination[];
  complaints: Complaint[];
  observers: Observer[];
  audits: Audit[];
};

export type PageKey =
  | "overview"
  | "elections"
  | "constituencies"
  | "parties"
  | "candidates"
  | "nominations"
  | "voters"
  | "complaints"
  | "observers"
  | "results"
  | "audit";

export type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "date" | "number" | "select" | "textarea";
  required?: boolean;
  options?: (string | { label: string; value: string })[];
};

export type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
};

export type ToastState = {
  text: string;
  tone: "success" | "error";
};

export type NavItem = {
  key: PageKey;
  label: string;
  icon: string;
};

export type EntityPageProps = {
  store: Store;
  voters: Voter[];
  setVoters: React.Dispatch<React.SetStateAction<Voter[]>>;
  create: (key: keyof Store, item: never, detail: string) => void;
  update: (key: keyof Store, item: never, detail: string) => void;
  remove: (key: keyof Store, id: string, detail: string) => void;
  addAudit: (entity: string, operation: string, reference: string, details: string) => void;
  notify: (text: string, tone?: "success" | "error") => void;
  backendConnected: boolean;
};
