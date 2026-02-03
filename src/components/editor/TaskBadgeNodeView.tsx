import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import TaskBadge from '@/components/TaskBadge';
import AgentBadge from '@/components/AgentBadge';

export const TaskBadgeNodeView = ({ node }: NodeViewProps) => {
  const { id, label } = node.attrs;
  const [type, actualId] = id.split(':');

  if (type === 'task') {
    return (
      <NodeViewWrapper as="span" className="inline-block">
        <TaskBadge
          taskId={actualId}
          title={label}
          showMenu={false}
        />
      </NodeViewWrapper>
    );
  }

  if (type === 'agent') {
    return (
      <NodeViewWrapper as="span" className="inline-block">
        <AgentBadge
          agentId={actualId}
          name={label}
        />
      </NodeViewWrapper>
    );
  }

  return null;
};
