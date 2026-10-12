"use client";

import React, { FormEvent, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

interface LoginProps {
  onLogin: () => void;
}

export function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email) {
      next.email = "Email address is required";
    } else if (!/^\S+@\S+\.\S+$/.test(email)) {
      next.email = "Enter a valid email address";
    }
    if (!password) {
      next.password = "Password is required";
    }

    setErrors(next);
    if (!Object.keys(next).length) {
      onLogin();
    }
  };

  return (
    <main className="login">
      <section className="login-panel">
        <div className="brand-mark" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="eyebrow">Election Management System</p>
        <h1>Administration Portal</h1>
        <p className="login-copy">
          Authorised administrative access for election management workflows.
        </p>
        <div className="demo-note">
          <Icon name="info" size={17} />
          <span>
            <strong>Prototype access</strong> — enter any valid email and
            password. No credentials are stored or transmitted.
          </span>
        </div>
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Email address</span>
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="administrator@example.in"
            />
            {errors.email && <small className="error">{errors.email}</small>}
          </label>
          <label className="field">
            <span>Password</span>
            <div className="password-wrap">
              <input
                type={show ? "text" : "password"}
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password && (
              <small className="error">{errors.password}</small>
            )}
          </label>
          <Button type="submit">Sign in to portal</Button>
        </form>
        <p className="legal">
          Demonstration system only. No connection to official electoral systems.
        </p>
      </section>
    </main>
  );
}
