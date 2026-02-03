import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface CollaborationUser {
  userId: string;
  userName: string;
  color: string;
  cursor?: {
    from: number;
    to: number;
  };
}

export interface CollaborationOptions {
  users: CollaborationUser[];
  onCursorUpdate?: (position: { from: number; to: number }) => void;
}

const collaborationPluginKey = new PluginKey('collaboration');

export const CollaborationExtension = Extension.create<CollaborationOptions>({
  name: 'collaboration',

  addOptions() {
    return {
      users: [],
      onCursorUpdate: undefined,
    };
  },

  addProseMirrorPlugins() {
    const extension = this;

    return [
      new Plugin({
        key: collaborationPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldState) {
            const users = extension.options.users || [];
            const decorations: Decoration[] = [];

            // Создаем декорации для курсоров других пользователей
            users.forEach((user) => {
              if (user.cursor && user.cursor.from !== undefined) {
                try {
                  // Курсор пользователя
                  const cursorDecoration = Decoration.widget(
                    user.cursor.from,
                    () => {
                      const cursor = document.createElement('span');
                      cursor.className = 'collaboration-cursor';
                      cursor.style.borderLeft = `2px solid ${user.color}`;
                      cursor.style.marginLeft = '-1px';
                      cursor.style.pointerEvents = 'none';
                      cursor.style.position = 'relative';
                      cursor.style.height = '1.2em';
                      cursor.style.display = 'inline-block';

                      const label = document.createElement('span');
                      label.className = 'collaboration-cursor-label';
                      label.textContent = user.userName;
                      label.style.position = 'absolute';
                      label.style.top = '-1.5em';
                      label.style.left = '0';
                      label.style.fontSize = '0.75rem';
                      label.style.backgroundColor = user.color;
                      label.style.color = 'white';
                      label.style.padding = '2px 6px';
                      label.style.borderRadius = '4px';
                      label.style.whiteSpace = 'nowrap';
                      label.style.pointerEvents = 'none';
                      label.style.zIndex = '10';

                      cursor.appendChild(label);
                      return cursor;
                    },
                    { side: -1 }
                  );

                  decorations.push(cursorDecoration);

                  // Выделение текста, если есть selection
                  if (user.cursor.to > user.cursor.from) {
                    const selectionDecoration = Decoration.inline(
                      user.cursor.from,
                      user.cursor.to,
                      {
                        style: `background-color: ${user.color}33; border-bottom: 2px solid ${user.color};`,
                        class: 'collaboration-selection',
                      }
                    );
                    decorations.push(selectionDecoration);
                  }
                } catch (error) {
                  console.error('Error creating cursor decoration:', error);
                }
              }
            });

            return DecorationSet.create(tr.doc, decorations);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
        view() {
          return {
            update: (view) => {
              // Отправляем текущую позицию курсора
              if (extension.options.onCursorUpdate) {
                const { from, to } = view.state.selection;
                extension.options.onCursorUpdate({ from, to });
              }
            },
          };
        },
      }),
    ];
  },
});
