import * as React from "react";
import { cn } from "@/lib/utils";
import { useSlashCommand } from "@/hooks/useSlashCommand";
import { SlashCommandMenu } from "@/components/ui/SlashCommandMenu";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  enableSlashCommand?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, enableSlashCommand = false, onChange, onKeyDown, ...props }, ref) => {
    const [value, setValue] = React.useState(props.value?.toString() || "");
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => textareaRef.current!);

    const handleSlashSelect = React.useCallback((item: any) => {
      const cursorPos = textareaRef.current?.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      
      const newValue = 
        value.slice(0, lastSlashIndex) + 
        `@${item.type}:${item.id}[${item.title}]` + 
        value.slice(cursorPos);
      
      setValue(newValue);
      if (onChange) {
        const event = { target: { value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
    }, [value, onChange]);

    const {
      showSuggestions,
      filteredItems,
      selectedIndex,
      handleSelect,
      handleKeyDown: slashKeyDown,
    } = useSlashCommand(value, handleSlashSelect);

    React.useEffect(() => {
      if (props.value !== undefined) {
        setValue(props.value.toString());
      }
    }, [props.value]);

    React.useEffect(() => {
      if (showSuggestions && textareaRef.current && containerRef.current) {
        const textareaRect = textareaRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setMenuPosition({
          top: textareaRect.bottom - containerRect.top + 4,
          left: textareaRect.left - containerRect.left,
        });
      }
    }, [showSuggestions]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setValue(e.target.value);
      if (onChange) onChange(e);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (enableSlashCommand && showSuggestions && (e.key === "Enter" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Escape")) {
        slashKeyDown(e as any);
      }
      if (onKeyDown) onKeyDown(e);
    };

    if (!enableSlashCommand) {
      return (
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={ref}
          onChange={onChange}
          onKeyDown={onKeyDown}
          {...props}
        />
      );
    }

    return (
      <div ref={containerRef} className="relative">
        <textarea
          className={cn(
            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className,
          )}
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDownInternal}
          {...props}
        />
        {showSuggestions && (
          <SlashCommandMenu
            items={filteredItems}
            selectedIndex={selectedIndex}
            onSelect={handleSelect}
            position={menuPosition}
          />
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
