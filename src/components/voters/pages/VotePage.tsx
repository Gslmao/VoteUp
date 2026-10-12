"use client";

import React, { useState } from "react";
import { VoterPageKey } from "@/types/voter";
import { candidates, parties } from "@/data/voterData";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";

interface VotePageProps {
  voted: boolean;
  onVote: (receipt: string) => void;
  navigate: (p: VoterPageKey) => void;
}

export function VotePage({ voted, onVote, navigate }: VotePageProps) {
  const [step, setStep] = useState(voted ? 6 : 1);
  const [candidateId, setCandidateId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(
    typeof window !== "undefined"
      ? localStorage.getItem("esp-demo-receipt") || ""
      : ""
  );

  const eligible = candidates.filter(
    (c) => c.electionId === "e1" && c.nomination === "Accepted"
  );
  const chosen = candidates.find((c) => c.id === candidateId);

  const finish = () => {
    setSubmitting(true);
    setTimeout(() => {
      const r = `DEMO-RCPT-${Math.floor(100000 + Math.random() * 900000)}`;
      setReceipt(r);
      onVote(r);
      setSubmitting(false);
      setStep(6);
    }, 800);
  };

  if (voted && step !== 6) setStep(6);

  return (
    <main id="main-content" className="app-main">
      <div className="shell vote-shell">
        <PageHeading
          eyebrow="Simulated voting"
          title="Cast vote demonstration"
          description="A guided prototype flow for an eligible, ongoing fictional election."
        />
        <DemoNotice />

        <ol className="stepper">
          {["Election", "Candidate", "Review", "Confirm", "Receipt"].map(
            (label, i) => (
              <li
                className={
                  step > i + 1 ? "done" : step === i + 1 ? "active" : ""
                }
                key={label}
              >
                <span>
                  {step > i + 1 ? <Icon name="check" size={15} /> : i + 1}
                </span>
                <small>{label}</small>
              </li>
            )
          )}
        </ol>

        <section className="vote-panel">
          {step === 1 && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 1 of 5</span>
                <h2>Confirm your eligible election</h2>
                <p>
                  Check that the election and constituency shown below match
                  your mock voter record.
                </p>
              </div>
              <div className="selection-summary">
                <div className="summary-mark">
                  <Icon name="calendar" size={24} />
                </div>
                <div>
                  <StatusBadge status="Ongoing" />
                  <h3>Madhya Pradesh Legislative Assembly By-election</h3>
                  <p>
                    <Icon name="location" size={16} /> Narmada Central · Madhya
                    Pradesh
                  </p>
                </div>
                <div className="eligibility-check">
                  <Icon name="check" />
                  <span>
                    <small>Mock eligibility</small>
                    <strong>Confirmed</strong>
                  </span>
                </div>
              </div>
              <div className="vote-actions">
                <span />
                <Button onClick={() => setStep(2)} icon="arrow">
                  Continue to candidates
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 2 of 5</span>
                <h2>Select one candidate</h2>
                <p>
                  Every accepted candidate is shown with equal prominence. Choose
                  one option to continue.
                </p>
              </div>
              <div className="ballot-list">
                {eligible.map((c) => {
                  const p = parties.find((x) => x.id === c.partyId)!;
                  return (
                    <label
                      className={`ballot-row ${
                        candidateId === c.id ? "selected" : ""
                      }`}
                      key={c.id}
                    >
                      <input
                        type="radio"
                        name="candidate"
                        checked={candidateId === c.id}
                        onChange={() => setCandidateId(c.id)}
                      />
                      <span className="radio-ui" />
                      <span className="symbol">{p.symbol.slice(0, 1)}</span>
                      <span>
                        <strong>{c.name}</strong>
                        <small>{p.name}</small>
                      </span>
                      <span className="ballot-constituency">
                        {c.constituency}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="neutral-note">
                <Icon name="info" size={18} /> Candidate ordering is alphabetical
                and does not indicate preference or endorsement.
              </div>
              <div className="vote-actions">
                <Button variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  disabled={!candidateId}
                  onClick={() => setStep(3)}
                  icon="arrow"
                >
                  Review selection
                </Button>
              </div>
            </>
          )}

          {step === 3 && chosen && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 3 of 5</span>
                <h2>Review your selection</h2>
                <p>Confirm the election and fictional candidate before proceeding.</p>
              </div>
              <div className="review-block">
                <div>
                  <small>Election</small>
                  <strong>
                    Madhya Pradesh Legislative Assembly By-election
                  </strong>
                  <span>Narmada Central</span>
                </div>
                <div>
                  <small>Selected candidate</small>
                  <strong>{chosen.name}</strong>
                  <span>
                    {parties.find((p) => p.id === chosen.partyId)?.name}
                  </span>
                </div>
              </div>
              <div className="vote-actions">
                <Button variant="secondary" onClick={() => setStep(2)}>
                  Change selection
                </Button>
                <Button onClick={() => setStep(4)} icon="arrow">
                  Continue
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 4 of 5</span>
                <h2>Final demonstration confirmation</h2>
                <p>
                  Read and acknowledge the notice below before creating a local
                  demo record.
                </p>
              </div>
              <div className="warning-box">
                <Icon name="info" size={26} />
                <div>
                  <strong>This is a simulated voting demonstration.</strong>
                  <p>No real vote will be cast or transmitted.</p>
                </div>
              </div>
              <label className={`ack-box ${acknowledged ? "checked" : ""}`}>
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                />
                <span>
                  <strong>I understand this is only a demonstration</strong>
                  <small>
                    The prototype will save only a local participation record
                    and DEMO receipt.
                  </small>
                </span>
              </label>
              <div className="vote-actions">
                <Button variant="secondary" onClick={() => setStep(3)}>
                  Back to review
                </Button>
                <Button
                  disabled={!acknowledged || submitting}
                  onClick={finish}
                >
                  {submitting ? "Recording locally…" : "Record simulated vote"}
                </Button>
              </div>
            </>
          )}

          {step === 6 && (
            <div className="success-state">
              <span className="success-check">
                <Icon name="check" size={32} />
              </span>
              <span className="step-label">DEMONSTRATION COMPLETE</span>
              <h2>Simulated participation recorded locally</h2>
              <p>
                No vote was transmitted to an election authority and nothing has
                been officially counted.
              </p>
              <div className="receipt-card">
                <div>
                  <small>Election</small>
                  <strong>
                    Madhya Pradesh Legislative Assembly By-election
                  </strong>
                </div>
                <div>
                  <small>Recorded</small>
                  <strong>18/09/2025, 10:42 IST</strong>
                </div>
                <div>
                  <small>Demo receipt identifier</small>
                  <code>{receipt || "DEMO-RCPT-RECORDED"}</code>
                </div>
              </div>
              <div className="success-actions">
                <Button onClick={() => navigate("history")}>
                  View voting history
                </Button>
                <Button variant="secondary" onClick={() => navigate("dashboard")}>
                  Return to dashboard
                </Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
