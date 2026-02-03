import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { cn } from '@/lib/utils';

interface SlashCommandMenuProps {
  items: any[];
  command?: (item: any) => void;
  selectedIndex?: number;
  onSelect?: (item: any) => void;
  position?: { top: number; left: number };
}

export const SlashCommandMenu = forwardRef((props: SlashCommandMenuProps, ref) => {
  const [internalSelectedIndex, setInternalSelectedIndex] = useState(0);
  
  // Use external selectedIndex if provided (input/textarea mode), otherwise use internal (TipTap mode)
  const selectedIndex = props.selectedIndex !== undefined ? props.selectedIndex : internalSelectedIndex;

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      if (props.onSelect) {
        props.onSelect(item);
      } else if (props.command) {
        props.command(item);
      }
    }
  };

  const upHandler = () => {
    if (props.selectedIndex === undefined) {
      setInternalSelectedIndex((internalSelectedIndex + props.items.length - 1) % props.items.length);
    }
  };

  const downHandler = () => {
    if (props.selectedIndex === undefined) {
      setInternalSelectedIndex((internalSelectedIndex + 1) % props.items.length);
    }
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => {
    if (props.selectedIndex === undefined) {
      setInternalSelectedIndex(0);
    }
  }, [props.items, props.selectedIndex]);

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

  return (
    <div 
      className="z-50 w-72 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={props.position ? { position: 'absolute', top: props.position.top, left: props.position.left } : undefined}
    >
      {props.items.length ? (
        props.items.map((item, index) => (
          <button
            className={cn(
              'flex w-full items-center space-x-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors',
              index === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
            )}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item.icon && (
              <span className="flex h-8 w-8 items-center justify-center rounded-md border bg-background font-mono text-sm">
                {item.icon}
              </span>
            )}
            <span>{item.title}</span>
          </button>
        ))
      ) : (
        <div className="px-2 py-1.5 text-sm text-muted-foreground">Ничего не найдено</div>
      )}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';
