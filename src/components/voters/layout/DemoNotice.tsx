import React from "react";
import { Icon } from "@/components/ui/Icon";

export function DemoNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`demo-notice ${compact ? "compact" : ""}`}>
      <Icon name="info" size={19} />
      <div>
        <strong>Demonstration portal</strong>
        {!compact && (
          <span>
            This prototype uses fictional data. No real vote or complaint is submitted to any authority.
          </span>
        )}
      </div>
    </div>
  );
}
