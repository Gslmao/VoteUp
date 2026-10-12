"use client";

import React, { useState } from "react";
import { VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";

interface VoterDetailsPageProps {
  navigate: (p: VoterPageKey) => void;
}

export function VoterDetailsPage({ navigate }: VoterDetailsPageProps) {
  const [correction, setCorrection] = useState(false);

  return (
    <main id="main-content" className="app-main">
      <div className="shell narrow">
        <PageHeading
          eyebrow="Voter services"
          title="My voter details"
          description="Review the fictional registration information linked to this demo account."
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
              Changes cannot be submitted to a government system from this
              prototype.
            </span>
          </div>
        </div>

        <section className="panel details-panel">
          <div className="details-header">
            <span className="large-avatar">AM</span>
            <div>
              <h2>Aarav Mehta</h2>
              <p>Voter ID: DVP••••821</p>
            </div>
            <StatusBadge status="Active" />
          </div>
          <div className="detail-grid">
            {[
              ["Full name", "Aarav Mehta"],
              ["Masked voter ID", "DVP••••821"],
              ["Date of birth", "14/08/1997"],
              ["Gender", "Male"],
              ["State", "Madhya Pradesh"],
              ["Constituency", "Narmada Central"],
              ["Registered address", "Ward 12, Narmada Central, Madhya Pradesh"],
              ["Eligibility status", "Eligible for ongoing election"],
            ].map(([label, value]) => (
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
              <small>Fictional record last reviewed on 01/09/2025</small>
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
