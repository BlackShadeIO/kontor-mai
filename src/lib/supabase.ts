import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://astkouozumrednfmfrbi.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdGtvdW96dW1yZWRuZm1mcmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NjM4NDMsImV4cCI6MjA2NTAzOTg0M30.PHFvshjboXHB6t1LrMrhNZs3z57Xdi3437gC-3mf3E0';

// Define database types for better TypeScript support
export interface Database {
  public: {
    Tables: {
      cases: {
        Row: {
          id: string;
          case_id: string;
          title: string;
          description: string | null;
          project_id: string | null; // Made nullable since documents are independent
          customer_id: string | null;
          service_address: string | null;
          status: 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue';
          priority: 'low' | 'normal' | 'high' | 'emergency';
          due_date: string | null;
          estimated_duration: number | null;
          estimated_cost: number | null;
          actual_cost: number | null;
          actual_duration: number | null;
          tags: string[] | null;
          notes: string | null;
          completed_at: string | null;
          user_id: string;
          created_at: string;
          updated_at: string;
          // New document management fields
          case_type: 'offer' | 'invoice';
          document_number: string | null;
          amount: number;
          currency: string;
          vat_rate: number;
          vat_amount: number;
          total_amount: number;
          payment_terms: number;
          valid_until: string | null;
          sent_at: string | null;
          accepted_at: string | null;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          case_id?: string;
          title: string;
          description?: string | null;
          project_id?: string | null;
          customer_id?: string | null;
          service_address?: string | null;
          status?: 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue';
          priority?: 'low' | 'normal' | 'high' | 'emergency';
          due_date?: string | null;
          estimated_duration?: number | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          actual_duration?: number | null;
          tags?: string[] | null;
          notes?: string | null;
          completed_at?: string | null;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          // New document management fields
          case_type?: 'offer' | 'invoice';
          document_number?: string | null;
          amount?: number;
          currency?: string;
          vat_rate?: number;
          vat_amount?: number;
          total_amount?: number;
          payment_terms?: number;
          valid_until?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          case_id?: string;
          title?: string;
          description?: string | null;
          project_id?: string | null;
          customer_id?: string | null;
          service_address?: string | null;
          status?: 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue';
          priority?: 'low' | 'normal' | 'high' | 'emergency';
          due_date?: string | null;
          estimated_duration?: number | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          actual_duration?: number | null;
          tags?: string[] | null;
          notes?: string | null;
          completed_at?: string | null;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          // New document management fields
          case_type?: 'offer' | 'invoice';
          document_number?: string | null;
          amount?: number;
          currency?: string;
          vat_rate?: number;
          vat_amount?: number;
          total_amount?: number;
          payment_terms?: number;
          valid_until?: string | null;
          sent_at?: string | null;
          accepted_at?: string | null;
          paid_at?: string | null;
        };
      };
      case_items: {
        Row: {
          id: string;
          case_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          unit: string;
          discount_percentage: number;
          line_total: number;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          case_id: string;
          description: string;
          quantity?: number;
          unit_price?: number;
          unit?: string;
          discount_percentage?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          case_id?: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          unit?: string;
          discount_percentage?: number;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      customers: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          company_name: string | null;
          street_address: string;
          city: string;
          postal_code: string;
          country: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          street_address: string;
          city: string;
          postal_code: string;
          country: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          phone?: string | null;
          company_name?: string | null;
          street_address?: string;
          city?: string;
          postal_code?: string;
          country?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          status: string;
          user_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          status?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          status?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helper functions for common operations
export const withErrorHandling = async <T>(
  operation: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any; success: boolean }> => {
  try {
    const result = await operation();
    return {
      ...result,
      success: !result.error
    };
  } catch (error) {
    console.error('Supabase operation failed:', error);
    return {
      data: null,
      error,
      success: false
    };
  }
};

// Enhanced case operations for document management
export const caseOperations = {
  // Get all cases for a user with relations (project is now optional)
  async getAllCases(userId: string) {
    return withErrorHandling(async () => {
      return await supabase
        .from('cases')
        .select(`
          *,
          projects(name, status),
          customers(first_name, last_name, phone, email, street_address, city, postal_code)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    });
  },

  // Create a new document (offer or invoice)
  async createCase(caseData: Database['public']['Tables']['cases']['Insert']) {
    return withErrorHandling(async () => {
      // First insert the case
      const { data: insertedCase, error: insertError } = await supabase
        .from('cases')
        .insert([caseData])
        .select()
        .single();

      if (insertError) {
        return { data: null, error: insertError };
      }

      // Then fetch the case with relationships
      return await supabase
        .from('cases')
        .select(`
          *,
          projects(name, status),
          customers(first_name, last_name, phone, email, street_address, city, postal_code)
        `)
        .eq('id', insertedCase.id)
        .single();
    });
  },

  // Update case status with timestamp tracking for document workflow
  async updateCaseStatus(caseId: string, status: Database['public']['Tables']['cases']['Row']['status']) {
    const updateData: Database['public']['Tables']['cases']['Update'] = {
      status,
      updated_at: new Date().toISOString()
    };

    // Add timestamp based on document status
    const now = new Date().toISOString();
    switch (status) {
      case 'sent':
        updateData.sent_at = now;
        break;
      case 'accepted':
        updateData.accepted_at = now;
        break;
      case 'paid':
        updateData.paid_at = now;
        break;
    }

    return withErrorHandling(async () => {
      return await supabase
        .from('cases')
        .update(updateData)
        .eq('id', caseId)
        .select()
        .single();
    });
  },

  // Update case with full details
  async updateCase(caseId: string, updates: Database['public']['Tables']['cases']['Update']) {
    return withErrorHandling(async () => {
      return await supabase
        .from('cases')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .select(`
          *,
          projects(name, status),
          customers(first_name, last_name, phone, email, street_address, city, postal_code)
        `)
        .single();
    });
  },

  // Delete a case
  async deleteCase(caseId: string) {
    return withErrorHandling(async () => {
      return await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);
    });
  },

  // Get document analytics for offers and invoices
  async getCaseAnalytics(userId: string) {
    return withErrorHandling(async () => {
      const { data: cases, error } = await supabase
        .from('cases')
        .select('status, priority, case_type, amount, total_amount, created_at')
        .eq('user_id', userId);

      if (error) return { data: null, error };

      const analytics = {
        total: cases?.length || 0,
        byType: {
          offers: cases?.filter(c => c.case_type === 'offer').length || 0,
          invoices: cases?.filter(c => c.case_type === 'invoice').length || 0,
        },
        byStatus: {
          draft: cases?.filter(c => c.status === 'draft').length || 0,
          sent: cases?.filter(c => c.status === 'sent').length || 0,
          accepted: cases?.filter(c => c.status === 'accepted').length || 0,
          paid: cases?.filter(c => c.status === 'paid').length || 0,
          rejected: cases?.filter(c => c.status === 'rejected').length || 0,
          cancelled: cases?.filter(c => c.status === 'cancelled').length || 0,
          overdue: cases?.filter(c => c.status === 'overdue').length || 0,
        },
        byPriority: {
          low: cases?.filter(c => c.priority === 'low').length || 0,
          normal: cases?.filter(c => c.priority === 'normal').length || 0,
          high: cases?.filter(c => c.priority === 'high').length || 0,
          emergency: cases?.filter(c => c.priority === 'emergency').length || 0,
        },
        revenue: {
          total: cases?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0,
          offers: cases?.filter(c => c.case_type === 'offer').reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0,
          invoices: cases?.filter(c => c.case_type === 'invoice').reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0,
          paid: cases?.filter(c => c.status === 'paid').reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0,
        }
      };

      return { data: analytics, error: null };
    });
  },

  // Convert offer to invoice
  async convertOfferToInvoice(caseId: string) {
    return withErrorHandling(async () => {
      return await supabase
        .from('cases')
        .update({
          case_type: 'invoice',
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId)
        .eq('case_type', 'offer') // Ensure it's currently an offer
        .select()
        .single();
    });
  }
};

// Case items operations for line items
export const caseItemOperations = {
  // Get all items for a case
  async getCaseItems(caseId: string) {
    return withErrorHandling(async () => {
      return await supabase
        .from('case_items')
        .select('*')
        .eq('case_id', caseId)
        .order('sort_order', { ascending: true });
    });
  },

  // Add item to case
  async addCaseItem(itemData: Database['public']['Tables']['case_items']['Insert']) {
    return withErrorHandling(async () => {
      return await supabase
        .from('case_items')
        .insert([itemData])
        .select()
        .single();
    });
  },

  // Update case item
  async updateCaseItem(itemId: string, updates: Database['public']['Tables']['case_items']['Update']) {
    return withErrorHandling(async () => {
      return await supabase
        .from('case_items')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId)
        .select()
        .single();
    });
  },

  // Delete case item
  async deleteCaseItem(itemId: string) {
    return withErrorHandling(async () => {
      return await supabase
        .from('case_items')
        .delete()
        .eq('id', itemId);
    });
  },

  // Bulk update items (for reordering)
  async updateItemsOrder(items: { id: string; sort_order: number }[]) {
    return withErrorHandling(async () => {
      const updates = items.map(item => 
        supabase
          .from('case_items')
          .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
          .eq('id', item.id)
      );
      
      const results = await Promise.all(updates);
      return { data: results, error: null };
    });
  }
}; 