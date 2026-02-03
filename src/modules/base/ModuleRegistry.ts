import { IModuleDefinition } from './IModuleDefinition';

class ModuleRegistry {
  private modules = new Map<string, IModuleDefinition>();
  
  register(definition: IModuleDefinition) {
    if (this.modules.has(definition.type)) {
      console.warn(`Module ${definition.type} already registered, overwriting`);
    }
    this.modules.set(definition.type, definition);
  }
  
  get(type: string): IModuleDefinition | undefined {
    return this.modules.get(type);
  }
  
  getAll(): IModuleDefinition[] {
    return Array.from(this.modules.values());
  }
  
  has(type: string): boolean {
    return this.modules.has(type);
  }
}

export const moduleRegistry = new ModuleRegistry();
