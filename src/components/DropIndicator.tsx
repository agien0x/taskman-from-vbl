import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface DropIndicatorProps {
  isVisible: boolean;
  type: "between" | "inside";
  className?: string;
}

/**
 * Visual indicator for drag-and-drop operations
 * - "between": Shows a horizontal line indicating insertion point between cards
 * - "inside": Shows an overlay indicating nesting into a card
 */
export const DropIndicator = ({ isVisible, type, className }: DropIndicatorProps) => {
  if (!isVisible) return null;

  if (type === "between") {
    return (
      <motion.div
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        exit={{ scaleX: 0, opacity: 0 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className={cn(
          "h-1 bg-primary rounded-full my-1 origin-left shadow-[0_0_8px_rgba(var(--primary),0.5)]",
          className
        )}
      />
    );
  }

  return null;
};

interface TaskDropZoneProps {
  isOver: boolean;
  isNestingZone: boolean;
  children: React.ReactNode;
}

/**
 * Wrapper that shows visual feedback when dragging over a task
 * - Upper 70% of card: reorder zone (insert before/after)
 * - Lower 30% of card: nesting zone (make child)
 */
export const TaskDropZone = ({ isOver, isNestingZone, children }: TaskDropZoneProps) => {
  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {isOver && isNestingZone && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 rounded-lg border-2 border-dashed border-primary bg-primary/10 pointer-events-none flex items-center justify-center z-10"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium shadow-lg"
            >
              📥 Вложить как подзадачу
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
