import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Plus } from "lucide-react";
import { InputSelector } from "./InputSelector";
import { useAgentInputs } from "../contexts/AgentInputsContext";

interface InputSelectorButtonProps {
  onSelectInput: (inputValue: string) => void;
  onSelectGroup: (groupInputs: Array<{ value: string; label: string }>) => void;
  supabaseClient?: any;
}

export const InputSelectorButton = ({
  onSelectInput,
  onSelectGroup,
  supabaseClient
}: InputSelectorButtonProps) => {
  const { getInputGroups } = useAgentInputs();
  const dynamicGroups = getInputGroups();
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-6 text-xs px-2">
          <Plus className="h-3 w-3 mr-1" />
          Добавить
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 bg-popover z-50" align="end">
        <InputSelector
          groups={dynamicGroups}
          onSelectInput={onSelectInput}
          onSelectGroup={onSelectGroup}
          supabaseClient={supabaseClient}
        />
      </PopoverContent>
    </Popover>
  );
};