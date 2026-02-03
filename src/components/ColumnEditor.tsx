import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Plus, X, Check, Minimize2, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SortableColumnItem } from "./SortableColumnItem";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ColumnLogsDialog } from "./ColumnLogsDialog";

interface Column {
  id: string;
  title: string;
  collapsed?: boolean;
  color?: string;
}

interface ColumnEditorProps {
  taskId: string;
  customColumns?: Column[] | null;
  onColumnsUpdate: () => void;
}

const defaultColumns: Column[] = [
  { id: "todo", title: "To Do" },
  { id: "inprogress", title: "In Progress" },
  { id: "done", title: "Done" },
];

export const ColumnEditor = ({ taskId, customColumns, onColumnsUpdate }: ColumnEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [columns, setColumns] = useState<Column[]>(customColumns || defaultColumns);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [globalStages, setGlobalStages] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { toast } = useToast();

  // Load global stages
  useEffect(() => {
    const loadGlobalStages = async () => {
      const { data } = await supabase
        .from("global_stages")
        .select("title")
        .order("updated_at", { ascending: false });
      
      if (data) {
        setGlobalStages(data.map(s => s.title));
      }
    };
    loadGlobalStages();
  }, []);

  // Update columns only when popover opens (not on customColumns changes while editing)
  useEffect(() => {
    if (isOpen) {
      setColumns(customColumns || defaultColumns);
    }
  }, [isOpen]);

  const saveColumns = async (columnsToSave: Column[]) => {
    try {
      // Check if columns are exactly default (both IDs and titles)
      const isDefault = columnsToSave.length === 3 && 
        columnsToSave[0].id === "todo" && columnsToSave[0].title === "To Do" &&
        columnsToSave[1].id === "inprogress" && columnsToSave[1].title === "In Progress" &&
        columnsToSave[2].id === "done" && columnsToSave[2].title === "Done";
      
      const columnsData = isDefault ? null : JSON.parse(JSON.stringify(columnsToSave));
      
      const { error } = await supabase.rpc("update_task_custom_columns", {
        _task_id: taskId,
        _columns: columnsData
      });

      if (error) throw error;

      onColumnsUpdate();
    } catch (error) {
      const err = error as any;
      console.error("Error saving columns:", err);
      const msg = typeof err?.message === 'string' && err.message.toLowerCase().includes('row level security')
        ? 'Недостаточно прав для изменения этой доски'
        : 'Не удалось сохранить стейджи';
      toast({
        title: "Ошибка",
        description: msg,
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    await saveColumns(columns);
    
    // Log the save action
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("column_logs").insert({
        task_id: taskId,
        action: "saved",
        column_title: `${columns.length} стейджей`,
        user_id: user?.id,
      });

      toast({
        title: "Успешно",
        description: "Стейджи канбана обновлены",
      });

      setIsOpen(false);
    } catch (error) {
      console.error("Error logging save:", error);
    }
  };

  const handleAddColumn = () => {
    const newId = `col-${Date.now()}`;
    const newColumn = { id: newId, title: "Новый стейдж", collapsed: false };
    const updatedColumns = [...columns, newColumn];
    setColumns(updatedColumns);
    setEditingId(newId);
    setEditingTitle("");
    setShowSuggestions(true);
  };

  const handleEditColumn = (column: Column) => {
    setEditingId(column.id);
    setEditingTitle(column.title);
  };

  const handleSaveEdit = async () => {
    if (!editingTitle.trim()) {
      toast({
        title: "Ошибка",
        description: "Название стейджа не может быть пустым",
        variant: "destructive",
      });
      return;
    }

    const oldTitle = columns.find(col => col.id === editingId)?.title;
    
    // Log creation or rename
    if (oldTitle && editingId) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        // If old title is "Новый стейдж", it's a creation, otherwise it's a rename
        const isNewColumn = oldTitle === "Новый стейдж";
        
        if (isNewColumn) {
          await supabase.from("column_logs").insert({
            task_id: taskId,
            action: "created",
            column_id: editingId,
            column_title: editingTitle,
            user_id: user?.id,
          });
          console.log("Column creation logged:", editingTitle);
        } else if (oldTitle !== editingTitle) {
          await supabase.from("column_logs").insert({
            task_id: taskId,
            action: "renamed",
            column_id: editingId,
            column_title: editingTitle,
            old_value: oldTitle,
            new_value: editingTitle,
            user_id: user?.id,
          });
          console.log("Column rename logged:", oldTitle, "→", editingTitle);
        }
      } catch (error) {
        console.error("Error logging column action:", error);
      }
    }
    
    const updatedColumns = columns.map(col => 
      col.id === editingId ? { ...col, title: editingTitle } : col
    );
    setColumns(updatedColumns);
    
    // Update global stage if it exists and title changed
    if (oldTitle && globalStages.includes(oldTitle) && oldTitle !== editingTitle) {
      const { error } = await supabase
        .from("global_stages")
        .update({ title: editingTitle })
        .eq("title", oldTitle);
      
      if (!error) {
        // Update all tasks using this global stage
        const { data: affectedTasks } = await supabase
          .from("tasks")
          .select("id, custom_columns")
          .not("custom_columns", "is", null);
        
        if (affectedTasks) {
          for (const task of affectedTasks) {
            if (Array.isArray(task.custom_columns)) {
              const cols = task.custom_columns as Array<{id: string; title: string; collapsed?: boolean}>;
              const updated = cols.map(c => 
                c.title === oldTitle ? { ...c, title: editingTitle } : c
              );
              await supabase
                .from("tasks")
                .update({ custom_columns: updated as any })
                .eq("id", task.id);
            }
          }
        }
        
        setGlobalStages(prev => prev.map(s => s === oldTitle ? editingTitle : s));
      }
    } else if (editingTitle && !globalStages.includes(editingTitle)) {
      // Add to global stages if new
      await supabase.from("global_stages").insert({ title: editingTitle });
      setGlobalStages(prev => [...prev, editingTitle]);
    }
    
    setEditingId(null);
    setEditingTitle("");
    setShowSuggestions(false);
    
    // Auto-save after editing
    await saveColumns(updatedColumns);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (columns.length <= 1) {
      toast({
        title: "Ошибка",
        description: "Должен остаться хотя бы один стейдж",
        variant: "destructive",
      });
      return;
    }
    
    const columnToDelete = columns.find(col => col.id === columnId);
    const updatedColumns = columns.filter(col => col.id !== columnId);
    setColumns(updatedColumns);

    // Log the deletion
    if (columnToDelete) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("column_logs").insert({
          task_id: taskId,
          action: "deleted",
          column_id: columnId,
          column_title: columnToDelete.title,
          user_id: user?.id,
        });
        console.log("Column deletion logged:", columnId);
      } catch (error) {
        console.error("Error logging column deletion:", error);
      }
    }
    
    // Auto-save after deletion
    await saveColumns(updatedColumns);
  };

  const handleReset = async () => {
    setColumns(defaultColumns);

    // Log the reset
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("column_logs").insert({
        task_id: taskId,
        action: "reset",
        column_title: "Сброс к дефолтным стейджам",
        user_id: user?.id,
      });
      console.log("Column reset logged");
    } catch (error) {
      console.error("Error logging column reset:", error);
    }
  };

  const isCustom = customColumns !== null;

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = columns.findIndex((col) => col.id === active.id);
      const newIndex = columns.findIndex((col) => col.id === over.id);
      
      const newColumns = arrayMove(columns, oldIndex, newIndex);
      setColumns(newColumns);
      await saveColumns(newColumns);

      // Log the reorder
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await supabase.from("column_logs").insert({
          task_id: taskId,
          action: "reordered",
          column_title: `Изменен порядок стейджей`,
          user_id: user?.id,
        });
      } catch (error) {
        console.error("Error logging column reorder:", error);
      }
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 px-2">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Редактировать стейджи канбана</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-sm">Стейджи канбана</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                ID: {taskId.substring(0, 8)}...
              </p>
            </div>
            <div className="flex items-center gap-1">
              <ColumnLogsDialog taskId={taskId} />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-7 text-xs"
              >
                Сбросить
              </Button>
            </div>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={columns.map((col) => col.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {columns.map((column) => (
                  <SortableColumnItem
                    key={column.id}
                    column={column}
                    editingId={editingId}
                    editingTitle={editingTitle}
                    showSuggestions={showSuggestions}
                    globalStages={globalStages}
                    columns={columns}
                    onEditColumn={handleEditColumn}
                    onSaveEdit={handleSaveEdit}
                    onDeleteColumn={handleDeleteColumn}
                    onEditingTitleChange={setEditingTitle}
                    onShowSuggestionsChange={setShowSuggestions}
                    onColumnsChange={setColumns}
                    saveColumns={saveColumns}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddColumn}
              className="flex-1 h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Добавить стейдж
            </Button>
            <Button onClick={handleSave} size="sm" className="h-8">
              Сохранить
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};