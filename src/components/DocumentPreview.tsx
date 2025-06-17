'use client';

import { useState, useEffect } from 'react';
import PDFWrapper from './PDFWrapper';

interface Customer {
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

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  unit: string;
  discount_percentage: number;
}

interface DocumentData {
  title: string;
  document_number?: string;
  case_type: 'offer' | 'invoice';
  description?: string;
  customer?: Customer;
  currency: string;
  vat_rate: number;
  payment_terms: number;
  valid_until?: string;
  created_at?: string;
  items: LineItem[];
  companyData?: {
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
  };
}

interface DocumentPreviewProps {
  documentData: DocumentData;
  isOpen: boolean;
  onClose: () => void;
  inline?: boolean; // New prop for inline mode
}

export default function DocumentPreview({ documentData, isOpen, onClose, inline = false }: DocumentPreviewProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isOpen || !isClient) return null;

  const fileName = `${documentData.case_type}_${documentData.document_number || 'preview'}.pdf`;
  
  if (inline) {
    // Inline mode - no modal overlay, fits within container
    return (
      <div className="h-full flex flex-col bg-white dark:bg-gray-800">
        {/* PDF Viewer */}
        <div className="flex-1 bg-gray-100 dark:bg-gray-900">
          <PDFWrapper documentData={documentData} fileName={fileName} isPreview={inline} />
        </div>
      </div>
    );
  }

  // Modal mode - original behavior
  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="relative flex h-full">
        <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 ml-auto max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {documentData.case_type === 'offer' ? 'Offer' : 'Invoice'} Preview
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {documentData.document_number || 'Draft'}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* PDF Viewer */}
          <div className="flex-1 bg-gray-100 dark:bg-gray-900">
            <PDFWrapper documentData={documentData} fileName={fileName} isPreview={false} />
          </div>
          
          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
              <div>
                Preview • {documentData.items.length} item{documentData.items.length !== 1 ? 's' : ''}
              </div>
              <div>
                Total: {documentData.items.reduce((sum, item) => 
                  sum + (item.quantity * item.unit_price * (1 - item.discount_percentage / 100)), 0
                ).toFixed(2)} {documentData.currency}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 