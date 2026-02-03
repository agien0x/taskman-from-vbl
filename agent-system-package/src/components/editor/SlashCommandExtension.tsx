import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { TaskSearchMenu } from './TaskSearchMenu';

interface TaskSearchItem {
  id: string;
  type: 'task' | 'agent';
  title: string;
  content: string;
}

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      supabaseClient: null,
      suggestion: {
        char: '/',
        items: async ({ query, editor }: { query: string; editor: any }): Promise<TaskSearchItem[]> => {
          const supabaseClient = editor.extensionManager.extensions.find(
            (ext: any) => ext.name === 'slashCommand'
          )?.options?.supabaseClient;
          
          if (!supabaseClient) {
            console.warn('SlashCommandExtension: supabaseClient not provided');
            return [];
          }
          
          try {
            const [tasksResponse, agentsResponse] = await Promise.all([
              supabaseClient.from('tasks').select('*'),
              supabaseClient.from('agents').select('*'),
            ]);

            const allItems: TaskSearchItem[] = [
              ...(tasksResponse.data || []).map((task: any) => ({
                id: task.id,
                type: 'task' as const,
                title: task.title || task.content?.split('\n')[0]?.slice(0, 50) || 'Без названия',
                content: task.content || '',
              })),
              ...(agentsResponse.data || []).map((agent: any) => ({
                id: agent.id,
                type: 'agent' as const,
                title: agent.name,
                content: agent.prompt || '',
              })),
            ];

            if (!query) {
              return allItems.slice(0, 10);
            }

            const lowerQuery = query.toLowerCase();
            return allItems
              .filter(item => {
                const lowerTitle = item.title.toLowerCase();
                const lowerContent = item.content.toLowerCase();
                return lowerTitle.includes(lowerQuery) || lowerContent.includes(lowerQuery);
              })
              .slice(0, 10);
          } catch (error) {
            console.error('Error loading items:', error);
            return [];
          }
        },
        render: () => {
          let component: ReactRenderer;
          let popup: TippyInstance[];

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(TaskSearchMenu, {
                props,
                editor: props.editor,
              });

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
              component.updateProps(props);

              popup[0].setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup[0].hide();
                return true;
              }

              return (component.ref as any)?.onKeyDown?.(props);
            },

            onExit() {
              popup[0].destroy();
              component.destroy();
            },
          };
        },
        command: ({ editor, range, props }: { editor: any; range: any; props: any }) => {
          const item = props as TaskSearchItem;
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setMention({
              id: item.id,
              label: item.title,
              type: item.type,
            })
            .insertContent(' ')
            .run();
        },
      } as Partial<SuggestionOptions>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});
