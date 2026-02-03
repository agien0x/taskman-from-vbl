import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DateRangePickerProps {
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
}

export const DateRangePicker = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangePickerProps) => {
  const startValue = startDate ? new Date(startDate) : undefined;
  const endValue = endDate ? new Date(endDate) : undefined;

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return null;
    return format(new Date(date), "dd.MM.yy", { locale: ru });
  };

  const hasAnyDate = startDate || endDate;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 px-1.5 gap-1 text-muted-foreground hover:text-foreground",
                !hasAnyDate && "opacity-50"
              )}
            >
              {hasAnyDate ? (
                <div className="flex flex-col items-start leading-none text-[10px]">
                  {startDate && <span>{formatDate(startDate)}</span>}
                  {endDate && <span>{formatDate(endDate)}</span>}
                </div>
              ) : (
                <CalendarIcon className="h-3.5 w-3.5" />
              )}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="top" align="center" sideOffset={5}>
          {startDate && endDate
            ? `${formatDate(startDate)} — ${formatDate(endDate)}`
            : startDate
            ? `Начало: ${formatDate(startDate)}`
            : endDate
            ? `Окончание: ${formatDate(endDate)}`
            : "Установить даты"}
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={5}>
        <Tabs defaultValue="start" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="start" className="text-xs">
              Начало
            </TabsTrigger>
            <TabsTrigger value="end" className="text-xs">
              Окончание
            </TabsTrigger>
          </TabsList>
          <TabsContent value="start" className="m-0">
            <Calendar
              mode="single"
              selected={startValue}
              onSelect={(newDate) => onStartDateChange(newDate || null)}
              initialFocus
              className="pointer-events-auto"
            />
          </TabsContent>
          <TabsContent value="end" className="m-0">
            <Calendar
              mode="single"
              selected={endValue}
              onSelect={(newDate) => onEndDateChange(newDate || null)}
              initialFocus
              className="pointer-events-auto"
            />
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
