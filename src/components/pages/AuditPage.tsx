"use client";

import React, { useState } from "react";
import { Store } from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";

interface AuditPageProps {
  store: Store;
}

export function AuditPage({ store }: AuditPageProps) {
  const [search, setSearch] = useState("");
  const [entity, setEntity] = useState("");
  const [operation, setOperation] = useState("");

  const rows = store.audits.filter(
    (a) =>
      Object.values(a).some((v) =>
        String(v).toLowerCase().includes(search.toLowerCase())
      ) &&
      (!entity || a.entity === entity) &&
      (!operation || a.operation === operation)
  );

  const entityOptions = Array.from(new Set(store.audits.map((a) => a.entity)));
  const operationOptions = Array.from(
    new Set(store.audits.map((a) => a.operation))
  );

  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Read-only record of non-sensitive administrative activity."
      />

      <Filters search={search} setSearch={setSearch}>
        <select
          aria-label="Filter by entity"
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
        >
          <option value="">All entities</option>
          {entityOptions.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by operation"
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
        >
          <option value="">All operations</option>
          {operationOptions.map((x) => (
            <option key={x} value={x}>
              {x.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </Filters>

      <DataTable
        rows={rows}
        columns={[
          {
            key: "timestamp",
            label: "Timestamp",
            render: (r) => new Date(r.timestamp).toLocaleString("en-IN"),
          },
          { key: "entity", label: "Entity" },
          {
            key: "operation",
            label: "Operation",
            render: (r) => <Badge value={r.operation} />,
          },
          { key: "reference", label: "Record reference" },
          { key: "details", label: "Relevant details" },
        ]}
      />
    </>
  );
}
