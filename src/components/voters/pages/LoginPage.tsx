"use client";

import React, { FormEvent, useState } from "react";
import { VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/voters/common/Field";
import { getApiJson } from "@/lib/portalBackend";

interface LoginPageProps {
  onLogin: () => void;
  navigate: (p: VoterPageKey) => void;
}

export function LoginPage({ onLogin, navigate }: LoginPageProps) {
  const [epicNumber, setEpicNumber] = useState("");
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!epicNumber.trim() || !dob) {
      return setError("Enter your EPIC number and date of birth.");
    }
    setLoading(true);
    try {
      await getApiJson<{ success: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ epicNumber: epicNumber.trim(), dob }),
      });
      onLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main-content" className="login-page">
      <div className="shell login-shell">
        <div className="login-aside">
          <span className="eyebrow">Voter account access</span>
          <h1>Sign in to voter services</h1>
          <p>
          Access your voter registration details, election information,
          participation history and complaints.
          </p>
          <div className="privacy-points">
            <div>
              <Icon name="check" />
              <span>
                <strong>Use your registered voter credentials</strong>
                <small>Your EPIC number and date of birth are verified by the voter registry.</small>
              </span>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <strong>Secure session</strong>
                <small>Your session is held in an HttpOnly cookie.</small>
              </span>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <strong>Privacy by design</strong>
                <small>Your ballot choice is not included in participation history.</small>
              </span>
            </div>
          </div>
        </div>

        <div className="login-card">
          <button className="back-link" onClick={() => navigate("home")}>
            ← Return to public home
          </button>
          <h2>Voter account sign in</h2>
          <p>Sign in with the EPIC number and date of birth on your voter record.</p>
          {error && (
            <div className="form-alert">
              <Icon name="info" size={18} />
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <Field label="EPIC number">
              <input
                value={epicNumber}
                onChange={(e) => setEpicNumber(e.target.value)}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Date of birth">
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                autoComplete="bday"
                required
              />
            </Field>
            <Button type="submit" className="full-btn" disabled={loading} icon={!loading ? "arrow" : undefined}>
              {loading ? "Signing in…" : "Sign in to portal"}
            </Button>
          </form>
          <p className="credentials">Use test voter records configured in the connected database.</p>
        </div>
      </div>
    </main>
  );
}
