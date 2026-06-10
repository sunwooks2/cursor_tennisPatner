"use client";

import { useEffect } from "react";
import { TennisBallIcon } from "@/components/tennis-ball-icon";

interface GenerationToastProps {
  message: string;
  onClose: () => void;
}

export function GenerationToast({ message, onClose }: GenerationToastProps) {
  useEffect(() => {
    const timer = window.setTimeout(onClose, 2400);
    return () => window.clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="generation-toast" role="status" aria-live="polite">
      <TennisBallIcon animated />
      <span>{message}</span>
    </div>
  );
}
