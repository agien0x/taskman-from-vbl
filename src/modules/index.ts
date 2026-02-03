import { moduleRegistry } from './base/ModuleRegistry';
import { ModelModule } from './model/ModelModule';
import { TriggerModule } from './trigger/TriggerModule';
import { PromptModule } from './prompt/PromptModule';
import { DestinationsModule } from './destinations/DestinationsModule';
import { JsonExtractorModule } from './json-extractor/JsonExtractorModule';
import { RouterModule } from './router/RouterModule';

// Регистрация модулей
moduleRegistry.register(ModelModule);
moduleRegistry.register(TriggerModule);
moduleRegistry.register(PromptModule);
moduleRegistry.register(DestinationsModule);
moduleRegistry.register(JsonExtractorModule);
moduleRegistry.register(RouterModule);

export { moduleRegistry };
export type { IModuleDefinition, ModuleEditorProps, ModulePreviewProps } from './base/IModuleDefinition';
