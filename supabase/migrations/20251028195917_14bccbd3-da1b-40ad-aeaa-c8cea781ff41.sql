-- Create task logs table
CREATE TABLE IF NOT EXISTS public.task_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  field_name TEXT,
  old_value TEXT,
  new_value TEXT,
  user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for task logs
CREATE POLICY "Authenticated users can view task logs"
  ON public.task_logs
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create task logs"
  ON public.task_logs
  FOR INSERT
  WITH CHECK (true);

-- Create index for performance
CREATE INDEX idx_task_logs_task_id ON public.task_logs(task_id);
CREATE INDEX idx_task_logs_created_at ON public.task_logs(created_at DESC);

-- Function to log task changes
CREATE OR REPLACE FUNCTION public.log_task_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.task_logs (task_id, action, user_id)
    VALUES (NEW.id, 'created', auth.uid());
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Log title changes
    IF (OLD.title IS DISTINCT FROM NEW.title) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'title', OLD.title, NEW.title, auth.uid());
    END IF;
    
    -- Log content changes
    IF (OLD.content IS DISTINCT FROM NEW.content) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'content', 
        LEFT(OLD.content, 100), LEFT(NEW.content, 100), auth.uid());
    END IF;
    
    -- Log status changes
    IF (OLD.column_id IS DISTINCT FROM NEW.column_id) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'column_id', OLD.column_id, NEW.column_id, auth.uid());
    END IF;
    
    -- Log priority changes
    IF (OLD.priority IS DISTINCT FROM NEW.priority) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'priority', OLD.priority::text, NEW.priority::text, auth.uid());
    END IF;
    
    -- Log owner changes
    IF (OLD.owner_id IS DISTINCT FROM NEW.owner_id) THEN
      INSERT INTO public.task_logs (task_id, action, field_name, old_value, new_value, user_id)
      VALUES (NEW.id, 'updated', 'owner_id', OLD.owner_id::text, NEW.owner_id::text, auth.uid());
    END IF;
    
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.task_logs (task_id, action, user_id)
    VALUES (OLD.id, 'deleted', auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task changes
DROP TRIGGER IF EXISTS trigger_log_task_changes ON public.tasks;
CREATE TRIGGER trigger_log_task_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.log_task_changes();