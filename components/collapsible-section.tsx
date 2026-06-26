"use client";

import { useState, type ReactNode } from "react";

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  onOpenChange?: (open: boolean) => void;
}

function CollapseToggleIcon({ open }: { open: boolean }) {
  return (
    <span className={`collapsible-section__toggle ${open ? "collapsible-section__toggle--open" : ""}`}>
      <svg viewBox="0 0 16 16" fill="none" className="collapsible-section__icon" aria-hidden>
        <path
          d="M4.25 6.25 8 9.75l3.75-3.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
  className = "",
  onOpenChange,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  const handleToggle = () => {
    setOpen((prev) => {
      const next = !prev;
      onOpenChange?.(next);
      return next;
    });
  };

  return (
    <section className={`collapsible-section ${className}`.trim()}>
      <button
        type="button"
        className="collapsible-section__trigger"
        onClick={handleToggle}
        aria-expanded={open}
      >
        <span className="collapsible-section__title">{title}</span>
        <CollapseToggleIcon open={open} />
      </button>
      {open && <div className="collapsible-section__body">{children}</div>}
    </section>
  );
}
