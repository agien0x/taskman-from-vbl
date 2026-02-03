// Module exports and registration
import { moduleRegistry } from './base/ModuleRegistry';
import { ModelModule } from './model/ModelModule';
import { PromptModule } from './prompt/PromptModule';
import { TriggerModule } from './trigger/TriggerModule';
import { DestinationsModule } from './destinations/DestinationsModule';
import { RouterModule } from './router/RouterModule';
import { JsonExtractorModule } from './json-extractor/JsonExtractorModule';

// Register all built-in modules
export function registerBuiltInModules() {
  moduleRegistry.register(TriggerModule);
  moduleRegistry.register(PromptModule);
  moduleRegistry.register(ModelModule);
  moduleRegistry.register(JsonExtractorModule);
  moduleRegistry.register(RouterModule);
  moduleRegistry.register(DestinationsModule);
}

// Export modules for direct access if needed
export {
  ModelModule,
  PromptModule,
  TriggerModule,
  DestinationsModule,
  RouterModule,
  JsonExtractorModule,
};

// Export module registry
export { moduleRegistry } from './base/ModuleRegistry';
export type { IModuleDefinition } from './base/IModuleDefinition';
