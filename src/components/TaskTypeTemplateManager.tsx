import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Trash2, Globe, Save, Edit, Calendar, Clock, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UnifiedEditor } from "@/components/editor/UnifiedEditor";
import { RecurrenceSettings } from "@/components/RecurrenceSettings";
import { Switch } from "@/components/ui/switch";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { RecurrenceType } from "@/types/kanban";
import { TaskType, TaskTypeTemplate, useTaskTypeTemplates } from "@/hooks/useTaskTypeTemplates";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { TemplateVersionHistory } from "@/components/TemplateVersionHistory";
import { useTemplateVersions } from "@/hooks/useTemplateVersions";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TemplateAssignmentSelector } from "@/components/TemplateAssignmentSelector";
import { RecurrenceTimeSelector } from "@/components/RecurrenceTimeSelector";
import { useQueryClient } from "@tanstack/react-query";

// Debounced input component to prevent cursor jumping
const DebouncedInput = ({ 
  value, 
  onChange, 
  delay = 500,
  ...props 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  delay?: number;
} & Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange'>) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <Input value={localValue} onChange={handleChange} {...props} />;
};

interface TaskTypeTemplateManagerProps {
  taskType: TaskType;
  label: string;
  onInsertTemplate?: (templateContent: string) => void;
  activeTemplateIds?: string[];
}

export const TaskTypeTemplateManager = ({ 
  taskType, 
  label, 
  onInsertTemplate,
  activeTemplateIds = []
}: TaskTypeTemplateManagerProps) => {
  const { templates, createTemplate, updateTemplate, deleteTemplate } = useTaskTypeTemplates();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Получаем текущего пользователя
  useState(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id || null);
    });
  });

  // Фильтруем шаблоны для текущего типа задачи
  const typeTemplates = templates.filter((t) => t.task_type === taskType);

  const handleCreateTemplate = () => {
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const newTemplate = {
      task_type: taskType,
      name: `Новый шаблон ${label}`,
      template: "",
      quality_criteria: "",
      is_global: false,
      is_active: true,
      recurrence_type: "none",
      recurrence_days: [],
      recurrence_time: "09:00:00",
      recurrence_timezone: userTimezone,
    };
    createTemplate(newTemplate);
  };

  const handleUpdateTemplate = (id: string, updates: Partial<TaskTypeTemplate>) => {
    updateTemplate({ id, ...updates });
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Удалить этот шаблон?")) {
      deleteTemplate(id);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedTemplates);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTemplates(newExpanded);
  };

  const getTemplateBadge = (template: TaskTypeTemplate) => {
    if (template.is_global) return <Badge variant="secondary" className="text-xs">Глобальный</Badge>;
    return null;
  };

  const getRecurrenceLabel = (recurrenceType: string | null, recurrenceDays: any, recurrenceTime: string | null) => {
    if (!recurrenceType || recurrenceType === "none") return null;
    
    let label = "";
    if (recurrenceType === "daily") label = "Ежедн";
    else if (recurrenceType === "weekly") {
      const days = recurrenceDays || [];
      if (days.length === 0) label = "Еженед";
      else if (days.length === 7) label = "Ежедн";
      else if (days.length === 5 && days.includes(1) && days.includes(2) && days.includes(3) && days.includes(4) && days.includes(5)) {
        label = "Пн-Пт";
      } else {
        label = `${days.length}д/н`;
      }
    } else if (recurrenceType === "monthly") label = "Ежемес";
    
    // Add time if available
    if (recurrenceTime) {
      const time = recurrenceTime.split(":").slice(0, 2).join(":");
      label += ` ${time}`;
    }
    
    return label;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        {label && <Label className="text-sm font-semibold">{label}</Label>}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleCreateTemplate}
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 ml-auto"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Создать шаблон</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {typeTemplates.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4 border rounded-lg border-dashed">
          Нет шаблонов для этого типа задач
        </div>
      ) : (
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 pr-4">
            {typeTemplates.map((template) => (
            <Collapsible
              key={template.id}
              open={expandedTemplates.has(template.id)}
              onOpenChange={() => toggleExpanded(template.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between p-3 hover:bg-accent/50 cursor-pointer gap-3">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <HoverCard openDelay={300}>
                        <HoverCardTrigger asChild>
                          <span className="text-sm font-medium truncate cursor-help">
                            {template.name}
                          </span>
                        </HoverCardTrigger>
                        <HoverCardContent className="w-80" side="top" align="start">
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold">Превью шаблона</h4>
                            {template.template ? (
                              <div 
                                className="text-xs text-muted-foreground max-h-[200px] overflow-auto"
                                dangerouslySetInnerHTML={{ __html: template.template }}
                              />
                            ) : (
                              <p className="text-xs text-muted-foreground italic">Шаблон пустой</p>
                            )}
                            {template.quality_criteria && (
                              <>
                                <div className="border-t pt-2 mt-2">
                                  <p className="text-xs font-medium mb-1">Критерии качества:</p>
                                  <div 
                                    className="text-xs text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: template.quality_criteria }}
                                  />
                                </div>
                              </>
                            )}
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                      {getTemplateBadge(template)}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1 text-muted-foreground/50">
                              <Calendar className="h-3 w-3" />
                              <span className="text-xs truncate max-w-[80px]">
                                {getRecurrenceLabel(template.recurrence_type, template.recurrence_days, template.recurrence_time) || "—"}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              {template.recurrence_type && template.recurrence_type !== "none" 
                                ? "Периодичность автоподстановки" 
                                : "Периодичность не указана"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Иконки и аватарки пользователей */}
                      <TemplateUsersInline 
                        templateId={template.id}
                        ownerId={template.owner_id}
                        isOwner={template.owner_id === currentUserId}
                        isGlobal={template.is_global}
                      />
                      
                      {/* Иконка глобальности */}
                      {template.is_global && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-muted-foreground">
                                <Globe className="h-3.5 w-3.5" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Глобальный шаблон (для всех пользователей)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Иконка редактирования */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="text-muted-foreground">
                              <Edit className="h-3.5 w-3.5" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Нажмите для редактирования</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>

                      {/* Включатель активности */}
                      {template.owner_id === currentUserId && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div onClick={(e) => e.stopPropagation()}>
                                <Switch
                                  checked={template.is_active}
                                  onCheckedChange={(checked) =>
                                    handleUpdateTemplate(template.id, { is_active: checked })
                                  }
                                  className="scale-75"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{template.is_active ? "Шаблон активен" : "Шаблон неактивен"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      
                      {/* Кнопка вставить */}
                      {onInsertTemplate && template.template && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onInsertTemplate(template.template || "");
                                }}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <FileDown className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Вставить шаблон</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="p-3 pt-0 space-y-3 border-t">
                    {/* Название и активность */}
                    <div className="flex gap-2">
                      <div className="flex-1 grid gap-2">
                        <Label className="text-xs text-muted-foreground">Название</Label>
                        <DebouncedInput
                          value={template.name}
                          onChange={(value) =>
                            handleUpdateTemplate(template.id, { name: value })
                          }
                          placeholder="Название шаблона"
                          className="h-8 text-sm"
                          disabled={template.owner_id !== currentUserId}
                        />
                      </div>
                      {template.owner_id === currentUserId && (
                        <TemplateVersionHistoryWrapper templateId={template.id} />
                      )}
                    </div>

                    {/* Шаблон контента */}
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Шаблон</Label>
                        <div className="flex gap-1">
                          {onInsertTemplate && template.template && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => onInsertTemplate(template.template || "")}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-xs"
                                  >
                                    <FileDown className="h-3 w-3 mr-1" />
                                    Добавить
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">Добавить шаблон с датой и временем</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </div>
                      <div>
                        {template.owner_id === currentUserId ? (
                          <UnifiedEditor
                            content={template.template || ""}
                            onChange={(html) =>
                              handleUpdateTemplate(template.id, { template: html })
                            }
                            placeholder="Шаблон для этого типа задачи"
                          />
                        ) : (
                          <div className="border rounded-md p-2 text-sm text-muted-foreground min-h-[60px]">
                            <div dangerouslySetInnerHTML={{ __html: template.template || "Нет шаблона" }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Критерии качества */}
                    <div className="grid gap-2">
                      <Label className="text-xs text-muted-foreground">Критерии качества</Label>
                      <div>
                        {template.owner_id === currentUserId ? (
                          <UnifiedEditor
                            content={template.quality_criteria || ""}
                            onChange={(html) =>
                              handleUpdateTemplate(template.id, { quality_criteria: html })
                            }
                            placeholder="Критерии для оценки качества задачи"
                          />
                        ) : (
                          <div className="border rounded-md p-2 text-sm text-muted-foreground min-h-[60px]">
                            <div dangerouslySetInnerHTML={{ __html: template.quality_criteria || "Нет критериев" }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Периодичность */}
                    <div className="border rounded-lg p-3 bg-primary/5 border-primary/20">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1">
                          <RecurrenceSettings
                            recurrenceType={(template.recurrence_type || "none") as RecurrenceType}
                            recurrenceDays={template.recurrence_days || []}
                            onRecurrenceTypeChange={(type) =>
                              handleUpdateTemplate(template.id, { recurrence_type: type })
                            }
                            onRecurrenceDaysChange={(days) =>
                              handleUpdateTemplate(template.id, { recurrence_days: days })
                            }
                          />
                        </div>
                        <RecurrenceTimeSelector
                          value={template.recurrence_time}
                          onChange={(time) => handleUpdateTemplate(template.id, { recurrence_time: time })}
                          timezone={template.recurrence_timezone || "UTC"}
                          onTimezoneChange={(tz) => handleUpdateTemplate(template.id, { recurrence_timezone: tz })}
                          disabled={template.owner_id !== currentUserId}
                        />
                      </div>
                    </div>

                    {/* Управление шаблоном */}
                    {template.owner_id === currentUserId && (
                      <div className="flex items-center justify-end gap-2">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleUpdateTemplate(template.id, { is_global: !template.is_global })}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                              >
                                <Globe className={`h-3.5 w-3.5 ${template.is_global ? 'text-primary' : 'text-muted-foreground'}`} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">{template.is_global ? "Глобальный шаблон (нажмите чтобы сделать личным)" : "Личный шаблон (нажмите чтобы сделать глобальным)"}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>

                        <SaveTemplateVersionButton 
                          templateId={template.id}
                          templateContent={template.template || ""}
                          qualityCriteria={template.quality_criteria}
                        />

                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                onClick={() => handleDeleteTemplate(template.id)}
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">Удалить шаблон</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

// Вспомогательный компонент для версий
const TemplateVersionHistoryWrapper = ({ templateId }: { templateId: string }) => {
  const { versions, isLoading, restoreVersion, loadVersions } = useTemplateVersions(templateId);
  const queryClient = useQueryClient();
  
  const handleRestore = async (versionId: string) => {
    const restored = await restoreVersion(versionId);
    if (restored) {
      // Перезагружаем версии после восстановления
      await loadVersions();
      // Инвалидируем кеш шаблонов для обновления интерфейса
      queryClient.invalidateQueries({ queryKey: ["task-type-templates"] });
    }
  };

  return (
    <TemplateVersionHistory
      versions={versions}
      onRestore={handleRestore}
      isLoading={isLoading}
    />
  );
};

// Компонент кнопки сохранения версии
const SaveTemplateVersionButton = ({ 
  templateId, 
  templateContent, 
  qualityCriteria 
}: { 
  templateId: string; 
  templateContent: string; 
  qualityCriteria: string | null;
}) => {
  const { saveVersion } = useTemplateVersions(templateId);
  
  const handleSave = async () => {
    await saveVersion(templateContent, qualityCriteria);
    toast.success("Версия шаблона сохранена");
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleSave}
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
          >
            <Save className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Сохранить текущую версию шаблона</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Компонент для отображения пользователей в строке
const TemplateUsersInline = ({ 
  templateId, 
  ownerId, 
  isOwner, 
  isGlobal 
}: { 
  templateId: string; 
  ownerId: string | null;
  isOwner: boolean;
  isGlobal: boolean;
}) => {
  // Для глобальных шаблонов показываем иконку глобуса
  if (isGlobal) {
    return (
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-secondary/50">
                <Globe className="h-3 w-3 text-secondary-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Глобальный шаблон (доступен всем)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <TemplateAssignmentSelector 
        templateId={templateId} 
        ownerId={ownerId}
        compact 
      />
    </div>
  );
};
