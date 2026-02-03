import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Play, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TaskDatePickerProps {
  date?: Date | string | null;
  onChange: (date: Date | null) => void;
  label: string;
  type?: "start" | "end";
}

export const TaskDatePicker = ({ date, onChange, label, type = "start" }: TaskDatePickerProps) => {
  const dateValue = date ? new Date(date) : undefined;
  const Icon = type === "start" ? Play : Flag;
  const tooltipText = type === "start" 
    ? `Начало работы${date ? `: ${format(new Date(date), "d MMM yyyy", { locale: ru })}` : ": не указано"}`
    : `Срок завершения${date ? `: ${format(new Date(date), "d MMM yyyy", { locale: ru })}` : ": не указан"}`;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0 text-muted-foreground hover:text-foreground",
                !date && "opacity-50"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" sideOffset={5}>
          {tooltipText}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
        <Calendar
          mode="single"
          selected={dateValue}
          onSelect={(newDate) => onChange(newDate || null)}
          initialFocus
          className="pointer-events-auto"
        />
      </PopoverContent>
    </Popover>
  );
};
