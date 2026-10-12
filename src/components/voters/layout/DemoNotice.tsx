import React from "react";
import { Icon } from "@/components/ui/Icon";

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-notice ${compact ? "compact" : ""}`}>
      <Icon name="info" size={19} />
      <div>
        <strong>Prototype service</strong>
        {!compact && (
          <span>
            This is not an official election authority website. Actions update the connected application database.
          </span>
        )}
      </div>
    </div>
  );
}
