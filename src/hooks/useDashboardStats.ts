'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface DashboardStats {
  totalCustomers: number;
  totalCases: number;
  totalProjects: number;
  totalRevenue: number;
  activeCases: number;
  totalOffers: number;
  totalInvoices: number;
  loading: boolean;
  error: string | null;
}

export function useDashboardStats(): DashboardStats {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalCases: 0,
    totalProjects: 0,
    totalRevenue: 0,
    activeCases: 0,
    totalOffers: 0,
    totalInvoices: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) {
        setStats(prev => ({ ...prev, loading: false }));
        return;
      }

      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        // Fetch all stats in parallel
        const [
          customersResult,
          casesResult,
          projectsResult,
          revenueResult,
          activeCasesResult,
          offersResult,
          invoicesResult,
        ] = await Promise.all([
          // Total customers
          supabase
            .from('customers')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id),
          
          // Total cases
          supabase
            .from('cases')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id),
          
          // Total projects
          supabase
            .from('projects')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id),
          
          // Total revenue (paid cases)
          supabase
            .from('cases')
            .select('total_amount')
            .eq('user_id', user.id)
            .eq('status', 'paid'),
          
          // Active cases (draft or sent)
          supabase
            .from('cases')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id)
            .in('status', ['draft', 'sent']),
          
          // Total offers
          supabase
            .from('offers')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id),
          
          // Total invoices
          supabase
            .from('invoices')
            .select('id', { count: 'exact' })
            .eq('user_id', user.id),
        ]);

        // Check for errors
        const results = [
          customersResult,
          casesResult,
          projectsResult,
          revenueResult,
          activeCasesResult,
          offersResult,
          invoicesResult,
        ];
        
        const firstError = results.find(r => r.error)?.error;
        if (firstError) {
          throw firstError;
        }

        // Calculate total revenue
        const totalRevenue = revenueResult.data?.reduce(
          (sum, record) => sum + Number(record.total_amount || 0), 
          0
        ) || 0;

        setStats({
          totalCustomers: customersResult.count || 0,
          totalCases: casesResult.count || 0,
          totalProjects: projectsResult.count || 0,
          totalRevenue,
          activeCases: activeCasesResult.count || 0,
          totalOffers: offersResult.count || 0,
          totalInvoices: invoicesResult.count || 0,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch stats',
        }));
      }
    };

    fetchStats();
  }, [user]);

  return stats;
} 