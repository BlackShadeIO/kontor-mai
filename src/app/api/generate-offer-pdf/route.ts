import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

interface OfferItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface OfferData {
  offerNumber: string;
  date: string;
  validUntil: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPhone: string;
  items: OfferItem[];
  notes: string;
  terms: string;
  subtotal: number;
  tax: number;
  total: number;
}

export async function POST(request: NextRequest) {
  try {
    const { offerData, userId } = await request.json();

    // Get the authorization header for user authentication
    const authHeader = request.headers.get('authorization');
    
    // Create Supabase client with user auth context
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { authorization: authHeader } : {},
      },
    });

    // Get company information for PDF
    const { data: companyData } = await supabase
      .from('companies')
      .select('name, address, phone')
      .eq('id', (await supabase
        .from('profiles')
        .select('company_id')
        .eq('user_id', userId)
        .single()
      ).data?.company_id)
      .single();

    // Create a new PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;

    // Header
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('OFFER', margin, yPosition);
    
    // Company name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(companyData?.name || 'Your Company Name', pageWidth - margin, yPosition, { align: 'right' });
    
    yPosition += 10;
    doc.setFontSize(10);
    if (companyData?.address) {
      const addressLines = companyData.address.split(',');
      addressLines.forEach((line: string) => {
        doc.text(line.trim(), pageWidth - margin, yPosition, { align: 'right' });
        yPosition += 5;
      });
    } else {
      doc.text('123 Business Street', pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 5;
      doc.text('City, State 12345', pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 5;
    }
    if (companyData?.phone) {
      doc.text(`Tel: ${companyData.phone}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 5;
    }

    yPosition += 20;

    // Offer details
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Offer Details:', margin, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Offer Number: ${offerData.offerNumber}`, margin, yPosition);
    doc.text(`Date: ${new Date(offerData.date).toLocaleDateString()}`, margin + 80, yPosition);
    yPosition += 8;
    doc.text(`Valid Until: ${new Date(offerData.validUntil).toLocaleDateString()}`, margin, yPosition);

    yPosition += 20;

    // Client information
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Bill To:', margin, yPosition);
    yPosition += 10;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(offerData.clientName, margin, yPosition);
    yPosition += 6;
    
    if (offerData.clientAddress) {
      const addressLines = offerData.clientAddress.split('\n');
      addressLines.forEach(line => {
        doc.text(line, margin, yPosition);
        yPosition += 6;
      });
    }
    
    if (offerData.clientEmail) {
      doc.text(`Email: ${offerData.clientEmail}`, margin, yPosition);
      yPosition += 6;
    }
    
    if (offerData.clientPhone) {
      doc.text(`Phone: ${offerData.clientPhone}`, margin, yPosition);
      yPosition += 6;
    }

    yPosition += 20;

    // Items table header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const tableStart = yPosition;
    const colWidths = [80, 20, 30, 30];
    const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

    // Table header
    doc.text('Description', colPositions[0], yPosition);
    doc.text('Qty', colPositions[1], yPosition);
    doc.text('Unit Price', colPositions[2], yPosition);
    doc.text('Total', colPositions[3], yPosition);
    yPosition += 8;

    // Draw line under header
    doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
    yPosition += 5;

    // Items
    doc.setFont('helvetica', 'normal');
    offerData.items.forEach((item: OfferItem) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }

      const description = item.description.length > 40 
        ? item.description.substring(0, 37) + '...' 
        : item.description;

      doc.text(description, colPositions[0], yPosition);
      doc.text(item.quantity.toString(), colPositions[1], yPosition);
      doc.text(`$${item.unitPrice.toFixed(2)}`, colPositions[2], yPosition);
      doc.text(`$${item.total.toFixed(2)}`, colPositions[3], yPosition);
      yPosition += 10;
    });

    yPosition += 10;

    // Totals
    const totalsX = pageWidth - margin - 60;
    doc.line(totalsX - 10, yPosition - 5, pageWidth - margin, yPosition - 5);
    
    doc.text('Subtotal:', totalsX, yPosition);
    doc.text(`$${offerData.subtotal.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;

    doc.text('VAT (25%):', totalsX, yPosition);
    doc.text(`$${offerData.tax.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;

    doc.setFont('helvetica', 'bold');
    doc.text('Total:', totalsX, yPosition);
    doc.text(`$${offerData.total.toFixed(2)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;

    // Notes
    if (offerData.notes) {
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', margin, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      const noteLines = doc.splitTextToSize(offerData.notes, pageWidth - 2 * margin);
      doc.text(noteLines, margin, yPosition);
      yPosition += noteLines.length * 6 + 10;
    }

    // Terms and conditions
    if (offerData.terms) {
      if (yPosition > 220) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFont('helvetica', 'bold');
      doc.text('Terms & Conditions:', margin, yPosition);
      yPosition += 8;
      
      doc.setFont('helvetica', 'normal');
      const termLines = doc.splitTextToSize(offerData.terms, pageWidth - 2 * margin);
      doc.text(termLines, margin, yPosition);
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="offer-${offerData.offerNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
} 