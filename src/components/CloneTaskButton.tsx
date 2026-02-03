import { useState, useEffect } from "react";
import { Copy, Check, Loader2, ChevronRight, ChevronLeft, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCleanTitle } from "@/lib/utils";
import { RootTaskIcon } from "./RootTaskIcon";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CloneTaskButtonProps {
  taskId: string;
  onCloneComplete?: () => void;
  className?: string;
}

interface FolderInfo {
  id: string;
  title: string;
  is_root: boolean;
  column_id: string;
  hasChildren?: boolean;
}

export const CloneTaskButton = ({
  taskId,
  onCloneComplete,
  className = "",
}: CloneTaskButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [rootBoards, setRootBoards] = useState<FolderInfo[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderInfo | null>(null);
  const [folderChildren, setFolderChildren] = useState<FolderInfo[]>([]);
  const [navigationStack, setNavigationStack] = useState<FolderInfo[]>([]);
  const [existingParentIds, setExistingParentIds] = useState<string[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadRootBoards();
      loadExistingParents();
    } else {
      // Reset navigation when closed
      setCurrentFolder(null);
      setNavigationStack([]);
      setFolderChildren([]);
    }
  }, [isOpen, taskId]);

  const loadExistingParents = async () => {
    try {
      const { data } = await supabase
        .from("task_relations")
        .select("parent_id")
        .eq("child_id", taskId);

      setExistingParentIds((data || []).map((r) => r.parent_id));
    } catch (error) {
      console.error("Error loading existing parents:", error);
    }
  };

  const loadRootBoards = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setRootBoards([]);
        setLoading(false);
        return;
      }

      // Get organization memberships
      const { data: orgMemberships } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

      const orgIds = (orgMemberships || []).map((m) => m.organization_id);

      // Get owned root tasks (not personal_board)
      const { data: ownedRoots } = await supabase
        .from("tasks")
        .select("id, title, is_root, column_id")
        .eq("owner_id", user.id)
        .eq("is_root", true)
        .neq("task_type", "personal_board");

      // Get organization root tasks
      let orgRoots: any[] = [];
      if (orgIds.length > 0) {
        const { data } = await supabase
          .from("tasks")
          .select("id, title, is_root, column_id")
          .in("id", orgIds);
        orgRoots = data || [];
      }

      // Combine and deduplicate
      const allBoards = [...(ownedRoots || []), ...orgRoots];
      const uniqueBoards = allBoards.filter(
        (board, index, self) =>
          index === self.findIndex((b) => b.id === board.id)
      );

      // Check which boards have children
      const boardsWithChildInfo = await Promise.all(
        uniqueBoards.map(async (board) => {
          const { count } = await supabase
            .from("task_relations")
            .select("*", { count: "exact", head: true })
            .eq("parent_id", board.id);
          return { ...board, hasChildren: (count || 0) > 0 };
        })
      );

      // Sort by title
      const sorted = boardsWithChildInfo.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );

      setRootBoards(sorted);
    } catch (error) {
      console.error("Error loading accessible boards:", error);
      toast.error("Не удалось загрузить доступные доски");
    } finally {
      setLoading(false);
    }
  };

  const loadFolderChildren = async (folder: FolderInfo) => {
    setLoadingChildren(true);
    try {
      // Get children of this folder
      const { data: relations } = await supabase
        .from("task_relations")
        .select("child_id")
        .eq("parent_id", folder.id);

      if (!relations || relations.length === 0) {
        setFolderChildren([]);
        setLoadingChildren(false);
        return;
      }

      const childIds = relations.map((r) => r.child_id);
      
      const { data: children } = await supabase
        .from("tasks")
        .select("id, title, is_root, column_id")
        .in("id", childIds)
        .neq("id", taskId); // Exclude current task

      // Check which children have their own children
      const childrenWithInfo = await Promise.all(
        (children || []).map(async (child) => {
          const { count } = await supabase
            .from("task_relations")
            .select("*", { count: "exact", head: true })
            .eq("parent_id", child.id);
          return { ...child, hasChildren: (count || 0) > 0 };
        })
      );

      // Sort by title
      const sorted = childrenWithInfo.sort((a, b) =>
        (a.title || "").localeCompare(b.title || "")
      );

      setFolderChildren(sorted);
    } catch (error) {
      console.error("Error loading folder children:", error);
    } finally {
      setLoadingChildren(false);
    }
  };

  const handleNavigateInto = async (folder: FolderInfo) => {
    setNavigationStack([...navigationStack, folder]);
    setCurrentFolder(folder);
    await loadFolderChildren(folder);
  };

  const handleNavigateBack = async () => {
    if (navigationStack.length <= 1) {
      // Go back to root list
      setCurrentFolder(null);
      setNavigationStack([]);
      setFolderChildren([]);
    } else {
      // Go back one level
      const newStack = navigationStack.slice(0, -1);
      const parentFolder = newStack[newStack.length - 1];
      setNavigationStack(newStack);
      setCurrentFolder(parentFolder);
      await loadFolderChildren(parentFolder);
    }
  };

  const handleAddToFolder = async (folder: FolderInfo) => {
    if (existingParentIds.includes(folder.id)) {
      toast.info("Задача уже находится в этой папке");
      return;
    }

    setCloning(true);
    try {
      // Create a new relation (link task to the folder)
      const { error } = await supabase.from("task_relations").insert({
        parent_id: folder.id,
        child_id: taskId,
      });

      if (error) throw error;

      toast.success(`Задача добавлена в "${getCleanTitle(folder.title)}"`);
      setExistingParentIds([...existingParentIds, folder.id]);
      onCloneComplete?.();
    } catch (error) {
      console.error("Error adding task to folder:", error);
      toast.error("Не удалось добавить задачу");
    } finally {
      setCloning(false);
    }
  };

  const handleRemoveFromFolder = async (folder: FolderInfo) => {
    // Cannot remove if this is the only parent
    if (existingParentIds.length <= 1) {
      toast.error("Нельзя удалить задачу из единственного места");
      return;
    }

    setCloning(true);
    try {
      const { error } = await supabase
        .from("task_relations")
        .delete()
        .eq("parent_id", folder.id)
        .eq("child_id", taskId);

      if (error) throw error;

      toast.success(`Задача удалена из "${getCleanTitle(folder.title)}"`);
      setExistingParentIds(existingParentIds.filter((id) => id !== folder.id));
      onCloneComplete?.();
    } catch (error) {
      console.error("Error removing task from folder:", error);
      toast.error("Не удалось удалить задачу");
    } finally {
      setCloning(false);
    }
  };

  const displayItems = currentFolder ? folderChildren : rootBoards;
  const isLoading = loading || loadingChildren;

  return (
    <TooltipProvider>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={`h-6 w-6 p-0 text-muted-foreground hover:text-foreground ${className}`}
              >
                <FolderPlus className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>Добавить на другую доску</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-72 p-0" align="start">
          {/* Header with navigation */}
          <div className="flex items-center gap-1 px-2 py-2 border-b">
            {currentFolder && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNavigateBack}
                className="h-6 w-6 p-0 flex-shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <span className="text-xs font-medium text-muted-foreground truncate flex-1">
              {currentFolder ? getCleanTitle(currentFolder.title) : "Выберите папку"}
            </span>
            {currentFolder && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddToFolder(currentFolder)}
                disabled={cloning || existingParentIds.includes(currentFolder.id)}
                className="h-6 px-2 text-xs gap-1"
              >
                {existingParentIds.includes(currentFolder.id) ? (
                  <>
                    <Check className="h-3 w-3 text-green-500" />
                    Добавлено
                  </>
                ) : (
                  <>
                    <FolderPlus className="h-3 w-3" />
                    Добавить сюда
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Content */}
          <ScrollArea className="max-h-64">
            <div className="p-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : displayItems.length === 0 ? (
                <div className="text-xs text-muted-foreground px-2 py-3 text-center">
                  {currentFolder ? "Нет вложенных папок" : "Нет доступных досок"}
                </div>
              ) : (
                displayItems.map((folder) => {
                  const isAlreadyAdded = existingParentIds.includes(folder.id);
                  const canRemove = isAlreadyAdded && existingParentIds.length > 1;
                  return (
                    <div
                      key={folder.id}
                      className="flex items-center rounded-md group"
                    >
                      {/* Main clickable area - folder icon and name */}
                      <button
                        onClick={() => isAlreadyAdded ? undefined : handleAddToFolder(folder)}
                        disabled={cloning || isAlreadyAdded}
                        className={`flex-1 flex items-center gap-2 py-1.5 px-2 text-left min-w-0 rounded-l-md transition-colors ${
                          isAlreadyAdded 
                            ? "bg-secondary/50 cursor-default" 
                            : "hover:bg-accent cursor-pointer"
                        }`}
                        title={isAlreadyAdded ? "Уже добавлено" : "Добавить в эту папку"}
                      >
                        {folder.is_root ? (
                          <RootTaskIcon
                            title={folder.title}
                            className="h-5 w-5 flex-shrink-0"
                            showLetters={3}
                          />
                        ) : (
                          <div className="h-5 w-5 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] font-medium text-muted-foreground">
                              {getCleanTitle(folder.title).slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-xs truncate flex-1">
                          {getCleanTitle(folder.title)}
                        </span>
                      </button>

                      {/* Status/action button - checkmark to remove */}
                      {isAlreadyAdded && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => canRemove ? handleRemoveFromFolder(folder) : undefined}
                              disabled={cloning || !canRemove}
                              className={`h-8 w-8 p-0 flex-shrink-0 ${
                                canRemove 
                                  ? "hover:bg-destructive/10 hover:text-destructive" 
                                  : "cursor-not-allowed opacity-50"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5 text-green-500" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {canRemove ? "Удалить из папки" : "Нельзя удалить из единственного места"}
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* Navigate arrow - highlighted separately */}
                      {folder.hasChildren && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateInto(folder);
                          }}
                          className="h-8 w-8 p-0 flex-shrink-0 hover:bg-primary/10 hover:text-primary border-l border-border/50"
                          title="Открыть"
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
};
