import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { FloatingToolbar } from './FloatingToolbar';
import { MentionExtension } from './MentionExtension';
import { SlashCommandExtension } from './SlashCommandExtension';
import { AgentInputElement } from './AgentElementExtension';
import { CollaborationExtension, CollaborationUser } from './CollaborationExtension';
import { cn } from '../../lib/utils';
// VoiceInputWithAgents and imageUpload are project-specific
// These should be provided by the integrating project if needed
import { Button } from '../ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './editor-styles.css';
import './collaboration-styles.css';
import 'tippy.js/dist/tippy.css';

interface UnifiedEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  singleLine?: boolean;
  autoFocus?: boolean;
  minimal?: boolean;
  templateSettingsComponent?: React.ReactNode;
  enableAgentInputs?: boolean;
  collaborationUsers?: CollaborationUser[];
  onCursorUpdate?: (position: { from: number; to: number }) => void;
  onImageUpload?: (file: File) => Promise<string | null>;
  supabaseClient?: any;
}

export interface UnifiedEditorHandle {
  insertContentAtCursor: (html: string) => void;
  getEditor: () => any;
}

export const UnifiedEditor = forwardRef<UnifiedEditorHandle, UnifiedEditorProps>(({
  content,
  onChange,
  placeholder = 'Начните печатать...',
  className,
  singleLine = false,
  autoFocus = false,
  minimal = false,
  templateSettingsComponent,
  enableAgentInputs = false,
  collaborationUsers = [],
  onCursorUpdate,
  onImageUpload,
  supabaseClient,
}, ref) => {
  const isUpdatingRef = useRef(false);
  const [hideCompletedTasks, setHideCompletedTasks] = useState(false);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  
  const extensions = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      bulletList: false,
      orderedList: false,
      listItem: false,
      blockquote: false,
    }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'list-disc list-outside ml-4',
        },
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: false,
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-4',
        },
      }),
      ListItem.extend({
        content: '(paragraph | taskList | bulletList | orderedList)+',
        draggable: false,
      }).configure({
        HTMLAttributes: {
          class: 'ml-2',
        },
      }),
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-border pl-4 italic text-muted-foreground',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose ml-4',
        },
      }),
      TaskItem.extend({
        content: '(paragraph | taskList | bulletList | orderedList)+',
        draggable: false,
      }).configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2',
        },
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-800',
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md my-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CollaborationExtension.configure({
        users: collaborationUsers,
        onCursorUpdate,
      }),
    ];
    
    // Add mention and slash command extensions if supabaseClient is provided
    if (supabaseClient) {
      const mentionExt = MentionExtension.configure({});
      (mentionExt.options as any).supabaseClient = supabaseClient;
      
      const slashExt = SlashCommandExtension.configure({});
      (slashExt.options as any).supabaseClient = supabaseClient;
      
      extensions.push(mentionExt, slashExt);
    }

  if (enableAgentInputs) {
    extensions.push(AgentInputElement);
  }
  
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      isUpdatingRef.current = true;
      const newContent = editor.getHTML();
      console.log('UnifiedEditor onUpdate:', { newContent, contentProp: content });
      onChange(newContent);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    },
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: singleLine
          ? minimal
            ? 'prose prose-sm max-w-none focus:outline-none pr-24'
            : 'prose prose-sm max-w-none focus:outline-none px-3 py-2 pr-24'
          : minimal
          ? 'prose prose-sm max-w-none focus:outline-none min-h-[60px] pr-24'
          : 'prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2 pr-24',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file && onImageUpload) {
              onImageUpload(file).then((url) => {
                if (url && editor) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              });
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        // Если это перемещение внутри редактора, разрешаем стандартное поведение
        if (moved) {
          return false;
        }
        
        if (!event.dataTransfer?.files.length) {
          return false;
        }
        
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        
        files.forEach((file) => {
          if (file.type.indexOf('image') === 0 && onImageUpload) {
            onImageUpload(file).then((url) => {
              if (url && editor) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  const node = schema.nodes.image.create({ src: url });
                  const transaction = view.state.tr.insert(coordinates.pos, node);
                  view.dispatch(transaction);
                }
              }
            });
          }
        });
        return true;
      },
      handleKeyDown: (view, event) => {
        if (singleLine && event.key === 'Enter') {
          event.preventDefault();
          return true;
        }

        // Tab - вложение списков
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          
          // Проверяем, находимся ли мы в обычном списке
          if (editor?.isActive('listItem')) {
            // В обычном списке создаем TaskList при Tab
            editor.chain().focus().toggleTaskList().run();
            return true;
          }
          
          if (editor?.can().sinkListItem('taskItem')) {
            editor.chain().focus().sinkListItem('taskItem').run();
            return true;
          }
          if (editor?.can().sinkListItem('listItem')) {
            editor.chain().focus().sinkListItem('listItem').run();
            return true;
          }
          return true;
        }

        // Shift+Tab - подъем уровня
        if (event.key === 'Tab' && event.shiftKey) {
          event.preventDefault();
          
          if (editor?.can().liftListItem('taskItem')) {
            editor.chain().focus().liftListItem('taskItem').run();
            return true;
          }
          if (editor?.can().liftListItem('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
            return true;
          }
          return true;
        }

        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor || isUpdatingRef.current) return;
    
    // Защита от undefined/null content
    if (content === undefined || content === null) {
      console.log('UnifiedEditor: received invalid content, skipping update');
      return;
    }
    
    const current = editor.getHTML();
    // Only update if content is significantly different (not just from user typing)
    if (content !== current && !editor.isFocused) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  // Update collaboration users when they change
  useEffect(() => {
    if (!editor) return;
    
    editor.extensionManager.extensions.forEach((ext) => {
      if (ext.name === 'collaboration') {
        (ext.options as any).users = collaborationUsers;
        editor.view.dispatch(editor.state.tr);
      }
    });
  }, [collaborationUsers, editor]);

  // Apply hide completed tasks styling
  useEffect(() => {
    if (!editorContainerRef.current) return;
    
    const editorElement = editorContainerRef.current.querySelector('.ProseMirror');
    if (!editorElement) return;

    if (hideCompletedTasks) {
      editorElement.classList.add('hide-completed-tasks');
    } else {
      editorElement.classList.remove('hide-completed-tasks');
    }
  }, [hideCompletedTasks, editor]);

  // Count consecutive completed tasks
  const getCompletedTasksCount = () => {
    if (!editor) return 0;
    const html = editor.getHTML();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const taskItems = doc.querySelectorAll('li[data-type="taskItem"]');
    
    let consecutiveCompleted = 0;
    let maxConsecutive = 0;
    let hasConsecutive = false;
    
    taskItems.forEach((item) => {
      const isChecked = item.getAttribute('data-checked') === 'true';
      
      if (isChecked) {
        consecutiveCompleted++;
        if (consecutiveCompleted >= 2) {
          hasConsecutive = true;
          maxConsecutive = Math.max(maxConsecutive, consecutiveCompleted);
        }
      } else {
        if (consecutiveCompleted >= 2) {
          maxConsecutive = Math.max(maxConsecutive, consecutiveCompleted);
        }
        consecutiveCompleted = 0;
      }
    });
    
    return hasConsecutive ? maxConsecutive : 0;
  };

  const completedCount = getCompletedTasksCount();

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    insertContentAtCursor: (html: string) => {
      if (editor) {
        editor.chain().focus().insertContent(html).run();
      }
    },
    getEditor: () => editor,
  }));

  if (!editor) {
    return null;
  }

  return (
    <div ref={editorContainerRef}>
      {!minimal && completedCount >= 2 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setHideCompletedTasks(!hideCompletedTasks)}
          className="mb-2 text-xs h-7 gap-1"
        >
          {hideCompletedTasks ? (
            <>
              <ChevronRight className="h-3 w-3" />
              Показать {completedCount} выполненных
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Скрыть выполненные
            </>
          )}
        </Button>
      )}
      <div
        className={cn(
          'w-full rounded-md bg-background transition-colors resize-y overflow-auto relative',
          !minimal && 'border border-input hover:border-primary/50',
          minimal && 'hover:bg-accent/50',
          'cursor-text',
          className
        )}
      >
        <FloatingToolbar editor={editor} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
});

UnifiedEditor.displayName = 'UnifiedEditor';
