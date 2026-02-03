import * as React from "react";
import { cn } from "@/lib/utils";
import { useSlashCommand } from "@/hooks/useSlashCommand";
import { SlashCommandMenu } from "@/components/ui/SlashCommandMenu";

interface InputProps extends React.ComponentProps<"input"> {
  enableSlashCommand?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, enableSlashCommand = false, onChange, onKeyDown, ...props }, ref) => {
    const [value, setValue] = React.useState(props.value?.toString() || "");
    const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });
    const inputRef = React.useRef<HTMLInputElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => inputRef.current!);

    const handleSlashSelect = React.useCallback((item: any) => {
      const cursorPos = inputRef.current?.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastSlashIndex = textBeforeCursor.lastIndexOf('/');
      
      const newValue = 
        value.slice(0, lastSlashIndex) + 
        `@${item.type}:${item.id}[${item.title}]` + 
        value.slice(cursorPos);
      
      setValue(newValue);
      if (onChange) {
        const event = { target: { value: newValue } } as React.ChangeEvent<HTMLInputElement>;
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
      if (showSuggestions && inputRef.current && containerRef.current) {
        const inputRect = inputRef.current.getBoundingClientRect();
        const containerRect = containerRef.current.getBoundingClientRect();
        setMenuPosition({
          top: inputRect.bottom - containerRect.top + 4,
          left: inputRect.left - containerRect.left,
        });
      }
    }, [showSuggestions]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
      if (onChange) onChange(e);
    };

    const handleKeyDownInternal = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (enableSlashCommand && showSuggestions) {
        slashKeyDown(e);
      }
      if (onKeyDown) onKeyDown(e);
    };

    if (!enableSlashCommand) {
      return (
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
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
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
            className,
          )}
          ref={inputRef}
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
Input.displayName = "Input";

export { Input };
