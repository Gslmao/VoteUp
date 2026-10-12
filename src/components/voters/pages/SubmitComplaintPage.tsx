"use client";

import React, { FormEvent, useState } from "react";
import { ComplaintRecord, VoterPageKey } from "@/types/voter";
import { elections } from "@/data/voterData";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { Field } from "@/components/voters/common/Field";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!values.category) next.category = "Select a complaint category.";
    if (values.subject.trim().length < 5)
      next.subject = "Enter a subject of at least 5 characters.";
    if (values.description.trim().length < 20)
      next.description =
        "Provide at least 20 characters so the issue is clear.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const ref = `DEMO-GRV-${Math.floor(10000 + Math.random() * 89999)}`;
    onSubmit({
      id: `cmp-${Date.now()}`,
      reference: ref,
      voterId: "v1",
      subject: values.subject,
      category: values.category,
      date: "18/09/2025",
      status: "Submitted",
      electionId: values.electionId,
      description: values.description,
      history: [{ date: "18/09/2025", label: "Demo complaint submitted" }],
    });
    setDone(ref);
  };

  if (done) {
    return (
      <main id="main-content" className="app-main">
        <div className="shell form-shell">
          <section className="panel success-state complaint-success">
            <span className="success-check">
              <Icon name="check" size={32} />
            </span>
            <span className="step-label">DEMO COMPLAINT CREATED</span>
            <h1>Your demonstration complaint is ready</h1>
            <p>
              No complaint was filed with a government authority. This record
              exists only in this prototype session.
            </p>
            <div className="receipt-card">
              <div>
                <small>Demo reference number</small>
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
          description="Create a fictional service complaint for demonstration and tracking."
        />
        <DemoNotice compact />
        <form className="panel complaint-form" onSubmit={submit}>
          <div className="form-section">
            <h2>Complaint details</h2>
            <p>Fields marked required must be completed.</p>
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
            <Field label="Related election (optional)">
              <select
                value={values.electionId}
                onChange={(e) =>
                  setValues({ ...values, electionId: e.target.value })
                }
              >
                <option value="">Not related to an election</option>
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
              placeholder="Include enough detail to understand the issue. Do not include real personal information."
            />
          </Field>
          <Field label="Attachment (optional)">
            <label className="upload-box">
              <Icon name="document" />
              <span>
                <strong>Choose a demonstration file</strong>
                <small>Mock interaction only · PDF, JPG or PNG</small>
              </span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" />
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
            <Button type="submit">Submit demo complaint</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
