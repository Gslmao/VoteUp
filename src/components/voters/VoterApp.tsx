"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ComplaintRecord, VoterPageKey } from "@/types/voter";
import { initialComplaints } from "@/data/voterData";
import { Icon } from "@/components/ui/Icon";
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
  const [loggedIn, setLoggedIn] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("esp-demo-auth") === "yes";
    }
    return false;
  });

  const [page, setPage] = useState<VoterPageKey>(() => {
    if (protectedPages.includes(initialRoute)) {
      if (typeof window !== "undefined" && sessionStorage.getItem("esp-demo-auth") !== "yes") {
        return "login";
      }
    }
    return initialRoute;
  });

  const [voted, setVoted] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("esp-demo-voted-e1") === "yes";
    }
    return false;
  });

  const [complaints, setComplaints] = useState<ComplaintRecord[]>(initialComplaints);

  const [largeText, setLargeTextState] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("esp-pref-large-text") === "yes";
    }
    return false;
  });

  const [toastMessage, setToastMessage] = useState("");

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/voters\/?/, "").split("/")[0];
      const validPage = (path as VoterPageKey) || "home";
      const isAuth = sessionStorage.getItem("esp-demo-auth") === "yes";
      setPage(protectedPages.includes(validPage) && !isAuth ? "login" : validPage);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(""), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const navigate = useCallback(
    (target: VoterPageKey) => {
      const isAuth = loggedIn || (typeof window !== "undefined" && sessionStorage.getItem("esp-demo-auth") === "yes");
      const safeTarget = protectedPages.includes(target) && !isAuth ? "login" : target;
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
    sessionStorage.setItem("esp-demo-auth", "yes");
    setLoggedIn(true);
    setPage("dashboard");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/voters/dashboard");
    }
    setToastMessage("Signed in to the demonstration account.");
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("esp-demo-auth");
    setLoggedIn(false);
    setPage("home");
    if (typeof window !== "undefined") {
      window.history.pushState({}, "", "/voters");
    }
    setToastMessage("You have signed out of the demonstration account.");
  }, []);

  const recordVote = useCallback((receipt: string) => {
    localStorage.setItem("esp-demo-voted-e1", "yes");
    localStorage.setItem("esp-demo-receipt", receipt);
    setVoted(true);
  }, []);

  const addComplaint = useCallback((complaint: ComplaintRecord) => {
    setComplaints((prev) => [complaint, ...prev]);
    setToastMessage("Demo complaint created successfully.");
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
        return <DashboardPage navigate={navigate} voted={voted} />;
      case "voter-details":
        return <VoterDetailsPage navigate={navigate} />;
      case "elections":
        return <ElectionsPage navigate={navigate} />;
      case "candidates":
        return <CandidatesPage navigate={navigate} />;
      case "vote":
        return <VotePage voted={voted} onVote={recordVote} navigate={navigate} />;
      case "history":
        return <HistoryPage voted={voted} />;
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
    voted,
    complaints,
    largeText,
    navigate,
    login,
    logout,
    recordVote,
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
