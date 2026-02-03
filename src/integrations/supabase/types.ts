export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agent_executions: {
        Row: {
          agent_id: string | null
          context: Json
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_type: string
          id: string
          input_data: Json
          modules_chain: Json | null
          output_data: Json
          rated_at: string | null
          rated_by: string | null
          rating: number | null
          rating_comment: string | null
          status: string
        }
        Insert: {
          agent_id?: string | null
          context?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_type: string
          id?: string
          input_data?: Json
          modules_chain?: Json | null
          output_data?: Json
          rated_at?: string | null
          rated_by?: string | null
          rating?: number | null
          rating_comment?: string | null
          status?: string
        }
        Update: {
          agent_id?: string | null
          context?: Json
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_type?: string
          id?: string
          input_data?: Json
          modules_chain?: Json | null
          output_data?: Json
          rated_at?: string | null
          rated_by?: string | null
          rating?: number | null
          rating_comment?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          channel_message: string | null
          channels: Json | null
          created_at: string
          description: string | null
          icon_url: string | null
          id: string
          inputs: Json | null
          inputs_raw: string | null
          last_trigger_execution: string | null
          model: string
          modules: Json | null
          name: string
          outputs: Json | null
          owner_id: string | null
          pitch: string | null
          prompt: string
          router_config: Json | null
          router_raw: string | null
          system_prompt: string | null
          trigger_config: Json | null
          updated_at: string
        }
        Insert: {
          channel_message?: string | null
          channels?: Json | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          inputs?: Json | null
          inputs_raw?: string | null
          last_trigger_execution?: string | null
          model?: string
          modules?: Json | null
          name: string
          outputs?: Json | null
          owner_id?: string | null
          pitch?: string | null
          prompt?: string
          router_config?: Json | null
          router_raw?: string | null
          system_prompt?: string | null
          trigger_config?: Json | null
          updated_at?: string
        }
        Update: {
          channel_message?: string | null
          channels?: Json | null
          created_at?: string
          description?: string | null
          icon_url?: string | null
          id?: string
          inputs?: Json | null
          inputs_raw?: string | null
          last_trigger_execution?: string | null
          model?: string
          modules?: Json | null
          name?: string
          outputs?: Json | null
          owner_id?: string | null
          pitch?: string | null
          prompt?: string
          router_config?: Json | null
          router_raw?: string | null
          system_prompt?: string | null
          trigger_config?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          task_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          task_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      global_stages: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          recommended_parents: Json | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          recommended_parents?: Json | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          recommended_parents?: Json | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          board_role: Database["public"]["Enums"]["board_role"] | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["task_member_role"]
          task_id: string
          user_id: string
        }
        Insert: {
          board_role?: Database["public"]["Enums"]["board_role"] | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["task_member_role"]
          task_id: string
          user_id: string
        }
        Update: {
          board_role?: Database["public"]["Enums"]["board_role"] | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["task_member_role"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_logs: {
        Row: {
          action: string
          created_at: string
          field_name: string | null
          id: string
          new_value: string | null
          old_value: string | null
          task_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          field_name?: string | null
          id?: string
          new_value?: string | null
          old_value?: string | null
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_relations: {
        Row: {
          child_id: string
          created_at: string | null
          id: string
          parent_id: string
        }
        Insert: {
          child_id: string
          created_at?: string | null
          id?: string
          parent_id: string
        }
        Update: {
          child_id?: string
          created_at?: string | null
          id?: string
          parent_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_relations_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_relations_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_scores: {
        Row: {
          created_at: string
          id: string
          is_manual: boolean
          quality_criteria: string | null
          reasoning: string | null
          score: number
          scored_by: string | null
          task_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_manual?: boolean
          quality_criteria?: string | null
          reasoning?: string | null
          score: number
          scored_by?: string | null
          task_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_manual?: boolean
          quality_criteria?: string | null
          reasoning?: string | null
          score?: number
          scored_by?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_scores_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_type_templates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          is_global: boolean
          name: string
          owner_id: string | null
          quality_criteria: string | null
          recurrence_days: Json | null
          recurrence_time: string | null
          recurrence_timezone: string
          recurrence_type: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          template: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          name: string
          owner_id?: string | null
          quality_criteria?: string | null
          recurrence_days?: Json | null
          recurrence_time?: string | null
          recurrence_timezone?: string
          recurrence_type?: string | null
          task_type: Database["public"]["Enums"]["task_type"]
          template?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          is_global?: boolean
          name?: string
          owner_id?: string | null
          quality_criteria?: string | null
          recurrence_days?: Json | null
          recurrence_time?: string | null
          recurrence_timezone?: string
          recurrence_type?: string | null
          task_type?: Database["public"]["Enums"]["task_type"]
          template?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      task_versions: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          task_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          task_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_versions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          attachments: Json | null
          auto_load_my_tasks: boolean | null
          column_id: string
          content: string
          content_embedding: string | null
          created_at: string
          custom_columns: Json | null
          custom_quality_criteria: string | null
          custom_template: string | null
          default_content: string | null
          duplicates: Json | null
          end_date: string | null
          id: string
          is_root: boolean
          last_recurrence_update: string | null
          last_score_at: string | null
          owner_id: string | null
          parent_id: string | null
          pitch: string | null
          planned_hours: number | null
          position: number
          priority: Database["public"]["Enums"]["task_priority"] | null
          recurrence_days: Json | null
          recurrence_time: string | null
          recurrence_type: string | null
          start_date: string | null
          subtask_order: number | null
          task_type: Database["public"]["Enums"]["task_type"] | null
          title: string
          updated_at: string
          use_custom_settings: boolean | null
        }
        Insert: {
          attachments?: Json | null
          auto_load_my_tasks?: boolean | null
          column_id: string
          content: string
          content_embedding?: string | null
          created_at?: string
          custom_columns?: Json | null
          custom_quality_criteria?: string | null
          custom_template?: string | null
          default_content?: string | null
          duplicates?: Json | null
          end_date?: string | null
          id?: string
          is_root?: boolean
          last_recurrence_update?: string | null
          last_score_at?: string | null
          owner_id?: string | null
          parent_id?: string | null
          pitch?: string | null
          planned_hours?: number | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence_days?: Json | null
          recurrence_time?: string | null
          recurrence_type?: string | null
          start_date?: string | null
          subtask_order?: number | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          title?: string
          updated_at?: string
          use_custom_settings?: boolean | null
        }
        Update: {
          attachments?: Json | null
          auto_load_my_tasks?: boolean | null
          column_id?: string
          content?: string
          content_embedding?: string | null
          created_at?: string
          custom_columns?: Json | null
          custom_quality_criteria?: string | null
          custom_template?: string | null
          default_content?: string | null
          duplicates?: Json | null
          end_date?: string | null
          id?: string
          is_root?: boolean
          last_recurrence_update?: string | null
          last_score_at?: string | null
          owner_id?: string | null
          parent_id?: string | null
          pitch?: string | null
          planned_hours?: number | null
          position?: number
          priority?: Database["public"]["Enums"]["task_priority"] | null
          recurrence_days?: Json | null
          recurrence_time?: string | null
          recurrence_type?: string | null
          start_date?: string | null
          subtask_order?: number | null
          task_type?: Database["public"]["Enums"]["task_type"] | null
          title?: string
          updated_at?: string
          use_custom_settings?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      time_logs: {
        Row: {
          completion_percentage: number | null
          created_at: string
          description: string
          hours: number
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completion_percentage?: number | null
          created_at?: string
          description: string
          hours: number
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          completion_percentage?: number | null
          created_at?: string
          description?: string
          hours?: number
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_logs_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          created_at: string | null
          id: string
          invited_by: string | null
          organization_id: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          invited_by?: string | null
          organization_id?: string
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_edit_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      can_view_board: {
        Args: { _board_id: string; _user_id: string }
        Returns: boolean
      }
      get_board_role: {
        Args: { _board_id: string; _user_id: string }
        Returns: Database["public"]["Enums"]["board_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      board_role: "admin" | "executor" | "viewer"
      organization_role: "admin" | "member"
      project_role: "owner" | "member"
      task_member_role: "owner" | "contributor"
      task_priority: "low" | "medium" | "high" | "none"
      task_type: "task" | "personal_board" | "standard" | "function" | "standup"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof Database
}
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
