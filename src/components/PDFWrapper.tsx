'use client';

import React, { useRef, forwardRef, useImperativeHandle } from 'react';
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
  isPreview?: boolean;
}

export interface PDFWrapperRef {
  downloadPDF: () => void;
}

const PDFWrapper = forwardRef<PDFWrapperRef, PDFWrapperProps>(
  function PDFWrapper({ documentData, fileName, isPreview = false }, ref) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);

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

  // Calculate how many items can fit on each page
  const ITEMS_PER_FIRST_PAGE = 4; // First page has header, customer info, etc.
  const ITEMS_PER_CONTINUATION_PAGE = 12; // Continuation pages have more space

  const paginateItems = () => {
    const pages = [];
    const remainingItems = [...documentData.items];

    // First page
    const firstPageItems = remainingItems.splice(0, ITEMS_PER_FIRST_PAGE);
    pages.push({
      items: firstPageItems,
      isFirstPage: true,
      isLastPage: remainingItems.length === 0,
      pageNumber: 1
    });

    // Continuation pages
    let pageNumber = 2;
    while (remainingItems.length > 0) {
      const pageItems = remainingItems.splice(0, ITEMS_PER_CONTINUATION_PAGE);
      pages.push({
        items: pageItems,
        isFirstPage: false,
        isLastPage: remainingItems.length === 0,
        pageNumber: pageNumber
      });
      pageNumber++;
    }

    return pages;
  };

  const pages = paginateItems();

  // Reset to page 1 when document data changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [documentData.items.length, documentData.title, documentData.customer?.first_name, documentData.customer?.last_name]);

  const goToPage = (pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= pages.length) {
      setCurrentPage(pageNumber);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pages.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const downloadPDF = async () => {
    if (!documentRef.current) return;
    
    setIsGenerating(true);
    try {
      // Create a temporary container to render all pages for PDF generation
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.left = '-9999px';
      tempContainer.style.top = '-9999px';
      tempContainer.style.width = '210mm';
      document.body.appendChild(tempContainer);

      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Generate all pages (not just the currently visible one)
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const page = pages[pageIndex];
        
        // Create page HTML
        const pageHtml = `
          <div class="pdf-page bg-white shadow-xl border border-gray-300" style="width: 210mm; min-height: 297mm; max-height: 297mm; overflow: hidden;">
            <div class="p-8">
              <!-- Header on every page -->
              <div class="flex justify-between items-start mb-8 pb-4 border-b-2 border-indigo-600">
                                 <div class="flex items-center">
                   ${documentData.companyData?.logo_url ? `
                     <div style="width: 120px; height: 64px; display: flex; align-items: center; justify-content: flex-start;">
                       <img 
                         src="${documentData.companyData.logo_url}" 
                         alt="Company Logo"
                         style="max-height: 100%; max-width: 100%; height: auto; width: auto; display: block;"
                         crossorigin="anonymous"
                       />
                     </div>
                   ` : ''}
                 </div>
                <div class="text-right text-xs text-gray-800">
                  <div class="font-medium text-gray-900">${documentData.companyData?.name || 'Your Company Name'}</div>
                  ${documentData.companyData?.address ? `
                    <div class="mt-1">
                      ${documentData.companyData.address.split(',').map((line: string) => 
                        `<div class="text-gray-700">${line.trim()}</div>`
                      ).join('')}
                    </div>
                  ` : ''}
                  ${documentData.companyData?.phone ? `<div class="text-gray-700">Phone: ${documentData.companyData.phone}</div>` : ''}
                  ${documentData.companyData?.userEmail ? `<div class="text-gray-700">Email: ${documentData.companyData.userEmail}</div>` : ''}
                  ${documentData.companyData?.website ? `<div class="text-gray-700">Web: ${documentData.companyData.website}</div>` : ''}
                  <div class="mt-2 text-gray-600">Page ${page.pageNumber} of ${pages.length}</div>
                </div>
              </div>

              ${page.isFirstPage ? `
                <!-- Document Title -->
                <div class="text-center mb-4">
                  <h2 class="text-2xl font-bold text-black mb-2">
                    ${documentData.case_type === 'offer' ? 'OFFER' : 'INVOICE'}
                  </h2>
                  ${documentData.document_number ? `
                    <p class="text-base text-black font-semibold">
                      Document Number: ${documentData.document_number}
                    </p>
                  ` : ''}
                </div>

                <!-- Customer Information -->
                ${documentData.customer ? `
                  <div class="mb-4">
                    <h3 class="text-base font-bold text-black mb-2 border-b-2 border-gray-400 pb-1">
                      Bill To
                    </h3>
                    <div class="bg-gray-100 p-2 rounded border border-gray-300 text-sm">
                      <div class="font-semibold text-gray-900">
                        ${documentData.customer.first_name} ${documentData.customer.last_name}
                        ${documentData.customer.company_name ? ` (${documentData.customer.company_name})` : ''}
                      </div>
                      <div class="text-xs text-gray-700 mt-1">
                        <div>${documentData.customer.street_address}</div>
                        <div>${documentData.customer.postal_code} ${documentData.customer.city}</div>
                        <div>${documentData.customer.country}</div>
                        ${documentData.customer.email ? `<div>Email: ${documentData.customer.email}</div>` : ''}
                        ${documentData.customer.phone ? `<div>Phone: ${documentData.customer.phone}</div>` : ''}
                      </div>
                    </div>
                  </div>
                ` : ''}

                <!-- Document Details -->
                <div class="mb-4">
                  <h3 class="text-base font-bold text-black mb-2 border-b-2 border-gray-400 pb-1">
                    Document Details
                  </h3>
                  <div class="flex justify-between text-xs text-gray-900">
                    <div>Created: ${documentData.created_at ? new Date(documentData.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                    ${documentData.case_type === 'offer' && documentData.valid_until ? `
                      <div>Valid Until: ${new Date(documentData.valid_until).toLocaleDateString()}</div>
                    ` : ''}
                    ${documentData.case_type === 'invoice' ? `
                      <div>Payment Terms: ${documentData.payment_terms} days</div>
                    ` : ''}
                  </div>
                  ${documentData.description ? `
                    <div class="text-xs text-gray-800 mt-1">${documentData.description}</div>
                  ` : ''}
                </div>
              ` : ''}

              <!-- Items Section -->
              <div class="mb-4">
                <h3 class="text-base font-bold text-black mb-3 border-b-2 border-gray-400 pb-1">
                  ${page.isFirstPage ? 'Items' : 'Items (continued)'}
                </h3>
                
                <table class="w-full">
                  ${page.isFirstPage ? `
                    <thead>
                      <tr class="bg-gray-200 text-sm font-semibold text-gray-900">
                        <th class="text-left p-2 border border-gray-400 text-gray-900">Description</th>
                        <th class="text-center p-2 border border-gray-400 w-16 text-gray-900">Qty</th>
                        <th class="text-center p-2 border border-gray-400 w-16 text-gray-900">Unit</th>
                        <th class="text-right p-2 border border-gray-400 w-24 text-gray-900">Unit Price</th>
                        <th class="text-right p-2 border border-gray-400 w-24 text-gray-900">Total</th>
                      </tr>
                    </thead>
                  ` : ''}
                  <tbody>
                    ${page.items.map((item) => `
                      <tr class="text-sm">
                        <td class="p-2 border border-gray-400 text-gray-900">${item.description}</td>
                        <td class="p-2 border border-gray-400 text-center text-gray-900">${item.quantity}</td>
                        <td class="p-2 border border-gray-400 text-center text-gray-900">${item.unit}</td>
                        <td class="p-2 border border-gray-400 text-right text-gray-900">${item.unit_price.toFixed(2)} ${documentData.currency}</td>
                        <td class="p-2 border border-gray-400 text-right text-gray-900">${calculateLineTotal(item).toFixed(2)} ${documentData.currency}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                
                ${!page.isLastPage ? `
                  <div class="text-center text-xs text-gray-600 mt-3">
                    Continued on next page...
                  </div>
                ` : ''}
              </div>

              ${page.isLastPage ? `
                <!-- Totals Section -->
                <div class="flex justify-end mt-6 mb-6">
                  <div class="w-64">
                    <div class="flex justify-between py-2 text-sm text-gray-900">
                      <span>Subtotal:</span>
                      <span>${calculateSubtotal().toFixed(2)} ${documentData.currency}</span>
                    </div>
                    <div class="flex justify-between py-2 text-sm text-gray-900">
                      <span>VAT (${documentData.vat_rate}%):</span>
                      <span>${calculateVAT().toFixed(2)} ${documentData.currency}</span>
                    </div>
                    <div class="flex justify-between py-3 font-bold text-lg border-t border-gray-900 text-gray-900">
                      <span>Total:</span>
                      <span>${calculateTotal().toFixed(2)} ${documentData.currency}</span>
                    </div>
                  </div>
                </div>
                
                <!-- Footer -->
                <div class="text-center text-xs text-gray-900 border-t-2 border-gray-400 pt-3 mt-4">
                  Thank you for your business! • ${documentData.case_type === 'offer' ? 'This offer is valid until the date specified above.' : `Payment is due within ${documentData.payment_terms} days.`}
                </div>
              ` : ''}
            </div>
          </div>
        `;

        tempContainer.innerHTML = pageHtml;
        
        if (pageIndex > 0) {
          pdf.addPage();
        }
        
        const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false,
          width: 794, // A4 width in pixels at 96dpi
          height: 1123, // A4 height in pixels at 96dpi
          onclone: (clonedDoc) => {
            // Remove all external stylesheets to avoid oklch issues
            const externalStyles = clonedDoc.querySelectorAll('link[rel="stylesheet"]');
            externalStyles.forEach(link => link.remove());
            
            // Remove all style tags that might contain oklch
            const styles = clonedDoc.querySelectorAll('style');
            styles.forEach(style => style.remove());
            
            // Add our own basic styling that html2canvas can handle
            const fallbackStyle = clonedDoc.createElement('style');
            fallbackStyle.textContent = `
              .pdf-page {
                font-family: Arial, sans-serif;
                background-color: white;
                color: #000000;
              }
              .font-bold { font-weight: bold; }
              .font-semibold { font-weight: 600; }
              .text-center { text-align: center; }
              .text-left { text-align: left; }
              .text-right { text-align: right; }
              .text-black { color: #000000; }
              .text-gray-900 { color: #111827; }
              .text-gray-800 { color: #1f2937; }
              .text-gray-700 { color: #374151; }
              .text-gray-600 { color: #4b5563; }
              .text-white { color: #ffffff; }
              .bg-white { background-color: #ffffff; }
              .bg-gray-100 { background-color: #f3f4f6; }
              .bg-gray-50 { background-color: #f9fafb; }
              .bg-gray-200 { background-color: #e5e7eb; }
              .border { border: 1px solid #d1d5db; }
              .border-gray-300 { border-color: #d1d5db; }
              .border-gray-400 { border-color: #9ca3af; }
              .border-gray-900 { border-color: #111827; }
              .border-indigo-600 { border-color: #4f46e5; }
              .border-t { border-top: 1px solid; }
              .border-b { border-bottom: 1px solid; }
              .border-t-2 { border-top: 2px solid; }
              .border-b-2 { border-bottom: 2px solid; }
              .rounded { border-radius: 0.25rem; }
              .p-2 { padding: 0.5rem; }
              .p-8 { padding: 2rem; }
              .pb-1 { padding-bottom: 0.25rem; }
              .pb-4 { padding-bottom: 1rem; }
              .pt-3 { padding-top: 0.75rem; }
              .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
              .py-3 { padding-top: 0.75rem; padding-bottom: 0.75rem; }
              .mt-1 { margin-top: 0.25rem; }
              .mt-2 { margin-top: 0.5rem; }
              .mt-3 { margin-top: 0.75rem; }
              .mt-4 { margin-top: 1rem; }
              .mt-6 { margin-top: 1.5rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-3 { margin-bottom: 0.75rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-6 { margin-bottom: 1.5rem; }
              .mb-8 { margin-bottom: 2rem; }
              .w-full { width: 100%; }
              .w-16 { width: 4rem; }
              .w-24 { width: 6rem; }
              .w-64 { width: 16rem; }
              .h-16 { height: 4rem; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; }
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              .text-base { font-size: 1rem; line-height: 1.5rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
              .text-2xl { font-size: 1.5rem; line-height: 2rem; }
              .flex { display: flex; }
              .flex-1 { flex: 1; }
              .justify-between { justify-content: space-between; }
              .justify-end { justify-content: flex-end; }
              .items-center { align-items: center; }
              .items-start { align-items: flex-start; }
              .space-y-2 > * + * { margin-top: 0.5rem; }
              table { border-collapse: collapse; width: 100%; }
              th, td { padding: 0.5rem; border: 1px solid #9ca3af; }
              th { background-color: #e5e7eb; font-weight: 600; }
              .shadow-xl { box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 10px 10px -5px rgb(0 0 0 / 0.04); }
              img[alt="Company Logo"] { 
                max-height: 100% !important; 
                max-width: 100% !important; 
                height: auto !important;
                width: auto !important;
                display: block !important;
              }
            `;
            clonedDoc.head.appendChild(fallbackStyle);
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      // Clean up
      document.body.removeChild(tempContainer);
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  useImperativeHandle(ref, () => ({
    downloadPDF
  }));

  const DocumentHeader = ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => (
    <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-indigo-600">
      <div className="flex items-center">
        {documentData.companyData?.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img 
            src={documentData.companyData.logo_url} 
            alt="Company Logo"
            className="h-16 w-auto object-contain"
            style={{ maxHeight: '64px', maxWidth: '120px' }}
            crossOrigin="anonymous"
            onError={(e) => {
              console.warn('Failed to load company logo:', documentData.companyData?.logo_url);
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
      </div>
      <div className="text-right text-xs text-gray-800">
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
        <div className="mt-2 text-gray-600">Page {pageNumber} of {totalPages}</div>
      </div>
    </div>
  );

  const ItemsTable = ({ items, showHeader = true }: { items: LineItem[]; showHeader?: boolean }) => (
    <table className="w-full">
      {showHeader && (
        <thead>
          <tr className="bg-gray-200 text-sm font-semibold text-gray-900">
            <th className="text-left p-2 border border-gray-400 text-gray-900">Description</th>
            <th className="text-center p-2 border border-gray-400 w-16 text-gray-900">Qty</th>
            <th className="text-center p-2 border border-gray-400 w-16 text-gray-900">Unit</th>
            <th className="text-right p-2 border border-gray-400 w-24 text-gray-900">Unit Price</th>
            <th className="text-right p-2 border border-gray-400 w-24 text-gray-900">Total</th>
          </tr>
        </thead>
      )}
      <tbody>
        {items.map((item, index) => (
          <tr key={index} className="text-sm">
            <td className="p-2 border border-gray-400 text-gray-900">{item.description}</td>
            <td className="p-2 border border-gray-400 text-center text-gray-900">{item.quantity}</td>
            <td className="p-2 border border-gray-400 text-center text-gray-900">{item.unit}</td>
            <td className="p-2 border border-gray-400 text-right text-gray-900">{item.unit_price.toFixed(2)} {documentData.currency}</td>
            <td className="p-2 border border-gray-400 text-right text-gray-900">{calculateLineTotal(item).toFixed(2)} {documentData.currency}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const TotalsSection = () => (
    <div className="flex justify-end mt-6 mb-6">
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
  );

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {/* Download Button - Only show when not in preview mode */}
          {!isPreview ? (
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
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Document Preview
            </div>
          )}

          {/* Page Navigation - Show when multiple pages */}
          {pages.length > 1 && (
            <div className="flex items-center space-x-3">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Page</span>
                <select
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value))}
                  className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  {pages.map((_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-600 dark:text-gray-400">of {pages.length}</span>
              </div>
              
              <button
                onClick={goToNextPage}
                disabled={currentPage === pages.length}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Document Preview */}
      <div className={`flex-1 bg-gray-100 dark:bg-gray-900 ${isPreview ? 'p-2 overflow-auto' : 'p-8 overflow-auto'}`}>
        <div ref={documentRef} className="space-y-6">
          {isPreview ? (
            // Preview mode - show only current page
            pages
              .filter((_, pageIndex) => pageIndex + 1 === currentPage)
              .map((page) => (
                <div
                  key={currentPage}
                  className={`pdf-page bg-white shadow-xl border border-gray-300 transform origin-top scale-[0.6] mx-auto`}
                  style={{ width: '210mm', height: '297mm', minHeight: '297mm', maxHeight: '297mm', overflow: 'hidden' }}
                >
                  <div className="p-8">
                    {/* Header on every page */}
                    <DocumentHeader pageNumber={page.pageNumber} totalPages={pages.length} />

                    {/* First page content */}
                    {page.isFirstPage && (
                      <>
                        {/* Document Title */}
                        <div className="text-center mb-4">
                          <h2 className="text-2xl font-bold text-black mb-2">
                            {documentData.case_type === 'offer' ? 'OFFER' : 'INVOICE'}
                          </h2>
                          {documentData.document_number && (
                            <p className="text-base text-black font-semibold">
                              Document Number: {documentData.document_number}
                            </p>
                          )}
                        </div>

                        {/* Customer Information */}
                        {documentData.customer && (
                          <div className="mb-4">
                            <h3 className="text-base font-bold text-black mb-2 border-b-2 border-gray-400 pb-1">
                              Bill To
                            </h3>
                            <div className="bg-gray-100 p-2 rounded border border-gray-300 text-sm">
                              <div className="font-semibold text-gray-900">
                                {documentData.customer.first_name} {documentData.customer.last_name}
                                {documentData.customer.company_name && ` (${documentData.customer.company_name})`}
                              </div>
                              <div className="text-xs text-gray-700 mt-1">
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
                        <div className="mb-4">
                          <h3 className="text-base font-bold text-black mb-2 border-b-2 border-gray-400 pb-1">
                            Document Details
                          </h3>
                          <div className="flex justify-between text-xs text-gray-900">
                            <div>Created: {documentData.created_at ? new Date(documentData.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                            {documentData.case_type === 'offer' && documentData.valid_until && (
                              <div>Valid Until: {new Date(documentData.valid_until).toLocaleDateString()}</div>
                            )}
                            {documentData.case_type === 'invoice' && (
                              <div>Payment Terms: {documentData.payment_terms} days</div>
                            )}
                          </div>
                          {documentData.description && (
                            <div className="text-xs text-gray-800 mt-1">{documentData.description}</div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Items Section */}
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-black mb-3 border-b-2 border-gray-400 pb-1">
                        {page.isFirstPage ? 'Items' : 'Items (continued)'}
                      </h3>
                      
                      <ItemsTable items={page.items} showHeader={page.isFirstPage} />
                      
                      {!page.isLastPage && (
                        <div className="text-center text-xs text-gray-600 mt-3">
                          Continued on next page...
                        </div>
                      )}
                    </div>

                    {/* Totals and Footer - only on last page */}
                    {page.isLastPage && (
                      <>
                        <TotalsSection />
                        
                        {/* Footer */}
                        <div className="text-center text-xs text-gray-900 border-t-2 border-gray-400 pt-3 mt-4">
                          Thank you for your business! • {documentData.case_type === 'offer' ? 'This offer is valid until the date specified above.' : `Payment is due within ${documentData.payment_terms} days.`}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))
          ) : (
            // Non-preview mode - show all pages
            pages.map((page, pageIndex) => (
              <div
                key={pageIndex}
                className={`pdf-page bg-white shadow-xl border border-gray-300 max-w-4xl mx-auto ${pageIndex > 0 ? 'mt-12' : ''}`}
                style={{ minHeight: '297mm', width: '210mm', maxHeight: '297mm', overflow: 'hidden' }}
              >
                <div className="p-8">
                  {/* Header on every page */}
                  <DocumentHeader pageNumber={page.pageNumber} totalPages={pages.length} />

                  {/* First page content */}
                  {page.isFirstPage && (
                    <>
                      {/* Document Title */}
                      <div className="text-center mb-4">
                        <h2 className="text-2xl font-bold text-black mb-2">
                          {documentData.case_type === 'offer' ? 'OFFER' : 'INVOICE'}
                        </h2>
                        {documentData.document_number && (
                          <p className="text-base text-black font-semibold">
                            Document Number: {documentData.document_number}
                          </p>
                        )}
                      </div>

                      {/* Customer Information */}
                      {documentData.customer && (
                        <div className="mb-4">
                          <h3 className="text-base font-bold text-black mb-2 border-b-2 border-gray-400 pb-1">
                            Bill To
                          </h3>
                          <div className="bg-gray-100 p-2 rounded border border-gray-300 text-sm">
                            <div className="font-semibold text-gray-900">
                              {documentData.customer.first_name} {documentData.customer.last_name}
                              {documentData.customer.company_name && ` (${documentData.customer.company_name})`}
                            </div>
                            <div className="text-xs text-gray-700 mt-1">
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
                      <div className="mb-4">
                        <h3 className="text-base font-bold text-black mb-2 border-b-2 border-gray-400 pb-1">
                          Document Details
                        </h3>
                        <div className="flex justify-between text-xs text-gray-900">
                          <div>Created: {documentData.created_at ? new Date(documentData.created_at).toLocaleDateString() : new Date().toLocaleDateString()}</div>
                          {documentData.case_type === 'offer' && documentData.valid_until && (
                            <div>Valid Until: {new Date(documentData.valid_until).toLocaleDateString()}</div>
                          )}
                          {documentData.case_type === 'invoice' && (
                            <div>Payment Terms: {documentData.payment_terms} days</div>
                          )}
                        </div>
                        {documentData.description && (
                          <div className="text-xs text-gray-800 mt-1">{documentData.description}</div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Items Section */}
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-black mb-3 border-b-2 border-gray-400 pb-1">
                      {page.isFirstPage ? 'Items' : 'Items (continued)'}
                    </h3>
                    
                    <ItemsTable items={page.items} showHeader={page.isFirstPage} />
                    
                    {!page.isLastPage && (
                      <div className="text-center text-xs text-gray-600 mt-3">
                        Continued on next page...
                      </div>
                    )}
                  </div>

                  {/* Totals and Footer - only on last page */}
                  {page.isLastPage && (
                    <>
                      <TotalsSection />
                      
                      {/* Footer */}
                      <div className="text-center text-xs text-gray-900 border-t-2 border-gray-400 pt-3 mt-4">
                        Thank you for your business! • {documentData.case_type === 'offer' ? 'This offer is valid until the date specified above.' : `Payment is due within ${documentData.payment_terms} days.`}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
  }
);

export default PDFWrapper; 