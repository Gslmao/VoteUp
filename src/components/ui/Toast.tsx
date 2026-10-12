"use client";

import React from "react";
import { Icon } from "./Icon";
import { ToastState } from "@/types/portal";

interface ToastProps {
  toast: ToastState | null;
  onClose: () => void;
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;

  return (
    <div className={`toast ${toast.tone}`}>
      <Icon
        name={toast.tone === "success" ? "check" : "alert"}
        size={18}
      />
      <span>{toast.text}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}
