"use client";

import React, { FormEvent, useState } from "react";
import { VoterPageKey } from "@/types/voter";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Field } from "@/components/voters/common/Field";

interface LoginPageProps {
  onLogin: () => void;
  navigate: (p: VoterPageKey) => void;
}

export function LoginPage({ onLogin, navigate }: LoginPageProps) {
  const [identifier, setIdentifier] = useState("aarav@example.demo");
  const [password, setPassword] = useState("Demo@123");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier || !password) {
      return setError("Enter both your email or voter ID and password.");
    }
    if (
      !["aarav@example.demo", "DVP0004821"].includes(identifier) ||
      password !== "Demo@123"
    ) {
      return setError("Those details do not match the demo account below.");
    }
    setLoading(true);
    setTimeout(onLogin, 650);
  };

  return (
    <main id="main-content" className="login-page">
      <div className="shell login-shell">
        <div className="login-aside">
          <span className="eyebrow">Secure demo access</span>
          <h1>Sign in to voter services</h1>
          <p>
            Access your fictional voter record, eligible election, complaint
            tracking and local demonstration history.
          </p>
          <div className="privacy-points">
            <div>
              <Icon name="check" />
              <span>
                <strong>Demo credentials only</strong>
                <small>Do not enter any real voter credentials.</small>
              </span>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <strong>No real authentication</strong>
                <small>Nothing is sent to an election authority.</small>
              </span>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <strong>Minimal local storage</strong>
                <small>Passwords are never stored by this prototype.</small>
              </span>
            </div>
          </div>
        </div>

        <div className="login-card">
          <button className="back-link" onClick={() => navigate("home")}>
            ← Return to public home
          </button>
          <h2>Voter account sign in</h2>
          <p>Use the demonstration account shown below.</p>
          {error && (
            <div className="form-alert">
              <Icon name="info" size={18} />
              {error}
            </div>
          )}
          <form onSubmit={submit}>
            <Field label="Email address or voter ID">
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <div className="password-wrap">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  <Icon name="eye" />
                </button>
              </div>
            </Field>
            <div className="form-options">
              <label className="check-label">
                <input type="checkbox" /> Remember this demo account
              </label>
              <button
                type="button"
                className="text-link"
                onClick={() =>
                  setError(
                    "Password reset is disabled in this offline demonstration. Use the credentials shown below."
                  )
                }
              >
                Forgot password?
              </button>
            </div>
            <Button type="submit" className="full-btn" disabled={loading} icon={!loading ? "arrow" : undefined}>
              {loading ? "Signing in…" : "Sign in to portal"}
            </Button>
          </form>
          <div className="credentials">
            <strong>Demo credentials</strong>
            <code>Email: aarav@example.demo</code>
            <code>Password: Demo@123</code>
          </div>
        </div>
      </div>
    </main>
  );
}
