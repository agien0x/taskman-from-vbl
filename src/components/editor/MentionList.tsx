import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import TaskBadge from '@/components/TaskBadge';
import AgentBadge from '@/components/AgentBadge';

function stripHtml(input: string): string {
  if (!input) return '';
  return input.replace(/<[^>]*>/g, '').trim();
}

interface MentionListProps {
  items: any[];
  command: (item: any) => void;
}

export const MentionList = forwardRef((props: MentionListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      const label = stripHtml(item.title);
      props.command({ id: `${item.type}:${item.id}`, label });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-lg p-2 max-w-xs">
        <div className="text-sm text-muted-foreground">Ничего не найдено</div>
      </div>
    );
  }

  const tasks = props.items.filter(item => item.type === 'task');
  const agents = props.items.filter(item => item.type === 'agent');

  return (
    <div className="bg-popover border border-border rounded-md shadow-lg p-2 max-w-md max-h-[400px] overflow-y-auto">
      {tasks.length > 0 && (
        <div className="mb-2">
          <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
            Задачи ({tasks.length})
          </div>
          <div className="space-y-0.5">
            {tasks.map((item, index) => {
              const globalIndex = props.items.indexOf(item);
              const isSelected = globalIndex === selectedIndex;
              return (
                <button
                  key={item.id}
                  className={`w-full text-left px-2 py-1.5 rounded-md transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/20 ring-2 ring-primary/50 shadow-sm' 
                      : 'hover:bg-accent/70 hover:shadow-sm'
                  }`}
                  onClick={() => selectItem(globalIndex)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                >
                  <div className="flex items-center justify-between">
                    <TaskBadge
                      taskId={item.id}
                      title={stripHtml(item.title)}
                      columnId={item.columnId}
                      disableDialogOpen={true}
                    />
                    {isSelected && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ↵ выбрать
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
      
      {agents.length > 0 && (
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-1 px-2">
            Агенты ({agents.length})
          </div>
          <div className="space-y-0.5">
            {agents.map((item, index) => {
              const globalIndex = props.items.indexOf(item);
              const isSelected = globalIndex === selectedIndex;
              return (
                <button
                  key={item.id}
                  className={`w-full text-left px-2 py-1.5 rounded-md transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-primary/20 ring-2 ring-primary/50 shadow-sm' 
                      : 'hover:bg-accent/70 hover:shadow-sm'
                  }`}
                  onClick={() => selectItem(globalIndex)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                >
                  <div className="flex items-center justify-between">
                    <AgentBadge
                      agentId={item.id}
                      name={stripHtml(item.title)}
                      disableDialogOpen={true}
                    />
                    {isSelected && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ↵ выбрать
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});

MentionList.displayName = 'MentionList';
