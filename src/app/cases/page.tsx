'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { caseOperations, Database } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

// Removed unused interfaces - Customer and Project are not used in this component

interface Case {
  id: string;
  case_id: string;
  title: string;
  description?: string;
  project_id?: string | null; // Made optional since documents are independent
  customer_id?: string;
  service_address?: string;
  status: 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue';
  priority: 'low' | 'normal' | 'high' | 'emergency';
  due_date?: string;
  estimated_duration?: number;
  estimated_cost?: number;
  actual_cost?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  // New document management fields
  case_type: 'offer' | 'invoice';
  document_number?: string;
  amount: number;
  currency: string;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  payment_terms: number;
  valid_until?: string;
  sent_at?: string;
  accepted_at?: string;
  paid_at?: string;
  // Relations
  projects?: {
    name: string;
  } | null;
  customers?: {
    first_name: string;
    last_name: string;
    phone?: string;
    street_address: string;
    city: string;
    postal_code: string;
  };
}

export default function CasesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  // const [projects, setProjects] = useState<Project[]>([]);
  // const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Enhanced features state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date' | 'priority' | 'status'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [casesPerPage] = useState(10);
  const [analytics, setAnalytics] = useState<{
    total: number;
    byType: { offers: number; invoices: number };
    byStatus: { paid: number };
    revenue: { total: number };
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Commented out unused fetch functions
  // const fetchProjects = async () => {
  //   if (!user) return;
  //   
  //   const { data, error } = await supabase
  //     .from('projects')
  //     .select('id, name, description, status')
  //     .eq('user_id', user.id)
  //     .order('created_at', { ascending: false });

  //   if (error) {
  //     console.error('Error fetching projects:', error);
  //   } else {
  //     setProjects(data || []);
  //   }
  // };

  // const fetchCustomers = async () => {
  //   if (!user) return;
  //   
  //   const { data, error } = await supabase
  //     .from('customers')
  //     .select('id, first_name, last_name, email, phone, company_name, street_address, city, postal_code, country')
  //     .eq('user_id', user.id)
  //     .order('first_name', { ascending: true });

  //   if (error) {
  //     console.error('Error fetching customers:', error);
  //   } else {
  //     setCustomers(data || []);
  //   }
  // };

  const fetchCases = useCallback(async () => {
    if (!user) return;
    
    const { data, error, success } = await caseOperations.getAllCases(user.id);

    if (!success || error) {
      console.error('Error fetching cases:', error);
    } else {
      setCases(data || []);
    }
    setIsLoading(false);
  }, [user]);

  const fetchAnalytics = useCallback(async () => {
    if (!user) return;
    
    const { data, success } = await caseOperations.getCaseAnalytics(user.id);
    
    if (success && data) {
      setAnalytics(data);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      // fetchProjects();
      // fetchCustomers();
      fetchCases();
      fetchAnalytics();
    }
  }, [user, fetchCases, fetchAnalytics]);

  const updateCaseStatus = async (caseId: string, status: string) => {
    const { error, success } = await caseOperations.updateCaseStatus(
      caseId, 
      status as Database['public']['Tables']['cases']['Row']['status']
    );

    if (!success || error) {
      console.error('Error updating case:', error);
    } else {
      setCases(cases.map(c => 
        c.id === caseId ? { ...c, status: status as 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue' } : c
      ));
      fetchAnalytics(); // Refresh analytics
    }
  };

  const deleteCase = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case?')) return;

    const { error, success } = await caseOperations.deleteCase(caseId);

    if (!success || error) {
      console.error('Error deleting case:', error);
    } else {
      setCases(cases.filter(c => c.id !== caseId));
      fetchAnalytics(); // Refresh analytics
    }
  };

  const getCustomerName = (case_: Case) => {
    if (case_.customers) {
      return `${case_.customers.first_name} ${case_.customers.last_name}`;
    }
    return 'Unknown Customer';
  };

  // const getCustomerAddress = (case_: Case) => {
  //   if (case_.service_address) {
  //     return case_.service_address;
  //   }
  //   if (case_.customers) {
  //     return `${case_.customers.street_address}, ${case_.customers.postal_code} ${case_.customers.city}`;
  //   }
  //   return 'No address';
  // };

  // Enhanced filtering and sorting
  const filteredAndSortedCases = cases
    .filter(case_ => {
      const matchesSearch = searchTerm === '' || 
        case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        case_.case_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (case_.customers && `${case_.customers.first_name} ${case_.customers.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = statusFilter === 'all' || case_.status === statusFilter;
      const matchesPriority = priorityFilter === 'all' || case_.priority === priorityFilter;
      
      return matchesSearch && matchesStatus && matchesPriority;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'due_date':
          aValue = a.due_date ? new Date(a.due_date).getTime() : 0;
          bValue = b.due_date ? new Date(b.due_date).getTime() : 0;
          break;
        case 'priority':
          const priorityOrder = { emergency: 4, high: 3, normal: 2, low: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder];
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          const statusOrder = { draft: 1, sent: 2, accepted: 3, paid: 4, rejected: 5, cancelled: 6, overdue: 7 };
          aValue = statusOrder[a.status as keyof typeof statusOrder];
          bValue = statusOrder[b.status as keyof typeof statusOrder];
          break;
        default: // created_at
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
      }
      
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedCases.length / casesPerPage);
  const startIndex = (currentPage - 1) * casesPerPage;
  const paginatedCases = filteredAndSortedCases.slice(startIndex, startIndex + casesPerPage);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'accepted': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'paid': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'overdue': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'normal': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'emergency': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'offer': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'invoice': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        
        <main className="flex-1 p-6 bg-gray-50/30 dark:bg-gray-900/30 pt-28 ml-64">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Documents</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage offers and invoices for your customers
                </p>
              </div>
              <button
                onClick={() => router.push('/cases/create')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Document</span>
              </button>
            </div>

            {/* Enhanced Stats for Document Management */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {[
                { label: 'Total Documents', value: analytics?.total || cases.length, color: 'blue', icon: '📋' },
                { label: 'Offers', value: analytics?.byType?.offers || cases.filter(c => c.case_type === 'offer').length, color: 'blue', icon: '📄' },
                { label: 'Invoices', value: analytics?.byType?.invoices || cases.filter(c => c.case_type === 'invoice').length, color: 'yellow', icon: '🧾' },
                { label: 'Paid', value: analytics?.byStatus?.paid || cases.filter(c => c.status === 'paid').length, color: 'green', icon: '✅' },
                { label: 'Total Revenue', value: `${(analytics?.revenue?.total || 0).toLocaleString()} DKK`, color: 'green', icon: '💰' }
              ].map((stat, index) => (
                <div key={index} className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                    </div>
                    <span className="text-2xl">{stat.icon}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search documents, numbers, or customers..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="accepted">Accepted</option>
                    <option value="paid">Paid</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="all">All Priority</option>
                    <option value="emergency">Emergency</option>
                    <option value="high">High</option>
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'created_at' | 'due_date' | 'priority' | 'status')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="created_at">Created Date</option>
                    <option value="due_date">Due Date</option>
                    <option value="priority">Priority</option>
                    <option value="status">Status</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Cases List */}
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/50 dark:border-gray-700/50">
              <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Documents ({filteredAndSortedCases.length})
                  </h3>
                  {filteredAndSortedCases.length > casesPerPage && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {startIndex + 1}-{Math.min(startIndex + casesPerPage, filteredAndSortedCases.length)} of {filteredAndSortedCases.length}
                    </div>
                  )}
                </div>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                </div>
              ) : filteredAndSortedCases.length === 0 ? (
                <div className="p-8 text-center">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Get started by creating your first offer or invoice.</p>
                  <button
                    onClick={() => router.push('/cases/create')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Create Document
                  </button>
                </div>
              ) : (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Document</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedCases.map((case_) => (
                        <tr key={case_.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4">
                            <div>
                              <div className="flex items-center space-x-3">
                                <span className="font-mono text-sm text-indigo-600 dark:text-indigo-400">
                                  {case_.document_number || case_.case_id}
                                </span>
                              </div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white mt-1">{case_.title}</div>
                              {case_.description && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate max-w-xs">
                                  {case_.description}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {getCustomerName(case_)}
                              </div>
                              {case_.customers?.phone && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {case_.customers.phone}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getDocumentTypeColor(case_.case_type)}`}>
                              {case_.case_type.charAt(0).toUpperCase() + case_.case_type.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {case_.total_amount.toLocaleString()} {case_.currency}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                +{case_.vat_rate}% VAT
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <select
                              value={case_.status}
                              onChange={(e) => updateCaseStatus(case_.id, e.target.value)}
                              className={`text-xs px-2 py-1 rounded-full font-semibold border-0 ${getStatusColor(case_.status)}`}
                            >
                              <option value="draft">Draft</option>
                              <option value="sent">Sent</option>
                              <option value="accepted">Accepted</option>
                              <option value="paid">Paid</option>
                              <option value="rejected">Rejected</option>
                              <option value="cancelled">Cancelled</option>
                              <option value="overdue">Overdue</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getPriorityColor(case_.priority)}`}>
                              {case_.priority.charAt(0).toUpperCase() + case_.priority.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => router.push(`/cases/${case_.id}`)}
                              className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                            >
                              View
                            </button>
                            <button
                              onClick={() => deleteCase(case_.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                        .map((page, index, array) => (
                          <div key={page} className="flex items-center">
                            {index > 0 && array[index - 1] !== page - 1 && (
                              <span className="px-2 text-gray-400">...</span>
                            )}
                            <button
                              onClick={() => setCurrentPage(page)}
                              className={`px-3 py-1 text-sm border rounded-lg ${
                                currentPage === page
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700'
                              }`}
                            >
                              {page}
                            </button>
                          </div>
                        ))}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>


    </div>
  );
} 