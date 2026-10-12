"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { ComplaintRecord, VoterPageKey } from "@/types/voter";
import { getApiJson } from "@/lib/portalBackend";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { Field } from "@/components/voters/common/Field";
import { PageHeading } from "@/components/voters/common/PageHeading";

interface SubmitComplaintPageProps {
  onSubmit: (c: ComplaintRecord) => void;
  navigate: (p: VoterPageKey) => void;
}

export function SubmitComplaintPage({
  onSubmit,
  navigate,
}: SubmitComplaintPageProps) {
  const [values, setValues] = useState({
    category: "",
    subject: "",
    description: "",
    electionId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState("");
  const [elections, setElections] = useState<{ id: number; name: string }[]>([]);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void getApiJson<{ election_id: number; election_name: string }[]>("/api/elections")
      .then((records) => setElections(records.map((record) => ({
        id: record.election_id,
        name: record.election_name,
      }))))
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : "Unable to load elections.");
      });
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.category) next.category = "Select a complaint category.";
    if (values.subject.trim().length < 5)
      next.subject = "Enter a subject of at least 5 characters.";
    if (values.description.trim().length < 20)
      next.description =
        "Provide at least 20 characters so the issue is clear.";
    if (!values.electionId) next.electionId = "Select the related election.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const description = `Category: ${values.category}\nSubject: ${values.subject.trim()}\n\n${values.description.trim()}`;
    if (description.length > 1000) {
      setErrors({ description: "Shorten the subject or details to fit the 1000 character limit." });
      return;
    }

    setSubmitting(true);
    setLoadError("");
    try {
      const result = await getApiJson<{
        success: boolean;
        complaint: {
          complaint_id: number;
          election_id: number;
          description: string;
          status: string;
        };
      }>("/api/complaints", {
        method: "POST",
        body: JSON.stringify({
          electionId: Number(values.electionId),
          description,
        }),
      });
      const submittedAt = new Date().toLocaleDateString("en-GB");
      const reference = `CMP-${result.complaint.complaint_id}`;
      onSubmit({
        id: String(result.complaint.complaint_id),
        reference,
        voterId: "",
        subject: values.subject.trim(),
        category: values.category,
        date: submittedAt,
        status: "Submitted",
        electionId: String(result.complaint.election_id),
        description: values.description.trim(),
        history: [{ date: submittedAt, label: "Complaint submitted" }],
      });
      setDone(reference);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <main id="main-content" className="app-main">
        <div className="shell form-shell">
          <section className="panel success-state complaint-success">
            <span className="success-check">
              <Icon name="check" size={32} />
            </span>
            <span className="step-label">COMPLAINT SUBMITTED</span>
            <h1>Your complaint has been submitted</h1>
            <p>
              Your complaint was saved and is available in your account history.
            </p>
            <div className="receipt-card">
              <div>
                <small>Reference number</small>
                <code>{done}</code>
              </div>
              <div>
                <small>Status</small>
                <StatusBadge status="Submitted" />
              </div>
            </div>
            <div className="success-actions">
              <Button onClick={() => navigate("complaints")}>
                View my complaints
              </Button>
              <Button variant="secondary" onClick={() => navigate("dashboard")}>
                Return to dashboard
              </Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main id="main-content" className="app-main">
      <div className="shell form-shell">
        <PageHeading
          eyebrow="Complaints & grievances"
          title="Submit a complaint"
          description="Submit a complaint related to an election in your constituency."
        />
        {loadError && <div className="form-alert" role="alert">{loadError}</div>}
        <form className="panel complaint-form" onSubmit={submit}>
          <div className="form-section">
            <h2>Complaint details</h2>
            <p>Fields marked required must be completed. Complaints are linked to your voter account.</p>
          </div>
          <div className="form-grid">
            <Field label="Complaint category *" error={errors.category}>
              <select
                value={values.category}
                onChange={(e) =>
                  setValues({ ...values, category: e.target.value })
                }
              >
                <option value="">Select a category</option>
                <option>Voter details</option>
                <option>Election information</option>
                <option>Accessibility</option>
                <option>Portal issue</option>
                <option>Other</option>
              </select>
            </Field>
            <Field label="Related election *" error={errors.electionId}>
              <select
                value={values.electionId}
                onChange={(e) =>
                  setValues({ ...values, electionId: e.target.value })
                }
              >
                <option value="">Select an election</option>
                {elections.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <Field label="Subject *" error={errors.subject}>
            <input
              value={values.subject}
              onChange={(e) =>
                setValues({ ...values, subject: e.target.value })
              }
              placeholder="Briefly describe the issue"
            />
          </Field>
          <Field
            label="Detailed description *"
            error={errors.description}
            hint={`${values.description.length}/1000 characters`}
          >
            <textarea
              rows={7}
              maxLength={1000}
              value={values.description}
              onChange={(e) =>
                setValues({ ...values, description: e.target.value })
              }
              placeholder="Include enough detail to understand the issue."
            />
          </Field>
          <Field label="Attachment (optional)">
            <label className="upload-box">
              <Icon name="document" />
              <span>
                <strong>Attachment unavailable</strong>
                <small>Attachments are not currently supported.</small>
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled />
            </label>
          </Field>
          <div className="form-footer">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("complaints")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !elections.length}>
              {submitting ? "Submitting…" : "Submit complaint"}
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}
