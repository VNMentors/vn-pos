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
      categories: {
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
      customers: {
        Row: {
          address: string | null
          birthday: string | null
          created_at: string
          id: string
          invoice_info: string | null
          name: string
          note: string | null
          phone: string | null
          points: number
          status: string
          total_orders: number
          total_spent: number
          type: string
        }
        Insert: {
          address?: string | null
          birthday?: string | null
          created_at?: string
          id?: string
          invoice_info?: string | null
          name: string
          note?: string | null
          phone?: string | null
          points?: number
          status?: string
          total_orders?: number
          total_spent?: number
          type?: string
        }
        Update: {
          address?: string | null
          birthday?: string | null
          created_at?: string
          id?: string
          invoice_info?: string | null
          name?: string
          note?: string | null
          phone?: string | null
          points?: number
          status?: string
          total_orders?: number
          total_spent?: number
          type?: string
        }
        Relationships: []
      }
      invoice_items: {
        Row: {
          cost_price: number
          id: string
          invoice_id: string
          product_code: string | null
          product_id: string | null
          product_name: string
          quantity: number
          subtotal: number
          unit: string
          unit_price: number
        }
        Insert: {
          cost_price?: number
          id?: string
          invoice_id: string
          product_code?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          subtotal?: number
          unit: string
          unit_price?: number
        }
        Update: {
          cost_price?: number
          id?: string
          invoice_id?: string
          product_code?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          subtotal?: number
          unit?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cash_received: number | null
          change_amount: number | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          discount_amount: number
          discount_reason: string | null
          id: string
          invoice_number: string
          note: string | null
          payment_method: string
          sale_type: string
          staff_id: string | null
          staff_name: string | null
          status: string
          subtotal: number
          tax_amount: number
          total: number
        }
        Insert: {
          cash_received?: number | null
          change_amount?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number
          discount_reason?: string | null
          id?: string
          invoice_number: string
          note?: string | null
          payment_method?: string
          sale_type?: string
          staff_id?: string | null
          staff_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
        }
        Update: {
          cash_received?: number | null
          change_amount?: number | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          discount_amount?: number
          discount_reason?: string | null
          id?: string
          invoice_number?: string
          note?: string | null
          payment_method?: string
          sale_type?: string
          staff_id?: string | null
          staff_name?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      print_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_default: boolean
          name: string
          paper_size: string
          type: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          paper_size?: string
          type?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          paper_size?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      printers: {
        Row: {
          choose_template_before_print: boolean | null
          copies: number | null
          created_at: string
          id: string
          ip_address: string
          is_default: boolean | null
          name: string
          open_cash_drawer: boolean | null
          paper_size: string | null
          port: number | null
          preview_before_print: boolean | null
          updated_at: string
        }
        Insert: {
          choose_template_before_print?: boolean | null
          copies?: number | null
          created_at?: string
          id?: string
          ip_address: string
          is_default?: boolean | null
          name: string
          open_cash_drawer?: boolean | null
          paper_size?: string | null
          port?: number | null
          preview_before_print?: boolean | null
          updated_at?: string
        }
        Update: {
          choose_template_before_print?: boolean | null
          copies?: number | null
          created_at?: string
          id?: string
          ip_address?: string
          is_default?: boolean | null
          name?: string
          open_cash_drawer?: boolean | null
          paper_size?: string | null
          port?: number | null
          preview_before_print?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      product_attributes: {
        Row: {
          attribute_name: string
          attribute_values: string[]
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          attribute_name: string
          attribute_values?: string[]
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          attribute_name?: string
          attribute_values?: string[]
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_attributes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          cost_price: number
          created_at: string
          id: string
          min_stock: number
          product_id: string
          retail_price: number
          sku: string | null
          status: string
          stock: number
          variant_name: string
          wholesale_price: number
        }
        Insert: {
          attributes?: Json
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          product_id: string
          retail_price?: number
          sku?: string | null
          status?: string
          stock?: number
          variant_name: string
          wholesale_price?: number
        }
        Update: {
          attributes?: Json
          cost_price?: number
          created_at?: string
          id?: string
          min_stock?: number
          product_id?: string
          retail_price?: number
          sku?: string | null
          status?: string
          stock?: number
          variant_name?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          code: string | null
          cost_price: number
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          min_stock: number
          name: string
          retail_price: number
          status: string
          stock: number
          unit: string
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          category_id?: string | null
          code?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number
          name: string
          retail_price?: number
          status?: string
          stock?: number
          unit?: string
          updated_at?: string
          wholesale_price?: number
        }
        Update: {
          category_id?: string | null
          code?: string | null
          cost_price?: number
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          min_stock?: number
          name?: string
          retail_price?: number
          status?: string
          stock?: number
          unit?: string
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          role: string | null
          shift: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
          name?: string
          phone?: string | null
          role?: string | null
          shift?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          role?: string | null
          shift?: string | null
          status?: string
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          can_create: boolean
          can_delete: boolean
          can_update: boolean
          can_view: boolean
          id: string
          module: string
          profile_id: string
        }
        Insert: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          id?: string
          module: string
          profile_id: string
        }
        Update: {
          can_create?: boolean
          can_delete?: boolean
          can_update?: boolean
          can_view?: boolean
          id?: string
          module?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      store_settings: {
        Row: {
          accent_color: string | null
          address: string | null
          email: string | null
          font_family: string | null
          id: string
          invoice_footer: string | null
          logo_url: string | null
          phone: string | null
          primary_color: string | null
          site_title: string | null
          store_name: string
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          email?: string | null
          font_family?: string | null
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          site_title?: string | null
          store_name?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          email?: string | null
          font_family?: string | null
          id?: string
          invoice_footer?: string | null
          logo_url?: string | null
          phone?: string | null
          primary_color?: string | null
          site_title?: string | null
          store_name?: string
          updated_at?: string
        }
        Relationships: []
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
    Enums: {},
  },
} as const
