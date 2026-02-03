import { Label } from "@/components/ui/label";
import { InputBadgeWithPopover } from "@/components/InputBadgeWithPopover";
import { InputElement } from "@/types/agent";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface ModuleInputSelectorProps {
  label: string;
  value?: string | string[];
  onChange: (inputIds: string | string[]) => void;
  availableInputs: InputElement[];
  placeholder?: string;
  description?: string;
  multiple?: boolean;
}

export const ModuleInputSelector = ({
  label,
  value,
  onChange,
  availableInputs,
  placeholder = "Выберите источник",
  description,
  multiple = false,
}: ModuleInputSelectorProps) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  
  const handleAdd = () => {
    const newValues = [...values, ''];
    onChange(multiple ? newValues : newValues[0] || '');
  };

  const handleChange = (index: number, newValue: string) => {
    const newValues = [...values];
    newValues[index] = newValue;
    onChange(multiple ? newValues : newValues[0] || '');
  };

  const handleRemove = (index: number) => {
    const newValues = values.filter((_, i) => i !== index);
    onChange(multiple ? newValues : newValues[0] || '');
  };

  if (!multiple) {
    // Режим одиночного выбора (обратная совместимость)
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Label className="text-sm min-w-fit">{label}:</Label>
          <InputBadgeWithPopover
            value={values[0] || ''}
            onChange={(inputId) => {
              console.log('ModuleInputSelector onChange:', inputId);
              onChange(inputId);
            }}
            availableInputs={availableInputs}
            placeholder={placeholder}
          />
        </div>
        {description && (
          <p className="text-xs text-muted-foreground ml-2">{description}</p>
        )}
      </div>
    );
  }

  // Режим множественного выбора
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label className="text-sm min-w-fit">{label}:</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="h-7 px-2"
        >
          <Plus className="h-3 w-3 mr-1" />
          Добавить
        </Button>
      </div>
      
      {values.length > 0 && (
        <div className="space-y-2 ml-2">
          {values.map((val, index) => (
            <div key={index} className="flex items-center gap-2">
              <InputBadgeWithPopover
                value={val}
                onChange={(inputId) => handleChange(index, inputId)}
                availableInputs={availableInputs}
                placeholder={placeholder}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground ml-2">{description}</p>
      )}
    </div>
  );
};
