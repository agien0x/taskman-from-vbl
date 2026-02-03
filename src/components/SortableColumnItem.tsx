import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, X, Check, Maximize2, Minimize2, GripVertical, Palette } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CSS } from "@dnd-kit/utilities";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Column {
  id: string;
  title: string;
  collapsed?: boolean;
  color?: string;
}

interface SortableColumnItemProps {
  column: Column;
  editingId: string | null;
  editingTitle: string;
  showSuggestions: boolean;
  globalStages: string[];
  columns: Column[];
  onEditColumn: (column: Column) => void;
  onSaveEdit: () => void;
  onDeleteColumn: (columnId: string) => void;
  onEditingTitleChange: (title: string) => void;
  onShowSuggestionsChange: (show: boolean) => void;
  onColumnsChange: (columns: Column[]) => void;
  saveColumns: (columns: Column[]) => void;
}

export const SortableColumnItem = ({
  column,
  editingId,
  editingTitle,
  showSuggestions,
  globalStages,
  columns,
  onEditColumn,
  onSaveEdit,
  onDeleteColumn,
  onEditingTitleChange,
  onShowSuggestionsChange,
  onColumnsChange,
  saveColumns,
}: SortableColumnItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      {editingId === column.id ? (
        <>
          <div className="flex-1 relative">
            <Input
              value={editingTitle}
              onChange={(e) => {
                onEditingTitleChange(e.target.value);
                onShowSuggestionsChange(true);
              }}
              onFocus={() => onShowSuggestionsChange(true)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") {
                  onEditingTitleChange("");
                  onShowSuggestionsChange(false);
                }
              }}
            />
            {showSuggestions && (
              <Command className="absolute top-full left-0 right-0 mt-1 z-50 border rounded-md shadow-md bg-popover h-auto max-h-[60vh]">
                <CommandList className="min-h-[200px] max-h-none">
                  {editingTitle && <CommandEmpty>Создать "{editingTitle}"</CommandEmpty>}
                  <CommandGroup heading="Сквозные стейджи">
                    {globalStages
                      .filter(stage => 
                        !editingTitle || stage.toLowerCase().includes(editingTitle.toLowerCase())
                      )
                      .map((stage) => (
                        <CommandItem
                          key={stage}
                          onSelect={() => {
                            onEditingTitleChange(stage);
                            onShowSuggestionsChange(false);
                          }}
                          className="cursor-pointer"
                        >
                          {stage}
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            )}
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Palette className="h-4 w-4" style={{ color: column.color || 'currentColor' }} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-5 gap-2">
                {[
                  { name: 'Без цвета', value: undefined },
                  { name: 'Красный', value: '#ef4444' },
                  { name: 'Оранжевый', value: '#f97316' },
                  { name: 'Желтый', value: '#eab308' },
                  { name: 'Зеленый', value: '#22c55e' },
                  { name: 'Голубой', value: '#06b6d4' },
                  { name: 'Синий', value: '#3b82f6' },
                  { name: 'Фиолетовый', value: '#a855f7' },
                  { name: 'Розовый', value: '#ec4899' },
                  { name: 'Серый', value: '#6b7280' },
                ].map((color) => (
                  <Tooltip key={color.name}>
                    <TooltipTrigger asChild>
                      <button
                        className="h-8 w-8 rounded border-2 hover:scale-110 transition-transform"
                        style={{
                          backgroundColor: color.value || 'transparent',
                          borderColor: !color.value ? 'currentColor' : 'transparent',
                        }}
                        onClick={() => {
                          const updated = columns.map(col =>
                            col.id === column.id ? { ...col, color: color.value } : col
                          );
                          onColumnsChange(updated);
                        }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{color.name}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveEdit}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 text-sm px-2 py-1.5 rounded border bg-background flex items-center justify-between">
            <span>{column.title}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const updated = columns.map(col =>
                      col.id === column.id ? { ...col, collapsed: !col.collapsed } : col
                    );
                    onColumnsChange(updated);
                    await saveColumns(updated);
                  }}
                  className={`h-6 w-6 p-0 ml-2 transition-colors ${
                    column.collapsed 
                      ? 'text-primary hover:text-primary/80' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {column.collapsed ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">
                  {column.collapsed ? "Свернутый вид" : "Полный вид"}
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEditColumn(column)}
            className="h-8 w-8 p-0"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteColumn(column.id)}
            className="h-8 w-8 p-0 text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </>
      )}
    </div>
  );
};
