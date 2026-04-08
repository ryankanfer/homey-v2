export type UserRole = 'buyer' | 'renter' | 'agent';
export type DocumentStatus = 'pending' | 'processing' | 'processed' | 'error';
export type DocumentCategory = 'w2' | 'bank_statement' | 'pre_approval' | 'tax_return' | 'other';

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
          friction_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['buyer_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['buyer_profiles']['Insert']>;
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
          friction_data: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['renter_profiles']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['renter_profiles']['Insert']>;
      };
      agent_profiles: {
        Row: {
          id: string;
          user_id: string;
          phone: string | null;
          headshot_url: string | null;
          license_number: string | null;
          brokerage_name: string | null;
          years_experience: number | null;
          market_focus: string[];
          bio: string | null;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          phone?: string | null;
          headshot_url?: string | null;
          license_number?: string | null;
          brokerage_name?: string | null;
          years_experience?: number | null;
          market_focus?: string[];
          bio?: string | null;
          onboarding_completed?: boolean;
        };
        Update: {
          phone?: string | null;
          headshot_url?: string | null;
          license_number?: string | null;
          brokerage_name?: string | null;
          years_experience?: number | null;
          market_focus?: string[];
          bio?: string | null;
          onboarding_completed?: boolean;
        };
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
      strategy_chats: {
        Row: {
          id: string;
          user_id: string;
          role: 'user' | 'assistant';
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['strategy_chats']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['strategy_chats']['Insert']>;
      };
      user_documents: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          storage_path: string;
          file_type: string;
          status: DocumentStatus;
          agent_access_granted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['user_documents']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['user_documents']['Insert']>;
      };
      document_intelligence: {
        Row: {
          id: string;
          document_id: string;
          user_id: string;
          category: DocumentCategory;
          extracted_data: Json;
          signal_summary: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['document_intelligence']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['document_intelligence']['Insert']>;
      };
      acquire_prospects: {
        Row: {
          id: string;
          agent_id: string | null;
          type: 'expired' | 'delisted' | 'fsbo' | 'ripe';
          address: string;
          neighborhood: string | null;
          asking_price: number | null;
          comp_price: number | null;
          days_on_market: number | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_email: string | null;
          stage: string;
          notes: string | null;
          angles: Json;
          messages: Json;
          tags: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['acquire_prospects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['acquire_prospects']['Insert']>;
      };
    };
  };
}
