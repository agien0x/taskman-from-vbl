import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight, Home, CheckSquare, Search } from "lucide-react";
import { Task } from "@/types/kanban";
import { useToast } from "@/hooks/use-toast";
import { getCleanTitle } from "@/lib/utils";

interface TaskNode extends Task {
  children: TaskNode[];
  level: number;
}

const ROOT_TASK_ID = 'bee63fd2-6a5a-48de-964d-ea063deaf355';

const TaskNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [taskTree, setTaskTree] = useState<TaskNode[]>([]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);

  useEffect(() => {
    loadTasksHierarchy();
  }, []);

  const loadTasksHierarchy = async () => {
    try {
      setLoading(true);
      
      // Load all tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select("*")
        .order("position", { ascending: true });

      if (tasksError) throw tasksError;

      // Load all relations
      const { data: relationsData, error: relationsError } = await supabase
        .from("task_relations")
        .select("parent_id, child_id");

      if (relationsError) throw relationsError;

      // Build task map
      const taskMap = new Map<string, TaskNode>();
      (tasksData || []).forEach((task) => {
        taskMap.set(task.id, {
          id: task.id,
          title: task.title,
          content: task.content,
          columnId: task.column_id,
          subtaskOrder: task.subtask_order,
          children: [],
          level: 0,
        });
      });

      // Build parent-child map and collect all child IDs
      const childrenMap = new Map<string, string[]>();
      const allChildIds = new Set<string>();
      (relationsData || []).forEach((rel) => {
        const children = childrenMap.get(rel.parent_id) || [];
        children.push(rel.child_id);
        childrenMap.set(rel.parent_id, children);
        allChildIds.add(rel.child_id);
      });

      // Build tree recursively
      const buildTree = (parentId: string, level: number): TaskNode[] => {
        const childIds = childrenMap.get(parentId) || [];
        return childIds
          .map((childId) => {
            const task = taskMap.get(childId);
            if (!task) return null;
            
            task.level = level;
            task.children = buildTree(childId, level + 1);
            return task;
          })
          .filter((task): task is TaskNode => task !== null);
      };

      // Find root tasks: children of ROOT_TASK_ID OR orphan tasks (not children of anyone, excluding ROOT itself)
      const rootChildIds = childrenMap.get(ROOT_TASK_ID) || [];
      const orphanTaskIds = (tasksData || [])
        .filter(task => !allChildIds.has(task.id) && task.id !== ROOT_TASK_ID)
        .map(task => task.id);
      
      // Combine root children and orphan tasks
      const allRootIds = [...new Set([...rootChildIds, ...orphanTaskIds])];
      
      const tree = allRootIds
        .map(taskId => {
          const task = taskMap.get(taskId);
          if (!task) return null;
          task.level = 0;
          task.children = buildTree(taskId, 1);
          return task;
        })
        .filter((task): task is TaskNode => task !== null);

      setTaskTree(tree);
    } catch (error) {
      console.error("Error loading tasks hierarchy:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить иерархию задач",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTaskClick = (taskId: string) => {
    navigate(`/?task=${taskId}`);
  };

  const toggleExpand = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getStatusColor = (columnId: string) => {
    switch (columnId) {
      case "todo":
        return "bg-primary/10 border-primary/30 text-primary-foreground";
      case "inprogress":
        return "bg-accent/10 border-accent/30 text-accent-foreground";
      case "done":
        return "bg-muted border-border text-muted-foreground";
      default:
        return "bg-card border-border text-card-foreground";
    }
  };

  const filterTasks = (tasks: TaskNode[], query: string): TaskNode[] => {
    if (!query.trim()) return tasks;
    
    const lowerQuery = query.toLowerCase();
    
    const filter = (tasks: TaskNode[]): TaskNode[] => {
      return tasks.reduce<TaskNode[]>((acc, task) => {
        const titleMatch = task.title.toLowerCase().includes(lowerQuery);
        const contentMatch = task.content.toLowerCase().includes(lowerQuery);
        const filteredChildren = filter(task.children);
        
        if (titleMatch || contentMatch || filteredChildren.length > 0) {
          acc.push({
            ...task,
            children: filteredChildren,
          });
        }
        
        return acc;
      }, []);
    };

    return filter(tasks);
  };

  const filteredTree = filterTasks(taskTree, searchQuery);

  // Auto-expand all tasks when searching to show results
  useEffect(() => {
    if (searchQuery.trim()) {
      const allIds = getAllTaskIds(taskTree);
      setExpandedTasks(new Set(allIds));
    }
  }, [searchQuery]);

  const getAllTaskIds = (tasks: TaskNode[]): string[] => {
    return tasks.flatMap(task => [task.id, ...getAllTaskIds(task.children)]);
  };

  const handleExpandAll = () => {
    const allIds = getAllTaskIds(taskTree);
    setExpandedTasks(new Set(allIds));
    setAllExpanded(true);
  };

  const handleCollapseAll = () => {
    setExpandedTasks(new Set());
    setAllExpanded(false);
  };

  const renderTask = (task: TaskNode) => {
    const hasChildren = task.children.length > 0;
    const isExpanded = expandedTasks.has(task.id);

    return (
      <div key={task.id} className="mb-2">
        <Card
          className={`cursor-pointer hover:shadow-md transition-all backdrop-blur-sm ${getStatusColor(task.columnId)}`}
          onClick={() => handleTaskClick(task.id)}
          style={{ marginLeft: `${task.level * 24}px` }}
        >
          <CardContent className="p-3 flex items-center gap-2">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={(e) => toggleExpand(task.id, e)}
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                />
              </Button>
            )}
            {!hasChildren && <div className="w-6" />}
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{getCleanTitle(task.title)}</h3>
              {task.children.length > 0 && (
                <p className="text-xs opacity-70 mt-0.5">
                  {task.children.length} подзадач{task.children.length === 1 ? 'а' : task.children.length < 5 ? 'и' : ''}
                </p>
              )}
            </div>

            <ChevronRight className="h-4 w-4 opacity-50 shrink-0" />
          </CardContent>
        </Card>

        {hasChildren && isExpanded && (
          <div className="mt-1">
            {task.children.map((child) => renderTask(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-accent">
      <header className="px-4 py-3 bg-card/10 backdrop-blur-sm border-b border-white/10 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-card rounded-lg shadow-sm">
              <CheckSquare className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold text-white">Навигация по задачам</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExpandAll}
              size="sm"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Развернуть все
            </Button>
            <Button
              onClick={handleCollapseAll}
              size="sm"
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            >
              Свернуть все
            </Button>
            <Button
              onClick={() => navigate("/")}
              size="sm"
              className="bg-white/20 hover:bg-white/30 text-white"
            >
              <Home className="h-3.5 w-3.5 mr-1.5" />
              На главную
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Search bar */}
        <Card className="mb-6 bg-card/80 backdrop-blur-sm border-border/50">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Поиск задач..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background border-border"
              />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <Card className="bg-card/80 backdrop-blur-sm border-border/50">
              <CardContent className="p-12">
                <p className="text-muted-foreground">Загрузка иерархии задач...</p>
              </CardContent>
            </Card>
          </div>
        ) : filteredTree.length === 0 ? (
          <Card className="bg-card/80 backdrop-blur-sm border-border/50">
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                {searchQuery ? "Задачи не найдены по запросу" : "Задачи не найдены"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredTree.map((task) => renderTask(task))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskNavigation;
