import { forwardRef, useImperativeHandle, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface TaskSearchItem {
  id: string;
  type: 'task' | 'agent';
  title: string;
  content: string;
}

interface TaskSearchMenuProps {
  items: TaskSearchItem[];
  command?: (item: TaskSearchItem) => void;
}

export const TaskSearchMenu = forwardRef((props: TaskSearchMenuProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item && props.command) {
      props.command(item);
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

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
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

  // Clean HTML from text
  const cleanText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  return (
    <div className="z-50 w-96 max-h-80 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={cn(
              'flex w-full items-start space-x-3 rounded-sm px-3 py-2 text-left text-sm outline-none transition-colors',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            )}
            key={item.id}
            onClick={() => selectItem(index)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant={item.type === 'task' ? 'default' : 'secondary'} className="text-xs">
                  {item.type === 'task' ? 'Задача' : 'Агент'}
                </Badge>
                <span className="font-medium truncate">{cleanText(item.title)}</span>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {cleanText(item.content)}
              </p>
            </div>
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          Начните вводить для поиска задач или агентов...
        </div>
      )}
    </div>
  );
});

TaskSearchMenu.displayName = 'TaskSearchMenu';
