import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimeSelectorProps {
  value: number | null;
  onChange: (hours: number) => void;
  options: number[];
  placeholder?: string;
  disabled?: boolean;
}

export const TimeSelector = ({ value, onChange, options, placeholder = "Выбрать", disabled = false }: TimeSelectorProps) => {
  return (
    <Select
      value={value?.toString() || ""}
      onValueChange={(val) => onChange(val ? parseFloat(val) : 0)}
      disabled={disabled}
    >
      <SelectTrigger className="h-7 text-xs w-[70px]">
        <SelectValue placeholder={placeholder}>
          {value ? `${value}ч` : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((hours) => (
          <SelectItem key={hours} value={hours.toString()} className="text-xs">
            {hours}ч
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
