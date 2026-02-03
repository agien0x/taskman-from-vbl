import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, GripVertical, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { InputSelector, InputGroup } from './InputSelector';
import { DestinationElement, DESTINATION_TYPES, INPUT_GROUPS } from '../types/agent';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect } from 'react';

interface AgentDestinationsEditorProps {
  elements: DestinationElement[];
  onChange: (elements: DestinationElement[]) => void;
  supabaseClient: any;
}

const SortableElement = ({ 
  element, 
  onUpdate, 
  onRemove,
  supabaseClient
}: { 
  element: DestinationElement;
  onUpdate: (id: string, updates: Partial<DestinationElement>) => void;
  onRemove: (id: string) => void;
  supabaseClient: any;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const destinationType = DESTINATION_TYPES.find(t => t.value === element.type);
  
  const [tables, setTables] = useState<Array<{ table_name: string; table_schema: string }>>([]);
  const [columns, setColumns] = useState<Array<{ column_name: string; data_type: string }>>([]);
  const [loadingTables, setLoadingTables] = useState(true);
  const [loadingColumns, setLoadingColumns] = useState(false);

  // Load tables on mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoadingTables(true);
        const { data, error } = await supabaseClient.functions.invoke('list-tables');
        
        if (error) {
          console.error('Error loading tables:', error);
        } else {
          console.log('Tables loaded successfully:', data?.length || 0, 'tables');
          setTables(data || []);
        }
      } catch (err) {
        console.error('Error in fetchTables:', err);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, []);

  // Load columns when table changes
  useEffect(() => {
    const fetchColumns = async () => {
      if (!element.targetTable) {
        setColumns([]);
        return;
      }

      try {
        setLoadingColumns(true);
        console.log('Loading columns for table:', element.targetTable);
        const { data, error } = await supabaseClient.functions.invoke('list-columns', {
          body: { table: element.targetTable }
        });
        
        if (error) {
          console.error('Error loading columns:', error);
        } else {
          console.log('Columns loaded successfully:', data?.length || 0, 'columns');
          setColumns(data || []);
        }
      } catch (err) {
        console.error('Error in fetchColumns:', err);
      } finally {
        setLoadingColumns(false);
      }
    };

    fetchColumns();
  }, [element.targetTable]);

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
      <div {...attributes} {...listeners} className="cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      
      <div className="flex-1 space-y-2">
        <Select 
          value={element.targetType || 'database'}
          onValueChange={(value) => onUpdate(element.id, { targetType: value as 'database' | 'ui_component' })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="database">База данных</SelectItem>
            <SelectItem value="ui_component">UI компонент</SelectItem>
          </SelectContent>
        </Select>

        {element.targetType === 'ui_component' ? (
          <>
            <Select 
              value={element.componentName || ''}
              onValueChange={(value) => onUpdate(element.id, { componentName: value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Выберите компонент" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ParentSuggestions">Предложения родителей</SelectItem>
                <SelectItem value="TaskComments">Комментарии к задаче</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Тип события (опционально)"
              value={element.eventType || ''}
              onChange={(e) => onUpdate(element.id, { eventType: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Название (опционально)"
              value={element.label || ''}
              onChange={(e) => onUpdate(element.id, { label: e.target.value })}
              className="h-8 text-xs"
            />
          </>
        ) : (
          <>
            <Select 
              value={element.targetTable || ''}
              onValueChange={(value) => {
                console.log('Table selected:', value, 'for destination:', element.id);
                onUpdate(element.id, { 
                  targetTable: value,
                  targetColumn: '' // Reset column when table changes
                });
              }}
              disabled={loadingTables}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder={loadingTables ? "Загрузка таблиц..." : "Выберите таблицу"} />
              </SelectTrigger>
              <SelectContent>
                {tables.map((table) => (
                  <SelectItem key={table.table_name} value={table.table_name}>
                    {table.table_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select 
              value={element.targetColumn || ''}
              onValueChange={(value) => {
                console.log('Column selected:', value, 'for table:', element.targetTable, 'destination:', element.id);
                onUpdate(element.id, { targetColumn: value });
              }}
              disabled={!element.targetTable || loadingColumns}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder={
                  !element.targetTable 
                    ? "Сначала выберите таблицу" 
                    : loadingColumns
                    ? "Загрузка колонок..."
                    : "Выберите колонку"
                } />
              </SelectTrigger>
              <SelectContent>
                {columns.map((col) => (
                  <SelectItem key={col.column_name} value={col.column_name}>
                    {col.column_name}
                    <span className="text-xs text-muted-foreground ml-1">({col.data_type})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Input
              placeholder="ID записи (опционально, по умолчанию из контекста)"
              value={element.targetRecordId || ''}
              onChange={(e) => onUpdate(element.id, { targetRecordId: e.target.value })}
              className="h-8 text-xs"
            />
            <Input
              placeholder="Название (например: Pitch задачи)"
              value={element.label || ''}
              onChange={(e) => onUpdate(element.id, { label: e.target.value })}
              className="h-8 text-xs"
            />
          </>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(element.id)}
        className="h-7 w-7"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

export const AgentDestinationsEditor = ({ elements, onChange, supabaseClient }: AgentDestinationsEditorProps) => {
  const inputGroupsForInsertion: InputGroup[] = INPUT_GROUPS;

  const addDestination = () => {
    const newElement: DestinationElement = {
      id: `dest_${Date.now()}`,
      type: 'task_content',
      order: elements.length,
    };
    onChange([...elements, newElement]);
  };

  const insertDestinationFromInput = (inputValue: string) => {
    const newElement: DestinationElement = {
      id: `dest_${Date.now()}`,
      type: inputValue,
      label: DESTINATION_TYPES.find(t => t.value === inputValue)?.label,
      order: elements.length,
    };
    onChange([...elements, newElement]);
  };

  const insertDestinationsGroup = (inputs: Array<{value: string; label: string}>) => {
    const newElements = inputs.map((input, idx) => ({
      id: `dest_${Date.now()}_${idx}`,
      type: input.value,
      label: input.label,
      order: elements.length + idx,
    }));
    onChange([...elements, ...newElements]);
  };

  const updateElement = (id: string, updates: Partial<DestinationElement>) => {
    onChange(elements.map(el => el.id === id ? { ...el, ...updates } : el));
  };

  const removeElement = (id: string) => {
    onChange(elements.filter(el => el.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const oldIndex = elements.findIndex(el => el.id === active.id);
    const newIndex = elements.findIndex(el => el.id === over.id);

    const reordered = [...elements];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);
    
    onChange(reordered.map((el, idx) => ({ ...el, order: idx })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">Направления (куда направляется аутпут)</Label>
        <div className="flex gap-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-6 text-xs px-2">
                <Plus className="h-3 w-3 mr-1" />
                Из инпутов
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 bg-popover z-50" align="end">
              <InputSelector
                groups={inputGroupsForInsertion}
                onSelectInput={insertDestinationFromInput}
                onSelectGroup={insertDestinationsGroup}
                supabaseClient={supabaseClient}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" onClick={addDestination} className="h-6 text-xs px-2">
            <Plus className="h-3 w-3 mr-1" />
            Направление
          </Button>
        </div>
      </div>

      {elements.length === 0 ? (
        <div className="text-xs text-muted-foreground p-2 text-center border border-dashed rounded-md">
          Нет настроенных направлений
        </div>
      ) : (
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={elements.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {elements.map((element) => (
                <SortableElement
                  key={element.id}
                  element={element}
                  onUpdate={updateElement}
                  onRemove={removeElement}
                  supabaseClient={supabaseClient}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};
