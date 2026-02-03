# @lovable/agent-system

Reusable agent dialog system with modular architecture for Lovable projects.

## Features

- ð¯ **Modular Architecture**: Extensible module system with 6 built-in modules (Trigger, Prompt, Model, Router, Destinations, JSON Extractor)
- ð **Plug & Play**: Easy integration with any Lovable project via NPM
- ð¨ **Customizable**: Override UI components and extend with custom modules
- ð **Type-Safe**: Full TypeScript support with comprehensive type definitions
- ð¦ **Self-Contained**: Includes database migrations and edge functions
- ð **Production Ready**: Versioning, testing, and RLS policies included
- â¡ **Auto-Registration**: Built-in modules are automatically registered on import
- ðï¸ **React Components**: Pre-built UI components for agent management
- ðª **Custom Hooks**: React hooks for agent versions, ratings, and analytics
- ð ï¸ **CLI Tools**: Command-line utilities for setup and management

## Installation

```bash
npm install @lovable/agent-system
```

## Quick Start

### 1. Initialize the system

```bash
npx agent-system init
```

This will:
- Copy SQL migrations to `supabase/migrations/`
- Copy edge functions to `supabase/functions/`
- Create `agent-system.config.ts`

### 2. Run migrations

```bash
npx agent-system migrate
```

### 3. Deploy functions

```bash
npx agent-system deploy
```

### 4. Integrate in your app

```typescript
import { AgentSystemProvider } from '@lovable/agent-system';
import { agentSystemConfig } from './agent-system.config';

function App() {
  return (
    <AgentSystemProvider config={agentSystemConfig}>
      <YourApp />
    </AgentSystemProvider>
  );
}
```

### 5. Use AgentDialog

```typescript
import { useAgentSystem } from '@lovable/agent-system';

function AgentsPage() {
  const { listAgents, createAgent, executeAgent } = useAgentSystem();
  
  // Use the API to manage agents
  const agents = await listAgents();
  
  return <div>Your UI here</div>;
}
```

## Configuration

### Basic Config

```typescript
// agent-system.config.ts
import { AgentSystemConfig } from '@lovable/agent-system';

export const agentSystemConfig: AgentSystemConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || '',
};
```

### Advanced Config

```typescript
export const agentSystemConfig: AgentSystemConfig = {
  supabaseUrl: process.env.VITE_SUPABASE_URL || '',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || '',
  
  // Customize table names
  tables: {
    agents: 'my_agents',
    executions: 'my_agent_executions',
  },
  
  // Customize function names
  functions: {
    testAgent: 'my-test-agent',
    checkTriggers: 'my-check-triggers',
  },
};
```

## API Reference

### useAgentSystem()

Hook to access Agent System API.

```typescript
const {
  // CRUD
  createAgent,
  updateAgent,
  deleteAgent,
  getAgent,
  listAgents,
  
  // Execution
  executeAgent,
  
  // Triggers
  checkAndExecuteTriggers,
  
  // Modules
  registerModule,
  getAvailableModules,
  
  // Schema
  listTables,
  listColumns,
} = useAgentSystem();
```

### Creating an Agent

```typescript
const agent = await createAgent({
  name: 'My Agent',
  model: 'grok-4-0709',
  prompt: 'You are a helpful assistant',
  modules: [
    {
      id: 'module-1',
      type: 'prompt',
      order: 0,
      config: { content: 'Hello {{task_title}}' },
    },
  ],
});
```

### Executing an Agent

```typescript
const result = await executeAgent('agent-id', {
  task_title: 'My Task',
  task_content: 'Task description',
});

console.log(result.output); // Agent's response
console.log(result.modules_chain); // Execution log
```

## Custom Modules

You can register custom modules to extend the Agent System:

```typescript
import { ModuleRegistry } from '@lovable/agent-system';

ModuleRegistry.register({
  type: 'my-custom-module',
  label: 'Custom Module',
  icon: MyIcon,
  color: 'bg-purple-100',
  
  getDefaultConfig: () => ({ value: '' }),
  
  validateConfig: (config) => ({
    valid: !!config.value,
    errors: config.value ? [] : [{ field: 'value', message: 'Required' }],
  }),
  
  EditorComponent: MyCustomEditor,
  PreviewComponent: MyCustomPreview,
  
  getDynamicOutputs: (config, moduleId) => [
    {
      id: `module_${moduleId}_output`,
      type: `module_${moduleId}_output`,
      label: 'Custom Output',
    },
  ],
});
```

## Dependency Injection

All module editors support Dependency Injection for external services. These props are automatically passed from `ModuleEditor` to all registered module `EditorComponent`s:

- **`supabaseClient`** - Supabase client instance for database operations
- **`toast`** - Toast notification function for user feedback
- **`onImageUpload`** - Image upload handler for rich text editors

Example usage in a custom module editor:

```typescript
export const MyCustomEditor: React.FC<ModuleEditorProps> = ({
  module,
  onChange,
  supabaseClient,  // Injected automatically
  toast,           // Injected automatically
  onImageUpload,   // Injected automatically
}) => {
  const handleSave = async () => {
    try {
      await supabaseClient.from('my_table').insert({ data: module.config });
      toast?.({ title: 'Success', description: 'Saved!' });
    } catch (error) {
      toast?.({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };
  
  return <div>...</div>;
};
```

## Built-in Modules

### Prompt Module

The Prompt module uses `UnifiedEditor` for rich text editing with dynamic agent inputs.

**Features:**
- Rich text formatting (bold, italic, lists, etc.)
- Dynamic `<agent-input>` element insertion
- Visual input badges with tooltips
- Prompt testing functionality
- Image upload support (via DI)

**Required DI Props:**
- `supabaseClient` - For mention suggestions
- `onImageUpload` - For image handling
- `toast` - For notifications

### Model Module

The Model module allows selecting an LLM model for processing.

**Features:**
- Support for Google Gemini models (2.5 Pro, Flash, Flash Lite)
- Support for OpenAI GPT-5 models (GPT-5, GPT-5 Mini, GPT-5 Nano)
- Support for X.AI Grok models (Grok 4, Grok 3, Grok 3 Mini, Grok 2 Image)
- Input source selection via `ModuleInputSelector`
- Model testing functionality with output preview

**Available Models:**
- `google/gemini-2.5-pro` - Gemini 2.5 Pro
- `google/gemini-2.5-flash` - Gemini 2.5 Flash (default)
- `google/gemini-2.5-flash-lite` - Gemini 2.5 Flash Lite
- `openai/gpt-5` - GPT-5
- `openai/gpt-5-mini` - GPT-5 Mini
- `openai/gpt-5-nano` - GPT-5 Nano
- `grok-4-0709` - Grok 4 (July 2024)
- `grok-3` - Grok 3
- `grok-3-mini` - Grok 3 Mini
- `grok-2-image-1212` - Grok 2 Image (December 2024)

**Configuration:**
- `sourceInputId` - Input source for the model
- `model` - Selected LLM model
- `temperature` - Model temperature (0-1)
- `maxTokens` - Maximum tokens (optional)

### Router Module

The Router module enables data routing to different destinations based on conditions or LLM decisions.

**Features:**
- Three routing strategies:
  - `all_destinations` - Route to all configured destinations
  - `based_on_input` - Route based on input data conditions
  - `based_on_llm` - Route based on LLM decision with custom logic description
- Visual rule editor with drag & drop
- Source input selection via `ModuleInputSelector`
- Destination selection via `InputBadgeWithPopover`
- Support for JSON variables from JSON Extractor module
- Module testing functionality with output preview
- Backward compatibility with legacy rule formats

**Required DI Props:**
- `supabaseClient` - For fetching destinations from other agents
- `toast` - For notifications
- `availableModules` - For accessing destinations from Destinations module

**Configuration:**
- `strategy` - Routing strategy:
  - `'all_destinations'` - Send to all destinations (no rules needed)
  - `'based_on_input'` - Conditional routing based on input data
  - `'based_on_llm'` - LLM-based routing with custom logic
- `rules` - Array of `RouterRule` objects (for `based_on_input` and `based_on_llm`):
  - `id` - Unique identifier
  - `sourceVariableId` - Source data for routing decision (string or array)
  - `destinationId` - Target destination ID
- `content` - Rich text description of routing logic (for `based_on_llm`)

**UI Components:**
- `AgentRouterRichEditor` - Visual editor with Tiptap for routing logic
- `RouterRulesEditor` - Rule management interface
- Dynamic strategy icons (Target, Database, Zap)
- Badge-based preview with rule count and warnings

**Backward Compatibility:**
Supports legacy rule formats with `conditions`, `conditionLogic`, and `variableMapping` fields.

### JSON Extractor Module

The JSON Extractor module extracts data from JSON using JSONPath expressions.

**Features:**
- Add multiple JSON variables with custom names and paths
- JSONPath validation
- Variable templates (save/load common extraction patterns)
- Source input selection via `InputBadgeWithPopover`
- Module testing functionality with output preview
- Expand/Collapse variable details (description, example)
- Drag & Drop support for reordering variables

**Required DI Props:**
- `supabaseClient` - For template management
- `toast` - For notifications

**Configuration:**
- `variables` - Array of `JsonVariable` objects:
  - `id` - Unique identifier
  - `name` - Variable name (e.g., "user_id")
  - `path` - JSONPath expression (e.g., "$.user.id")
  - `description` - Optional description
  - `example` - Optional example value

### Destinations Module

The Destinations module defines target destinations for agent output data.

**Features:**
- Two destination types:
  - **Database** - Write to specific database table and column
  - **UI Component** - Dispatch events to UI components
- Full CRUD operations with drag & drop reordering
- Dynamic table and column selection via Supabase edge functions
- Input insertion via `InputSelector` (add from predefined input groups)
- Module testing functionality with output preview
- Backward compatibility with legacy `elements` field

**Required DI Props:**
- `supabaseClient` - For fetching database schema (tables, columns)
- `toast` - For notifications (optional)

**Configuration:**
- `destinations` - Array of `DestinationElement` objects:
  - `id` - Unique identifier
  - `type` - Destination type (e.g., 'task_content', 'task_pitch')
  - `label` - Human-readable label
  - `targetType` - `'database'` or `'ui_component'`
  - **For database destinations:**
    - `targetTable` - Table name
    - `targetColumn` - Column name
    - `targetRecordId` - Record ID (optional, defaults to context)
  - **For UI component destinations:**
    - `componentName` - Component name (e.g., 'ParentSuggestions', 'TaskComments')
    - `eventType` - Event type (optional)
  - `order` - Display order

**UI Components:**
- `AgentDestinationsEditor` - Full-featured destination manager with drag & drop
- Dynamic icons (Database, Component) in preview
- Badge-based preview with grouping by type

**Backward Compatibility:**
Supports legacy `elements` field, automatically migrates to `destinations`.
- `sourceInputId` - Input source for JSON data (defaults to model output)

**JSONPath Examples:**
- `$.user.name` - Get user.name
- `$.items[0].price` - First item in items array
- `$.data.*.id` - All ids in data object
- `$..email` - All email fields at any level

## Database Tables

The system creates the following tables:

- `agents` - Agent configurations
- `agent_executions` - Execution history
- `trigger_executions` - Trigger logs
- `agent_versions` - Version history
- `agent_ratings` - User ratings
- `agent_input_versions` - Input version history
- `module_versions` - Module templates

All tables include RLS policies for security.

## Edge Functions

The system includes:

- `test-agent` - Execute agents with modules
- `check-and-execute-triggers` - Handle trigger events
- `list-tables` - Get database schema
- `list-columns` - Get table columns

## Examples

See the `examples/` directory for complete integration examples.

## License

MIT

## Support

For issues and questions, please visit [GitHub Issues](https://github.com/lovable/agent-system/issues)
