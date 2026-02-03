import { Brain } from 'lucide-react';
import { IModuleDefinition } from '../base/IModuleDefinition';
import { ModelEditor } from './ModelEditor';
import { ModelPreview } from './ModelPreview';
import { AVAILABLE_MODELS } from '@/types/agent';

export const ModelModule: IModuleDefinition = {
  type: 'model',
  label: 'Модель LLM',
  icon: Brain,
  color: 'bg-green-100 text-green-700 border-green-200',
  description: 'Выбор LLM модели для обработки',
  
  getDefaultConfig: () => ({
    model: 'google/gemini-2.5-flash',
    sourceInputId: null,
    temperature: 0.7,
    maxTokens: null,
  }),
  
  validateConfig: (config) => {
    const errors = [];
    
    if (!config.model) {
      errors.push({ field: 'model', message: 'Модель не выбрана' });
    }
    
    if (!AVAILABLE_MODELS.find(m => m.value === config.model)) {
      errors.push({ field: 'model', message: 'Недопустимая модель' });
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  EditorComponent: ModelEditor,
  PreviewComponent: ModelPreview,
  
  getDynamicOutputs: (config, moduleId) => [{
    id: `module_${moduleId}_output`,
    type: `module_${moduleId}_llm_response`,
    label: `${config.model || 'LLM'} ответ`,
    content: 'Ответ модели LLM',
  }],
  
  executeLogic: `
    1. Получить входные данные из sourceInputId или предыдущего модуля
    2. Вызвать X.AI API с выбранной моделью
    3. Вернуть ответ LLM
  `,
};
