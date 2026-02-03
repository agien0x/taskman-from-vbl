import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Placeholder from '@tiptap/extension-placeholder';
import ListItem from '@tiptap/extension-list-item';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import Blockquote from '@tiptap/extension-blockquote';
import Highlight from '@tiptap/extension-highlight';
import { EditorToolbar } from './EditorToolbar';
import { FloatingToolbar } from './FloatingToolbar';
import { MentionExtension } from './MentionExtension';
import { SlashCommandExtension } from './SlashCommandExtension';
import { cn } from '@/lib/utils';
import './editor-styles.css';
import 'tippy.js/dist/tippy.css';

interface RichEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  showToolbar?: boolean;
  singleLine?: boolean;
  autoFocus?: boolean;
}

export const RichEditor = ({
  content,
  onChange,
  placeholder = 'Начните печатать...',
  className,
  showToolbar = true,
  singleLine = false,
  autoFocus = false,
}: RichEditorProps) => {
  const editor = useEditor({
    extensions: [
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
        HTMLAttributes: {
          class: 'list-disc list-outside ml-4',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-4',
        },
      }),
      ListItem.configure({
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
          class: 'not-prose',
        },
      }),
      TaskItem.configure({
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
      Placeholder.configure({
        placeholder,
      }),
      MentionExtension,
      SlashCommandExtension,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: singleLine 
          ? 'prose prose-sm max-w-none focus:outline-none px-3 py-2'
          : 'prose prose-sm max-w-none focus:outline-none min-h-[120px] px-4 py-3',
      },
      handleKeyDown: (view, event) => {
        // Prevent Enter in single line mode
        if (singleLine && event.key === 'Enter') {
          event.preventDefault();
          return true;
        }
        
        // Handle Tab for list indentation
        if (event.key === 'Tab' && !event.shiftKey) {
          if (editor?.can().sinkListItem('listItem')) {
            event.preventDefault();
            editor.chain().focus().sinkListItem('listItem').run();
            return true;
          }
        }
        // Handle Shift+Tab for list outdentation
        if (event.key === 'Tab' && event.shiftKey) {
          if (editor?.can().liftListItem('listItem')) {
            event.preventDefault();
            editor.chain().focus().liftListItem('listItem').run();
            return true;
          }
        }
        return false;
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (content !== current) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('w-full border border-input rounded-md bg-background', className)}>
      {showToolbar === true && <EditorToolbar editor={editor} />}
      {showToolbar === false && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
};
