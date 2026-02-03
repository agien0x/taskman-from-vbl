import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { RichContent } from '@/components/RichContent';
import type { Database } from '@/integrations/supabase/types';

type TemplateVersion = Database['public']['Tables']['template_versions']['Row'];

interface TemplateVersionHistoryProps {
  versions: TemplateVersion[];
  onRestore: (versionId: string) => void;
  isLoading: boolean;
}

export const TemplateVersionHistory = ({
  versions,
  onRestore,
  isLoading,
}: TemplateVersionHistoryProps) => {
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className="h-7 w-7 p-0">
        <History className="h-3.5 w-3.5" />
      </Button>
    );
  }

  if (versions.length === 0) {
    return null;
  }

  return (
    <Popover>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                <History className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs max-w-xs space-y-1">
              <p className="font-medium">История версий</p>
              <p>Версии сохраняются вручную через кнопку 💾</p>
              <p>Последние {versions.length} версий доступны для восстановления</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">История версий</h4>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {versions.map((version, index) => (
                <Card key={version.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">
                          {index === 0 ? 'Последняя версия' : `Версия ${versions.length - index}`}
                          {' • '}
                          {new Date(version.created_at).toLocaleString('ru-RU', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <RichContent 
                          content={version.template_content}
                          className="text-sm line-clamp-2"
                        />
                        {version.quality_criteria && (
                          <div className="mt-1 pt-1 border-t">
                            <div className="text-xs text-muted-foreground">Критерии:</div>
                            <RichContent 
                              content={version.quality_criteria}
                              className="text-xs line-clamp-1"
                            />
                          </div>
                        )}
                      </div>
                      {index > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestore(version.id)}
                          className="h-7 w-7 p-0"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
};
