import Mention from '@tiptap/extension-mention';
import { ReactRenderer, ReactNodeViewRenderer } from '@tiptap/react';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { MentionList } from './MentionList';
import { TaskBadgeNodeView } from './TaskBadgeNodeView';
import { SuggestionKeyDownProps } from '@tiptap/suggestion';

export const MentionExtension = Mention.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TaskBadgeNodeView);
  },
  
  addOptions() {
    return {
      ...this.parent?.(),
      supabaseClient: null,
    };
  },
}).configure({
  HTMLAttributes: {
    class: 'mention',
  },
  suggestion: {
    char: '@',
    items: async ({ query, editor }: { query: string; editor: any }) => {
      const supabaseClient = editor.extensionManager.extensions.find(
        (ext: any) => ext.name === 'mention'
      )?.options?.supabaseClient;
      
      if (!supabaseClient) {
        console.warn('MentionExtension: supabaseClient not provided');
        return [];
      }
      
      // Fetch tasks - show all if query is empty, otherwise filter
      let tasksQuery = supabaseClient
        .from('tasks')
        .select('id, title, content, column_id');

      if (query.trim()) {
        tasksQuery = tasksQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
      }

      const { data: tasks } = await tasksQuery
        .order('updated_at', { ascending: false })
        .limit(50);

      // Fetch agents
      let agentsQuery = supabaseClient
        .from('agents')
        .select('id, name');

      if (query.trim()) {
        agentsQuery = agentsQuery.ilike('name', `%${query}%`);
      }

      const { data: agents } = await agentsQuery
        .order('updated_at', { ascending: false })
        .limit(20);

      const taskItems = (tasks || []).map(task => ({
        id: task.id,
        title: task.title || task.content,
        type: 'task' as const,
        columnId: task.column_id,
      }));

      const agentItems = (agents || []).map(agent => ({
        id: agent.id,
        title: agent.name,
        type: 'agent' as const,
      }));

      return [...taskItems, ...agentItems];
    },
    render: () => {
      let component: ReactRenderer | undefined;
      let popup: TippyInstance[] | undefined;

      return {
        onStart: (props: any) => {
          component = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          if (!props.clientRect) {
            return;
          }

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          });
        },

        onUpdate(props: any) {
          component?.updateProps(props);

          if (!props.clientRect || !popup) {
            return;
          }

          popup[0].setProps({
            getReferenceClientRect: props.clientRect,
          });
        },

        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup?.[0].hide();
            return true;
          }

          if (component?.ref) {
            return (component.ref as any).onKeyDown?.(props) || false;
          }

          return false;
        },

        onExit() {
          popup?.[0].destroy();
          component?.destroy();
        },
      };
    },
  },
});
