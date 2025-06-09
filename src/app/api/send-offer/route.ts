import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
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

function generatePDF(offerData: OfferData, companyData?: { name: string; address: string; phone: string; }): Buffer {
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
    addressLines.forEach(line => {
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

  // Items table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const colWidths = [80, 20, 30, 30];
  const colPositions = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

  doc.text('Description', colPositions[0], yPosition);
  doc.text('Qty', colPositions[1], yPosition);
  doc.text('Unit Price', colPositions[2], yPosition);
  doc.text('Total', colPositions[3], yPosition);
  yPosition += 8;

  doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
  yPosition += 5;

  // Items
  doc.setFont('helvetica', 'normal');
  offerData.items.forEach(item => {
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

  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(request: NextRequest) {
  try {
    const { offerData, userId } = await request.json();

    // Validate required fields
    if (!offerData.clientEmail) {
      return NextResponse.json(
        { error: 'Client email is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Get the authorization header for user authentication
    const authHeader = request.headers.get('authorization');
    
    // Create Supabase client with user auth context
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { authorization: authHeader } : {},
      },
    });

    // Get SMTP configuration from database
    const { data: smtpConfig, error: dbError } = await supabase
      .from('smtp_configurations')
      .select('host, port, username, password_encrypted, use_tls, use_ssl, from_email, from_name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (dbError || !smtpConfig) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'No active SMTP configuration found' }, { status: 404 });
    }

    // Decrypt password (simple base64 for now)
    const password = Buffer.from(smtpConfig.password_encrypted, 'base64').toString('utf-8');

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

    // Generate PDF with company data
    const pdfBuffer = generatePDF(offerData, companyData || undefined);

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.use_ssl, // true for 465, false for other ports
      auth: {
        user: smtpConfig.username,
        pass: password,
      },
      tls: smtpConfig.use_tls ? {
        rejectUnauthorized: false
      } : undefined,
    });

    // Email content
    const emailSubject = `Offer ${offerData.offerNumber} - ${offerData.clientName}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">New Offer</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Offer #${offerData.offerNumber}</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${offerData.clientName},</p>
          
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Thank you for your interest in our services. Please find attached our offer for your review.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Offer Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Offer Number:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${offerData.offerNumber}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${new Date(offerData.date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Valid Until:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${new Date(offerData.validUntil).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-size: 16px;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #667eea;">$${offerData.total.toFixed(2)}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; margin: 20px 0;">
            The detailed offer is attached as a PDF document. Please review it carefully and don't hesitate to contact us if you have any questions.
          </p>
          
          <p style="font-size: 14px; line-height: 1.6; margin: 20px 0;">
            We look forward to working with you!
          </p>
          
          <div style="border-top: 2px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 14px; color: #666; margin: 0;">
              Best regards,<br>
              <strong>${companyData?.name || 'Your Company Name'}</strong><br>
              ${smtpConfig.from_email}${companyData?.phone ? `<br>Tel: ${companyData.phone}` : ''}
            </p>
          </div>
        </div>
      </div>
    `;

    const emailText = `
      Dear ${offerData.clientName},

      Thank you for your interest in our services. Please find attached our offer for your review.

      Offer Details:
      - Offer Number: ${offerData.offerNumber}
      - Date: ${new Date(offerData.date).toLocaleDateString()}
      - Valid Until: ${new Date(offerData.validUntil).toLocaleDateString()}
      - Total Amount: $${offerData.total.toFixed(2)}

      The detailed offer is attached as a PDF document. Please review it carefully and don't hesitate to contact us if you have any questions.

      We look forward to working with you!

      Best regards,
      ${companyData?.name || 'Your Company Name'}
      ${smtpConfig.from_email}${companyData?.phone ? `
      Tel: ${companyData.phone}` : ''}
    `;

    // Send email
    await transporter.sendMail({
      from: smtpConfig.from_name 
        ? `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`
        : smtpConfig.from_email,
      to: offerData.clientEmail,
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
      attachments: [
        {
          filename: `offer-${offerData.offerNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Offer sent successfully' 
    });

  } catch (error: unknown) {
    console.error('Error sending offer:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send offer';
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as { code: string }).code;
      if (errorCode === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check your SMTP configuration.';
      } else if (errorCode === 'ECONNECTION') {
        errorMessage = 'Connection failed. Please check your SMTP host and port.';
      } else if (errorCode === 'ESECURE') {
        errorMessage = 'Security error. Please check your TLS/SSL settings.';
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as Error).message;
    }

    return NextResponse.json({ 
      error: errorMessage,
      details: (error && typeof error === 'object' && 'code' in error) 
        ? (error as { code: string }).code 
        : 'UNKNOWN'
    }, { status: 500 });
  }
} 