import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskTypeEditor, getTaskTypeConfigs } from "@/components/TaskTypeEditor";
import { useEffect, useState } from "react";

type TaskType = "task" | "personal_board" | "standup" | "function" | "organization";

interface TaskTypeSelectorProps {
  value: TaskType;
  onChange: (value: TaskType) => void;
}

export const TaskTypeSelector = ({ value, onChange }: TaskTypeSelectorProps) => {
  const [typeConfigs, setTypeConfigs] = useState(getTaskTypeConfigs());

  useEffect(() => {
    const handleConfigsChange = () => {
      setTypeConfigs(getTaskTypeConfigs());
    };
    window.addEventListener('taskTypeConfigsChanged', handleConfigsChange);
    return () => window.removeEventListener('taskTypeConfigsChanged', handleConfigsChange);
  }, []);

  return (
    <div className="flex items-center gap-1">
      <Select value={value} onValueChange={(v) => onChange(v as TaskType)}>
        <SelectTrigger className="h-7 w-[110px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(typeConfigs).map(([key, config]) => (
            <SelectItem key={key} value={key} className="text-xs">
              {config.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <TaskTypeEditor />
    </div>
  );
};
