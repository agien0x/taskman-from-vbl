import { Zap } from 'lucide-react';
import { IModuleDefinition } from '../base/IModuleDefinition';
import { TriggerEditor } from './TriggerEditor';
import { TriggerPreview } from './TriggerPreview';

export const TriggerModule: IModuleDefinition = {
  type: 'trigger',
  label: 'Триггер',
  icon: Zap,
  color: 'bg-blue-100 text-blue-700 border-blue-200',
  description: 'Настройка условий запуска агента',
  
  getDefaultConfig: () => ({
    enabled: false,
    inputTriggers: [],
    strategy: 'any_match',
  }),
  
  validateConfig: (config) => {
    const errors = [];
    const warnings = [];
    
    if (!config.inputTriggers || config.inputTriggers.length === 0) {
      warnings.push({ 
        field: 'inputTriggers', 
        message: 'Не настроено ни одного триггера' 
      });
    }
    
    config.inputTriggers?.forEach((trigger: any, idx: number) => {
      if (!trigger.inputId) {
        errors.push({ 
          field: `inputTriggers[${idx}].inputId`, 
          message: `Триггер ${idx + 1}: не выбран входной элемент` 
        });
      }
      
      if (!trigger.conditions || trigger.conditions.length === 0) {
        errors.push({ 
          field: `inputTriggers[${idx}].conditions`, 
          message: `Триггер ${idx + 1}: не добавлено ни одного условия` 
        });
      }
    });
    
    if (!['all_match', 'any_match'].includes(config.strategy)) {
      errors.push({ 
        field: 'strategy', 
        message: 'Недопустимая стратегия. Используйте all_match или any_match' 
      });
    }
    
    return { 
      valid: errors.length === 0, 
      errors,
      warnings 
    };
  },
  
  EditorComponent: TriggerEditor,
  PreviewComponent: TriggerPreview,
  
  getDynamicOutputs: (config, moduleId) => {
    if (!config.enabled) return [];
    
    return [{
      id: `module_${moduleId}_trigger_status`,
      type: `module_${moduleId}_trigger_status`,
      label: 'Триггер статус',
    }];
  },
  
  executeLogic: `
    1. Проверить, включен ли триггер (enabled)
    2. Получить входные данные для проверки
    3. Для каждого inputTrigger:
       - Проверить все условия (conditions)
       - Применить логику условий (conditionLogic)
    4. Применить стратегию (all_match/any_match)
    5. Вернуть результат: триггер сработал или нет
  `,
};
