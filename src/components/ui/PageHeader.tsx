import React, { ReactNode } from "react";
import { Icon } from "./Icon";

interface PageHeaderProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <>
      <div className="breadcrumbs">
        <span>Administration</span>
        <Icon name="chevron" size={13} />
        <strong>{title}</strong>
      </div>
      <div className="page-header">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {action}
      </div>
    </>
  );
}
