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
          <p>Citizen-facing demonstration application. All records are fictional.</p>
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
          Designed for demonstration purposes only · Last reviewed 12/09/2025
        </div>
      </div>
    </footer>
  );
}
