import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface RecurrenceTimeSelectorProps {
  value: string | null;
  onChange: (time: string) => void;
  timezone?: string;
  onTimezoneChange?: (timezone: string) => void;
  disabled?: boolean;
}

const COMMON_TIMEZONES = [
  { value: "UTC", label: "UTC", offset: "+00:00" },
  { value: "Europe/Moscow", label: "Москва", offset: "+03:00" },
  { value: "Europe/London", label: "Лондон", offset: "+00:00" },
  { value: "Europe/Paris", label: "Париж", offset: "+01:00" },
  { value: "America/New_York", label: "Нью-Йорк", offset: "-05:00" },
  { value: "America/Los_Angeles", label: "Лос-Анджелес", offset: "-08:00" },
  { value: "Asia/Tokyo", label: "Токио", offset: "+09:00" },
  { value: "Asia/Shanghai", label: "Шанхай", offset: "+08:00" },
  { value: "Australia/Sydney", label: "Сидней", offset: "+11:00" },
];

export const RecurrenceTimeSelector = ({ 
  value, 
  onChange, 
  timezone = "UTC",
  onTimezoneChange,
  disabled = false 
}: RecurrenceTimeSelectorProps) => {
  const parseTime = (timeStr: string | null): { hours: string; minutes: string } => {
    if (!timeStr) return { hours: "09", minutes: "00" };
    const parts = timeStr.split(":");
    return { hours: parts[0] || "09", minutes: parts[1] || "00" };
  };

  const { hours, minutes } = parseTime(value);

  const hoursOptions = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutesOptions = ["00", "15", "30", "45"];

  return (
    <div className="flex items-center gap-2">
      <Select value={hours} onValueChange={(h) => onChange(`${h}:${minutes}:00`)} disabled={disabled}>
        <SelectTrigger className="w-[70px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hoursOptions.map((h) => <SelectItem key={h} value={h} className="text-xs">{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-xs">:</span>
      <Select value={minutes} onValueChange={(m) => onChange(`${hours}:${m}:00`)} disabled={disabled}>
        <SelectTrigger className="w-[70px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutesOptions.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={timezone} onValueChange={onTimezoneChange} disabled={disabled || !onTimezoneChange}>
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {COMMON_TIMEZONES.map((tz) => (
            <SelectItem key={tz.value} value={tz.value} className="text-xs">
              {tz.label} ({tz.offset})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};