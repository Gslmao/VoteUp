"use client";

import React from "react";
import { Constituency } from "@/types/portal";

interface ConstituencyPickerProps {
  value?: string;
  selectedList?: string[];
  constituencies: Constituency[];
  onChange: (summary: string, list: string[]) => void;
}

export function ConstituencyPicker({
  value = "All Constituencies",
  selectedList,
  constituencies,
  onChange,
}: ConstituencyPickerProps) {
  const allNames = constituencies.map((c) => c.name);

  // Derive active selection array
  const activeList: string[] = React.useMemo(() => {
    if (Array.isArray(selectedList)) {
      return selectedList;
    }
    if (!value || value === "All Constituencies") {
      return allNames;
    }
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => allNames.includes(s));
  }, [selectedList, value, allNames]);

  const isAllSelected =
    constituencies.length > 0 &&
    constituencies.every((c) => activeList.includes(c.name));

  // Determine current dropdown selection
  const dropdownValue = React.useMemo(() => {
    if (isAllSelected || value === "All Constituencies") {
      return "ALL";
    }
    if (activeList.length === 1 && allNames.includes(activeList[0])) {
      return activeList[0];
    }
    if (activeList.length === 0) {
      return "";
    }
    return "CUSTOM";
  }, [isAllSelected, value, activeList, allNames]);

  const handleDropdownChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "ALL") {
      onChange("All Constituencies", [...allNames]);
    } else if (val === "") {
      onChange("", []);
    } else if (val !== "CUSTOM") {
      onChange(val, [val]);
    }
  };

  const handleToggle = (name: string, checked: boolean) => {
    let nextList: string[];
    if (checked) {
      nextList = activeList.includes(name) ? activeList : [...activeList, name];
    } else {
      nextList = activeList.filter((item) => item !== name);
    }

    let nextSummary = "";
    if (nextList.length === 0) {
      nextSummary = "";
    } else if (
      constituencies.length > 0 &&
      constituencies.every((c) => nextList.includes(c.name))
    ) {
      nextSummary = "All Constituencies";
    } else if (nextList.length === 1) {
      nextSummary = nextList[0];
    } else {
      nextSummary = nextList.join(", ");
    }

    onChange(nextSummary, nextList);
  };

  const handleSelectAll = () => {
    onChange("All Constituencies", [...allNames]);
  };

  const handleClearAll = () => {
    onChange("", []);
  };

  return (
    <div className="constituency-picker">
      <div className="picker-dropdown-row">
        <select
          aria-label="Eligible constituency dropdown selector"
          value={dropdownValue}
          onChange={handleDropdownChange}
        >
          <option value="ALL">All Constituencies (Nationwide / State-wide)</option>
          {constituencies.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name} ({c.state})
            </option>
          ))}
          {dropdownValue === "CUSTOM" && (
            <option value="CUSTOM">
              Custom selection ({activeList.length} constituencies)
            </option>
          )}
        </select>
        <div className="picker-actions">
          <button
            type="button"
            className="btn-picker-action"
            onClick={handleSelectAll}
            title="Select all constituencies"
          >
            Select all
          </button>
          <button
            type="button"
            className="btn-picker-action"
            onClick={handleClearAll}
            title="Clear all selected constituencies"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="picker-checkbox-section">
        <div className="picker-checkbox-header">
          <span>Eligible constituencies (check to select):</span>
          <span className="picker-counter">
            {activeList.length} of {constituencies.length} selected
          </span>
        </div>
        {constituencies.length === 0 ? (
          <p style={{ margin: "4px 0", color: "var(--muted)", fontSize: "11px" }}>
            No constituencies configured in master data.
          </p>
        ) : (
          <div className="picker-checkbox-grid">
            {constituencies.map((c) => {
              const isChecked = activeList.includes(c.name);
              return (
                <label
                  key={c.id}
                  className={`picker-checkbox-item ${
                    isChecked ? "picker-checkbox-item-checked" : ""
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => handleToggle(c.name, e.target.checked)}
                  />
                  <span className="picker-checkbox-label">
                    <strong>{c.name}</strong>
                    <small>
                      {c.state} &bull; {c.voters.toLocaleString()} voters
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
