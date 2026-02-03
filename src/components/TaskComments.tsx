import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Send, ArrowRight, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { RichContent } from "@/components/RichContent";
import { UnifiedEditor } from "@/components/editor/UnifiedEditor";
import { TimeLog } from "@/types/kanban";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Comment {
  id: string;
  task_id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  replies?: Comment[];
  isTimeLog?: boolean;
  timeLogData?: TimeLog;
}

interface TaskCommentsProps {
  taskId: string;
  comments: Comment[];
  onCommentsChange: () => void;
}

export const TaskComments = ({ taskId, comments, onCommentsChange }: TaskCommentsProps) => {
  const [commentText, setCommentText] = useState("");
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const { toast } = useToast();

  // Load time logs
  useEffect(() => {
    loadTimeLogs();
  }, [taskId]);

  // Load saved draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(`comment-draft-${taskId}`);
    if (savedDraft) {
      setCommentText(savedDraft);
    }
  }, [taskId]);

  const loadTimeLogs = async () => {
    const { data, error } = await supabase
      .from("time_logs")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTimeLogs(data);
    }
  };

  // Save draft to localStorage on change
  const handleCommentChange = (newText: string) => {
    setCommentText(newText);
    
    // Save draft to localStorage
    if (newText.trim()) {
      localStorage.setItem(`comment-draft-${taskId}`, newText);
    } else {
      localStorage.removeItem(`comment-draft-${taskId}`);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходимо войти в систему",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("comments")
        .insert({ 
          task_id: taskId, 
          content: commentText,
          parent_comment_id: replyToId,
          author_id: user.id 
        });

      if (error) throw error;

      // Clear draft from localStorage
      localStorage.removeItem(`comment-draft-${taskId}`);
      
      setCommentText("");
      setReplyToId(null);
      onCommentsChange();
      toast({
        title: "Успешно",
        description: replyToId ? "Ответ добавлен" : "Комментарий добавлен",
      });
    } catch (error) {
      console.error("Error adding comment:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить комментарий",
        variant: "destructive",
      });
    }
  };

  const handleConvertToSubtask = async (comment: Comment) => {
    try {
      // Create new subtask
      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert({
          title: comment.content.substring(0, 50) + (comment.content.length > 50 ? "..." : ""),
          content: comment.content,
          column_id: "todo", // Default column
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Create relation
      const { error: relationError } = await supabase
        .from("task_relations")
        .insert({
          parent_id: taskId,
          child_id: newTask.id,
        });

      if (relationError) throw relationError;

      // Delete comment
      const { error: deleteError } = await supabase
        .from("comments")
        .delete()
        .eq("id", comment.id);

      if (deleteError) throw deleteError;

      onCommentsChange();
      toast({
        title: "Успешно",
        description: "Комментарий превращен в подзадачу",
      });
    } catch (error) {
      console.error("Error converting comment to subtask:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось превратить комментарий в подзадачу",
        variant: "destructive",
      });
    }
  };

  // Build hierarchical comment structure with time logs
  const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // Add time logs as special comments
    timeLogs.forEach(log => {
      const timeLogComment: Comment = {
        id: `timelog-${log.id}`,
        task_id: taskId,
        content: log.description,
        created_at: log.created_at,
        isTimeLog: true,
        timeLogData: log,
      };
      rootComments.push(timeLogComment);
    });

    // Create map and initialize replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Build tree structure
    comments.forEach(comment => {
      const commentNode = commentMap.get(comment.id)!;
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies!.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });

    // Sort by date
    return rootComments.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  };

  const commentTree = buildCommentTree(comments);

  const renderComment = (comment: Comment, depth: number = 0) => (
    <div key={comment.id} className={depth > 0 ? "ml-6 mt-2 border-l-2 border-border pl-3" : ""}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="p-2">
              <RichContent content={comment.content} className="text-sm" />
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(comment.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => {
            setReplyToId(comment.id);
          }}>
            <Send className="h-4 w-4 mr-2" />
            Ответить
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleConvertToSubtask(comment)}>
            <ArrowRight className="h-4 w-4 mr-2" />
            Превратить в подзадачу
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(reply => renderComment(reply, depth + 1))}
        </div>
      )}
    </div>
  );

  const [showAll, setShowAll] = useState(false);
  const displayedComments = showAll ? commentTree : commentTree.slice(0, 1);
  const hasMore = commentTree.length > 1;

  return (
    <div className="space-y-1.5 w-full">
      {commentTree.length > 0 && (
        <div className="space-y-1.5 w-full">
          {displayedComments.map(comment => (
            <div key={comment.id} className="w-full">
              {comment.isTimeLog ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="p-1.5">
                    <div className="flex items-start gap-1.5">
                      <Clock className="h-3 w-3 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {comment.timeLogData?.hours}ч
                          </Badge>
                          {comment.timeLogData?.completion_percentage && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                              {comment.timeLogData.completion_percentage}%
                            </Badge>
                          )}
                        </div>
                        <RichContent content={comment.content} className="text-xs" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(comment.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Card className="cursor-pointer hover:bg-accent/50 transition-colors w-full">
                      <CardContent className="p-1.5">
                        <RichContent content={comment.content} className="text-xs" />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setReplyToId(comment.id)}>
                      <Send className="h-4 w-4 mr-2" />
                      Ответить
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleConvertToSubtask(comment)}>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Превратить в подзадачу
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      {replyToId && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          Ответ на комментарий
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setReplyToId(null)}
            className="h-5 px-2"
          >
            Отмена
          </Button>
        </div>
      )}

      <div className="flex gap-1.5 items-center w-full">
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-7 px-2 text-xs shrink-0"
          >
            {showAll ? "Скрыть" : `Все (${commentTree.length})`}
          </Button>
        )}
        <UnifiedEditor
          content={commentText}
          onChange={handleCommentChange}
          placeholder={replyToId ? "Ответ..." : "Комментарий..."}
          singleLine={true}
          className="flex-1"
        />
        <Button onClick={handleAddComment} size="sm" className="shrink-0 h-7 w-7 p-0">
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};
