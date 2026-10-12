"use client";

import React from "react";
import { VoterIconName, VoterPageKey } from "@/types/voter";
import { announcements, elections } from "@/data/voterData";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { StatusBadge } from "@/components/voters/common/StatusBadge";
import { DemoNotice } from "@/components/voters/layout/DemoNotice";

interface HomePageProps {
  navigate: (p: VoterPageKey) => void;
}

export function HomePage({ navigate }: HomePageProps) {
  return (
    <main id="main-content">
      <section className="service-hero">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">Citizen election services</div>
            <h1>
              Your Vote. <span>Your Voice.</span>
            </h1>
            <p>
              Access clear election information, review your voter details, explore
              eligible candidates and use citizen support services in one place.
            </p>
            <div className="hero-actions">
              <Button onClick={() => navigate("login")} icon="arrow">
                Sign in to voter services
              </Button>
              <Button onClick={() => navigate("elections")} variant="secondary">
                View elections
              </Button>
              <Button onClick={() => navigate("candidates")} variant="text">
                Explore candidates
              </Button>
            </div>
            <DemoNotice />
          </div>

          <div className="election-focus">
            <div className="focus-top">
              <span className="live-dot" /> ONGOING ELECTION
            </div>
            <h2>Madhya Pradesh Legislative Assembly By-election</h2>
            <div className="focus-detail">
              <Icon name="location" size={18} />
              <span>
                <small>Constituency</small>Narmada Central
              </span>
            </div>
            <div className="focus-detail">
              <Icon name="calendar" size={18} />
              <span>
                <small>Polling period</small>15/09/2025 — 18/09/2025
              </span>
            </div>
            <Button
              onClick={() => navigate("elections")}
              variant="secondary"
              icon="arrow"
            >
              View election details
            </Button>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="section-title">
          <div>
            <span className="eyebrow">Start here</span>
            <h2>Essential voter services</h2>
          </div>
          <p>Quick access to commonly used services and information.</p>
        </div>
        <div className="service-grid">
          {[
            [
              "document",
              "View voter details",
              "Check your registration information and eligibility status.",
              "voter-details",
            ],
            [
              "calendar",
              "Find elections",
              "See upcoming, ongoing and completed elections.",
              "elections",
            ],
            [
              "users",
              "Explore candidates",
              "Review fictional profiles for accepted candidates.",
              "candidates",
            ],
            [
              "complaint",
              "Complaints & grievances",
              "Submit and track a demo service request.",
              "complaints",
            ],
          ].map(([icon, title, text, page]) => (
            <button
              className="service-card"
              key={title}
              onClick={() => navigate(page as VoterPageKey)}
            >
              <span className="service-icon">
                <Icon name={icon as VoterIconName} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
                <b>
                  Open service <Icon name="arrow" size={15} />
                </b>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="section alt-section">
        <div className="shell two-column">
          <div>
            <div className="section-title">
              <div>
                <span className="eyebrow">Election calendar</span>
                <h2>Upcoming and ongoing</h2>
              </div>
              <button
                className="text-link"
                onClick={() => navigate("elections")}
              >
                View all elections <Icon name="arrow" size={16} />
              </button>
            </div>
            <div className="compact-list">
              {elections.slice(0, 3).map((e) => (
                <button
                  key={e.id}
                  className="compact-election"
                  onClick={() => navigate("elections")}
                >
                  <span className="date-block">
                    <b>{e.pollingDate.slice(0, 2)}</b>
                    <small>
                      {e.pollingDate.slice(3, 5) === "09"
                        ? "SEP"
                        : e.pollingDate.slice(3, 5) === "12"
                        ? "DEC"
                        : "JUN"}
                    </small>
                  </span>
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {e.constituency} · {e.type}
                    </small>
                  </span>
                  <StatusBadge status={e.status} />
                  <Icon name="chevron" size={18} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="section-title">
              <div>
                <span className="eyebrow">Latest updates</span>
                <h2>Announcements</h2>
              </div>
            </div>
            <div className="announcements">
              {announcements.map((a) => (
                <div className="announcement" key={a.id}>
                  <span>{a.date}</span>
                  <div>
                    <small>{a.tag}</small>
                    <strong>{a.title}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
