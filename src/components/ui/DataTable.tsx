"use client";

import React, { ReactNode, useEffect, useMemo, useState } from "react";
import { Column } from "@/types/portal";
import { Icon } from "./Icon";
import { Button } from "./Button";

interface DataTableProps<T extends { id: string }> {
  rows: T[];
  columns: Column<T>[];
  onView?: (row: T) => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  extraAction?: (row: T) => ReactNode;
  pageSize?: number;
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onView,
  onEdit,
  onDelete,
  extraAction,
  pageSize = 5,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(String(columns[0]?.key ?? "id"));
  const [asc, setAsc] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [rows.length]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sort] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sort] ?? "");
      return av.localeCompare(bv, undefined, { numeric: true }) * (asc ? 1 : -1);
    });
  }, [rows, sort, asc]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages);
  const shown = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const sortBy = (key: string) => {
    if (sort === key) {
      setAsc(!asc);
    } else {
      setSort(key);
      setAsc(true);
    }
  };

  const hasActions = Boolean(onView || onEdit || onDelete || extraAction);

  return (
    <div className="table-shell">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={String(c.key)}>
                  <button type="button" onClick={() => sortBy(String(c.key))}>
                    {c.label}
                    <Icon name="sort" size={13} />
                  </button>
                </th>
              ))}
              {hasActions && <th className="actions-col">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.id}>
                {columns.map((c) => (
                  <td key={String(c.key)}>
                    {c.render
                      ? c.render(row)
                      : String(
                          (row as unknown as Record<string, unknown>)[
                            String(c.key)
                          ] ?? "—"
                        )}
                  </td>
                ))}
                {hasActions && (
                  <td className="actions-col">
                    <details className="row-menu">
                      <summary aria-label={`Actions for ${row.id}`}>
                        <Icon name="more" />
                      </summary>
                      <div className="menu-pop">
                        {onView && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.closest("details")?.removeAttribute("open");
                              onView(row);
                            }}
                          >
                            View details
                          </button>
                        )}
                        {onEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.currentTarget.closest("details")?.removeAttribute("open");
                              onEdit(row);
                            }}
                          >
                            Edit record
                          </button>
                        )}
                        {extraAction?.(row)}
                        {onDelete && (
                          <button
                            type="button"
                            className="danger-link"
                            onClick={(e) => {
                              e.currentTarget.closest("details")?.removeAttribute("open");
                              onDelete(row);
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!shown.length ? (
        <div className="empty">
          <Icon name="search" size={28} />
          <h3>No records found</h3>
          <p>Try adjusting the search or filter criteria.</p>
        </div>
      ) : (
        <div className="pagination">
          <span>
            Showing {(safePage - 1) * pageSize + 1}–
            {Math.min(safePage * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div>
            <Button
              variant="secondary"
              disabled={safePage === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span>
              Page {safePage} of {pages}
            </span>
            <Button
              variant="secondary"
              disabled={safePage === pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
