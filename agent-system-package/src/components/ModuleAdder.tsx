import { AgentModule } from "../types/agent";
import { useState } from "react";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Plus } from "lucide-react";

interface ModuleAdderProps {
  onAddModule: (type: AgentModule['type']) => void;
}

const MODULE_OPTIONS: Array<{ type: AgentModule['type']; label: string; description: string }> = [
  { type: 'trigger', label: 'Триггер', description: 'Условия запуска агента' },
  { type: 'prompt', label: 'Промпт и инпуты', description: 'Инструкции для модели' },
  { type: 'model', label: 'Модель LLM', description: 'Выбор AI модели' },
  { type: 'json_extractor', label: 'Извлекатель JSON', description: 'Извлечение переменных из JSON' },
  { type: 'router', label: 'Правило роутинга', description: 'Логика маршрутизации' },
  { type: 'destinations', label: 'Направления', description: 'Куда отправляется результат' },
  { type: 'channels', label: 'Каналы', description: 'Email, Telegram, и др.' },
];

export const ModuleAdder = ({ onAddModule }: ModuleAdderProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (type: AgentModule['type']) => {
    onAddModule(type);
    setOpen(false);
  };

  return (
    <div className="flex justify-center py-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 rounded-full p-0 hover:bg-primary/10 hover:text-primary"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-2" align="center">
          <div className="text-xs font-semibold mb-2 px-2">Добавить модуль</div>
          <div className="space-y-1">
            {MODULE_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleSelect(option.type)}
                className="w-full text-left px-2 py-2 rounded hover:bg-accent text-xs transition-colors"
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-muted-foreground">{option.description}</div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};