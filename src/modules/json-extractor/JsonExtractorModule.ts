import { IModuleDefinition, ValidationResult } from '../base/IModuleDefinition';
import { Code2, type LucideIcon } from 'lucide-react';
import { JsonExtractorEditor } from './JsonExtractorEditor';
import { JsonExtractorPreview } from './JsonExtractorPreview';
import { JsonVariable, InputElement } from '@/types/agent';

export interface JsonExtractorConfig {
  variables: JsonVariable[];
  sourceInputId?: string;
}

// Simple JSONPath validation
const validateJsonPath = (path: string): boolean => {
  if (!path || path.trim() === '') return false;
  
  // Basic validation: should start with $ or contain valid JSONPath syntax
  const pathPattern = /^(\$|\.)[a-zA-Z0-9_\[\]\.\*\-]+$/;
  return pathPattern.test(path.trim()) || path.includes('[') || path.includes('.');
};

export const JsonExtractorModule: IModuleDefinition = {
  type: 'json_extractor',
  label: 'Извлечение JSON',
  icon: Code2 as LucideIcon,
  color: 'hsl(var(--chart-3))',
  description: 'Извлечение данных из JSON с помощью JSONPath',

  getDefaultConfig: (): JsonExtractorConfig => ({
    variables: [],
    sourceInputId: undefined
  }),

  validateConfig: (config: JsonExtractorConfig): ValidationResult => {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    if (!config.variables || config.variables.length === 0) {
      warnings.push({
        field: 'variables',
        message: 'Нет настроенных переменных для извлечения. Добавьте хотя бы одну переменную.'
      });
    }

    // Validate each variable
    config.variables?.forEach((variable, index) => {
      if (!variable.name || variable.name.trim() === '') {
        errors.push({
          field: `variables[${index}].name`,
          message: `Переменная ${index + 1}: требуется имя переменной`
        });
      }

      if (!variable.path || variable.path.trim() === '') {
        errors.push({
          field: `variables[${index}].path`,
          message: `Переменная "${variable.name || index + 1}": требуется JSONPath`
        });
      } else if (!validateJsonPath(variable.path)) {
        errors.push({
          field: `variables[${index}].path`,
          message: `Переменная "${variable.name}": некорректный JSONPath "${variable.path}"`
        });
      }

      // Check for duplicate names
      const duplicates = config.variables.filter(v => v.name === variable.name);
      if (duplicates.length > 1) {
        errors.push({
          field: `variables[${index}].name`,
          message: `Переменная "${variable.name}": дублирующееся имя переменной`
        });
      }
    });

    if (!config.sourceInputId) {
      warnings.push({
        field: 'sourceInputId',
        message: 'Не указан источник данных. По умолчанию будет использован вывод модели.'
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  EditorComponent: JsonExtractorEditor,
  PreviewComponent: JsonExtractorPreview,

  getDynamicOutputs: (config: JsonExtractorConfig, moduleId: string): InputElement[] => {
    // Each JSON variable becomes an available input
    return (config.variables || []).map((variable, index) => ({
      id: `${moduleId}_json_${variable.name}`,
      type: 'json_variable',
      label: `JSON: ${variable.name}`,
      order: 1000 + index
    }));
  },

  executeLogic: `
    1. Получить JSON данные из указанного источника (sourceInputId или output модели)
    2. Для каждой переменной:
       - Применить JSONPath выражение к JSON данным
       - Извлечь значение по указанному пути
       - Сохранить в переменную с заданным именем
    3. Сделать все извлеченные переменные доступными для последующих модулей
  `
};
