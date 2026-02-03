import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { Badge } from '../ui/badge';

export const TaskBadgeNodeView = ({ node }: NodeViewProps) => {
  const { id, label } = node.attrs;
  const [type, actualId] = id.split(':');

  // Simplified version - render as badges without full components
  return (
    <NodeViewWrapper as="span" className="inline-block">
      <Badge variant={type === 'task' ? 'default' : 'secondary'}>
        {label || actualId}
      </Badge>
    </NodeViewWrapper>
  );
};
