"use client";

import React, { ReactNode } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Badge } from "./Badge";

interface DetailProps {
  title: string;
  record: Record<string, unknown>;
  onClose: () => void;
  extras?: ReactNode;
}

export function Detail({ title, record, onClose, extras }: DetailProps) {
  return (
    <Modal title={title} onClose={onClose} wide>
      <div className="modal-body">
        <dl className="detail-grid">
          {Object.entries(record).map(([k, v]) => (
            <div key={k}>
              <dt>{k.replace(/([A-Z])/g, " $1")}</dt>
              <dd>
                {["status", "participation"].includes(k) ? (
                  <Badge value={String(v)} />
                ) : (
                  String(v ?? "—")
                )}
              </dd>
            </div>
          ))}
        </dl>
        {extras}
      </div>
      <div className="modal-actions">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
