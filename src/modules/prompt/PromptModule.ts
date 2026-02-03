import { FileText } from 'lucide-react';
import { IModuleDefinition } from '../base/IModuleDefinition';
import { PromptEditor } from './PromptEditor';
import { PromptPreview } from './PromptPreview';

export const PromptModule: IModuleDefinition = {
  type: 'prompt',
  label: 'Промпт и инпуты',
  icon: FileText,
  color: 'bg-purple-100 text-purple-700 border-purple-200',
  description: 'Настройка промпта с динамическими инпутами',
  
  getDefaultConfig: () => ({
    content: '',
  }),
  
  validateConfig: (config) => {
    const errors = [];
    const warnings = [];
    
    if (!config.content || config.content.trim() === '') {
      warnings.push({ 
        field: 'content', 
        message: 'Промпт пустой' 
      });
    }
    
    // Проверка на наличие agent-input элементов
    const hasInputs = config.content && config.content.includes('<agent-input');
    if (!hasInputs) {
      warnings.push({
        field: 'content',
        message: 'Промпт не содержит динамических инпутов',
      });
    }
    
    return { 
      valid: errors.length === 0, 
      errors,
      warnings 
    };
  },
  
  EditorComponent: PromptEditor,
  PreviewComponent: PromptPreview,
  
  getDynamicOutputs: (config, moduleId) => {
    if (!config.content) return [];
    
    return [{
      id: `module_${moduleId}_prompt`,
      type: `module_${moduleId}_prompt_output`,
      label: 'Сформированный промпт',
      content: 'Промпт с подставленными значениями',
    }];
  },
  
  executeLogic: `
    1. Получить содержимое промпта (content)
    2. Найти все <agent-input> элементы в промпте
    3. Для каждого элемента:
       - Извлечь type и elementId
       - Найти соответствующее значение из входных данных
       - Подставить значение вместо элемента
    4. Вернуть обработанный промпт
  `,
};
