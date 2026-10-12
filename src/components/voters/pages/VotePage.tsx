"use client";

import React, { useEffect, useState } from "react";
import { CandidateRecord, PartyRecord, VoterPageKey } from "@/types/voter";
import { getApiJson } from "@/lib/portalBackend";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { Field } from "@/components/voters/common/Field";

interface VotePageProps {
  navigate: (p: VoterPageKey) => void;
}

interface ApiCandidate {
  candidate_id: number;
  full_name: string;
  dob: string;
  party_id: number | null;
  party_name: string | null;
  constituency_id: number;
}

interface ApiElection {
  election_id: number;
  election_name: string;
  election_type: string | null;
  start_date: string;
  end_date: string;
}

export function VotePage({ navigate }: VotePageProps) {
  const [step, setStep] = useState(1);
  const [candidateId, setCandidateId] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [election, setElection] = useState<ApiElection | null>(null);
  const [ongoingElections, setOngoingElections] = useState<ApiElection[]>([]);
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [parties, setParties] = useState<PartyRecord[]>([]);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [constituencyId, setConstituencyId] = useState<number | null>(null);
  const [constituencyNames, setConstituencyNames] = useState<Map<number, string>>(new Map());
  const [participatedElectionIds, setParticipatedElectionIds] = useState<number[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBallot() {
      try {
        const [elections, session, partyRows] = await Promise.all([
          getApiJson<ApiElection[]>("/api/elections?status=ONGOING"),
          getApiJson<{
            profile: { constituency_id: number };
            history: { election_id: number }[];
          }>("/api/voter/me"),
          getApiJson<{
            party_id: number;
            party_name: string;
            symbol: string | null;
          }[]>("/api/parties"),
        ]);
        const activeElection = elections[0];
        if (!activeElection) {
          if (!cancelled) setElection(null);
          return;
        }
        const [candidateRows, constituencies] = await Promise.all([
          getApiJson<ApiCandidate[]>(
            `/api/voter/candidates?electionId=${activeElection.election_id}&constituencyId=${session.profile.constituency_id}`
          ),
          getApiJson<{ constituency_id: number; name: string }[]>("/api/constituencies"),
        ]);
        if (cancelled) return;

        const constituencyNames = new Map(
          constituencies.map((row) => [row.constituency_id, row.name])
        );
        setOngoingElections(elections);
        setConstituencyId(session.profile.constituency_id);
        setConstituencyNames(constituencyNames);
        setParticipatedElectionIds(session.history.map((row) => row.election_id));
        setElection(activeElection);
        setAlreadyVoted(
          session.history.some((row) => row.election_id === activeElection.election_id)
        );
        setParties(
          partyRows.map((row) => ({
            id: String(row.party_id),
            name: row.party_name,
            symbol: row.symbol ?? "•",
          }))
        );
        setCandidates(mapCandidates(candidateRows, activeElection, constituencyNames));
        setLoadError("");
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load the ballot.");
        }
      }
    }

    void loadBallot();
    return () => {
      cancelled = true;
    };
  }, []);

  async function selectElection(electionId: number) {
    const selected = ongoingElections.find((record) => record.election_id === electionId);
    if (!selected || constituencyId === null) return;
    setElection(selected);
    setCandidateId("");
    setAlreadyVoted(participatedElectionIds.includes(selected.election_id));
    setCandidates([]);
    setLoadError("");
    try {
      const rows = await getApiJson<ApiCandidate[]>(
        `/api/voter/candidates?electionId=${selected.election_id}&constituencyId=${constituencyId}`
      );
      setCandidates(mapCandidates(rows, selected, constituencyNames));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load candidates.");
    }
  }

  const chosen = candidates.find((candidate) => candidate.id === candidateId);
  const partyFor = (partyId: string) =>
    parties.find((party) => party.id === partyId)?.name ?? "Independent";

  async function finish() {
    if (!election || !candidateId) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      await getApiJson<{ success: boolean }>("/api/vote", {
        method: "POST",
        body: JSON.stringify({
          electionId: election.election_id,
          candidateId: Number(candidateId),
        }),
      });
      setAlreadyVoted(true);
      setStep(6);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Unable to cast your vote.");
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadyVoted && step !== 6 && ongoingElections.length <= 1) {
    return (
      <main id="main-content" className="app-main">
        <div className="shell vote-shell">
          <PageHeading
            eyebrow="Participation"
            title="Your participation is recorded"
            description="The ballot is anonymous. Your participation record does not include your candidate selection."
          />
          <div className="panel success-state">
            <span className="success-check"><Icon name="check" size={32} /></span>
            <h2>Vote already recorded for this election</h2>
            <p>One vote per voter per election is enforced by the database.</p>
            <Button onClick={() => navigate("history")}>View participation history</Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="app-main">
      <div className="shell vote-shell">
        <PageHeading
          eyebrow="Secure voting"
          title="Cast your vote"
          description="Review the active election and eligible candidates before confirming your ballot."
        />
        {loadError && <div className="form-alert" role="alert">{loadError}</div>}

        <ol className="stepper">
          {["Election", "Candidate", "Review", "Confirm", "Complete"].map((label, i) => (
            <li className={step > i + 1 ? "done" : step === i + 1 ? "active" : ""} key={label}>
              <span>{step > i + 1 ? <Icon name="check" size={15} /> : i + 1}</span>
              <small>{label}</small>
            </li>
          ))}
        </ol>

        <section className="vote-panel">
          {step === 1 && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 1 of 5</span>
                <h2>Confirm your election</h2>
                <p>Your voter constituency and the accepted nominations determine which candidates are available.</p>
              </div>
              {ongoingElections.length > 1 && (
                <Field label="Election">
                  <select
                    value={election?.election_id ?? ""}
                    onChange={(event) => void selectElection(Number(event.target.value))}
                  >
                    {ongoingElections.map((record) => (
                      <option key={record.election_id} value={record.election_id}>
                        {record.election_name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {alreadyVoted && (
                <div className="form-alert" role="status">
                  Your participation in this election is already recorded. Select a different ongoing election if eligible.
                </div>
              )}
              {election ? (
                <div className="selection-summary">
                  <div className="summary-mark"><Icon name="calendar" size={24} /></div>
                  <div>
                    <StatusBadge status="Ongoing" />
                    <h3>{election.election_name}</h3>
                    <p>{election.election_type ?? "Election"} · {formatDate(election.start_date)} – {formatDate(election.end_date)}</p>
                  </div>
                  <div className="eligibility-check">
                    <Icon name="check" />
                    <span><small>Eligibility</small><strong>Verified against voter record</strong></span>
                  </div>
                </div>
              ) : (
                <p className="form-alert" role="status">There is no ongoing election available for voting.</p>
              )}
              <div className="vote-actions">
                <span />
                <Button onClick={() => setStep(2)} disabled={!election || !candidates.length || alreadyVoted || !!loadError} icon="arrow">
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
                <p>Each accepted candidate is shown with equal prominence.</p>
              </div>
              <div className="ballot-list">
                {candidates.map((candidate) => (
                  <label className={`ballot-row ${candidateId === candidate.id ? "selected" : ""}`} key={candidate.id}>
                    <input
                      type="radio"
                      name="candidate"
                      checked={candidateId === candidate.id}
                      onChange={() => setCandidateId(candidate.id)}
                    />
                    <span className="radio-ui" />
                    <span className="symbol">
                      {parties.find((party) => party.id === candidate.partyId)?.symbol.slice(0, 1) ?? "•"}
                    </span>
                    <span><strong>{candidate.name}</strong><small>{partyFor(candidate.partyId)}</small></span>
                    <span className="ballot-constituency">{candidate.constituency}</span>
                  </label>
                ))}
              </div>
              {!candidates.length && <p className="form-alert" role="status">No accepted candidates are registered for this election and constituency.</p>}
              <div className="neutral-note">
                <Icon name="info" size={18} /> Candidate ordering is alphabetical and does not indicate preference.
              </div>
              <div className="vote-actions">
                <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
                <Button disabled={!candidateId} onClick={() => setStep(3)} icon="arrow">Review selection</Button>
              </div>
            </>
          )}

          {step === 3 && chosen && election && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 3 of 5</span>
                <h2>Review your ballot</h2>
                <p>Your selection is private and will not appear in participation history.</p>
              </div>
              <div className="review-block">
                <div><small>Election</small><strong>{election.election_name}</strong><span>{formatDate(election.start_date)}</span></div>
                <div><small>Selected candidate</small><strong>{chosen.name}</strong><span>{partyFor(chosen.partyId)}</span></div>
              </div>
              <div className="vote-actions">
                <Button variant="secondary" onClick={() => setStep(2)}>Change selection</Button>
                <Button onClick={() => setStep(4)} icon="arrow">Continue</Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="vote-title">
                <span className="step-label">Step 4 of 5</span>
                <h2>Confirm and cast your vote</h2>
                <p>Your ballot is submitted securely and recorded without linking your choice to your voter identity.</p>
              </div>
              <div className="warning-box">
                <Icon name="info" size={26} />
                <div><strong>This action cannot be undone.</strong><p>The database prevents a second vote in the same election.</p></div>
              </div>
              <label className={`ack-box ${acknowledged ? "checked" : ""}`}>
                <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
                <span><strong>I have reviewed my selection</strong><small>I understand that a submitted vote cannot be changed.</small></span>
              </label>
              {submitError && <div className="form-alert" role="alert">{submitError}</div>}
              <div className="vote-actions">
                <Button variant="secondary" onClick={() => setStep(3)}>Back to review</Button>
                <Button disabled={!acknowledged || submitting} onClick={() => void finish()}>
                  {submitting ? "Submitting vote…" : "Cast vote"}
                </Button>
              </div>
            </>
          )}

          {step === 6 && (
            <div className="success-state">
              <span className="success-check"><Icon name="check" size={32} /></span>
              <span className="step-label">VOTE RECORDED</span>
              <h2>Your participation has been recorded</h2>
              <p>Your candidate selection remains private and is not included in your participation history.</p>
              <div className="success-actions">
                <Button onClick={() => navigate("history")}>View participation history</Button>
                <Button variant="secondary" onClick={() => navigate("dashboard")}>Return to dashboard</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function calculateAge(dob: string) {
  const birthDate = new Date(`${dob.slice(0, 10)}T00:00:00`);
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  if (
    now.getMonth() < birthDate.getMonth() ||
    (now.getMonth() === birthDate.getMonth() && now.getDate() < birthDate.getDate())
  ) age -= 1;
  return age;
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function mapCandidates(
  rows: ApiCandidate[],
  election: ApiElection,
  constituencyNames: Map<number, string>
): CandidateRecord[] {
  return rows
    .map((row) => ({
      id: String(row.candidate_id),
      name: row.full_name,
      partyId: String(row.party_id ?? ""),
      constituency: constituencyNames.get(row.constituency_id) ?? "Your constituency",
      profile: "Candidate with an accepted nomination for this election.",
      age: calculateAge(row.dob),
      profession: "Not provided",
      nomination: "Accepted" as const,
      electionId: String(election.election_id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
