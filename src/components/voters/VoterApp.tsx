"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ComplaintRecord, VoterPageKey, VoterProfile } from "@/types/voter";
import { Icon } from "@/components/ui/Icon";
import { getApiJson } from "@/lib/portalBackend";
import { AppHeader } from "./layout/AppHeader";
import { Footer } from "./layout/Footer";
import { HomePage } from "./pages/HomePage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { VoterDetailsPage } from "./pages/VoterDetailsPage";
import { ElectionsPage } from "./pages/ElectionsPage";
import { CandidatesPage } from "./pages/CandidatesPage";
import { VotePage } from "./pages/VotePage";
import { HistoryPage } from "./pages/HistoryPage";
import { ComplaintsPage } from "./pages/ComplaintsPage";
import { SubmitComplaintPage } from "./pages/SubmitComplaintPage";
import { HelpPage } from "./pages/HelpPage";
import { SettingsPage } from "./pages/SettingsPage";

interface VoterAppProps {
  initialRoute?: VoterPageKey;
}

const protectedPages: VoterPageKey[] = [
  "dashboard",
  "voter-details",
  "vote",
  "history",
  "complaints",
  "submit-complaint",
  "settings",
];

export function VoterApp({ initialRoute = "home" }: VoterAppProps) {
  const [loggedIn, setLoggedIn] = useState(false);

  const [page, setPage] = useState<VoterPageKey>(() => {
    return protectedPages.includes(initialRoute) ? "login" : initialRoute;
  });

  const [voterProfile, setVoterProfile] = useState<VoterProfile | null>(null);

  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);

  const [largeText, setLargeTextState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("esp-pref-large-text") === "yes";
    }
    return false;
  });

  const [toastMessage, setToastMessage] = useState("");

  const refreshSession = useCallback(async () => {
    const session = await getApiJson<{ profile: VoterProfile }>("/api/voter/me");
    setLoggedIn(true);
    setVoterProfile(session.profile);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void getApiJson<{
      profile: VoterProfile;
    }>("/api/voter/me")
      .then((session) => {
        if (cancelled) return;
        setLoggedIn(true);
        setVoterProfile(session.profile);
        if (protectedPages.includes(initialRoute)) setPage(initialRoute);
        else if (initialRoute === "login") setPage("dashboard");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLoggedIn(false);
        setVoterProfile(null);
        if (error instanceof Error && error.message !== "Voter session required") {
          setToastMessage(error.message);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialRoute]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/voters\/?/, "").split("/")[0];
      const validPage = (path as VoterPageKey) || "home";
      setPage(protectedPages.includes(validPage) && !loggedIn ? "login" : validPage);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loggedIn]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const navigate = useCallback(
    (target: VoterPageKey) => {
      const safeTarget = protectedPages.includes(target) && !loggedIn ? "login" : target;
      setPage(safeTarget);

      const newUrl = safeTarget === "home" ? "/voters" : `/voters/${safeTarget}`;
      if (typeof window !== "undefined" && window.location.pathname !== newUrl) {
        window.history.pushState({}, "", newUrl);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [loggedIn]
  );

  const login = useCallback(() => {
    void refreshSession()
      .then(() => {
        setPage("dashboard");
        if (typeof window !== "undefined") {
          window.history.pushState({}, "", "/voters/dashboard");
        }
        setToastMessage("You are signed in.");
      })
      .catch((error: unknown) => {
        setToastMessage(error instanceof Error ? error.message : "Unable to load your account.");
      });
  }, [refreshSession]);

  const logout = useCallback(() => {
    void getApiJson<{ success: boolean }>("/api/auth/logout", { method: "POST" })
      .then(() => {
        setLoggedIn(false);
        setVoterProfile(null);
        setComplaints([]);
        setPage("home");
        if (typeof window !== "undefined") {
          window.history.pushState({}, "", "/voters");
        }
        setToastMessage("You have signed out.");
      })
      .catch((error: unknown) => {
        setToastMessage(error instanceof Error ? error.message : "Unable to sign out.");
      });
  }, []);

  const addComplaint = useCallback((complaint: ComplaintRecord) => {
    setComplaints((prev) => [complaint, ...prev]);
    setToastMessage("Complaint submitted successfully.");
  }, []);

  const setLargeText = useCallback((value: boolean) => {
    setLargeTextState(value);
    localStorage.setItem("esp-pref-large-text", value ? "yes" : "no");
  }, []);

  const content = useMemo(() => {
    switch (page) {
      case "home":
        return <HomePage navigate={navigate} />;
      case "login":
        return <LoginPage onLogin={login} navigate={navigate} />;
      case "dashboard":
        return <DashboardPage navigate={navigate} voter={voterProfile} />;
      case "voter-details":
        return <VoterDetailsPage navigate={navigate} voter={voterProfile} />;
      case "elections":
        return <ElectionsPage navigate={navigate} />;
      case "candidates":
        return <CandidatesPage navigate={navigate} />;
      case "vote":
        return <VotePage navigate={navigate} />;
      case "history":
        return <HistoryPage />;
      case "complaints":
        return <ComplaintsPage complaints={complaints} navigate={navigate} />;
      case "submit-complaint":
        return <SubmitComplaintPage onSubmit={addComplaint} navigate={navigate} />;
      case "help":
        return <HelpPage />;
      case "settings":
        return (
          <SettingsPage
            onLogout={logout}
            voter={voterProfile}
            largeText={largeText}
            setLargeText={setLargeText}
            toast={setToastMessage}
          />
        );
      default:
        return <HomePage navigate={navigate} />;
    }
  }, [
    page,
    voterProfile,
    complaints,
    largeText,
    navigate,
    login,
    logout,
    addComplaint,
    setLargeText,
  ]);

  return (
    <div className={largeText ? "app large-text" : "app"}>
      <AppHeader
        loggedIn={loggedIn}
        current={page}
        navigate={navigate}
        onLogout={logout}
        voter={voterProfile}
      />
      {content}
      <Footer navigate={navigate} />

      {toastMessage && (
        <div className="toast" role="status">
          <Icon name="check" size={19} />
          {toastMessage}
          <button
            onClick={() => setToastMessage("")}
            aria-label="Close notification"
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
