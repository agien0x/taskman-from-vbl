import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { RotateCcw, Trash2, Star } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

interface ModuleVersionCardProps {
  version: {
    id: string;
    module_type: string;
    config: any;
    is_template: boolean;
    template_name: string | null;
    created_at: string;
  };
  onRestore: (versionId: string) => void;
  onDelete?: (versionId: string) => void;
}

export const ModuleVersionCard = ({ version, onRestore, onDelete }: ModuleVersionCardProps) => {
  const displayName = version.is_template && version.template_name 
    ? version.template_name 
    : `Версия от ${format(new Date(version.created_at), "d MMM yyyy, HH:mm", { locale: ru })}`;

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
           <div className="flex items-center gap-2">
             {version.is_template && <Star className="h-3 w-3 text-pink-500 fill-pink-500" />}
             <p className="text-sm font-medium truncate">{displayName}</p>
           </div>
          {!version.is_template && (
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(version.created_at), "d MMM yyyy, HH:mm", { locale: ru })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRestore(version.id)}
            title="Восстановить версию"
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(version.id)}
              title="Удалить версию"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};