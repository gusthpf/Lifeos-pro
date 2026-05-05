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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointments: {
        Row: {
          created_at: string | null
          description: string | null
          end_time: string | null
          id: string
          start_time: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          start_time: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          id?: string
          start_time?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_activities: {
        Row: {
          category: string | null
          created_at: string | null
          description: string
          id: string
          user_id: string | null
          xp_reward: number
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description: string
          id?: string
          user_id?: string | null
          xp_reward: number
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string
          id?: string
          user_id?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed_at: string | null
          habit_id: string | null
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          habit_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          habit_id?: string | null
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          category: string | null
          created_at: string | null
          duration: number | null
          frequency_type: string | null
          id: string
          target_per_period: number | null
          title: string
          updated_at: string | null
          user_id: string | null
          xp_reward: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          duration?: number | null
          frequency_type?: string | null
          id?: string
          target_per_period?: number | null
          title: string
          updated_at?: string | null
          user_id?: string | null
          xp_reward?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          duration?: number | null
          frequency_type?: string | null
          id?: string
          target_per_period?: number | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
          xp_reward?: number | null
        }
        Relationships: []
      }
      incident_categories: {
        Row: {
          default_xp_waive: number | null
          display_name: string
          id: string
        }
        Insert: {
          default_xp_waive?: number | null
          display_name: string
          id: string
        }
        Update: {
          default_xp_waive?: number | null
          display_name?: string
          id?: string
        }
        Relationships: []
      }
      incident_logs: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          user_id: string
          xp_waived: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description: string
          id?: string
          user_id: string
          xp_waived?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          user_id?: string
          xp_waived?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_logs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "incident_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      journal: {
        Row: {
          content: string
          created_at: string | null
          id: string
          sentiment: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          sentiment?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          sentiment?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      kb_tecnica: {
        Row: {
          criado_em: string | null
          id: string
          solucao: string
          tags: string[] | null
          titulo: string
          user_id: string | null
        }
        Insert: {
          criado_em?: string | null
          id?: string
          solucao: string
          tags?: string[] | null
          titulo: string
          user_id?: string | null
        }
        Update: {
          criado_em?: string | null
          id?: string
          solucao?: string
          tags?: string[] | null
          titulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      life_goals: {
        Row: {
          created_at: string | null
          horizon: string | null
          id: string
          objective: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          horizon?: string | null
          id?: string
          objective: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          horizon?: string | null
          id?: string
          objective?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          email: string | null
          full_name: string | null
          id: string
          last_access: string | null
          level: number | null
          xp_total: number | null
        }
        Insert: {
          email?: string | null
          full_name?: string | null
          id: string
          last_access?: string | null
          level?: number | null
          xp_total?: number | null
        }
        Update: {
          email?: string | null
          full_name?: string | null
          id?: string
          last_access?: string | null
          level?: number | null
          xp_total?: number | null
        }
        Relationships: []
      }
      rca_logs: {
        Row: {
          action_plan: string
          created_at: string | null
          downtime_date: string
          id: string
          root_cause: string | null
          sla_percentage: number
          user_id: string | null
        }
        Insert: {
          action_plan: string
          created_at?: string | null
          downtime_date: string
          id?: string
          root_cause?: string | null
          sla_percentage: number
          user_id?: string | null
        }
        Update: {
          action_plan?: string
          created_at?: string | null
          downtime_date?: string
          id?: string
          root_cause?: string | null
          sla_percentage?: number
          user_id?: string | null
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_completed: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          title: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_completed?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      todo_list: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          is_completed: boolean | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          title: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          title: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          title?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      workouts: {
        Row: {
          category: string
          created_at: string | null
          duration_minutes: number
          exercise_name: string | null
          id: string
          intensity_level: string | null
          user_id: string | null
          workout_type: string | null
          xp_earned: number
        }
        Insert: {
          category?: string
          created_at?: string | null
          duration_minutes?: number
          exercise_name?: string | null
          id?: string
          intensity_level?: string | null
          user_id?: string | null
          workout_type?: string | null
          xp_earned?: number
        }
        Update: {
          category?: string
          created_at?: string | null
          duration_minutes?: number
          exercise_name?: string | null
          id?: string
          intensity_level?: string | null
          user_id?: string | null
          workout_type?: string | null
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      daily_sla_monitor: {
        Row: {
          realized_xp: number | null
          reference_date: string | null
          system_status: string | null
          uptime_percentage: number | null
          user_id: string | null
          waived_xp: number | null
        }
        Relationships: []
      }
      daily_xp_summary: {
        Row: {
          data_log: string | null
          total_atividades: number | null
          total_xp_dia: number | null
        }
        Relationships: []
      }
      monthly_ha_summary: {
        Row: {
          avg_uptime_month: number | null
          month_log: string | null
          user_id: string | null
        }
        Relationships: []
      }
      vw_export_csv: {
        Row: {
          atividade: string | null
          categoria: string | null
          data: string | null
          user_id: string | null
          xp_ganho: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      adicionar_xp: { Args: { xp_ganho: number }; Returns: undefined }
      run_read_only_query: { Args: { query_text: string }; Returns: Json }
    }
    Enums: {
      priority_level: "Alta" | "Média" | "Baixa"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      priority_level: ["Alta", "Média", "Baixa"],
    },
  },
} as const
