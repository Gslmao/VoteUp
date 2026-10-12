import React, { ReactNode } from "react";
import { Icon } from "./Icon";

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost" | "text";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  title?: string;
  icon?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  type = "button",
  disabled = false,
  className = "",
  title,
  icon,
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
      {icon && <Icon name={icon} size={18} />}
    </button>
  );
}
