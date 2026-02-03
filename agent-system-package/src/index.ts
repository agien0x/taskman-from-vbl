// Auto-register all built-in modules on import
import { registerBuiltInModules } from './modules';
registerBuiltInModules();

// Main exports for the package
export * from './types/api';
export * from './types/agent';
export * from './types/kanban';
export * from './components/AgentSystemProvider';
export * from './modules/base/ModuleRegistry';
export * from './modules/base/IModuleDefinition';

// Export components
export { default as AgentDialog } from './components/AgentDialog';
export { ModuleCard } from './components/ModuleCard';
export { AgentAnalytics } from './components/AgentAnalytics';
export { ModuleEditor } from './components/ModuleEditor';
export { ModuleAdder } from './components/ModuleAdder';
export { InputSelectorButton } from './components/InputSelectorButton';
export { ModuleInputSelector } from './components/ModuleInputSelector';
export { AgentDestinationsEditor } from './components/AgentDestinationsEditor';
export { AgentRouterRichEditor } from './components/AgentRouterRichEditor';
export { AgentTriggerEditor } from './components/AgentTriggerEditor';
export { AgentExecutionTable } from './components/AgentExecutionTable';
export { AgentExecutionDetail } from './components/AgentExecutionDetail';
export { AgentSelector } from './components/AgentSelector';
export { AgentVersionCard } from './components/AgentVersionCard';
export { AgentRatingWidget } from './components/AgentRatingWidget';
export { AgentInputVersionCard } from './components/AgentInputVersionCard';
export { InputSelector } from './components/InputSelector';
export { InputBadgeWithPopover } from './components/InputBadgeWithPopover';
export { JsonExtractorEditor } from './components/JsonExtractorEditor';
export { FormulaEditor } from './components/FormulaEditor';
export { ConditionsBuilder } from './components/ConditionsBuilder';
export { ConditionLogicEditor } from './components/ConditionLogicEditor';
export { SortableConditionItem } from './components/SortableConditionItem';
export { SortableConditionItemWithEdit } from './components/SortableConditionItemWithEdit';
export { LogicElementAdder } from './components/LogicElementAdder';
export { SortableLogicElement } from './components/SortableLogicElement';
export { SortableLogicElementWithEdit } from './components/SortableLogicElementWithEdit';
export { RouterRulesEditor } from './components/RouterRulesEditor';
export { AgentInputsRichEditor } from './components/AgentInputsRichEditor';
export { ModuleBadgeWithPopover } from './components/ModuleBadgeWithPopover';
export { ModuleVersionCard } from './components/ModuleVersionCard';
export { RecurrenceTimeSelector } from './components/RecurrenceTimeSelector';
export { TriggerConditionItem } from './components/TriggerConditionItem';
export { UniversalElementMenu } from './components/UniversalElementMenu';

// Export editor components
export { UnifiedEditor } from './components/editor/UnifiedEditor';
export { EditorToolbar } from './components/editor/EditorToolbar';
export { FloatingToolbar } from './components/editor/FloatingToolbar';
export { MentionExtension } from './components/editor/MentionExtension';
export { MentionList } from './components/editor/MentionList';
export { SlashCommandExtension } from './components/editor/SlashCommandExtension';
export { AgentElementNodeView } from './components/editor/AgentElementNodeView';
export { CollaborationExtension } from './components/editor/CollaborationExtension';

// Export execution views
export { ScoreExecutionView } from './components/execution-views/ScoreExecutionView';

// Export Voice Input
export { VoiceInputWithAgents } from './components/ui/VoiceInputWithAgents';

// Export UI components
export { Button } from './components/ui/button';
export { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './components/ui/dialog';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './components/ui/tabs';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
export { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
export { ScrollArea } from './components/ui/scroll-area';
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip';
export { Separator } from './components/ui/separator';
export { Switch } from './components/ui/switch';
export { Label } from './components/ui/label';
export { Checkbox } from './components/ui/checkbox';
export { Input } from './components/ui/input';
export { Textarea } from './components/ui/textarea';
export { Badge } from './components/ui/badge';
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './components/ui/card';
export { HoverCard, HoverCardContent, HoverCardTrigger } from './components/ui/hover-card';
export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';
export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from './components/ui/command';
export { Toaster } from './components/ui/toaster';
export { Alert, AlertDescription, AlertTitle } from './components/ui/alert';
export { SlashCommandMenu } from './components/ui/SlashCommandMenu';
export { useToast, toast } from './hooks/use-toast';
export { ChartContainer, ChartTooltip, ChartTooltipContent } from './components/ui/chart';

// Export hooks
export { useAgentVersions } from './hooks/useAgentVersions';
export { useAgentRatings } from './hooks/useAgentRatings';
export { useAgentInputVersions } from './hooks/useAgentInputVersions';
export { useModuleVersions } from './hooks/useModuleVersions';
// useDatabaseSchema removed - use main app's hook instead
export { useSlashCommand } from './hooks/useSlashCommand';

// Export contexts
export { AgentInputsProvider, useAgentInputs } from './contexts/AgentInputsContext';

// Export utility functions
export { cn, getCleanTitle } from './lib/utils';
export * from './utils/inputPreview';
export { parseMentions, type MentionSegment } from './utils/mentionParser';

// Version
export { AGENT_SYSTEM_VERSION } from './types/api';
