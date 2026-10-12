"use client";

import React from "react";
import Link from "next/link";
import { VoterPageKey } from "@/types/voter";

export function Footer({ navigate }: { navigate: (p: VoterPageKey) => void }) {
  return (
    <footer>
      <div className="shell footer-inner">
        <div>
          <strong>Election Services Portal</strong>
          <p>Prototype connected to the election system database. Verify official information with the relevant election authority.</p>
        </div>
        <div className="footer-links">
          <button onClick={() => navigate("help")}>Help</button>
          <button onClick={() => navigate("help")}>Accessibility</button>
          <button onClick={() => navigate("help")}>Privacy</button>
          <button onClick={() => navigate("help")}>Terms</button>
          <button onClick={() => navigate("help")}>Contact information</button>
          <Link
            href="/admin"
            style={{ color: "#d5dfeb", textDecoration: "none", fontSize: "10px", padding: "3px" }}
          >
            Admin Portal
          </Link>
        </div>
      </div>
      <div className="footer-base">
        <div className="shell">
          Prototype service · Not an official government website
        </div>
      </div>
    </footer>
  );
}
