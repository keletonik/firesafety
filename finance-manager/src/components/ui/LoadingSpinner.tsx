"use client";

import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex items-center justify-center py-12", className)}>
      <div
        className={cn(
          "rounded-full border-slate-200 border-t-blue-600 animate-spin",
          sizeClasses[size]
        )}
      />
    </div>
  );
}
