import React, { ReactNode } from "react";
import { Icon } from "./Icon";

interface FiltersProps {
  search: string;
  setSearch: (s: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
}

export function Filters({
  search,
  setSearch,
  searchPlaceholder = "Search records…",
  children,
}: FiltersProps) {
  return (
    <div className="filters">
      <label className="search">
        <Icon name="search" size={17} />
        <input
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {children}
    </div>
  );
}
