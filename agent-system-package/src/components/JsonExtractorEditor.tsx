import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Plus, Trash2, GripVertical, Save, FolderOpen } from "lucide-react";
import { JsonVariable } from "../types/agent";
import { Card } from "./ui/card";
import { Textarea } from "./ui/textarea";
import { InputBadgeWithPopover } from "./InputBadgeWithPopover";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface JsonExtractorEditorProps {
  variables: JsonVariable[];
  onChange: (variables: JsonVariable[]) => void;
  sourceInputId?: string;
  onSourceChange?: (sourceInputId: string) => void;
  availableInputs?: Array<{ id: string; type: string; label?: string }>;
  supabaseClient: any;
  toast: (props: { title?: string; description?: string; variant?: string }) => void;
}

interface JsonTemplate {
  id: string;
  name: string;
  description: string | null;
  variables: JsonVariable[];
}

export const JsonExtractorEditor = ({
  variables,
  onChange,
  sourceInputId,
  onSourceChange,
  availableInputs = [],
  supabaseClient,
  toast
}: JsonExtractorEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<JsonTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const addVariable = () => {
    const newVar: JsonVariable = {
      id: `var_${Date.now()}`,
      name: "",
      path: "",
      description: "",
      example: "",
    };
    onChange([...variables, newVar]);
    setEditingId(newVar.id);
  };

  const updateVariable = (id: string, field: keyof JsonVariable, value: string) => {
    onChange(
      variables.map((v) =>
        v.id === id ? { ...v, [field]: value } : v
      )
    );
  };

  const deleteVariable = (id: string) => {
    onChange(variables.filter((v) => v.id !== id));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    const { data, error } = await supabaseClient
      .from('json_variable_templates' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading templates:', error);
      return;
    }

    setTemplates((data || []).map((t: any) => ({
      ...t,
      variables: t.variables as unknown as JsonVariable[]
    })));
  };

  const saveAsTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите название шаблона",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      toast({
        title: "Ошибка",
        description: "Необходима авторизация",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabaseClient
      .from('json_variable_templates' as any)
      .insert([{
        name: templateName,
        description: templateDescription || null,
        variables: variables as any,
        user_id: user.id,
      }]);

    if (error) {
      console.error('Error saving template:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить шаблон",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Успешно",
      description: "Шаблон сохранен",
    });

    setShowSaveDialog(false);
    setTemplateName("");
    setTemplateDescription("");
    loadTemplates();
  };

  const loadFromTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      onChange(template.variables);
      toast({
        title: "Успешно",
        description: `Шаблон "${template.name}" применен`,
      });
    }
  };

  return (
    <div className="space-y-2">
      {/* Выбор источника JSON */}
      <div className="flex items-center gap-2 mb-3">
        <Label className="text-sm min-w-fit">Источник JSON:</Label>
        <InputBadgeWithPopover
          value={sourceInputId || ''}
          onChange={(inputId) => {
            console.log('JsonExtractorEditor sourceInputId changed:', inputId);
            onSourceChange?.(inputId);
          }}
          availableInputs={availableInputs}
          placeholder="Выберите источник"
        />
      </div>

      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm">Переменные для извлечения</Label>
        <div className="flex gap-2">
          <Select value={selectedTemplateId} onValueChange={(value) => {
            setSelectedTemplateId(value);
            loadFromTemplate(value);
          }}>
            <SelectTrigger className="h-7 w-[180px] text-xs">
              <SelectValue placeholder="Выбрать шаблон" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={variables.length === 0}
              >
                <Save className="h-3 w-3 mr-1" />
                Сохранить как шаблон
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Сохранить шаблон</DialogTitle>
                <DialogDescription>
                  Создайте шаблон для переиспользования переменных в других агентах
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label>Название шаблона</Label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="API Response Variables"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Описание (опционально)</Label>
                  <Textarea
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    placeholder="Переменные для парсинга ответа API..."
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowSaveDialog(false)}
                  >
                    Отмена
                  </Button>
                  <Button onClick={saveAsTemplate}>
                    Сохранить
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addVariable}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Добавить переменную
          </Button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {variables.length === 0 ? (
          <Card className="p-4 text-center text-sm text-muted-foreground">
            Нет переменных. Нажмите "Добавить переменную" для начала.
          </Card>
        ) : (
          variables.map((variable) => (
            <Card
              key={variable.id}
              className="p-3 space-y-2 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 mt-2 text-muted-foreground cursor-move" />
                
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs mb-1">Название переменной</Label>
                      <Input
                        value={variable.name}
                        onChange={(e) => updateVariable(variable.id, "name", e.target.value)}
                        placeholder="user_id"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1">JSON Path</Label>
                      <Input
                        value={variable.path}
                        onChange={(e) => updateVariable(variable.id, "path", e.target.value)}
                        placeholder="data.user.id"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {editingId === variable.id && (
                    <>
                      <div>
                        <Label className="text-xs mb-1">Описание (опционально)</Label>
                        <Input
                          value={variable.description || ""}
                          onChange={(e) => updateVariable(variable.id, "description", e.target.value)}
                          placeholder="Идентификатор пользователя"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs mb-1">Пример значения</Label>
                        <Textarea
                          value={variable.example || ""}
                          onChange={(e) => updateVariable(variable.id, "example", e.target.value)}
                          placeholder='{"data": {"user": {"id": "12345"}}}'
                          className="text-xs min-h-[60px] font-mono"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingId(editingId === variable.id ? null : variable.id)}
                    className="h-7 w-7 p-0"
                  >
                    {editingId === variable.id ? "▲" : "▼"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteVariable(variable.id)}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {variables.length > 0 && (
        <>
          <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
            <strong>Справка:</strong> JSON Path позволяет извлекать данные из вложенных структур.
            Примеры: <code className="bg-background px-1">data.user.name</code>, <code className="bg-background px-1">items[0].price</code>, <code className="bg-background px-1">response.total</code>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded border">
            <strong>Outputs:</strong>
            <div className="flex flex-wrap gap-1 mt-1">
              {variables.map((v) => (
                <Badge key={v.id} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  → {v.name}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
