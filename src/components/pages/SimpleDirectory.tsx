"use client";

import React, { ReactNode, useState } from "react";
import {
  Column,
  EntityPageProps,
  FieldConfig,
  Store,
} from "@/types/portal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Filters } from "@/components/ui/Filters";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EntityForm } from "@/components/forms/EntityForm";
import { Detail } from "@/components/ui/Detail";
import { Confirm } from "@/components/ui/Confirm";
import { nextId } from "@/lib/formatters";

export interface DirectoryConfig<T extends { id: string; name: string }> {
  title: string;
  description: string;
  key: "constituencies" | "candidates" | "observers";
  singular: string;
  fields: FieldConfig[];
  columns: Column<T>[];
  initial: Record<string, unknown>;
  filterKey?: string;
  filterOptions?: string[];
  secondFilterKey?: string;
  secondFilterOptions?: string[];
  detailExtras?: (record: T) => ReactNode;
}

interface SimpleDirectoryProps<T extends { id: string; name: string }> {
  config: DirectoryConfig<T>;
  store: Store;
  create: EntityPageProps["create"];
  update: EntityPageProps["update"];
  remove: EntityPageProps["remove"];
}

export function SimpleDirectory<T extends { id: string; name: string }>({
  config,
  store,
  create,
  update,
  remove,
}: SimpleDirectoryProps<T>) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [secondFilter, setSecondFilter] = useState("");
  const [form, setForm] = useState<T | "new" | null>(null);
  const [view, setView] = useState<T | null>(null);
  const [deleting, setDeleting] = useState<T | null>(null);

  const records = store[config.key] as unknown as T[];

  const rows = records.filter((r) => {
    const matchesSearch = Object.values(r).some((v) =>
      String(v).toLowerCase().includes(search.toLowerCase())
    );
    const matchesFilter =
      !filter ||
      String((r as unknown as Record<string, unknown>)[config.filterKey ?? ""]) ===
        filter;
    const matchesSecondFilter =
      !secondFilter ||
      String(
        (r as unknown as Record<string, unknown>)[config.secondFilterKey ?? ""]
      ) === secondFilter;

    return matchesSearch && matchesFilter && matchesSecondFilter;
  });

  const save = (value: Record<string, unknown>) => {
    const prefix = config.singular.slice(0, 3).toUpperCase();
    const item = {
      ...value,
      id: form === "new" ? nextId(prefix) : (form as T).id,
    } as unknown as T;

    if (form === "new") {
      create(config.key, item as never, `${config.singular} created`);
    } else {
      update(config.key, item as never, `${config.singular} updated`);
    }
    setForm(null);
  };

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        action={
          <Button onClick={() => setForm("new")}>
            <Icon name="plus" size={16} /> Add {config.singular.toLowerCase()}
          </Button>
        }
      />

      <Filters search={search} setSearch={setSearch}>
        {config.filterKey && (
          <select
            aria-label={`Filter by ${config.filterKey}`}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">All {config.filterKey}</option>
            {config.filterOptions?.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        )}
        {config.secondFilterKey && (
          <select
            aria-label={`Filter by ${config.secondFilterKey}`}
            value={secondFilter}
            onChange={(e) => setSecondFilter(e.target.value)}
          >
            <option value="">All {config.secondFilterKey}</option>
            {config.secondFilterOptions?.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        )}
      </Filters>

      <DataTable
        rows={rows}
        columns={config.columns}
        onView={setView}
        onEdit={(r) => setForm(r)}
        onDelete={(r) => setDeleting(r)}
      />

      {form && (
        <EntityForm
          title={`${form === "new" ? "Add" : "Edit"} ${config.singular.toLowerCase()}`}
          fields={config.fields}
          initial={form === "new" ? config.initial : (form as unknown as Record<string, unknown>)}
          onSave={save}
          onClose={() => setForm(null)}
          validate={(v) => {
            const errs: Record<string, string> = {};
            if (v.voters !== undefined && Number(v.voters) < 0) {
              errs.voters = "Value cannot be negative";
            }
            if (v.assets !== undefined && Number(v.assets) < 0) {
              errs.assets = "Value cannot be negative";
            }
            return errs;
          }}
        />
      )}

      {view && (
        <Detail
          title={`${config.singular} details`}
          record={view as unknown as Record<string, unknown>}
          onClose={() => setView(null)}
          extras={config.detailExtras?.(view)}
        />
      )}

      {deleting && (
        <Confirm
          title={`Delete ${config.singular.toLowerCase()}?`}
          message={`Remove ${deleting.name}? This action affects local demonstration data only.`}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            remove(config.key, deleting.id, `${config.singular} deleted`);
            setDeleting(null);
          }}
        />
      )}
    </>
  );
}
