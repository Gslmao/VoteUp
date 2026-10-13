"use client";

import React, { FormEvent, useState } from "react";
import { FieldConfig } from "@/types/portal";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface EntityFormProps {
  title: string;
  fields: FieldConfig[];
  initial: Record<string, unknown>;
  onSave: (value: Record<string, unknown>) => void;
  onClose: () => void;
  validate?: (value: Record<string, unknown>) => Record<string, string>;
}

export function EntityForm({
  title,
  fields,
  initial,
  onSave,
  onClose,
  validate,
}: EntityFormProps) {
  const [data, setData] = useState<Record<string, unknown>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};

    fields.forEach((f) => {
      const val = data[f.key];
      if (f.required && (val === undefined || val === null || String(val).trim() === "")) {
        next[f.key] = `${f.label} is required`;
      }
    });

    if (validate) {
      Object.assign(next, validate(data));
    }

    setErrors(next);
    if (Object.keys(next).length === 0) {
      onSave(data);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        <div className="modal-body form-grid">
          {fields.map((field) => {
            const isFull = Boolean(
              field.fullWidth ||
              field.type === "textarea" ||
              field.type === "checkbox-group" ||
              field.render
            );

            if (field.render) {
              return (
                <div
                  className={`field ${isFull ? "field-full" : ""}`}
                  key={field.key}
                >
                  <span>
                    {field.label}
                    {field.required && <b aria-hidden="true"> *</b>}
                  </span>
                  {field.render(
                    data[field.key],
                    (val) => setData((prev) => ({ ...prev, [field.key]: val })),
                    data,
                    setData
                  )}
                  {errors[field.key] && (
                    <small className="error">{errors[field.key]}</small>
                  )}
                </div>
              );
            }

            return (
              <label
                className={`field ${isFull ? "field-full" : ""}`}
                key={field.key}
              >
                <span>
                  {field.label}
                  {field.required && <b aria-hidden="true"> *</b>}
                </span>
                {field.type === "select" ? (
                  <select
                    value={String(data[field.key] ?? "")}
                    onChange={(e) =>
                      setData({ ...data, [field.key]: e.target.value })
                    }
                  >
                    <option value="">Select</option>
                    {field.options?.map((o) => (
                      <option
                        key={typeof o === "string" ? o : o.value}
                        value={typeof o === "string" ? o : o.value}
                      >
                        {typeof o === "string" ? o : o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    value={String(data[field.key] ?? "")}
                    onChange={(e) =>
                      setData({ ...data, [field.key]: e.target.value })
                    }
                  />
                ) : (
                  <input
                    type={field.type ?? "text"}
                    value={String(data[field.key] ?? "")}
                    min={field.type === "number" ? 0 : undefined}
                    onChange={(e) =>
                      setData({
                        ...data,
                        [field.key]:
                          field.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                  />
                )}
                {errors[field.key] && (
                  <small className="error">{errors[field.key]}</small>
                )}
              </label>
            );
          })}
        </div>
        <div className="modal-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}
