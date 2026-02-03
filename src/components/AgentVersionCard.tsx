import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RotateCcw } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface AgentVersionCardProps {
  version: {
    id: string;
    name: string;
    model: string;
    created_at: string;
  };
  onRestore: (versionId: string) => void;
}

export const AgentVersionCard = ({ version, onRestore }: AgentVersionCardProps) => {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{version.name}</p>
          <p className="text-xs text-muted-foreground">{version.model}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(version.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRestore(version.id)}
          className="h-7 px-2 shrink-0"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
};
