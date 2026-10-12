import React from "react";

export interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  title: string;
  text: string;
}

export function Toggle({ checked, onChange, title, text }: ToggleProps) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="toggle-ui" />
    </label>
  );
}
