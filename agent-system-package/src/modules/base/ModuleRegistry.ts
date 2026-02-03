import { IModuleDefinition } from './IModuleDefinition';

/**
 * Central registry for all agent modules
 */
class ModuleRegistry {
  private modules = new Map<string, IModuleDefinition>();

  /**
   * Register a new module definition
   */
  register(definition: IModuleDefinition) {
    if (this.modules.has(definition.type)) {
      console.warn(`Module ${definition.type} already registered, overwriting`);
    }
    this.modules.set(definition.type, definition);
  }

  /**
   * Get a module definition by type
   */
  get(type: string): IModuleDefinition | undefined {
    return this.modules.get(type);
  }

  /**
   * Get all registered module definitions
   */
  getAll(): IModuleDefinition[] {
    return Array.from(this.modules.values());
  }

  /**
   * Check if a module type is registered
   */
  has(type: string): boolean {
    return this.modules.has(type);
  }

  /**
   * Unregister a module
   */
  unregister(type: string): boolean {
    return this.modules.delete(type);
  }

  /**
   * Clear all registered modules
   */
  clear() {
    this.modules.clear();
  }
}

// Export singleton instance
export const moduleRegistry = new ModuleRegistry();
