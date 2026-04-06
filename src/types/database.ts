export type UserRole = 'buyer' | 'renter' | 'agent';

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string | null;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      buyer_profiles: {
        Row: {
          id: string;
          user_id: string;
          mode: string | null;
          timeline: string | null;
          timeline_context: string | null;
          budget_tier: string | null;
          budget_context: string | null;
          territory: string[];
          fear: string | null;
          fear_context: string | null;
          summary: string | null;
          readiness_score: number;
          vault: Json;
          journey_stage: number;
          accuracy_rating: string | null;
          is_partial: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['buyer_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['buyer_profiles']['Insert']>;
      };
      agent_clients: {
        Row: {
          id: string;
          agent_id: string;
          client_id: string;
          status: 'pending' | 'active' | 'closed';
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['agent_clients']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['agent_clients']['Insert']>;
      };
      listing_analyses: {
        Row: {
          id: string;
          agent_id: string;
          client_id: string;
          url: string;
          analysis: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['listing_analyses']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['listing_analyses']['Insert']>;
      };
      chat_messages: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['chat_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['chat_messages']['Insert']>;
      };
      renter_profiles: {
        Row: {
          id: string;
          user_id: string;
          mode: 'Rent';
          timeline: string | null;
          timeline_context: string | null;
          move_in_date: string | null;
          budget_monthly: string | null;
          max_monthly_rent: number | null;
          meets_income_req: boolean | null;
          using_guarantor: boolean | null;
          budget_context: string | null;
          territory: string[];
          fear: string | null;
          fear_context: string | null;
          summary: string | null;
          readiness_score: number;
          vault: Json;
          journey_stage: number;
          accuracy_rating: string | null;
          is_partial: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['renter_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['renter_profiles']['Insert']>;
      };
    };
  };
}
