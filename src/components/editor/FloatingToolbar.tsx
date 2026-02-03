import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  List,
  ListOrdered,
  CheckSquare,
  Undo,
  Redo,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Indent,
  Outdent,
} from 'lucide-react';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Separator } from '@/components/ui/separator';

interface FloatingToolbarProps {
  editor: Editor;
}

export const FloatingToolbar = ({ editor }: FloatingToolbarProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const isInteractingRef = useRef(false);

  const updatePosition = useCallback(() => {
    // Не обновляем позицию во время взаимодействия с тулбаром
    if (isInteractingRef.current) return;
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;
    
    // Скрываем тулбар если нет выделения
    if (!hasSelection) {
      setIsVisible(false);
      return;
    }
    
    // Скрываем тулбар если выделен узел (например, изображение)
    // NodeSelection имеет свойство node
    const selection = editor.state.selection;
    if ('node' in selection && selection.node) {
      setIsVisible(false);
      return;
    }

    // Получаем координаты выделения относительно viewport
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    
    // Вычисляем позицию относительно viewport для fixed positioning
    const centerX = (start.left + end.left) / 2;
    const topY = start.top - 60;
    
    setPosition({ 
      top: topY,
      left: centerX
    });
    setIsVisible(true);
  }, [editor]);

  useEffect(() => {
    const handleUpdate = () => {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(updatePosition, 150);
    };

    const handleSelectionUpdate = () => {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = setTimeout(updatePosition, 150);
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleSelectionUpdate);
    
    // Добавляем обработчик прокрутки
    const handleScroll = () => {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        updatePosition();
      } else {
        setIsVisible(false);
      }
    };

    // Находим прокручиваемый контейнер
    let scrollContainer = editor.view.dom.parentElement;
    while (scrollContainer) {
      const overflow = window.getComputedStyle(scrollContainer).overflow;
      const overflowY = window.getComputedStyle(scrollContainer).overflowY;
      if (overflow === 'auto' || overflow === 'scroll' || overflowY === 'auto' || overflowY === 'scroll' || scrollContainer === document.documentElement) {
        scrollContainer.addEventListener('scroll', handleScroll, true);
        break;
      }
      scrollContainer = scrollContainer.parentElement;
    }
    
    // Также отслеживаем прокрутку окна
    window.addEventListener('scroll', handleScroll, true);
    
    // Initial check
    updatePosition();

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleSelectionUpdate);
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleScroll, true);
      }
      window.removeEventListener('scroll', handleScroll, true);
      clearTimeout(updateTimeoutRef.current);
    };
  }, [editor, updatePosition]);

  if (!isVisible) {
    return null;
  }

  const toolbar = (
    <div
      className="fixed z-[9999] flex items-center gap-0.5 p-1 bg-popover border border-border rounded-md shadow-lg"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)',
        pointerEvents: 'auto',
      }}
      onMouseDown={() => { isInteractingRef.current = true; }}
      onMouseUp={() => { setTimeout(() => { isInteractingRef.current = false; }, 100); }}
      onMouseLeave={() => { isInteractingRef.current = false; }}
    >
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('heading', { level: 1 }) ? 'bg-accent' : ''}`}
        title="Заголовок 1"
      >
        <Heading1 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('heading', { level: 2 }) ? 'bg-accent' : ''}`}
        title="Заголовок 2"
      >
        <Heading2 className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('heading', { level: 3 }) ? 'bg-accent' : ''}`}
        title="Заголовок 3"
      >
        <Heading3 className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('bold') ? 'bg-accent' : ''}`}
        title="Жирный"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('italic') ? 'bg-accent' : ''}`}
        title="Курсив"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('strike') ? 'bg-accent' : ''}`}
        title="Зачеркнутый"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('code') ? 'bg-accent' : ''}`}
        title="Код"
      >
        <Code className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHighlight().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('highlight') ? 'bg-accent' : ''}`}
        title="Выделение"
      >
        <Highlighter className="h-3.5 w-3.5" />
      </Button>
      
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('blockquote') ? 'bg-accent' : ''}`}
        title="Цитата"
      >
        <Quote className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('bulletList') ? 'bg-accent' : ''}`}
        title="Маркированный список"
      >
        <List className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('orderedList') ? 'bg-accent' : ''}`}
        title="Нумерованный список"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleTaskList().run(); }}
        className={`h-7 w-7 p-0 ${editor.isActive('taskList') ? 'bg-accent' : ''}`}
        title="Чек-лист"
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          if (editor.can().sinkListItem('taskItem')) {
            editor.chain().focus().sinkListItem('taskItem').run();
          } else if (editor.can().sinkListItem('listItem')) {
            editor.chain().focus().sinkListItem('listItem').run();
          }
        }}
        disabled={!editor.can().sinkListItem('taskItem') && !editor.can().sinkListItem('listItem')}
        className="h-7 w-7 p-0"
        title="Увеличить отступ"
      >
        <Indent className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          if (editor.can().liftListItem('taskItem')) {
            editor.chain().focus().liftListItem('taskItem').run();
          } else if (editor.can().liftListItem('listItem')) {
            editor.chain().focus().liftListItem('listItem').run();
          }
        }}
        disabled={!editor.can().liftListItem('taskItem') && !editor.can().liftListItem('listItem')}
        className="h-7 w-7 p-0"
        title="Уменьшить отступ"
      >
        <Outdent className="h-3.5 w-3.5" />
      </Button>
      
      <Separator orientation="vertical" className="h-6 mx-0.5" />
      
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().undo().run(); }}
        disabled={!editor.can().undo()}
        className="h-7 w-7 p-0"
      >
        <Undo className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().redo().run(); }}
        disabled={!editor.can().redo()}
        className="h-7 w-7 p-0"
      >
        <Redo className="h-3.5 w-3.5" />
      </Button>
    </div>
  );

  return createPortal(toolbar, document.body);
};