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
      access_requests: {
        Row: {
          created_at: string
          cv_url: string | null
          description: string | null
          id: string
          scheduled_time: string | null
          status: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["access_request_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cv_url?: string | null
          description?: string | null
          id?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type: Database["public"]["Enums"]["access_request_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cv_url?: string | null
          description?: string | null
          id?: string
          scheduled_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type?: Database["public"]["Enums"]["access_request_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["article_category"]
          content: string
          content_en: string | null
          content_kz: string | null
          created_at: string
          excerpt: string | null
          excerpt_en: string | null
          excerpt_kz: string | null
          id: string
          image_url: string | null
          is_published: boolean
          title: string
          title_en: string | null
          title_kz: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          category?: Database["public"]["Enums"]["article_category"]
          content?: string
          content_en?: string | null
          content_kz?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_en?: string | null
          excerpt_kz?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          title: string
          title_en?: string | null
          title_kz?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["article_category"]
          content?: string
          content_en?: string | null
          content_kz?: string | null
          created_at?: string
          excerpt?: string | null
          excerpt_en?: string | null
          excerpt_kz?: string | null
          id?: string
          image_url?: string | null
          is_published?: boolean
          title?: string
          title_en?: string | null
          title_kz?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "articles_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          created_at: string
          end_time: string
          equipment_id: string
          id: string
          material_used: string | null
          mentor_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time: string
          equipment_id: string
          id?: string
          material_used?: string | null
          mentor_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string
          equipment_id?: string
          id?: string
          material_used?: string | null
          mentor_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_mentor_profile_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_profile_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          access_type: Database["public"]["Enums"]["equipment_access_type"]
          category: Database["public"]["Enums"]["equipment_category"]
          created_at: string
          description: string | null
          description_en: string | null
          description_kz: string | null
          id: string
          image_url: string | null
          name: string
          name_en: string | null
          name_kz: string | null
          specs: string | null
          status: Database["public"]["Enums"]["equipment_status"]
          updated_at: string
        }
        Insert: {
          access_type?: Database["public"]["Enums"]["equipment_access_type"]
          category: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_kz?: string | null
          id?: string
          image_url?: string | null
          name: string
          name_en?: string | null
          name_kz?: string | null
          specs?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Update: {
          access_type?: Database["public"]["Enums"]["equipment_access_type"]
          category?: Database["public"]["Enums"]["equipment_category"]
          created_at?: string
          description?: string | null
          description_en?: string | null
          description_kz?: string | null
          id?: string
          image_url?: string | null
          name?: string
          name_en?: string | null
          name_kz?: string | null
          specs?: string | null
          status?: Database["public"]["Enums"]["equipment_status"]
          updated_at?: string
        }
        Relationships: []
      }
      mentor_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          mentor_id: string
          start_time: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          mentor_id: string
          start_time: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          mentor_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_schedule_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          contact_telegram: string | null
          created_at: string
          id: string
          is_banned: boolean
          name: string
          role: Database["public"]["Enums"]["app_role"]
          safety_briefing_passed: boolean
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          created_at?: string
          id: string
          is_banned?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          safety_briefing_passed?: boolean
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          contact_telegram?: string | null
          created_at?: string
          id?: string
          is_banned?: boolean
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          safety_briefing_passed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      project_applications: {
        Row: {
          applicant_id: string
          cover_letter: string | null
          created_at: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          applicant_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          applicant_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_applications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_updates: {
        Row: {
          content: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_updates_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          author_id: string
          created_at: string
          description: string
          description_en: string | null
          description_kz: string | null
          id: string
          image_url: string | null
          is_approved: boolean
          is_looking_for_team: boolean
          is_rejected: boolean
          looking_for_roles: string[]
          status: Database["public"]["Enums"]["project_status"]
          title: string
          title_en: string | null
          title_kz: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string
          description_en?: string | null
          description_kz?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_looking_for_team?: boolean
          is_rejected?: boolean
          looking_for_roles?: string[]
          status?: Database["public"]["Enums"]["project_status"]
          title: string
          title_en?: string | null
          title_kz?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string
          description_en?: string | null
          description_kz?: string | null
          id?: string
          image_url?: string | null
          is_approved?: boolean
          is_looking_for_team?: boolean
          is_rejected?: boolean
          looking_for_roles?: string[]
          status?: Database["public"]["Enums"]["project_status"]
          title?: string
          title_en?: string | null
          title_kz?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_access_request: {
        Args: { request_id: string }
        Returns: undefined
      }
      change_user_role: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: undefined
      }
      check_if_admin: { Args: never; Returns: boolean }
      check_if_banned: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      toggle_user_ban: {
        Args: { is_banned_new: boolean; target_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      access_request_type: "safety_briefing" | "residency"
      app_role: "student" | "resident" | "admin"
      application_status: "pending" | "accepted" | "rejected"
      article_category: "news" | "article"
      booking_status: "pending" | "active" | "cancelled" | "completed"
      equipment_access_type:
        | "basic"
        | "independent"
        | "mentor_required"
        | "resident_only"
      equipment_category: "stationary" | "portable"
      equipment_status: "active" | "maintenance"
      project_status: "in_progress" | "completed" | "paused"
      request_status: "pending" | "approved" | "rejected"
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
      access_request_type: ["safety_briefing", "residency"],
      app_role: ["student", "resident", "admin"],
      application_status: ["pending", "accepted", "rejected"],
      article_category: ["news", "article"],
      booking_status: ["pending", "active", "cancelled", "completed"],
      equipment_access_type: [
        "basic",
        "independent",
        "mentor_required",
        "resident_only",
      ],
      equipment_category: ["stationary", "portable"],
      equipment_status: ["active", "maintenance"],
      project_status: ["in_progress", "completed", "paused"],
      request_status: ["pending", "approved", "rejected"],
    },
  },
} as const
