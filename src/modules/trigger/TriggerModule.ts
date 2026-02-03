import { Zap } from 'lucide-react';
import { IModuleDefinition } from '../base/IModuleDefinition';
import { TriggerEditor } from './TriggerEditor';
import { TriggerPreview } from './TriggerPreview';
import { validateConditionLogic } from '@/utils/conditionLogicValidator';

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
    correctActivateModuleId: null,
    notCorrectActivateModuleId: null,
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
    
    // Проверяем каждый inputTrigger
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
      
      // Валидация логики условий
      if (trigger.conditionLogic && trigger.conditions?.length > 1) {
        const validationResult = validateConditionLogic(
          trigger.conditionLogic, 
          trigger.conditions.length
        );
        
        if (!validationResult.isValid) {
          validationResult.errors.forEach(error => {
            errors.push({
              field: `inputTriggers[${idx}].conditionLogic`,
              message: `Триггер ${idx + 1}: ${error.message}`,
            });
          });
        }
      }
      
      // Проверка условий
      trigger.conditions?.forEach((condition: any, condIdx: number) => {
        if (condition.type === 'trigger' && !condition.triggerType) {
          errors.push({
            field: `inputTriggers[${idx}].conditions[${condIdx}].triggerType`,
            message: `Триггер ${idx + 1}, условие ${condIdx + 1}: не выбран тип триггера`,
          });
        }
        
        if (condition.type === 'filter' && !condition.operator) {
          errors.push({
            field: `inputTriggers[${idx}].conditions[${condIdx}].operator`,
            message: `Триггер ${idx + 1}, условие ${condIdx + 1}: не выбран оператор фильтра`,
          });
        }
      });
    });
    
    // Проверка стратегии
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
      content: 'Информация о срабатывании триггера',
    }];
  },
  
  executeLogic: `
    1. Проверить, включен ли триггер (enabled)
    2. Для каждого inputTrigger:
       - Получить значение входного элемента
       - Проверить условия (conditions) согласно conditionLogic
       - Вернуть результат проверки
    3. Применить стратегию (all_match/any_match) к результатам всех inputTriggers
    4. Если условия выполнены:
       - Активировать модуль correctActivateModuleId
       - Передать контекст выполнения
    5. Если условия не выполнены:
       - Активировать модуль notCorrectActivateModuleId или остановить выполнение
  `,
};
