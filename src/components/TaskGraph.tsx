import { useEffect, useMemo, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MarkerType,
  useNodesState,
  useEdgesState,
  Panel,
  useStore,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Task } from '@/types/kanban';
import { supabase } from '@/integrations/supabase/client';
import TaskBadge from './TaskBadge';
import { TaskOwnerAvatar } from './TaskOwnerAvatar';
import { Card } from '@/components/ui/card';
import dagre from 'dagre';
import { Position } from 'reactflow';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TaskAssignment {
  user_id: string;
  role: 'owner' | 'contributor';
}

interface TaskGraphProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
}

type GroupingType = 'relations' | 'owner' | 'column' | 'none';

const ZOOM_THRESHOLD = 0.8;

// Компонент узла с поддержкой zoom
const ZoomAwareTaskNode = ({ 
  data 
}: { 
  data: { 
    task: Task; 
    owner?: string; 
    contributors: string[];
    childTasks: Task[];
    onTaskClick?: (task: Task) => void;
  } 
}) => {
  const zoom = useStore((state) => state.transform[2]);
  const isCardView = zoom >= ZOOM_THRESHOLD;
  const { task, owner, contributors, childTasks, onTaskClick } = data;

  if (!isCardView) {
    return (
      <div 
        onClick={() => onTaskClick?.(task)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-1.5">
          <div className="scale-90">
            <TaskBadge 
              taskId={task.id} 
              title={task.title}
              columnId={task.columnId}
              disableDialogOpen={true}
            />
          </div>
          <div className="flex items-center gap-0.5">
            {owner && <TaskOwnerAvatar ownerId={owner} size="sm" />}
            {contributors.map(userId => (
              <TaskOwnerAvatar key={userId} ownerId={userId} size="sm" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card 
      className="p-3 min-w-[200px] max-w-[280px] bg-card border shadow-sm cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onTaskClick?.(task)}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <TaskBadge 
            taskId={task.id} 
            title={task.title}
            columnId={task.columnId}
            disableDialogOpen={true}
          />
          <div className="flex items-center gap-0.5 ml-auto">
            {owner && <TaskOwnerAvatar ownerId={owner} size="sm" />}
            {contributors.slice(0, 2).map(userId => (
              <TaskOwnerAvatar key={userId} ownerId={userId} size="sm" />
            ))}
          </div>
        </div>

        {task.pitch && (
          <p className="text-xs text-muted-foreground line-clamp-2">{task.pitch}</p>
        )}

        {childTasks.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <div className="text-[10px] text-muted-foreground mb-1.5 font-medium">
              Подзадачи ({childTasks.length})
            </div>
            <div className="flex flex-wrap gap-1">
              {childTasks.slice(0, 5).map(child => (
                <div 
                  key={child.id} 
                  onClick={(e) => {
                    e.stopPropagation();
                    onTaskClick?.(child);
                  }}
                  className="transform scale-[0.85] origin-left"
                >
                  <TaskBadge 
                    taskId={child.id} 
                    title={child.title}
                    columnId={child.columnId}
                    disableDialogOpen={true}
                  />
                </div>
              ))}
              {childTasks.length > 5 && (
                <span className="text-[10px] text-muted-foreground self-center">
                  +{childTasks.length - 5}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const nodeTypes = {
  taskNode: ZoomAwareTaskNode,
};

const nodeWidth = 180;
const nodeHeight = 36;
const cardNodeWidth = 280;
const cardNodeHeight = 120;
const groupNodeWidth = 200;
const groupNodeHeight = 50;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB', grouping: GroupingType = 'relations') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  const isHorizontal = direction === 'LR';
  const nodesep = grouping === 'none' ? 15 : 20;
  const ranksep = grouping === 'none' ? 60 : 80;
  
  dagreGraph.setGraph({ 
    rankdir: direction,
    nodesep,
    ranksep,
    edgesep: 10,
    ranker: 'network-simplex'
  });

  nodes.forEach((node) => {
    const width = node.type === 'taskNode' ? cardNodeWidth : nodeWidth;
    const height = node.type === 'taskNode' ? cardNodeHeight : nodeHeight;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const width = node.type === 'taskNode' ? cardNodeWidth : nodeWidth;
    const height = node.type === 'taskNode' ? cardNodeHeight : nodeHeight;
    
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export const TaskGraph = ({ tasks, onTaskClick }: TaskGraphProps) => {
  const [relations, setRelations] = useState<Array<{ parent_id: string; child_id: string }>>([]);
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');
  const [assignments, setAssignments] = useState<Record<string, TaskAssignment[]>>({});
  const [grouping, setGrouping] = useState<GroupingType>('relations');
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    loadRelations();
    loadAssignments();
  }, [tasks]);

  const loadRelations = async () => {
    const { data, error } = await supabase
      .from('task_relations')
      .select('parent_id, child_id');

    if (!error && data) {
      setRelations(data);
    }
  };

  const loadAssignments = async () => {
    const taskIds = tasks.map(t => t.id);
    if (taskIds.length === 0) return;

    const { data, error } = await supabase
      .from('task_assignments')
      .select('task_id, user_id, role')
      .in('task_id', taskIds);

    if (!error && data) {
      const assignmentsByTask: Record<string, TaskAssignment[]> = {};
      data.forEach(assignment => {
        if (!assignmentsByTask[assignment.task_id]) {
          assignmentsByTask[assignment.task_id] = [];
        }
        assignmentsByTask[assignment.task_id].push({
          user_id: assignment.user_id,
          role: assignment.role as 'owner' | 'contributor'
        });
      });
      setAssignments(assignmentsByTask);
    }
  };

  // Получаем children для каждой задачи
  const getChildTasks = useCallback((taskId: string) => {
    const childIds = relations
      .filter(r => r.parent_id === taskId)
      .map(r => r.child_id);
    return tasks.filter(t => childIds.includes(t.id));
  }, [relations, tasks]);

  // Построение графа
  useEffect(() => {
    const taskIds = new Set(tasks.map(t => t.id));

    const createTaskNode = (task: Task, owner: string | undefined, contributors: string[]): Node => {
      const childTasks = getChildTasks(task.id);
      return {
        id: task.id,
        type: 'taskNode',
        data: { 
          task,
          owner,
          contributors,
          childTasks,
          onTaskClick,
        },
        position: { x: 0, y: 0 },
      };
    };

    let newNodes: Node[] = [];
    let newEdges: Edge[] = [];

    // Группировка по owner
    if (grouping === 'owner') {
      const tasksByOwner = new Map<string, Task[]>();
      const noOwnerTasks: Task[] = [];

      tasks.forEach(task => {
        if (task.owner_id) {
          const ownerTasks = tasksByOwner.get(task.owner_id) || [];
          ownerTasks.push(task);
          tasksByOwner.set(task.owner_id, ownerTasks);
        } else {
          noOwnerTasks.push(task);
        }
      });

      tasksByOwner.forEach((ownerTasks, ownerId) => {
        newNodes.push({
          id: `owner-${ownerId}`,
          type: 'default',
          data: { 
            label: (
              <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg font-semibold text-sm">
                <TaskOwnerAvatar ownerId={ownerId} size="sm" />
                <span>Задачи владельца</span>
              </div>
            )
          },
          position: { x: 0, y: 0 },
          style: { width: groupNodeWidth, height: groupNodeHeight }
        });

        ownerTasks.forEach(task => {
          const taskAssignments = assignments[task.id] || [];
          const contributors = taskAssignments
            .filter(a => a.role === 'contributor')
            .map(a => a.user_id);

          newNodes.push(createTaskNode(task, task.owner_id, contributors));
          newEdges.push({
            id: `group-${ownerId}-${task.id}`,
            source: `owner-${ownerId}`,
            target: task.id,
            type: 'straight',
            style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '5,5' },
          });
        });
      });

      if (noOwnerTasks.length > 0) {
        newNodes.push({
          id: 'no-owner',
          type: 'default',
          data: { 
            label: (
              <div className="p-2 bg-muted/50 rounded-lg font-semibold text-sm">
                Без владельца
              </div>
            )
          },
          position: { x: 0, y: 0 },
          style: { width: groupNodeWidth, height: groupNodeHeight }
        });

        noOwnerTasks.forEach(task => {
          const taskAssignments = assignments[task.id] || [];
          const contributors = taskAssignments
            .filter(a => a.role === 'contributor')
            .map(a => a.user_id);

          newNodes.push(createTaskNode(task, task.owner_id, contributors));
          newEdges.push({
            id: `group-no-owner-${task.id}`,
            source: 'no-owner',
            target: task.id,
            type: 'straight',
            style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '5,5' },
          });
        });
      }

      relations
        .filter(rel => taskIds.has(rel.parent_id) && taskIds.has(rel.child_id))
        .forEach((rel, index) => {
          newEdges.push({
            id: `${rel.parent_id}-${rel.child_id}-${index}`,
            source: rel.parent_id,
            target: rel.child_id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
          });
        });
    }
    // Группировка по колонке
    else if (grouping === 'column') {
      const tasksByColumn = new Map<string, Task[]>();

      tasks.forEach(task => {
        const columnTasks = tasksByColumn.get(task.columnId) || [];
        columnTasks.push(task);
        tasksByColumn.set(task.columnId, columnTasks);
      });

      tasksByColumn.forEach((columnTasks, columnId) => {
        newNodes.push({
          id: `column-${columnId}`,
          type: 'default',
          data: { 
            label: (
              <div className="p-2 bg-accent/50 rounded-lg font-semibold text-sm">
                {columnId}
              </div>
            )
          },
          position: { x: 0, y: 0 },
          style: { width: groupNodeWidth, height: groupNodeHeight }
        });

        columnTasks.forEach(task => {
          const taskAssignments = assignments[task.id] || [];
          const contributors = taskAssignments
            .filter(a => a.role === 'contributor')
            .map(a => a.user_id);

          newNodes.push(createTaskNode(task, task.owner_id, contributors));
          newEdges.push({
            id: `group-${columnId}-${task.id}`,
            source: `column-${columnId}`,
            target: task.id,
            type: 'straight',
            style: { strokeWidth: 1, stroke: 'hsl(var(--muted-foreground))', strokeDasharray: '5,5' },
          });
        });
      });

      relations
        .filter(rel => taskIds.has(rel.parent_id) && taskIds.has(rel.child_id))
        .forEach((rel, index) => {
          newEdges.push({
            id: `${rel.parent_id}-${rel.child_id}-${index}`,
            source: rel.parent_id,
            target: rel.child_id,
            type: 'smoothstep',
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
          });
        });
    }
    // Без группировки или по связям
    else {
      newNodes = tasks.map((task) => {
        const taskAssignments = assignments[task.id] || [];
        const contributors = taskAssignments
          .filter(a => a.role === 'contributor')
          .map(a => a.user_id);

        return createTaskNode(task, task.owner_id, contributors);
      });

      newEdges = relations
        .filter(rel => taskIds.has(rel.parent_id) && taskIds.has(rel.child_id))
        .map((rel, index) => ({
          id: `${rel.parent_id}-${rel.child_id}-${index}`,
          source: rel.parent_id,
          target: rel.child_id,
          type: 'smoothstep',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          style: { strokeWidth: 2, stroke: 'hsl(var(--primary))' },
        }));
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, direction, grouping);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [tasks, relations, assignments, direction, grouping, getChildTasks, onTaskClick]);

  const toggleDirection = () => {
    setDirection(prev => prev === 'TB' ? 'LR' : 'TB');
  };

  return (
    <div className="w-full h-[calc(100vh-12rem)] bg-background rounded-lg border">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{
            padding: 0.15,
            minZoom: 0.3,
            maxZoom: 1.5
          }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <Panel position="top-right" className="bg-card p-3 rounded-lg border shadow-sm space-y-2">
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">Группировка</div>
              <Select value={grouping} onValueChange={(value) => setGrouping(value as GroupingType)}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relations">По связям</SelectItem>
                  <SelectItem value="owner">По владельцу</SelectItem>
                  <SelectItem value="column">По статусу</SelectItem>
                  <SelectItem value="none">Без группировки</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="text-xs font-medium text-muted-foreground">Ориентация</div>
              <button
                onClick={toggleDirection}
                className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
              >
                {direction === 'TB' ? 'Вертикально' : 'Горизонтально'}
              </button>
            </div>

            <div className="pt-2 border-t border-border/50">
              <div className="text-[10px] text-muted-foreground">
                Приближение → карточки с подзадачами
              </div>
            </div>
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
};
