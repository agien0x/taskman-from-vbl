import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, { SuggestionOptions } from '@tiptap/suggestion';
import tippy, { Instance as TippyInstance } from 'tippy.js';
import { TaskSearchMenu } from './TaskSearchMenu';
import { supabase } from '@/integrations/supabase/client';

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
      suggestion: {
        char: '/',
        items: async ({ query }: { query: string }): Promise<TaskSearchItem[]> => {
          try {
            // Ограничиваем поля и количество записей для производительности
            const [tasksResponse, agentsResponse] = await Promise.all([
              supabase.from('tasks').select('id, title, content').order('updated_at', { ascending: false }).limit(50),
              supabase.from('agents').select('id, name, prompt').order('updated_at', { ascending: false }).limit(20),
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
