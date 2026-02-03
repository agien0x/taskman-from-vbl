import { Star } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface TaskScoreBadgeProps {
  score: number | null;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  className?: string;
}

export const TaskScoreBadge = ({ 
  score, 
  size = "sm", 
  onClick,
  className,
}: TaskScoreBadgeProps) => {
  // Определяем цвет на основе оценки
  const getColor = (score: number | null) => {
    if (score === null) return { from: "hsl(var(--muted))", to: "hsl(var(--muted))" };
    if (score < 2) return { from: "#ef4444", to: "#dc2626" }; // red
    if (score < 3) return { from: "#f97316", to: "#ea580c" }; // orange
    if (score < 4) return { from: "#eab308", to: "#ca8a04" }; // yellow
    return { from: "#22c55e", to: "#16a34a" }; // green
  };

  const colors = getColor(score);
  const sizeClasses = {
    sm: "h-5 w-5",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  const textSizeClasses = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center justify-center transition-all hover:scale-110",
        sizeClasses[size],
        onClick && "cursor-pointer",
        !onClick && "cursor-default",
        className
      )}
      title={score !== null ? `Оценка: ${score}/5` : "Нет оценки"}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id={`star-gradient-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: colors.from, stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: colors.to, stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path
          d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
          fill={score !== null ? `url(#star-gradient-${score})` : "hsl(var(--muted))"}
          stroke={score !== null ? colors.to : "hsl(var(--border))"}
          strokeWidth="1"
        />
      </svg>
      {score !== null && (
        <span
          className={cn(
            "relative z-10 font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]",
            textSizeClasses[size]
          )}
        >
          {score}
        </span>
      )}
    </button>
  );
};
