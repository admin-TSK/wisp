export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      billing_config: {
        Row: {
          billing_enabled: boolean
          monthly_cap: number | null
          shadow_until: string | null
          stripe_customer_id: string | null
          take_rate: number
          tenant_id: string
        }
        Insert: {
          billing_enabled?: boolean
          monthly_cap?: number | null
          shadow_until?: string | null
          stripe_customer_id?: string | null
          take_rate?: number
          tenant_id: string
        }
        Update: {
          billing_enabled?: boolean
          monthly_cap?: number | null
          shadow_until?: string | null
          stripe_customer_id?: string | null
          take_rate?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_periods: {
        Row: {
          created_at: string
          gross_savings: number
          id: string
          measured_savings: number
          period_end: string
          period_start: string
          reported_fee: number
          status: string
          stripe_invoice_id: string | null
          tenant_id: string
          total_tokens_removed: number
          wisp_fee: number
        }
        Insert: {
          created_at?: string
          gross_savings: number
          id?: string
          measured_savings: number
          period_end: string
          period_start: string
          reported_fee?: number
          status?: string
          stripe_invoice_id?: string | null
          tenant_id: string
          total_tokens_removed: number
          wisp_fee: number
        }
        Update: {
          created_at?: string
          gross_savings?: number
          id?: string
          measured_savings?: number
          period_end?: string
          period_start?: string
          reported_fee?: number
          status?: string
          stripe_invoice_id?: string | null
          tenant_id?: string
          total_tokens_removed?: number
          wisp_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "billing_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          agent_version: string | null
          created_at: string
          enrolment_label: string | null
          group_name: string | null
          headroom_version: string | null
          id: string
          last_seen: string | null
          tenant_id: string
        }
        Insert: {
          agent_version?: string | null
          created_at?: string
          enrolment_label?: string | null
          group_name?: string | null
          headroom_version?: string | null
          id?: string
          last_seen?: string | null
          tenant_id: string
        }
        Update: {
          agent_version?: string | null
          created_at?: string
          enrolment_label?: string | null
          group_name?: string | null
          headroom_version?: string | null
          id?: string
          last_seen?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role: string
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrol_secrets: {
        Row: {
          created_at: string
          label: string | null
          revoked_at: string | null
          secret_hash: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          label?: string | null
          revoked_at?: string | null
          secret_hash: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          label?: string | null
          revoked_at?: string | null
          secret_hash?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrol_secrets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      enrolment_tokens: {
        Row: {
          created_at: string
          device_id: string | null
          revoked_at: string | null
          tenant_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          device_id?: string | null
          revoked_at?: string | null
          tenant_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          device_id?: string | null
          revoked_at?: string | null
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrolment_tokens_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrolment_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      model_pricing: {
        Row: {
          base_input_rate: number
          cached_input_rate: number
          effective_date: string
          model: string
          output_rate: number
          provider: string
          source_url: string
        }
        Insert: {
          base_input_rate: number
          cached_input_rate: number
          effective_date: string
          model: string
          output_rate: number
          provider: string
          source_url: string
        }
        Update: {
          base_input_rate?: number
          cached_input_rate?: number
          effective_date?: string
          model?: string
          output_rate?: number
          provider?: string
          source_url?: string
        }
        Relationships: []
      }
      policies: {
        Row: {
          id: string
          level: string
          scope: string
          scope_ref: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          level: string
          scope: string
          scope_ref?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          level?: string
          scope?: string
          scope_ref?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_config: {
        Row: {
          effective_cached_rate: number | null
          effective_input_rate: number | null
          model: string
          tenant_id: string
        }
        Insert: {
          effective_cached_rate?: number | null
          effective_input_rate?: number | null
          model: string
          tenant_id: string
        }
        Update: {
          effective_cached_rate?: number | null
          effective_input_rate?: number | null
          model?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pricing_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          role: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          role: string
          tenant_id: string
          user_id: string
        }
        Update: {
          role?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      usage_events: {
        Row: {
          batch_id: string | null
          created_at: string
          device_id: string
          id: number
          input_tokens_cache_read: number
          input_tokens_compressed: number
          input_tokens_original: number
          input_tokens_removed: number
          model: string
          output_tokens: number
          policy_level: string
          requests: number
          tenant_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          device_id: string
          id?: number
          input_tokens_cache_read?: number
          input_tokens_compressed: number
          input_tokens_original: number
          input_tokens_removed: number
          model: string
          output_tokens: number
          policy_level: string
          requests: number
          tenant_id: string
          window_end: string
          window_start: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          device_id?: string
          id?: number
          input_tokens_cache_read?: number
          input_tokens_compressed?: number
          input_tokens_original?: number
          input_tokens_removed?: number
          model?: string
          output_tokens?: number
          policy_level?: string
          requests?: number
          tenant_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
