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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      alert_locations: {
        Row: {
          accuracy: number | null
          alert_id: string
          created_at: string
          id: string
          latitude: number
          longitude: number
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          alert_id: string
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          user_id: string
        }
        Update: {
          accuracy?: number | null
          alert_id?: string
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_locations_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
        ]
      }
      alerts: {
        Row: {
          acknowledged_at: string | null
          created_at: string
          demo: boolean
          id: string
          resolved_at: string | null
          status: Database["public"]["Enums"]["alert_status"]
          trigger_type: Database["public"]["Enums"]["trigger_type"]
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string
          demo?: boolean
          id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string
          demo?: boolean
          id?: string
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
          user_id?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          complaint_number: string
          created_at: string
          description: string
          evidence_note: string | null
          id: string
          incident_date: string | null
          incident_time: string | null
          location: string | null
          status: Database["public"]["Enums"]["complaint_status"]
          type: Database["public"]["Enums"]["complaint_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          complaint_number: string
          created_at?: string
          description: string
          evidence_note?: string | null
          id?: string
          incident_date?: string | null
          incident_time?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          type?: Database["public"]["Enums"]["complaint_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          complaint_number?: string
          created_at?: string
          description?: string
          evidence_note?: string | null
          id?: string
          incident_date?: string | null
          incident_time?: string | null
          location?: string | null
          status?: Database["public"]["Enums"]["complaint_status"]
          type?: Database["public"]["Enums"]["complaint_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string
          relationship: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone: string
          relationship?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string
          relationship?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          alert_id: string
          contact_id: string | null
          created_at: string
          error_message: string | null
          id: string
          notification_type: string
          provider_message_id: string | null
          recipient: string
          status: Database["public"]["Enums"]["notification_status"]
          user_id: string
        }
        Insert: {
          alert_id: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type: string
          provider_message_id?: string | null
          recipient: string
          status?: Database["public"]["Enums"]["notification_status"]
          user_id: string
        }
        Update: {
          alert_id?: string
          contact_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          notification_type?: string
          provider_message_id?: string | null
          recipient?: string
          status?: Database["public"]["Enums"]["notification_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          demo_mode: boolean
          email: string
          full_name: string
          hidden_mode: boolean
          id: string
          location_sharing: boolean
          phone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_mode?: boolean
          email?: string
          full_name?: string
          hidden_mode?: boolean
          id?: string
          location_sharing?: boolean
          phone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demo_mode?: boolean
          email?: string
          full_name?: string
          hidden_mode?: boolean
          id?: string
          location_sharing?: boolean
          phone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      alert_status: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED"
      app_role: "admin" | "moderator" | "user"
      complaint_status:
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "CLOSED"
      complaint_type:
        | "HARASSMENT"
        | "STALKING"
        | "THREAT"
        | "UNSAFE_SITUATION"
        | "DOMESTIC_VIOLENCE"
        | "OTHER"
      notification_status:
        | "PENDING"
        | "SENT"
        | "FAILED"
        | "NOT_CONFIGURED"
        | "SIMULATED"
      trigger_type: "BUTTON" | "VOICE"
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
      alert_status: ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"],
      app_role: ["admin", "moderator", "user"],
      complaint_status: [
        "SUBMITTED",
        "UNDER_REVIEW",
        "IN_PROGRESS",
        "RESOLVED",
        "CLOSED",
      ],
      complaint_type: [
        "HARASSMENT",
        "STALKING",
        "THREAT",
        "UNSAFE_SITUATION",
        "DOMESTIC_VIOLENCE",
        "OTHER",
      ],
      notification_status: [
        "PENDING",
        "SENT",
        "FAILED",
        "NOT_CONFIGURED",
        "SIMULATED",
      ],
      trigger_type: ["BUTTON", "VOICE"],
    },
  },
} as const
