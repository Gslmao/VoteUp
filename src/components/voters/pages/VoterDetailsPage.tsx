"use client";

import React, { useState } from "react";
import { VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { VoterProfile } from "@/types/voter";

interface VoterDetailsPageProps {
  navigate: (p: VoterPageKey) => void;
  voter: VoterProfile | null;
}

export function VoterDetailsPage({ navigate, voter }: VoterDetailsPageProps) {
  const [correction, setCorrection] = useState(false);
  const maskedEpic = voter?.epic_number
    ? `${voter.epic_number.slice(0, 3)}••••${voter.epic_number.slice(-3)}`
    : "Unavailable";
  const details = [
    ["Full name", voter?.full_name ?? "—"],
    ["Masked voter ID", maskedEpic],
    ["Date of birth", voter?.dob ? formatDate(voter.dob) : "—"],
    ["State", voter?.state_name ?? "—"],
    ["Constituency", voter?.constituency_name ?? "—"],
    ["Eligibility status", "Eligibility checked when voting"],
  ];

  return (
    <main id="main-content" className="app-main">
      <div className="shell narrow">
        <PageHeading
          eyebrow="Voter services"
          title="My voter details"
          description="Review the registration information linked to your voter account."
          action={
            <Button variant="secondary" onClick={() => setCorrection(true)}>
              Request a correction
            </Button>
          }
        />
        <div className="read-only-note">
          <Icon name="info" />
          <div>
            <strong>Read-only demonstration record</strong>
            <span>
              Contact the appropriate election authority to request a change to your registered details.
            </span>
          </div>
        </div>

        <section className="panel details-panel">
          <div className="details-header">
            <span className="large-avatar">
              {voter?.full_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase() ?? "V"}
            </span>
            <div>
              <h2>{voter?.full_name ?? "Voter"}</h2>
              <p>Voter ID: {maskedEpic}</p>
            </div>
            <StatusBadge status="Active" />
          </div>
          <div className="detail-grid">
            {details.map(([label, value]) => (
              <div className="detail-item" key={label}>
                <small>{label}</small>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <div className="record-footer">
            <Icon name="check" />
            <div>
              <strong>Registration active</strong>
              <small>Record retrieved from the voter registry</small>
            </div>
          </div>
        </section>

        {correction && (
          <div
            className="modal-backdrop"
            role="presentation"
            onMouseDown={() => setCorrection(false)}
          >
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <button
                className="modal-close"
                onClick={() => setCorrection(false)}
                aria-label="Close modal"
              >
                <Icon name="close" />
              </button>
              <span className="modal-icon">
                <Icon name="document" />
              </span>
              <h2>Request a correction</h2>
              <p>
                Correction requests are represented as demo complaints and are
                not sent to an official register.
              </p>
              <div style={{ marginTop: "16px" }}>
                <Button onClick={() => navigate("submit-complaint")}>
                  Continue to complaint form
                </Button>
                <Button variant="text" onClick={() => setCorrection(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
