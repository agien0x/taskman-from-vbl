import { IModuleDefinition, ValidationResult } from '../base/IModuleDefinition';
import { GitBranch, type LucideIcon } from 'lucide-react';
import { RouterEditor } from './RouterEditor';
import { RouterPreview } from './RouterPreview';
import { RouterRule, InputElement } from '@/types/agent';

export interface RouterConfig {
  strategy: 'based_on_input' | 'based_on_llm' | 'all_destinations';
  rules?: RouterRule[];
  description?: string;
  content?: string; // Rich text описание логики роутинга
}

export const RouterModule: IModuleDefinition = {
  type: 'router',
  label: 'Роутинг',
  icon: GitBranch as LucideIcon,
  color: 'hsl(var(--chart-2))',
  description: 'Маршрутизация данных к различным направлениям на основе условий',

  getDefaultConfig: (): RouterConfig => ({
    strategy: 'all_destinations',
    rules: [],
    description: '',
    content: ''
  }),

  validateConfig: (config: RouterConfig): ValidationResult => {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Validate strategy
    if (!config.strategy) {
      errors.push({
        field: 'strategy',
        message: 'Требуется стратегия роутинга'
      });
    } else {
      const validStrategies = ['based_on_input', 'based_on_llm', 'all_destinations'];
      if (!validStrategies.includes(config.strategy)) {
        errors.push({
          field: 'strategy',
          message: `Некорректная стратегия: "${config.strategy}". Допустимые: ${validStrategies.join(', ')}`
        });
      }
    }

    // Validate rules based on strategy
    if (config.strategy === 'based_on_input' || config.strategy === 'based_on_llm') {
      if (!config.rules || config.rules.length === 0) {
        warnings.push({
          field: 'rules',
          message: `Стратегия "${config.strategy}" рекомендует настройку правил роутинга`
        });
      } else {
        // Validate each rule
        config.rules.forEach((rule, index) => {
          // Обратная совместимость: пропускаем валидацию для старого формата
          const isOldFormat = (rule as any).conditions || (rule as any).conditionLogic;
          
          if (!isOldFormat) {
            if (!rule.destinationId || rule.destinationId.trim() === '') {
              errors.push({
                field: `rules[${index}].destinationId`,
                message: `Правило ${index + 1}: требуется направление`
              });
            }

            if (config.strategy === 'based_on_input') {
              if (!rule.sourceVariableId || 
                  (Array.isArray(rule.sourceVariableId) && rule.sourceVariableId.length === 0) ||
                  (typeof rule.sourceVariableId === 'string' && rule.sourceVariableId.trim() === '')) {
                errors.push({
                  field: `rules[${index}].sourceVariableId`,
                  message: `Правило ${index + 1}: требуется источник данных для роутинга по входным данным`
                });
              }
            }
          }
        });
      }
    }

    // Validate LLM description for based_on_llm strategy
    if (config.strategy === 'based_on_llm') {
      if (!config.content || config.content.trim() === '' || config.content === '<p></p>') {
        warnings.push({
          field: 'content',
          message: 'Для роутинга на основе LLM рекомендуется описать логику роутинга'
        });
      }
    }

    // Warn if all_destinations has rules configured
    if (config.strategy === 'all_destinations' && config.rules && config.rules.length > 0) {
      warnings.push({
        field: 'rules',
        message: 'Стратегия "все направления" игнорирует правила роутинга. Данные будут отправлены во все направления.'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  EditorComponent: RouterEditor,
  PreviewComponent: RouterPreview,

  getDynamicOutputs: (config: RouterConfig, moduleId: string): InputElement[] => {
    // Router doesn't create new outputs, it routes existing data
    return [];
  },

  executeLogic: `
    1. Получить данные из предыдущих модулей
    2. В зависимости от стратегии:
       - all_destinations: Отправить данные во все настроенные направления
       - based_on_input: Проверить правила и отправить данные в направления согласно условиям
       - based_on_llm: Использовать LLM для определения целевых направлений на основе описания
    3. Для каждого направления выполнить соответствующую операцию (запись в БД или отправка в UI компонент)
  `
};
