import React from "react";

interface BadgeProps {
  value: string;
}

export function Badge({ value }: BadgeProps) {
  const tone = [
    "ONGOING",
    "ACCEPTED",
    "RESOLVED",
    "Recorded",
    "COMPLETED",
  ].includes(value)
    ? "green"
    : ["OPEN", "FILED", "SCHEDULED", "Not recorded"].includes(value)
    ? "amber"
    : ["REJECTED", "DISMISSED"].includes(value)
    ? "red"
    : "blue";

  return (
    <span className={`badge badge-${tone}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}
