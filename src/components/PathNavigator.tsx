import { useState, useEffect, useRef } from "react";
import { Search, ChevronRight, FolderOpen, Building2, X, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Task } from "@/types/kanban";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";

interface PathItem {
  id: string;
  title: string;
  isRoot?: boolean;
}

interface PathNavigatorProps {
  onNavigate: (taskId: string) => void;
  onNavigateHome: () => void;
  currentPath?: PathItem[];
  className?: string;
}

export const PathNavigator = ({
  onNavigate,
  onNavigateHome,
  currentPath = [],
  className,
}: PathNavigatorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [path, setPath] = useState<PathItem[]>([]);
  const [items, setItems] = useState<{ id: string; title: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean title from HTML tags
  const cleanTitle = (title: string) => {
    return title.replace(/<[^>]*>/g, '').trim();
  };

  // Fetch organizations (root tasks)
  const fetchOrganizations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("is_root", true)
      .order("title");
    setItems((data || []).map(d => ({ id: d.id, title: cleanTitle(d.title) })));
    setLoading(false);
  };

  // Fetch children of a task
  const fetchChildren = async (parentId: string) => {
    setLoading(true);
    const { data: relations } = await supabase
      .from("task_relations")
      .select("child_id")
      .eq("parent_id", parentId);

    if (relations && relations.length > 0) {
      const childIds = relations.map(r => r.child_id);
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title")
        .in("id", childIds)
        .order("title");
      setItems((tasks || []).map(d => ({ id: d.id, title: cleanTitle(d.title) })));
    } else {
      setItems([]);
    }
    setLoading(false);
  };

  // Open navigator
  const handleOpen = () => {
    setIsOpen(true);
    setPath([]);
    setSearchQuery("");
    fetchOrganizations();
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Close navigator
  const handleClose = () => {
    setIsOpen(false);
    setPath([]);
    setItems([]);
    setSearchQuery("");
  };

  // Select an item
  const handleSelectItem = async (item: { id: string; title: string }) => {
    const newPath = [...path, { id: item.id, title: item.title }];
    setPath(newPath);
    setSearchQuery("");
    
    // Check if item has children
    const { data: relations } = await supabase
      .from("task_relations")
      .select("child_id")
      .eq("parent_id", item.id)
      .limit(1);

    if (relations && relations.length > 0) {
      // Has children - fetch them
      fetchChildren(item.id);
    } else {
      // No children - navigate to this task
      onNavigate(item.id);
      handleClose();
    }
  };

  // Navigate directly to selected path item
  const handleNavigateToPathItem = (index: number) => {
    if (index === -1) {
      // Home clicked
      onNavigateHome();
      handleClose();
    } else {
      const item = path[index];
      onNavigate(item.id);
      handleClose();
    }
  };

  // Go back in path
  const handlePathBack = (toIndex: number) => {
    if (toIndex === -1) {
      setPath([]);
      fetchOrganizations();
    } else {
      const newPath = path.slice(0, toIndex + 1);
      setPath(newPath);
      fetchChildren(newPath[newPath.length - 1].id);
    }
    setSearchQuery("");
  };

  // Filter items by search query
  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Get display path string
  const getPathString = () => {
    if (path.length === 0) return "";
    return path.map(p => p.title).join(" / ") + " /";
  };

  // Display current path in collapsed state
  const getCurrentPathDisplay = () => {
    if (currentPath.length === 0) return "Поиск...";
    return currentPath.map(p => cleanTitle(p.title)).join(" / ");
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 transition-opacity" />
      )}

      {/* Search Bar */}
      <div ref={containerRef} className={cn("relative", className)}>
        {!isOpen ? (
          // Collapsed state - clickable search bar
          <button
            onClick={handleOpen}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 dark:bg-secondary hover:bg-white/20 dark:hover:bg-muted rounded-lg transition-colors min-w-[300px] max-w-[500px]"
          >
            <Search className="h-4 w-4 text-white/70 dark:text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-white/70 dark:text-muted-foreground truncate">
              {getCurrentPathDisplay()}
            </span>
          </button>
        ) : (
          // Expanded state - search input with path
          <div className="fixed left-1/2 top-16 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center border-b border-border px-4 py-3">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-2" />
                
                {/* Path breadcrumbs */}
                <div className="flex items-center flex-wrap gap-1 flex-1">
                  <button
                    onClick={() => handlePathBack(-1)}
                    className="flex items-center gap-1 px-2 py-0.5 text-sm rounded hover:bg-secondary transition-colors"
                  >
                    <Home className="h-3 w-3" />
                  </button>
                  
                  {path.map((item, index) => (
                    <div key={item.id} className="flex items-center">
                      <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                      <button
                        onClick={() => handlePathBack(index)}
                        className="px-2 py-0.5 text-sm rounded hover:bg-secondary transition-colors truncate max-w-[120px]"
                        title={item.title}
                      >
                        {item.title}
                      </button>
                    </div>
                  ))}

                  {path.length > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground mx-0.5" />
                  )}
                  
                  <input
                    ref={inputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={path.length === 0 ? "Выберите организацию..." : "Поиск..."}
                    className="flex-1 min-w-[100px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
                  />
                </div>
                
                <button
                  onClick={handleClose}
                  className="ml-2 p-1 hover:bg-secondary rounded transition-colors"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Items list */}
              <ScrollArea className="max-h-[400px]">
                <div className="p-2">
                  {loading ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Загрузка...
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {path.length === 0 ? "Нет организаций" : "Нет элементов"}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filteredItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectItem(item)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-secondary transition-colors text-left group"
                        >
                          <div className="p-1.5 rounded bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            {path.length === 0 ? (
                              <Building2 className="h-4 w-4 text-primary" />
                            ) : (
                              <FolderOpen className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <span className="text-sm font-medium truncate flex-1">
                            {item.title}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Actions */}
              {path.length > 0 && (
                <div className="border-t border-border p-2 bg-muted/30">
                  <button
                    onClick={() => handleNavigateToPathItem(path.length - 1)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors text-sm font-medium"
                  >
                    Открыть "{path[path.length - 1].title}"
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
