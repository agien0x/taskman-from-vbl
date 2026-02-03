import { IModuleDefinition, ValidationResult } from '../base/IModuleDefinition';
import { Database, type LucideIcon } from 'lucide-react';
import { DestinationsEditor } from './DestinationsEditor';
import { DestinationsPreview } from './DestinationsPreview';
import { DestinationElement, InputElement } from '../../types/agent';

export interface DestinationsConfig {
  destinations: DestinationElement[];
}

export const DestinationsModule: IModuleDefinition = {
  type: 'destinations',
  label: 'Направления',
  icon: Database as LucideIcon,
  color: 'hsl(var(--chart-4))',
  description: 'Определение целевых направлений для вывода данных агента',

  getDefaultConfig: (): DestinationsConfig => ({
    destinations: []
  }),

  validateConfig: (config: DestinationsConfig): ValidationResult => {
    const errors: Array<{ field: string; message: string }> = [];
    const warnings: Array<{ field: string; message: string }> = [];

    // Обратная совместимость: читаем из elements если destinations пустой
    const destinations = config.destinations?.length > 0 
      ? config.destinations 
      : (config as any).elements || [];

    if (!destinations || destinations.length === 0) {
      warnings.push({
        field: 'destinations',
        message: 'Нет настроенных направлений. Добавьте хотя бы одно направление для вывода данных.'
      });
    }

    // Validate each destination
    destinations.forEach((dest: any, index: number) => {
      if (!dest.label || dest.label.trim() === '') {
        errors.push({
          field: `destinations[${index}].label`,
          message: `Направление ${index + 1}: требуется название`
        });
      }

      if (!dest.type || dest.type.trim() === '') {
        errors.push({
          field: `destinations[${index}].type`,
          message: `Направление ${index + 1}: требуется тип`
        });
      }

      // Validate database destinations
      if (dest.targetType === 'database') {
        if (!dest.targetTable || dest.targetTable.trim() === '') {
          errors.push({
            field: `destinations[${index}].targetTable`,
            message: `Направление "${dest.label}": требуется таблица для БД`
          });
        }
        if (!dest.targetColumn || dest.targetColumn.trim() === '') {
          errors.push({
            field: `destinations[${index}].targetColumn`,
            message: `Направление "${dest.label}": требуется колонка для БД`
          });
        }
      }

      // Validate UI component destinations
      if (dest.targetType === 'ui_component') {
        if (!dest.componentName || dest.componentName.trim() === '') {
          errors.push({
            field: `destinations[${index}].componentName`,
            message: `Направление "${dest.label}": требуется имя компонента для UI`
          });
        }
        if (!dest.eventType || dest.eventType.trim() === '') {
          errors.push({
            field: `destinations[${index}].eventType`,
            message: `Направление "${dest.label}": требуется тип события для UI`
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  },

  EditorComponent: DestinationsEditor,
  PreviewComponent: DestinationsPreview,

  getDynamicOutputs: (config: DestinationsConfig, moduleId: string): InputElement[] => {
    // Destinations module creates outputs based on configured destinations
    // Обратная совместимость: читаем из elements если destinations пустой
    const destinations = config.destinations?.length > 0 
      ? config.destinations 
      : (config as any).elements || [];
      
    return destinations.map((dest: any, index: number) => ({
      id: `${moduleId}_dest_${dest.id}`,
      type: dest.type,
      label: dest.label || `Направление ${index + 1}`,
      order: 1000 + index
    }));
  }
};
