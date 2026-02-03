import { getCleanTitle } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface RootTaskIconProps {
  title: string;
  className?: string;
  showLetters?: number; // How many letters to show (1-3)
  isLoading?: boolean;
  variant?: "default" | "original-root" | "foreign-root" | "duplicated-folder"; // Подсветка для разных случаев
}

export const RootTaskIcon = ({ 
  title, 
  className = "h-7 w-7", 
  showLetters = 3,
  isLoading = false,
  variant = "default"
}: RootTaskIconProps) => {
  const cleanTitle = getCleanTitle(title, "");
  const letters = cleanTitle
    .slice(0, showLetters)
    .toUpperCase() || "";

  // Определяем цвета в зависимости от варианта
  const getStrokeColor = () => {
    switch (variant) {
      case "original-root":
        return "stroke-blue-500"; // Синий для оригинального корня
      case "foreign-root":
        return "stroke-amber-500"; // Жёлтый/оранжевый для чужого корня
      case "duplicated-folder":
        return "stroke-amber-500";
      default:
        return "stroke-current";
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case "original-root":
        return "text-blue-600 dark:text-blue-400 font-bold";
      case "foreign-root":
        return "text-amber-600 dark:text-amber-400 font-bold";
      case "duplicated-folder":
        return "text-amber-600 dark:text-amber-400 font-bold";
      default:
        return "text-foreground font-bold";
    }
  };

  const getBgColor = () => {
    switch (variant) {
      case "original-root":
        return "bg-blue-500/10";
      case "foreign-root":
        return "bg-amber-500/10";
      case "duplicated-folder":
        return "bg-amber-500/10";
      default:
        return "";
    }
  };

  // Показать загрузку
  if (isLoading) {
    return (
      <div className={`${className} relative flex items-center justify-center`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Если нет букв - показать пустой домик
  if (!letters) {
    return (
      <div className={`${className} relative flex items-center justify-center ${getBgColor()} rounded`}>
        <svg
          viewBox="0 0 40 36"
          fill="none"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`w-full h-full ${getStrokeColor()}`}
        >
          <path d="M2 15L20 3L38 15V33a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V15z" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`${className} relative flex items-center justify-center ${getBgColor()} rounded`}>
      <svg
        viewBox="0 0 40 36"
        fill="none"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`w-full h-full ${getStrokeColor()}`}
      >
        {/* Wider house shape with more space for text, taller bottom */}
        <path d="M2 15L20 3L38 15V33a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V15z" />
      </svg>
      <span 
        className={`absolute leading-none flex items-center justify-center ${getTextColor()}`}
        style={{ 
          fontSize: showLetters === 1 ? "0.55em" : showLetters === 2 ? "0.48em" : "0.42em",
          top: "58%", // Сместить ниже к основанию
          left: "50%",
          transform: "translate(-50%, -50%)",
          letterSpacing: "-0.02em",
        }}
      >
        {letters}
      </span>
    </div>
  );
};
