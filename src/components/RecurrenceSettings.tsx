import { useState } from "react";
import { RecurrenceType } from "@/types/kanban";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface RecurrenceSettingsProps {
  recurrenceType: RecurrenceType;
  recurrenceDays: number[];
  onRecurrenceTypeChange: (type: RecurrenceType) => void;
  onRecurrenceDaysChange: (days: number[]) => void;
}

const WEEKDAYS = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 0, label: 'Вс' },
];

export const RecurrenceSettings = ({
  recurrenceType,
  recurrenceDays,
  onRecurrenceTypeChange,
  onRecurrenceDaysChange,
}: RecurrenceSettingsProps) => {
  const handleDayToggle = (day: number) => {
    const newDays = recurrenceDays.includes(day)
      ? recurrenceDays.filter(d => d !== day)
      : [...recurrenceDays, day];
    onRecurrenceDaysChange(newDays);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-xs font-medium whitespace-nowrap">Периодичность:</Label>
        <Select 
          value={recurrenceType} 
          onValueChange={(v) => onRecurrenceTypeChange(v as RecurrenceType)}
        >
          <SelectTrigger className="h-8 text-xs flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none" className="text-xs">Не повторяется</SelectItem>
            <SelectItem value="daily" className="text-xs">Ежедневно</SelectItem>
            <SelectItem value="weekdays" className="text-xs">Пн-Пт</SelectItem>
            <SelectItem value="weekly" className="text-xs">Еженедельно</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {recurrenceType === 'weekly' && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Дни недели:</Label>
          <div className="flex gap-1.5 flex-wrap">
            {WEEKDAYS.map(({ value, label }) => (
              <div key={value} className="flex items-center gap-1">
                <Checkbox
                  id={`day-${value}`}
                  checked={recurrenceDays.includes(value)}
                  onCheckedChange={() => handleDayToggle(value)}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`day-${value}`} 
                  className="text-xs cursor-pointer"
                >
                  {label}
                </Label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
