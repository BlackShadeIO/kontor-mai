'use client';

import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

interface PDFWrapperProps {
  documentData: DocumentData;
  fileName: string;
  isPreview?: boolean; // Add preview mode flag
}

const PDFWrapper: React.FC<PDFWrapperProps> = ({ documentData, fileName, isPreview = false }) => {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const calculateLineTotal = (item: LineItem) => {
    return item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
  };

  const calculateSubtotal = () => {
    return documentData.items.reduce((sum, item) => sum + calculateLineTotal(item), 0);
  };

  const calculateVAT = () => {
    return calculateSubtotal() * (documentData.vat_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVAT();
  };

  const downloadPDF = async () => {
    if (!documentRef.current) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(documentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Download Button - Only show when not in preview mode */}
      {!isPreview && (
        <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={downloadPDF}
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center space-x-2"
          >
            {isGenerating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
            <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>
      )}

      {/* Document Preview */}
      <div className={`flex-1 bg-gray-100 dark:bg-gray-900 ${isPreview ? 'p-2 overflow-auto flex justify-center items-start' : 'p-8 overflow-auto'}`}>
        <div 
          ref={documentRef}
          className={`bg-white shadow-lg ${
            isPreview 
              ? 'transform origin-top scale-[0.75] flex-shrink-0' 
              : 'max-w-4xl mx-auto'
          }`}
          style={
            isPreview 
              ? { width: '210mm', height: '297mm', minHeight: '297mm' }
              : { minHeight: '297mm', width: '210mm' }
          }
        >
          {/* Document Content */}
          <div className="p-12">
            {/* Header */}
            <div className="flex justify-between items-start mb-12 pb-6 border-b-2 border-indigo-600">
              <div>
                <h1 className="text-3xl font-bold text-indigo-600">
                  {documentData.companyData?.name || 'Your Company'}
                </h1>
              </div>
              <div className="text-right text-sm text-gray-800">
                <div className="font-medium text-gray-900">{documentData.companyData?.name || 'Your Company Name'}</div>
                {documentData.companyData?.address && (
                  <div className="mt-1">
                    {documentData.companyData.address.split(',').map((line: string, index: number) => (
                      <div key={index} className="text-gray-700">{line.trim()}</div>
                    ))}
                  </div>
                )}
                {documentData.companyData?.phone && (
                  <div className="text-gray-700">Phone: {documentData.companyData.phone}</div>
                )}
                {documentData.companyData?.userEmail && (
                  <div className="text-gray-700">Email: {documentData.companyData.userEmail}</div>
                )}
                {documentData.companyData?.website && (
                  <div className="text-gray-700">Web: {documentData.companyData.website}</div>
                )}
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-black mb-2">
                {documentData.case_type === 'offer' ? 'OFFER' : 'INVOICE'}
              </h2>
              {documentData.document_number && (
                <p className="text-lg text-black font-semibold">
                  Document Number: {documentData.document_number}
                </p>
              )}
            </div>

            {/* Customer Information */}
            {documentData.customer && (
              <div className="mb-8">
                <h3 className="text-lg font-bold text-black mb-4 border-b-2 border-gray-400 pb-2">
                  Bill To
                </h3>
                <div className="bg-gray-100 p-4 rounded border border-gray-300">
                  <div className="font-semibold text-gray-900">
                    {documentData.customer.first_name} {documentData.customer.last_name}
                    {documentData.customer.company_name && ` (${documentData.customer.company_name})`}
                  </div>
                  <div className="text-sm text-gray-700 mt-1">
                    <div>{documentData.customer.street_address}</div>
                    <div>{documentData.customer.postal_code} {documentData.customer.city}</div>
                    <div>{documentData.customer.country}</div>
                    {documentData.customer.email && <div>Email: {documentData.customer.email}</div>}
                    {documentData.customer.phone && <div>Phone: {documentData.customer.phone}</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Document Details */}
            <div className="mb-8">
                              <h3 className="text-lg font-bold text-black mb-4 border-b-2 border-gray-400 pb-2">
                  Document Details
                </h3>
              <div className="flex justify-between text-sm text-gray-900">
                <div>Created: {documentData.created_at ? new Date(documentData.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                {documentData.case_type === 'offer' && documentData.valid_until && (
                  <div>Valid Until: {new Date(documentData.valid_until).toLocaleDateString()}</div>
                )}
                {documentData.case_type === 'invoice' && (
                  <div>Payment Terms: {documentData.payment_terms} days</div>
                )}
              </div>
              {documentData.description && (
                <div className="text-sm text-gray-800 mt-2">{documentData.description}</div>
              )}
            </div>

            {/* Line Items */}
            <div className="mb-8">
                              <h3 className="text-lg font-bold text-black mb-4 border-b-2 border-gray-400 pb-2">
                  Items
                </h3>
              
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-200 text-sm font-semibold text-gray-900">
                    <th className="text-left p-3 border border-gray-400 text-gray-900">Description</th>
                    <th className="text-center p-3 border border-gray-400 w-16 text-gray-900">Qty</th>
                    <th className="text-center p-3 border border-gray-400 w-16 text-gray-900">Unit</th>
                    <th className="text-right p-3 border border-gray-400 w-24 text-gray-900">Unit Price</th>
                    <th className="text-right p-3 border border-gray-400 w-24 text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {documentData.items.map((item, index) => (
                    <tr key={index} className="text-sm">
                      <td className="p-3 border border-gray-400 text-gray-900">{item.description}</td>
                      <td className="p-3 border border-gray-400 text-center text-gray-900">{item.quantity}</td>
                      <td className="p-3 border border-gray-400 text-center text-gray-900">{item.unit}</td>
                      <td className="p-3 border border-gray-400 text-right text-gray-900">{item.unit_price.toFixed(2)} {documentData.currency}</td>
                      <td className="p-3 border border-gray-400 text-right text-gray-900">{calculateLineTotal(item).toFixed(2)} {documentData.currency}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-64">
                <div className="flex justify-between py-2 text-sm text-gray-900">
                  <span>Subtotal:</span>
                  <span>{calculateSubtotal().toFixed(2)} {documentData.currency}</span>
                </div>
                <div className="flex justify-between py-2 text-sm text-gray-900">
                  <span>VAT ({documentData.vat_rate}%):</span>
                  <span>{calculateVAT().toFixed(2)} {documentData.currency}</span>
                </div>
                <div className="flex justify-between py-3 font-bold text-lg border-t border-gray-900 text-gray-900">
                  <span>Total:</span>
                  <span>{calculateTotal().toFixed(2)} {documentData.currency}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-gray-900 border-t-2 border-gray-400 pt-4">
              Thank you for your business! • {documentData.case_type === 'offer' ? 'This offer is valid until the date specified above.' : `Payment is due within ${documentData.payment_terms} days.`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PDFWrapper; 