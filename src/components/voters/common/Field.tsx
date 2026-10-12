import React, { ReactNode } from "react";

export interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  error,
  hint,
  children,
  className = "",
}: FieldProps) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <small>{hint}</small>}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}
