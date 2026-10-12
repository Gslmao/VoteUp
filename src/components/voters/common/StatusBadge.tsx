import React from "react";
import { ComplaintStatus, ElectionStatus } from "@/types/voter";

export type StatusValue =
  | ElectionStatus
  | ComplaintStatus
  | "Active"
  | "Inactive"
  | "Eligible"
  | "Participated"
  | "Not voted"
  | "Demo vote recorded";

export function StatusBadge({ status }: { status: StatusValue }) {
  const tone = [
    "Ongoing",
    "Active",
    "Eligible",
    "Resolved",
    "Participated",
    "Demo vote recorded",
  ].includes(status)
    ? "success"
    : ["Upcoming", "Submitted"].includes(status)
    ? "blue"
    : ["Under Review", "Not voted"].includes(status)
    ? "warning"
    : ["Rejected"].includes(status)
    ? "danger"
    : "neutral";

  return (
    <span className={`status status-${tone}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}
