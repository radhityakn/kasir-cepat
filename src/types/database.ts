export interface Database {
  public: {
    Tables: {
      stores: {
        Row: {
          id: string;
          name: string;
          address: string;
          phone: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string;
          phone?: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          address?: string;
          phone?: string;
          updated_at?: string;
        };
      };
      store_members: {
        Row: {
          id: string;
          store_id: string;
          user_id: string;
          role: 'owner' | 'cashier';
          display_name: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          user_id: string;
          role?: 'owner' | 'cashier';
          display_name: string;
          joined_at?: string;
        };
        Update: {
          role?: 'owner' | 'cashier';
          display_name?: string;
        };
      };
      store_invites: {
        Row: {
          id: string;
          store_id: string;
          invite_code: string;
          email: string | null;
          role: 'cashier';
          status: 'pending' | 'accepted' | 'expired';
          invited_by: string;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id?: string;
          store_id: string;
          invite_code?: string;
          email?: string | null;
          role?: 'cashier';
          status?: 'pending' | 'accepted' | 'expired';
          invited_by: string;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          status?: 'pending' | 'accepted' | 'expired';
          email?: string | null;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          barcode: string;
          name: string;
          price: number;
          cost_price: number;
          category: string;
          image: string;
          stock: number;
          sold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          store_id?: string | null;
          barcode: string;
          name: string;
          price: number;
          cost_price?: number;
          category: string;
          image: string;
          stock?: number;
          sold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_id?: string | null;
          barcode?: string;
          name?: string;
          price?: number;
          cost_price?: number;
          category?: string;
          image?: string;
          stock?: number;
          sold?: number;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          store_id: string | null;
          total: number;
          discount: number;
          tax: number;
          grand_total: number;
          payment_method: string;
          amount_paid: number;
          change: number;
          cashier: string;
          customer: string | null;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          store_id?: string | null;
          total: number;
          discount?: number;
          tax?: number;
          grand_total: number;
          payment_method: string;
          amount_paid: number;
          change?: number;
          cashier: string;
          customer?: string | null;
          status?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          store_id?: string | null;
          total?: number;
          discount?: number;
          tax?: number;
          grand_total?: number;
          payment_method?: string;
          amount_paid?: number;
          change?: number;
          cashier?: string;
          customer?: string | null;
          status?: string;
        };
      };
      transaction_items: {
        Row: {
          id: string;
          transaction_id: string;
          product_id: string;
          product_name: string;
          product_image: string;
          product_price: number;
          product_cost_price: number;
          quantity: number;
          notes: string | null;
        };
        Insert: {
          id?: string;
          transaction_id: string;
          product_id: string;
          product_name: string;
          product_image: string;
          product_price: number;
          product_cost_price?: number;
          quantity: number;
          notes?: string | null;
        };
        Update: {
          id?: string;
          transaction_id?: string;
          product_id?: string;
          product_name?: string;
          product_image?: string;
          product_price?: number;
          product_cost_price?: number;
          quantity?: number;
          notes?: string | null;
        };
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          store_name: string;
          cashier_name: string;
          cashier_pin: string;
          address: string;
          phone: string;
          notif_low_stock: boolean;
          notif_daily_summary: boolean;
          auto_print: boolean;
          printer_name: string;
          dark_mode: boolean;
          onboarded: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_name?: string;
          cashier_name?: string;
          cashier_pin?: string;
          address?: string;
          phone?: string;
          notif_low_stock?: boolean;
          notif_daily_summary?: boolean;
          auto_print?: boolean;
          printer_name?: string;
          dark_mode?: boolean;
          onboarded?: boolean;
        };
        Update: {
          store_name?: string;
          cashier_name?: string;
          cashier_pin?: string;
          address?: string;
          phone?: string;
          notif_low_stock?: boolean;
          notif_daily_summary?: boolean;
          auto_print?: boolean;
          printer_name?: string;
          dark_mode?: boolean;
          onboarded?: boolean;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
