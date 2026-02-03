import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';
import Highlight from '@tiptap/extension-highlight';
import { ResizableImage } from './ResizableImageExtension';
import { FloatingToolbar } from './FloatingToolbar';
import { MentionExtension } from './MentionExtension';
import { SlashCommandExtension } from './SlashCommandExtension';
import { AgentInputElement } from './AgentElementExtension';
import { CollaborationExtension, CollaborationUser } from './CollaborationExtension';
import { cn } from '@/lib/utils';
import { VoiceInputWithAgents } from '@/components/ui/VoiceInputWithAgents';
import { uploadImageToStorage } from '@/utils/imageUpload';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight } from 'lucide-react';
import './editor-styles.css';
import './collaboration-styles.css';
import 'tippy.js/dist/tippy.css';

export interface UnifiedEditorProps {
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
  onFocus?: () => void;
  onBlur?: () => void;
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
  onFocus,
  onBlur,
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
    ResizableImage.configure({
      inline: true,
      allowBase64: true,
    }),
    Placeholder.configure({
      placeholder,
    }),
    MentionExtension,
    SlashCommandExtension,
    CollaborationExtension.configure({
      users: collaborationUsers,
      onCursorUpdate,
    }),
  ];

  if (enableAgentInputs) {
    extensions.push(AgentInputElement);
  }
  
  const editor = useEditor({
    extensions,
    content,
    onUpdate: ({ editor }) => {
      isUpdatingRef.current = true;
      const newContent = editor.getHTML();
      onChange(newContent);
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 0);
    },
    onFocus: () => {
      onFocus?.();
    },
    onBlur: () => {
      onBlur?.();
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
        console.log('handlePaste triggered');
        const items = event.clipboardData?.items;
        if (!items) {
          console.log('No clipboard items');
          return false;
        }

        console.log('Clipboard items count:', items.length);
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          console.log('Clipboard item:', i, item.type, item.kind);
          if (item.type.indexOf('image') === 0) {
            console.log('Found image in clipboard');
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              console.log('Got file from clipboard:', file.name, file.size);
              uploadImageToStorage(file).then((url) => {
                console.log('Upload result:', url);
                if (url && editor) {
                  editor.chain().focus().setImage({ src: url }).run();
                }
              }).catch((err) => {
                console.error('Upload failed:', err);
              });
            } else {
              console.log('Could not get file from clipboard item');
            }
            return true;
          }
        }
        return false;
      },
      handleDrop: (view, event, slice, moved) => {
        console.log('handleDrop triggered, moved:', moved);
        // Если это перемещение внутри редактора, разрешаем стандартное поведение
        if (moved) {
          return false;
        }
        
        if (!event.dataTransfer?.files.length) {
          console.log('No files in drop');
          return false;
        }
        
        event.preventDefault();
        const files = Array.from(event.dataTransfer.files);
        console.log('Dropped files:', files.length);
        
        files.forEach((file) => {
          console.log('Processing dropped file:', file.name, file.type);
          if (file.type.indexOf('image') === 0) {
            uploadImageToStorage(file).then((url) => {
              console.log('Drop upload result:', url);
              if (url && editor) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  const node = schema.nodes.image.create({ src: url });
                  const transaction = view.state.tr.insert(coordinates.pos, node);
                  view.dispatch(transaction);
                }
              }
            }).catch((err) => {
              console.error('Drop upload failed:', err);
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
          
          // Сначала пробуем вложить taskItem
          if (editor?.can().sinkListItem('taskItem')) {
            editor.chain().focus().sinkListItem('taskItem').run();
            return true;
          }
          // Затем пробуем вложить обычный listItem
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

  // Count consecutive completed tasks (memoized to avoid re-parsing on every render)
  const completedCount = useMemo(() => {
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
  }, [editor, content]);

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
      <VoiceInputWithAgents
        value={content}
        onChange={onChange}
        templateSettingsComponent={templateSettingsComponent}
      >
        {({ disabled }) => (
          <div
            className={cn(
              'w-full rounded-md bg-background transition-colors overflow-auto relative',
              !minimal && 'border border-input hover:border-primary/50',
              minimal && 'hover:bg-accent/50',
              disabled && 'opacity-50 pointer-events-none',
              'cursor-text',
              className
            )}
          >
            <FloatingToolbar editor={editor} />
            <EditorContent editor={editor} />
            {/* Sticky icons container inside editor */}
            <div className="sticky bottom-0 right-0 flex justify-end pointer-events-none">
              <div className="pointer-events-auto" />
            </div>
          </div>
        )}
      </VoiceInputWithAgents>
    </div>
  );
});

UnifiedEditor.displayName = 'UnifiedEditor';
