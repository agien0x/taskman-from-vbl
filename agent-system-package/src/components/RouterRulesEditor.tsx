import { Label } from './ui/label';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { RouterRule, DestinationElement, InputElement } from '../types/agent';
import { InputBadgeWithPopover } from './InputBadgeWithPopover';
import { ModuleInputSelector } from './ModuleInputSelector';

interface RouterRulesEditorProps {
  rules: RouterRule[];
  onChange: (rules: RouterRule[]) => void;
  jsonVariables: Array<{ id?: string; name: string; path: string }>;
  destinations: DestinationElement[];
  availableInputs: InputElement[];
}

export const RouterRulesEditor = ({ 
  rules, 
  onChange, 
  jsonVariables,
  destinations,
  availableInputs 
}: RouterRulesEditorProps) => {
  
  // Логируем destinations для отладки
  console.log('[RouterRulesEditor] Current destinations:', destinations);
  console.log('[RouterRulesEditor] Destinations count:', destinations?.length);
  
  const addRule = () => {
    const newRule: RouterRule = {
      id: `rule_${Date.now()}`,
      sourceVariableId: [],
      destinationId: '',
    };
    onChange([...rules, newRule]);
  };

  // Преобразуем jsonVariables в InputElement формат и объединяем с availableInputs
  const jsonInputsType: InputElement[] = jsonVariables.map((v, idx) => ({
    id: `type_json_${v.name}`,
    type: `json_var_${v.name}`,
    label: `${v.name} (${v.path})`,
    order: availableInputs.length + idx,
  }));

  // Backward compatibility for older saved configs using json_var_* ids
  const legacyJsonInputs: InputElement[] = jsonVariables.map((v, idx) => ({
    id: `json_var_${v.name}`,
    type: `json_var_${v.name}`,
    label: `${v.name} (${v.path})`,
    order: availableInputs.length + idx + jsonVariables.length,
  }));

  const allAvailableInputs = [...availableInputs, ...jsonInputsType, ...legacyJsonInputs];

  const updateRule = (id: string, updates: Partial<RouterRule>) => {
    onChange(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeRule = (id: string) => {
    onChange(rules.filter(r => r.id !== id));
  };

  // Преобразуем destinations в InputElement формат для селектора
  const destinationsInputs: InputElement[] = destinations.map((dest, idx) => {
    // Формируем читаемый label
    let displayLabel = dest.label || dest.type;
    
    // Если есть targetTable и targetColumn, показываем полный путь
    if (dest.targetTable && dest.targetColumn) {
      displayLabel = `${dest.targetTable}.${dest.targetColumn}`;
    } else if (dest.componentName) {
      displayLabel = `UI: ${dest.componentName}`;
    }
    
    return {
      id: dest.id,  // ID направления (dest_1763374158967)
      type: `destination_${dest.type}`,  // Добавляем префикс для группировки
      label: displayLabel,  // Полный путь: "tasks.pitch"
      order: availableInputs.length + idx,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Правила роутинга</Label>
        <Button variant="outline" size="sm" onClick={addRule}>
          <Plus className="h-4 w-4 mr-1" />
          Добавить правило
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-md">
          Нет правил роутинга
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.id} className="p-3 border rounded-md space-y-2 bg-muted/20">
              <div className="flex items-start justify-between gap-2">
              <div className="flex-1 space-y-2">
                  <div>
                    <ModuleInputSelector
                      label="Источник данных"
                      value={Array.isArray(rule.sourceVariableId) ? rule.sourceVariableId : []}
                      onChange={(ids) => updateRule(rule.id, { sourceVariableId: ids })}
                      availableInputs={allAvailableInputs}
                      placeholder="Выберите источники данных"
                      description="Можно выбрать несколько источников"
                      multiple={true}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Направление</Label>
                    <div className="mt-1">
                      <InputBadgeWithPopover
                        value={rule.destinationId}
                        onChange={(destinationId) => updateRule(rule.id, { destinationId })}
                        availableInputs={destinationsInputs}
                        placeholder="Выберите направление"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRule(rule.id)}
                >
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
