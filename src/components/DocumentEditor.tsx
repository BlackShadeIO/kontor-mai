'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { supabase, caseOperations, caseItemOperations, Database } from '@/lib/supabase';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import DocumentPreview from '@/components/DocumentPreview';

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
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

interface CaseItem {
  id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  discount_percentage: number;
  line_total: number;
}

interface Case {
  id: string;
  case_id: string;
  title: string;
  description?: string;
  project_id?: string | null;
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
    country: string;
    company_name?: string;
    email?: string;
  };
}

const unitOptions = [
  { value: 'pcs', label: 'pcs' },
  { value: 'hours', label: 'hours' },
  { value: 'days', label: 'days' },
  { value: 'kg', label: 'kg' },
  { value: 'm', label: 'm' },
  { value: 'm²', label: 'm²' },
  { value: 'm³', label: 'm³' },
  { value: 'liters', label: 'liters' },
];

interface DocumentEditorProps {
  caseId?: string; // If provided, edit mode; if not, create mode
}

export default function DocumentEditor({ caseId }: DocumentEditorProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const isEditMode = !!caseId;
  
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [caseLoading, setCaseLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyData, setCompanyData] = useState<{
    name?: string;
    logo_url?: string;
    address?: string;
    phone?: string;
    website?: string;
    description?: string;
    userFirstName?: string;
    userLastName?: string;
    userPhone?: string;
    userEmail?: string;
  } | null>(null);
  const [items, setItems] = useState<CaseItem[]>([
    { description: '', quantity: 1, unit_price: 0, unit: 'pcs', discount_percentage: 0, line_total: 0 }
  ]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    case_type: 'offer' as 'offer' | 'invoice',
    project_id: '',
    customer_id: '',
    service_address: '',
    status: 'draft' as 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue',
    priority: 'normal' as 'low' | 'normal' | 'high' | 'emergency',
    due_date: '',
    estimated_duration: '',
    estimated_cost: '',
    currency: 'DKK',
    vat_rate: 25,
    payment_terms: 30,
    valid_until: '',
    notes: '',
    tags: '',
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchCustomers();
      fetchCompanyData();
      if (isEditMode && caseId) {
        fetchCase();
      } else {
        setCaseLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, caseId, isEditMode]);

  const fetchCase = async () => {
    if (!caseId || !user) return;
    
    setCaseLoading(true);
    
    try {
      const { data: caseData, error } = await supabase
        .from('cases')
        .select(`
          *,
          projects (name),
          customers (
            first_name, 
            last_name, 
            phone, 
            street_address, 
            city, 
            postal_code, 
            country,
            company_name,
            email
          )
        `)
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();
      
      if (error || !caseData) {
        console.error('Error fetching case:', error);
        router.push('/cases');
        return;
      }

      setCurrentCase(caseData);
      
      // Set form data
      setFormData({
        title: caseData.title,
        description: caseData.description || '',
        case_type: caseData.case_type,
        project_id: caseData.project_id || '',
        customer_id: caseData.customer_id || '',
        service_address: caseData.service_address || '',
        status: caseData.status,
        priority: caseData.priority,
        due_date: caseData.due_date ? caseData.due_date.split('T')[0] : '',
        estimated_duration: caseData.estimated_duration?.toString() || '',
        estimated_cost: caseData.estimated_cost?.toString() || '',
        currency: caseData.currency,
        vat_rate: caseData.vat_rate,
        payment_terms: caseData.payment_terms,
        valid_until: caseData.valid_until ? caseData.valid_until.split('T')[0] : '',
        notes: '',
        tags: '',
      });

      // Fetch case items
      const { data: itemsData, error: itemsError } = await caseItemOperations.getCaseItems(caseId);
      if (!itemsError && itemsData) {
        setItems(itemsData);
      }

    } catch (error) {
      console.error('Error fetching case:', error);
      router.push('/cases');
    } finally {
      setCaseLoading(false);
    }
  };

  const fetchProjects = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, description, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
    } else {
      setProjects(data || []);
    }
  };

  const fetchCustomers = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone, company_name, street_address, city, postal_code, country')
      .eq('user_id', user.id)
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error fetching customers:', error);
    } else {
      setCustomers(data || []);
    }
  };

  const fetchCompanyData = async () => {
    if (!user) return;
    
    try {
      // First get user profile to find company_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('company_id, first_name, last_name, phone')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        console.error('Error fetching profile:', profileError);
        return;
      }

      // If user has a company_id, fetch company data
      if (profile.company_id) {
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('name, logo_url, address, phone, website, description')
          .eq('id', profile.company_id)
          .single();

        if (!companyError && company) {
          setCompanyData({
            ...company,
            userFirstName: profile.first_name,
            userLastName: profile.last_name,
            userPhone: profile.phone,
            userEmail: user.email
          });
          return;
        }
      }

      // Fallback to user profile data only
      setCompanyData({
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Your Company',
        userFirstName: profile.first_name,
        userLastName: profile.last_name,
        userPhone: profile.phone,
        userEmail: user.email
      });
    } catch (error) {
      console.error('Error fetching company data:', error);
    }
  };

  const calculateItemTotal = (item: CaseItem) => {
    const subtotal = item.quantity * item.unit_price;
    const discount = subtotal * (item.discount_percentage / 100);
    return subtotal - discount;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    const vatAmount = subtotal * (formData.vat_rate / 100);
    const total = subtotal + vatAmount;
    
    return {
      subtotal,
      vatAmount,
      total
    };
  };

  const addItem = () => {
    setItems([...items, {
      description: '',
      quantity: 1,
      unit_price: 0,
      unit: 'pcs',
      discount_percentage: 0,
      line_total: 0
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof CaseItem, value: string | number) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate line total
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percentage') {
      newItems[index].line_total = calculateItemTotal(newItems[index]);
    }
    
    setItems(newItems);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) newErrors.title = 'Document title is required';
    if (!formData.customer_id) newErrors.customer_id = 'Please select a customer';
    
    // Validate line items
    const hasValidItems = items.some(item => item.description.trim() && item.quantity > 0 && item.unit_price > 0);
    if (!hasValidItems) {
      newErrors.items = 'At least one valid line item is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !validateForm()) return;

    setSaving(true);

    try {
      const totals = calculateTotals();
      
      if (isEditMode && caseId) {
        // Update existing case
        const caseUpdateData = {
          title: formData.title,
          description: formData.description,
          case_type: formData.case_type,
          project_id: formData.project_id || null,
          customer_id: formData.customer_id || null,
          service_address: formData.service_address,
          status: formData.status,
          priority: formData.priority,
          due_date: formData.due_date || null,
          estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : null,
          estimated_cost: formData.estimated_cost ? parseFloat(formData.estimated_cost) : null,
          currency: formData.currency,
          vat_rate: formData.vat_rate,
          payment_terms: formData.payment_terms,
          valid_until: formData.valid_until || null,
          amount: totals.subtotal,
          vat_amount: totals.vatAmount,
          total_amount: totals.total,
        };

        const { error: updateError } = await caseOperations.updateCase(caseId, caseUpdateData);
        
        if (updateError) {
          console.error('Error updating case:', updateError);
          alert('Error updating case');
          return;
        }

        // Update case items - delete existing and recreate
        await supabase.from('case_items').delete().eq('case_id', caseId);
        
        const validItems = items.filter(item => item.description.trim() && item.quantity > 0);
        if (validItems.length > 0) {
          const itemsToInsert = validItems.map((item, index) => ({
            case_id: caseId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            unit: item.unit,
            discount_percentage: item.discount_percentage,
            sort_order: index
          }));

          const { error: itemsError } = await supabase
            .from('case_items')
            .insert(itemsToInsert);

          if (itemsError) {
            console.error('Error updating items:', itemsError);
          }
        }

        alert('Document updated successfully!');
      } else {
        // Create new case
        const caseData: Database['public']['Tables']['cases']['Insert'] = {
          title: formData.title,
          description: formData.description || undefined,
          case_type: formData.case_type,
          project_id: formData.project_id || undefined,
          customer_id: formData.customer_id || undefined,
          service_address: formData.service_address || undefined,
          priority: formData.priority,
          due_date: formData.due_date || undefined,
          estimated_duration: formData.estimated_duration ? parseInt(formData.estimated_duration) : undefined,
          amount: totals.subtotal,
          vat_rate: formData.vat_rate,
          currency: formData.currency,
          payment_terms: formData.payment_terms,
          valid_until: formData.valid_until || undefined,
          user_id: user.id
        };

        const { data: createdCase, error, success } = await caseOperations.createCase(caseData);

        if (!success || error || !createdCase) {
          console.error('Error creating case:', error);
          alert(`Error creating document: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return;
        }

        const caseWithId = createdCase as { id: string };

        // Create line items
        const validItems = items.filter(item => item.description.trim() && item.quantity > 0);
        if (validItems.length > 0) {
          const itemPromises = validItems.map((item, index) => 
            caseItemOperations.addCaseItem({
              case_id: caseWithId.id,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unit_price,
              unit: item.unit,
              discount_percentage: item.discount_percentage,
              sort_order: index
            })
          );

          const itemResults = await Promise.all(itemPromises);
          const failedItems = itemResults.filter(result => !result.success);
          
          if (failedItems.length > 0) {
            console.error('Some items failed to create:', failedItems);
            alert('Document created but some line items failed to save.');
          }
        }

        alert('Document created successfully!');
      }

      router.push('/cases');
    } catch (error) {
      console.error('Error saving case:', error);
      alert('Error saving document');
    } finally {
      setSaving(false);
    }
  };

  // Generate live preview data for PDF
  const previewData = useMemo(() => {
    const selectedCustomer = customers.find(c => c.id === formData.customer_id);
    
    return {
      title: formData.title || 'Untitled Document',
      document_number: currentCase?.document_number || 'DRAFT',
      case_type: formData.case_type,
      description: formData.description,
      customer: selectedCustomer,
      currency: formData.currency,
      vat_rate: formData.vat_rate,
      payment_terms: formData.payment_terms,
      valid_until: formData.valid_until,
      created_at: currentCase?.created_at || new Date().toISOString(),
      items: items.filter(item => item.description.trim() || item.quantity > 0 || item.unit_price > 0),
      companyData: companyData || undefined
    };
  }, [formData, items, customers, currentCase, companyData]);

  const canShowPreview = formData.title.trim() && formData.customer_id;

  if (loading || caseLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <Header user={user} />
        
        <main className="flex-1 pt-20 ml-64">
          <div className="h-full flex">
            {/* Left Panel - Form */}
            <div className="w-[55%] p-4 overflow-y-auto">
              <div className="max-w-4xl mx-auto space-y-4">
                {/* Header */}
                <div className="relative">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-8 border border-white/20 dark:border-gray-700/20 shadow-xl">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                              {isEditMode ? 'Edit Document' : 'Create New Document'}
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-1">
                              {isEditMode 
                                ? `Update your ${formData.case_type} details and preview changes in real-time`
                                : `Create a professional ${formData.case_type} with live PDF preview`
                              }
                            </p>
                          </div>
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="flex items-center space-x-4 mt-4">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${formData.case_type ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${formData.title && formData.customer_id ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Details</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${items.some(item => item.description.trim()) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <span className="text-sm text-gray-600 dark:text-gray-400">Items</span>
                          </div>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => router.push('/cases')}
                        className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-6 py-3 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 flex items-center space-x-2 shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Document Type Selection */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
                    <div className="flex items-center space-x-2 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Document Type</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <label className={`flex items-center justify-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        formData.case_type === 'offer' 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}>
                        <input
                          type="radio"
                          name="case_type"
                          value="offer"
                          checked={formData.case_type === 'offer'}
                          onChange={(e) => setFormData({ ...formData, case_type: e.target.value as 'offer' | 'invoice' })}
                          className="hidden"
                        />
                        <div className="text-center">
                          <div className="text-3xl mb-2">📄</div>
                          <span className="font-semibold text-gray-900 dark:text-white">Offer</span>
                        </div>
                      </label>
                      <label className={`flex items-center justify-center space-x-3 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        formData.case_type === 'invoice' 
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' 
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}>
                        <input
                          type="radio"
                          name="case_type"
                          value="invoice"
                          checked={formData.case_type === 'invoice'}
                          onChange={(e) => setFormData({ ...formData, case_type: e.target.value as 'offer' | 'invoice' })}
                          className="hidden"
                        />
                        <div className="text-center">
                          <div className="text-3xl mb-2">🧾</div>
                          <span className="font-semibold text-gray-900 dark:text-white">Invoice</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Basic Information */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
                    <div className="flex items-center space-x-2 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">Basic Information</h3>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Title *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:border-gray-600 dark:text-white transition-all duration-200 ${
                            errors.title ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700/70'
                          }`}
                          placeholder="e.g., Website Development Project"
                        />
                        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700/50 dark:border-gray-600 dark:text-white transition-all duration-200 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700/70"
                          placeholder="Describe the work or services..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Customer *
                          </label>
                          <select
                            value={formData.customer_id}
                            onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                              errors.customer_id ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select Customer</option>
                            {customers.map((customer) => (
                              <option key={customer.id} value={customer.id}>
                                {customer.first_name} {customer.last_name}
                                {customer.company_name ? ` (${customer.company_name})` : ''}
                              </option>
                            ))}
                          </select>
                          {errors.customer_id && <p className="mt-1 text-sm text-red-600">{errors.customer_id}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Project
                          </label>
                          <select
                            value={formData.project_id}
                            onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="">No Project</option>
                            {projects.map((project) => (
                              <option key={project.id} value={project.id}>
                                {project.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {isEditMode && (
                          <>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                              </label>
                              <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'draft' | 'sent' | 'accepted' | 'paid' | 'rejected' | 'cancelled' | 'overdue' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
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
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Priority
                              </label>
                              <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'emergency' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              >
                                <option value="low">Low</option>
                                <option value="normal">Normal</option>
                                <option value="high">High</option>
                                <option value="emergency">Emergency</option>
                              </select>
                            </div>
                          </>
                        )}

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Currency
                          </label>
                          <select
                            value={formData.currency}
                            onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          >
                            <option value="DKK">DKK</option>
                            <option value="EUR">EUR</option>
                            <option value="USD">USD</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            VAT Rate (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            value={formData.vat_rate}
                            onChange={(e) => setFormData({ ...formData, vat_rate: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          />
                        </div>

                        {formData.case_type === 'offer' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Valid Until
                            </label>
                            <input
                              type="date"
                              value={formData.valid_until}
                              onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                        )}

                        {formData.case_type === 'invoice' && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Payment Terms (days)
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={formData.payment_terms}
                              onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) || 30 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Line Items */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Line Items</h3>
                      </div>
                      <button
                        type="button"
                        onClick={addItem}
                        className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-4 py-2 rounded-xl flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Item</span>
                      </button>
                    </div>

                    <div className="space-y-4">
                      {items.map((item, index) => (
                        <div key={index} className="grid grid-cols-8 gap-3 items-end p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder="Item description"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Qty
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Unit
                            </label>
                            <select
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            >
                              {unitOptions.map((unit) => (
                                <option key={unit.value} value={unit.value}>
                                  {unit.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Price
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unit_price}
                              onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Disc %
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={item.discount_percentage}
                              onChange={(e) => updateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Total
                            </label>
                            <div className="px-2 py-1 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white">
                              {calculateItemTotal(item).toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              disabled={items.length === 1}
                              className="w-full px-2 py-1 text-sm bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {errors.items && <p className="mt-2 text-sm text-red-600">{errors.items}</p>}

                    {/* Totals Summary */}
                    <div className="mt-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {totals.subtotal.toFixed(2)} {formData.currency}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">VAT ({formData.vat_rate}%):</span>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {totals.vatAmount.toFixed(2)} {formData.currency}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-semibold border-t border-gray-200 dark:border-gray-600 pt-2">
                          <span className="text-gray-900 dark:text-white">Total:</span>
                          <span className="text-gray-900 dark:text-white">
                            {totals.total.toFixed(2)} {formData.currency}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/20 shadow-lg">
                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Ready to {isEditMode ? 'update' : 'create'} your {formData.case_type}?
                      </div>
                      <div className="flex space-x-3">
                        <button
                          type="button"
                          onClick={() => router.push('/cases')}
                          className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={saving || items.length === 0 || !formData.title || !formData.customer_id}
                          className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-200 flex items-center space-x-2 font-medium shadow-lg hover:shadow-xl disabled:shadow-none"
                        >
                          {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                          <span>{saving ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Document' : 'Create Document')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Right Panel - Live PDF Preview */}
            <div className="w-[45%] bg-gray-50/50 dark:bg-gray-900/50 border-l border-gray-200/50 dark:border-gray-700/50">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Live Preview</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {canShowPreview ? 'Preview updates as you edit' : 'Fill in title and customer to see preview'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-gray-100 dark:bg-gray-900">
                  {canShowPreview ? (
                    <DocumentPreview
                      isOpen={true}
                      onClose={() => {}} // No close button in live preview
                      documentData={previewData}
                      inline={true}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-lg font-medium">Document Preview</p>
                        <p className="mt-2">Enter a title and select a customer to see the preview</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
} 