"use client";

import React, { useState } from "react";
import { faqs } from "@/data/voterData";
import { Icon } from "@/components/ui/Icon";
import { PageHeading } from "@/components/voters/common/PageHeading";
import { EmptyState } from "@/components/voters/common/EmptyState";

export function HelpPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  const shown = faqs.filter((f) =>
    `${f.question} ${f.answer}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main id="main-content" className="app-main">
      <div className="shell help-shell">
        <PageHeading
          eyebrow="Help centre"
          title="Help and frequently asked questions"
          description="Find guidance for voter details, elections, candidates, voting and complaints."
        />

        <div className="help-search">
          <Icon name="search" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search help topics"
            aria-label="Search help topics"
          />
        </div>

        <div className="help-grid">
          <section>
            <h2>Frequently asked questions</h2>
            <div className="faq-list">
              {shown.map((faq, i) => (
                <div
                  className={`faq ${open === i ? "open" : ""}`}
                  key={faq.question}
                >
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    aria-expanded={open === i}
                  >
                    <span>{faq.question}</span>
                    <span>{open === i ? "−" : "+"}</span>
                  </button>
                  {open === i && <p>{faq.answer}</p>}
                </div>
              ))}
            </div>
            {!shown.length && (
              <EmptyState
                icon="search"
                title="No help topics found"
                text="Try a shorter or different search term."
              />
            )}
          </section>

          <aside className="help-aside">
            <div className="help-box">
              <span className="service-icon">
                <Icon name="help" />
              </span>
              <h2>Need more help?</h2>
              <p>This prototype does not provide official support contact details. For authoritative assistance, contact the relevant election authority.</p>
            </div>

            <div className="help-box">
              <h3>Accessibility guidance</h3>
              <p>
                Navigate using Tab and Shift + Tab. Visible focus indicators show
                your position. Larger text is available in Profile & settings.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
