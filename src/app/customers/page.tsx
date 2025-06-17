'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
  notes?: string;
  customer_type: 'private' | 'business';
  // Business-specific fields
  cvr_number?: string;
  vat_number?: string;
  contact_person_first_name?: string;
  contact_person_last_name?: string;
  contact_person_title?: string;
  contact_person_email?: string;
  contact_person_phone?: string;
  billing_address_different?: boolean;
  billing_street_address?: string;
  billing_city?: string;
  billing_postal_code?: string;
  billing_country?: string;
  industry?: string;
  website?: string;
  payment_terms?: number;
  created_at: string;
  updated_at: string;
}

interface NewCustomer {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name: string;
  street_address: string;
  city: string;
  postal_code: string;
  country: string;
  notes: string;
  customer_type: 'private' | 'business';
  // Business-specific fields
  cvr_number: string;
  vat_number: string;
  contact_person_first_name: string;
  contact_person_last_name: string;
  contact_person_title: string;
  contact_person_email: string;
  contact_person_phone: string;
  billing_address_different: boolean;
  billing_street_address: string;
  billing_city: string;
  billing_postal_code: string;
  billing_country: string;
  industry: string;
  website: string;
  payment_terms: number;
}

export default function CustomersPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<NewCustomer>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    street_address: '',
    city: '',
    postal_code: '',
    country: 'Denmark',
    notes: '',
    customer_type: 'private',
    // Business-specific fields
    cvr_number: '',
    vat_number: '',
    contact_person_first_name: '',
    contact_person_last_name: '',
    contact_person_title: '',
    contact_person_email: '',
    contact_person_phone: '',
    billing_address_different: false,
    billing_street_address: '',
    billing_city: '',
    billing_postal_code: '',
    billing_country: 'Denmark',
    industry: '',
    website: '',
    payment_terms: 30
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const fetchCustomers = useCallback(async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCustomers();
    }
  }, [user, fetchCustomers]);

  const createCustomer = async () => {
    if (!user || !newCustomer.first_name || !newCustomer.last_name || !newCustomer.street_address) return;

    // Additional validation for business customers
    if (newCustomer.customer_type === 'business') {
      if (!newCustomer.company_name || !newCustomer.cvr_number) {
        alert('Company name and CVR number are required for business customers');
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customerData: any = {
      first_name: newCustomer.first_name,
      last_name: newCustomer.last_name,
      email: newCustomer.email || null,
      phone: newCustomer.phone || null,
      street_address: newCustomer.street_address,
      city: newCustomer.city,
      postal_code: newCustomer.postal_code,
      country: newCustomer.country,
      notes: newCustomer.notes || null,
      customer_type: newCustomer.customer_type,
      user_id: user.id
    };

    // Add business-specific fields if it's a business customer
    if (newCustomer.customer_type === 'business') {
      customerData.company_name = newCustomer.company_name || null;
      customerData.cvr_number = newCustomer.cvr_number || null;
      customerData.vat_number = newCustomer.vat_number || null;
      customerData.contact_person_first_name = newCustomer.contact_person_first_name || null;
      customerData.contact_person_last_name = newCustomer.contact_person_last_name || null;
      customerData.contact_person_title = newCustomer.contact_person_title || null;
      customerData.contact_person_email = newCustomer.contact_person_email || null;
      customerData.contact_person_phone = newCustomer.contact_person_phone || null;
      customerData.billing_address_different = newCustomer.billing_address_different;
      customerData.billing_street_address = newCustomer.billing_street_address || null;
      customerData.billing_city = newCustomer.billing_city || null;
      customerData.billing_postal_code = newCustomer.billing_postal_code || null;
      customerData.billing_country = newCustomer.billing_country || null;
      customerData.industry = newCustomer.industry || null;
      customerData.website = newCustomer.website || null;
      customerData.payment_terms = newCustomer.payment_terms || 30;
    } else {
      // For private customers, company_name can still be set (e.g., sole proprietorship)
      customerData.company_name = newCustomer.company_name || null;
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([customerData])
      .select()
      .single();

    if (error) {
      console.error('Error creating customer:', error);
      alert('Error creating customer');
    } else {
      setCustomers([data, ...customers]);
      setShowCreateModal(false);
      resetForm();
    }
  };

  const updateCustomer = async () => {
    if (!editingCustomer) return;

    // Additional validation for business customers
    if (editingCustomer.customer_type === 'business') {
      if (!editingCustomer.company_name || !editingCustomer.cvr_number) {
        alert('Company name and CVR number are required for business customers');
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {
      first_name: editingCustomer.first_name,
      last_name: editingCustomer.last_name,
      email: editingCustomer.email || null,
      phone: editingCustomer.phone || null,
      street_address: editingCustomer.street_address,
      city: editingCustomer.city,
      postal_code: editingCustomer.postal_code,
      country: editingCustomer.country,
      notes: editingCustomer.notes || null,
      customer_type: editingCustomer.customer_type
    };

    // Add business-specific fields if it's a business customer
    if (editingCustomer.customer_type === 'business') {
      updateData.company_name = editingCustomer.company_name || null;
      updateData.cvr_number = editingCustomer.cvr_number || null;
      updateData.vat_number = editingCustomer.vat_number || null;
      updateData.contact_person_first_name = editingCustomer.contact_person_first_name || null;
      updateData.contact_person_last_name = editingCustomer.contact_person_last_name || null;
      updateData.contact_person_title = editingCustomer.contact_person_title || null;
      updateData.contact_person_email = editingCustomer.contact_person_email || null;
      updateData.contact_person_phone = editingCustomer.contact_person_phone || null;
      updateData.billing_address_different = editingCustomer.billing_address_different || false;
      updateData.billing_street_address = editingCustomer.billing_street_address || null;
      updateData.billing_city = editingCustomer.billing_city || null;
      updateData.billing_postal_code = editingCustomer.billing_postal_code || null;
      updateData.billing_country = editingCustomer.billing_country || null;
      updateData.industry = editingCustomer.industry || null;
      updateData.website = editingCustomer.website || null;
      updateData.payment_terms = editingCustomer.payment_terms || 30;
    } else {
      // For private customers, company_name can still be set
      updateData.company_name = editingCustomer.company_name || null;
      // Clear business-specific fields for private customers
      updateData.cvr_number = null;
      updateData.vat_number = null;
      updateData.contact_person_first_name = null;
      updateData.contact_person_last_name = null;
      updateData.contact_person_title = null;
      updateData.contact_person_email = null;
      updateData.contact_person_phone = null;
      updateData.billing_address_different = false;
      updateData.billing_street_address = null;
      updateData.billing_city = null;
      updateData.billing_postal_code = null;
      updateData.billing_country = null;
      updateData.industry = null;
      updateData.website = null;
      updateData.payment_terms = 30;
    }

    const { error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', editingCustomer.id);

    if (error) {
      console.error('Error updating customer:', error);
      alert('Error updating customer');
    } else {
      setCustomers(customers.map(c => 
        c.id === editingCustomer.id ? editingCustomer : c
      ));
      setEditingCustomer(null);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer? This will also delete all associated cases.')) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);

    if (error) {
      console.error('Error deleting customer:', error);
      alert('Error deleting customer');
    } else {
      setCustomers(customers.filter(c => c.id !== customerId));
    }
  };

  const resetForm = () => {
    setNewCustomer({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      company_name: '',
      street_address: '',
      city: '',
      postal_code: '',
      country: 'Denmark',
      notes: '',
      customer_type: 'private',
      // Business-specific fields
      cvr_number: '',
      vat_number: '',
      contact_person_first_name: '',
      contact_person_last_name: '',
      contact_person_title: '',
      contact_person_email: '',
      contact_person_phone: '',
      billing_address_different: false,
      billing_street_address: '',
      billing_city: '',
      billing_postal_code: '',
      billing_country: 'Denmark',
      industry: '',
      website: '',
      payment_terms: 30
    });
  };

  const getFullName = (customer: Customer) => {
    return `${customer.first_name} ${customer.last_name}`;
  };

  // Removed unused getFullAddress function

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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Customers</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  Manage your customer database
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>New Customer</span>
              </button>
            </div>

            {/* Modern Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { 
                  label: 'Total Customers', 
                  value: customers.length, 
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  ),
                  gradient: 'from-blue-500 to-cyan-500',
                  bgGradient: 'from-blue-500/10 to-cyan-500/10',
                  change: '+12%'
                },
                { 
                  label: 'Private Customers', 
                  value: customers.filter(c => c.customer_type === 'private').length, 
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  ),
                  gradient: 'from-emerald-500 to-teal-500',
                  bgGradient: 'from-emerald-500/10 to-teal-500/10',
                  change: '+8%'
                },
                { 
                  label: 'Business Customers', 
                  value: customers.filter(c => c.customer_type === 'business').length, 
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  ),
                  gradient: 'from-purple-500 to-pink-500',
                  bgGradient: 'from-purple-500/10 to-pink-500/10',
                  change: '+15%'
                }
              ].map((stat, index) => (
                <div key={index} className="group relative overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-300`}></div>
                  <div className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/30 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-[1.02]">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className={`w-12 h-12 bg-gradient-to-br ${stat.gradient} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                            {stat.icon}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.label}</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                                {stat.change}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Modern Customers Table */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-gray-700/30 shadow-xl overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-indigo-200 dark:border-indigo-800"></div>
                  </div>
                </div>
              ) : customers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="relative mx-auto w-24 h-24 mb-6">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl opacity-20"></div>
                    <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl">
                      <svg className="w-12 h-12 text-indigo-600 dark:text-indigo-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No customers yet</h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
                    Start building your customer database by adding your first customer. You can add both private individuals and business customers.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Your First Customer
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-b border-gray-200 dark:border-gray-600">
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Contact</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Address</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300/50 dark:divide-gray-600/50">
                      {customers.map((customer, index) => (
                        <tr key={customer.id} className={`hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-gray-700/50 dark:hover:to-gray-600/50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-white/70 dark:bg-gray-800/70' : 'bg-gray-50/70 dark:bg-gray-700/30'
                        }`}>
                          <td className="px-6 py-4">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                {getFullName(customer)}
                              </div>
                              {customer.company_name && (
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {customer.company_name}
                                  {customer.customer_type === 'business' && customer.cvr_number && (
                                    <span className="text-xs ml-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded-md font-mono">CVR: {customer.cvr_number}</span>
                                  )}
                                </div>
                              )}
                              {customer.customer_type === 'business' && (customer.contact_person_first_name || customer.contact_person_last_name) && (
                                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                  Contact: {customer.contact_person_first_name} {customer.contact_person_last_name}
                                  {customer.contact_person_title && ` (${customer.contact_person_title})`}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {/* For business customers, prioritize contact person info */}
                              {customer.customer_type === 'business' && customer.contact_person_email ? (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                  </svg>
                                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-xs">{customer.contact_person_email}</span>
                                </div>
                              ) : customer.email && (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                                  </svg>
                                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-xs">{customer.email}</span>
                                </div>
                              )}
                              
                              {/* For business customers, prioritize contact person phone */}
                              {customer.customer_type === 'business' && customer.contact_person_phone ? (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="text-sm text-gray-900 dark:text-white">{customer.contact_person_phone}</span>
                                </div>
                              ) : customer.phone && (
                                <div className="flex items-center space-x-2">
                                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                  </svg>
                                  <span className="text-sm text-gray-900 dark:text-white">{customer.phone}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              <div>{customer.street_address}</div>
                              <div className="text-gray-500 dark:text-gray-400">
                                {customer.postal_code} {customer.city}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                              customer.customer_type === 'business' 
                                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
                            }`}>
                              {customer.customer_type === 'business' ? (
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                              ) : (
                                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                              {customer.customer_type === 'business' ? 'Business' : 'Private'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => setSelectedCustomer(customer)}
                                className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                                title="View Details"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setEditingCustomer(customer)}
                                className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                                title="Edit Customer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteCustomer(customer.id)}
                                className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                title="Delete Customer"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Customer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add New Customer</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.first_name}
                  onChange={(e) => setNewCustomer({...newCustomer, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter first name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={newCustomer.last_name}
                  onChange={(e) => setNewCustomer({...newCustomer, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter last name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter phone number"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Type
                </label>
                <select
                  value={newCustomer.customer_type}
                  onChange={(e) => setNewCustomer({...newCustomer, customer_type: e.target.value as 'private' | 'business'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="private">Private</option>
                  <option value="business">Business</option>
                </select>
              </div>
              
              {newCustomer.customer_type === 'business' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={newCustomer.company_name}
                      onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter company name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CVR Number *
                    </label>
                    <input
                      type="text"
                      value={newCustomer.cvr_number}
                      onChange={(e) => setNewCustomer({...newCustomer, cvr_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="12345678"
                      maxLength={8}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={newCustomer.vat_number}
                      onChange={(e) => setNewCustomer({...newCustomer, vat_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="DK12345678"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={newCustomer.industry}
                      onChange={(e) => setNewCustomer({...newCustomer, industry: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="E.g., Construction, Plumbing"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={newCustomer.website}
                      onChange={(e) => setNewCustomer({...newCustomer, website: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://www.company.dk"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Terms (Days)
                    </label>
                    <select
                      value={newCustomer.payment_terms}
                      onChange={(e) => setNewCustomer({...newCustomer, payment_terms: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value={8}>8 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={newCustomer.company_name}
                    onChange={(e) => setNewCustomer({...newCustomer, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="For sole proprietorships, etc."
                  />
                </div>
              )}
              
              {/* Contact Person Section for Business Customers */}
              {newCustomer.customer_type === 'business' && (
                <>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                      Contact Person
                    </h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact First Name
                    </label>
                    <input
                      type="text"
                      value={newCustomer.contact_person_first_name}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person_first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Contact person's first name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Last Name
                    </label>
                    <input
                      type="text"
                      value={newCustomer.contact_person_last_name}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person_last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Contact person's last name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={newCustomer.contact_person_title}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person_title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="E.g., CEO, Manager"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={newCustomer.contact_person_email}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="contact@company.dk"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={newCustomer.contact_person_phone}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="+45 12 34 56 78"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                      Service Address
                    </h4>
                  </div>
                </>
              )}
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={newCustomer.street_address}
                  onChange={(e) => setNewCustomer({...newCustomer, street_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter street address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  value={newCustomer.postal_code}
                  onChange={(e) => setNewCustomer({...newCustomer, postal_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter postal code"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={newCustomer.city}
                  onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Enter city"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={newCustomer.notes}
                  onChange={(e) => setNewCustomer({...newCustomer, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Add any notes about the customer..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createCustomer}
                disabled={!newCustomer.first_name || !newCustomer.last_name || !newCustomer.street_address || !newCustomer.city || !newCustomer.postal_code || (newCustomer.customer_type === 'business' && (!newCustomer.company_name || !newCustomer.cvr_number))}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  {getFullName(selectedCustomer)}
                </h3>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                  selectedCustomer.customer_type === 'business' 
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
                    : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                }`}>
                  {selectedCustomer.customer_type === 'business' ? 'Business Customer' : 'Private Customer'}
                </span>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Contact Information</label>
                  <div className="mt-2 space-y-2">
                    {selectedCustomer.email && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                        </svg>
                        <span className="text-gray-900 dark:text-white">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.phone && (
                      <div className="flex items-center space-x-2">
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        <span className="text-gray-900 dark:text-white">{selectedCustomer.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {selectedCustomer.company_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Company</label>
                    <p className="text-gray-900 dark:text-white mt-1">{selectedCustomer.company_name}</p>
                    {selectedCustomer.customer_type === 'business' && (
                      <div className="mt-2 space-y-1">
                        {selectedCustomer.cvr_number && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">CVR: {selectedCustomer.cvr_number}</p>
                        )}
                        {selectedCustomer.vat_number && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">VAT: {selectedCustomer.vat_number}</p>
                        )}
                        {selectedCustomer.industry && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Industry: {selectedCustomer.industry}</p>
                        )}
                        {selectedCustomer.website && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Website: <a href={selectedCustomer.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">{selectedCustomer.website}</a>
                          </p>
                        )}
                        {selectedCustomer.payment_terms && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">Payment Terms: {selectedCustomer.payment_terms} days</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Contact Person for Business Customers */}
                {selectedCustomer.customer_type === 'business' && (selectedCustomer.contact_person_first_name || selectedCustomer.contact_person_last_name) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Contact Person</label>
                    <div className="mt-1">
                      <p className="text-gray-900 dark:text-white">
                        {selectedCustomer.contact_person_first_name} {selectedCustomer.contact_person_last_name}
                        {selectedCustomer.contact_person_title && <span className="text-gray-600 dark:text-gray-400"> - {selectedCustomer.contact_person_title}</span>}
                      </p>
                      {selectedCustomer.contact_person_email && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedCustomer.contact_person_email}</p>
                      )}
                      {selectedCustomer.contact_person_phone && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCustomer.contact_person_phone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Address</label>
                  <div className="text-gray-900 dark:text-white mt-1">
                    <div>{selectedCustomer.street_address}</div>
                    <div>{selectedCustomer.postal_code} {selectedCustomer.city}</div>
                    <div>{selectedCustomer.country}</div>
                  </div>
                </div>
              </div>
              
              {selectedCustomer.notes && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Notes</label>
                  <p className="text-gray-900 dark:text-white mt-1 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                </div>
              )}
              
              <div className="md:col-span-2 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Created</label>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedCustomer.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Last Updated</label>
                  <p className="text-gray-900 dark:text-white">{new Date(selectedCustomer.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setEditingCustomer(selectedCustomer);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Edit Customer
              </button>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto border border-white/20 dark:border-gray-700/30 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Customer</h3>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Update customer information and details</p>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editingCustomer.first_name}
                  onChange={(e) => setEditingCustomer({...editingCustomer, first_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editingCustomer.last_name}
                  onChange={(e) => setEditingCustomer({...editingCustomer, last_name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editingCustomer.phone || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Customer Type
                </label>
                <select
                  value={editingCustomer.customer_type}
                  onChange={(e) => setEditingCustomer({...editingCustomer, customer_type: e.target.value as 'private' | 'business'})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="private">Private</option>
                  <option value="business">Business</option>
                </select>
              </div>
              
              {/* Company/Business Fields */}
              {editingCustomer.customer_type === 'business' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.company_name || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, company_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Enter company name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CVR Number *
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.cvr_number || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, cvr_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="12345678"
                      maxLength={8}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      VAT Number
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.vat_number || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, vat_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="DK12345678"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.industry || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, industry: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="E.g., Construction, Retail"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={editingCustomer.website || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, website: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="https://company.dk"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Payment Terms (Days)
                    </label>
                    <select
                      value={editingCustomer.payment_terms || 30}
                      onChange={(e) => setEditingCustomer({...editingCustomer, payment_terms: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value={8}>8 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Company Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={editingCustomer.company_name || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, company_name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="For sole proprietorships, etc."
                  />
                </div>
              )}
              
              {/* Contact Person Section for Business Customers */}
              {editingCustomer.customer_type === 'business' && (
                <>
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                      Contact Person
                    </h4>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact First Name
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.contact_person_first_name || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, contact_person_first_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Contact person's first name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Last Name
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.contact_person_last_name || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, contact_person_last_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="Contact person's last name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={editingCustomer.contact_person_title || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, contact_person_title: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="E.g., CEO, Manager"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      value={editingCustomer.contact_person_email || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, contact_person_email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="contact@company.dk"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={editingCustomer.contact_person_phone || ''}
                      onChange={(e) => setEditingCustomer({...editingCustomer, contact_person_phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="+45 12 34 56 78"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                      Service Address
                    </h4>
                  </div>
                </>
              )}
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  value={editingCustomer.street_address}
                  onChange={(e) => setEditingCustomer({...editingCustomer, street_address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Postal Code *
                </label>
                <input
                  type="text"
                  value={editingCustomer.postal_code}
                  onChange={(e) => setEditingCustomer({...editingCustomer, postal_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  value={editingCustomer.city}
                  onChange={(e) => setEditingCustomer({...editingCustomer, city: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={editingCustomer.notes || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setEditingCustomer(null)}
                className="px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={updateCustomer}
                disabled={!editingCustomer.first_name || !editingCustomer.last_name || !editingCustomer.street_address || !editingCustomer.city || !editingCustomer.postal_code || (editingCustomer.customer_type === 'business' && (!editingCustomer.company_name || !editingCustomer.cvr_number))}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                <svg className="w-5 h-5 mr-2 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Update Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 