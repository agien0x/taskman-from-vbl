// Widget API Client for interacting with task manager

export interface WidgetTask {
  id: string;
  title: string;
  content: string;
  column_id: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WidgetConfig {
  apiToken: string;
  baseUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export type RealtimeCallback = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: WidgetTask;
  old: WidgetTask;
}) => void;

export class WidgetAPI {
  private token: string;
  private baseUrl: string;
  private supabaseUrl: string;
  private supabaseKey: string;
  private realtimeChannel: any = null;
  private supabase: any = null;

  constructor(config: WidgetConfig) {
    this.token = config.apiToken;
    this.baseUrl = config.baseUrl || 'https://vmtjcycacbrzefrxeakv.supabase.co/functions/v1';
    this.supabaseUrl = config.supabaseUrl || 'https://vmtjcycacbrzefrxeakv.supabase.co';
    this.supabaseKey = config.supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdGpjeWNhY2JyemVmcnhlYWt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyMzM0MTUsImV4cCI6MjA3NjgwOTQxNX0.G3r36d9Mdye8iSSDh_uqr-Txu9exOiRs72yqI7eo3R8';
  }

  async initializeRealtime() {
    // Dynamically import Supabase client from CDN
    try {
      // @ts-ignore - Dynamic import from CDN
      const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
      this.supabase = module.createClient(this.supabaseUrl, this.supabaseKey);
    } catch (error) {
      console.error('Failed to load Supabase client:', error);
      throw error;
    }
  }

  subscribeToChanges(callback: RealtimeCallback) {
    if (!this.supabase) {
      console.error('Supabase not initialized. Call initializeRealtime() first');
      return;
    }

    this.realtimeChannel = this.supabase
      .channel('widget-tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        (payload: any) => {
          callback({
            eventType: payload.eventType,
            new: payload.new as WidgetTask,
            old: payload.old as WidgetTask
          });
        }
      )
      .subscribe();

    console.log('Realtime subscription created');
  }

  unsubscribe() {
    if (this.realtimeChannel && this.supabase) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
      console.log('Realtime subscription removed');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'API request failed');
    }

    return response.json();
  }

  async getTasks(): Promise<WidgetTask[]> {
    return this.request<WidgetTask[]>(`widget-api-list/${this.token}/tasks`);
  }

  async getTask(taskId: string): Promise<WidgetTask> {
    return this.request<WidgetTask>(`widget-api-get/${this.token}/tasks/${taskId}`);
  }

  async createTask(task: Partial<WidgetTask>): Promise<WidgetTask> {
    return this.request<WidgetTask>(`widget-api-create/${this.token}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  async updateTask(taskId: string, updates: Partial<WidgetTask>): Promise<WidgetTask> {
    return this.request<WidgetTask>(`widget-api-update/${this.token}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTask(taskId: string): Promise<{ success: boolean; id: string }> {
    return this.request(`widget-api-delete/${this.token}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }
}
