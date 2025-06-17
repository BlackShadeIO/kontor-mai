import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import jsPDF from 'jspdf';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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

interface CaseDocument {
  id: string;
  document_number: string;
  case_type: 'offer' | 'invoice';
  title: string;
  description?: string;
  customer: Customer;
  currency: string;
  vat_rate: number;
  payment_terms: number;
  valid_until?: string;
  created_at: string;
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
  amount: number;
  vat_amount: number;
  total_amount: number;
}

function generatePDF(documentData: CaseDocument): Buffer {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = 30;

  // Header with company info
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(documentData.case_type.toUpperCase(), margin, yPosition);
  
  // Company info on right
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(documentData.companyData?.name || 'Your Company Name', pageWidth - margin, yPosition, { align: 'right' });
  
  yPosition += 8;
  doc.setFontSize(8);
  if (documentData.companyData?.address) {
    const addressLines = documentData.companyData.address.split(',');
    addressLines.forEach(line => {
      doc.text(line.trim(), pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 4;
    });
  }
  if (documentData.companyData?.phone) {
    doc.text(`Phone: ${documentData.companyData.phone}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 4;
  }
  if (documentData.companyData?.userEmail) {
    doc.text(`Email: ${documentData.companyData.userEmail}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 4;
  }

  yPosition = 60; // Reset position for document content

  // Document number
  if (documentData.document_number) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Document Number: ${documentData.document_number}`, margin, yPosition);
    yPosition += 15;
  }

  // Customer information
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', margin, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`${documentData.customer.first_name} ${documentData.customer.last_name}`, margin, yPosition);
  yPosition += 5;
  
  if (documentData.customer.company_name) {
    doc.text(documentData.customer.company_name, margin, yPosition);
    yPosition += 5;
  }
  
  doc.text(documentData.customer.street_address, margin, yPosition);
  yPosition += 5;
  doc.text(`${documentData.customer.postal_code} ${documentData.customer.city}`, margin, yPosition);
  yPosition += 5;
  doc.text(documentData.customer.country, margin, yPosition);
  yPosition += 5;
  
  if (documentData.customer.email) {
    doc.text(`Email: ${documentData.customer.email}`, margin, yPosition);
    yPosition += 5;
  }
  
  if (documentData.customer.phone) {
    doc.text(`Phone: ${documentData.customer.phone}`, margin, yPosition);
    yPosition += 5;
  }

  yPosition += 15;

  // Document details
  doc.setFontSize(10);
  doc.text(`Created: ${new Date(documentData.created_at).toLocaleDateString()}`, margin, yPosition);
  
  if (documentData.case_type === 'offer' && documentData.valid_until) {
    doc.text(`Valid Until: ${new Date(documentData.valid_until).toLocaleDateString()}`, margin + 80, yPosition);
  } else if (documentData.case_type === 'invoice') {
    doc.text(`Payment Terms: ${documentData.payment_terms} days`, margin + 80, yPosition);
  }
  
  yPosition += 20;

  // Items table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  const colWidths = [80, 20, 25, 25, 25];
  const colPositions = [
    margin, 
    margin + colWidths[0], 
    margin + colWidths[0] + colWidths[1], 
    margin + colWidths[0] + colWidths[1] + colWidths[2],
    margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3]
  ];

  doc.text('Description', colPositions[0], yPosition);
  doc.text('Qty', colPositions[1], yPosition);
  doc.text('Unit', colPositions[2], yPosition);
  doc.text('Price', colPositions[3], yPosition);
  doc.text('Total', colPositions[4], yPosition);
  yPosition += 8;

  doc.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);
  yPosition += 5;

  // Items
  doc.setFont('helvetica', 'normal');
  documentData.items.forEach(item => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    const lineTotal = item.quantity * item.unit_price * (1 - item.discount_percentage / 100);
    
    const description = item.description.length > 35 
      ? item.description.substring(0, 32) + '...' 
      : item.description;

    doc.text(description, colPositions[0], yPosition);
    doc.text(item.quantity.toString(), colPositions[1], yPosition);
    doc.text(item.unit, colPositions[2], yPosition);
    doc.text(`${item.unit_price.toFixed(2)}`, colPositions[3], yPosition);
    doc.text(`${lineTotal.toFixed(2)}`, colPositions[4], yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Totals
  const totalsX = pageWidth - margin - 60;
  doc.line(totalsX - 10, yPosition - 5, pageWidth - margin, yPosition - 5);
  
  doc.text('Subtotal:', totalsX, yPosition);
  doc.text(`${documentData.amount.toFixed(2)} ${documentData.currency}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;

  doc.text(`VAT (${documentData.vat_rate}%):`, totalsX, yPosition);
  doc.text(`${documentData.vat_amount.toFixed(2)} ${documentData.currency}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Total:', totalsX, yPosition);
  doc.text(`${documentData.total_amount.toFixed(2)} ${documentData.currency}`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 15;

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Thank you for your business! • ${documentData.case_type === 'offer' 
    ? 'This offer is valid until the date specified above.' 
    : `Payment is due within ${documentData.payment_terms} days.`}`, margin, yPosition);

  return Buffer.from(doc.output('arraybuffer'));
}

export async function POST(request: NextRequest) {
  try {
    const { caseId, recipientEmail, customMessage, userId } = await request.json();

    // Validate required fields
    if (!caseId || !recipientEmail || !userId) {
      return NextResponse.json(
        { error: 'Case ID, recipient email, and user ID are required' },
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

    // Get case data with customer and items
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        *,
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
      .eq('user_id', userId)
      .single();

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found or access denied' },
        { status: 404 }
      );
    }

    // Get case items
    const { data: itemsData, error: itemsError } = await supabase
      .from('case_items')
      .select('*')
      .eq('case_id', caseId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      return NextResponse.json(
        { error: 'Failed to load case items' },
        { status: 500 }
      );
    }

    // Get company data
    const { data: profileData } = await supabase
      .from('profiles')
      .select('company_id, first_name, last_name, phone')
      .eq('user_id', userId)
      .single();

    let companyData: CaseDocument['companyData'] = undefined;
    if (profileData?.company_id) {
      const { data } = await supabase
        .from('companies')
        .select('name, logo_url, address, phone, website, description')
        .eq('id', profileData.company_id)
        .single();
      
      if (data) {
        companyData = {
          ...data,
          userFirstName: profileData.first_name,
          userLastName: profileData.last_name,
          userPhone: profileData.phone,
          userEmail: (await supabase.auth.getUser()).data.user?.email
        };
      }
    }

    // Get SMTP configuration
    const { data: smtpConfig, error: smtpError } = await supabase
      .from('smtp_configurations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (smtpError || !smtpConfig) {
      return NextResponse.json({ error: 'No active SMTP configuration found' }, { status: 404 });
    }

    // Prepare document data
    const documentData: CaseDocument = {
      id: caseData.id,
      document_number: caseData.document_number || caseData.case_id,
      case_type: caseData.case_type,
      title: caseData.title,
      description: caseData.description,
      customer: caseData.customers,
      currency: caseData.currency,
      vat_rate: caseData.vat_rate,
      payment_terms: caseData.payment_terms,
      valid_until: caseData.valid_until,
      created_at: caseData.created_at,
      items: itemsData || [],
      companyData,
      amount: caseData.amount,
      vat_amount: caseData.vat_amount,
      total_amount: caseData.total_amount
    };

    // Generate PDF
    const pdfBuffer = generatePDF(documentData);

    // Decrypt password
    const password = Buffer.from(smtpConfig.password_encrypted, 'base64').toString('utf-8');

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.use_ssl,
      auth: {
        user: smtpConfig.username,
        pass: password,
      },
      tls: smtpConfig.use_tls ? {
        rejectUnauthorized: false
      } : undefined,
    });

    // Email content
    const customerName = `${documentData.customer.first_name} ${documentData.customer.last_name}`;
    const documentType = documentData.case_type === 'offer' ? 'Offer' : 'Invoice';
    const emailSubject = `${documentType} ${documentData.document_number} - ${customerName}`;
    
    const defaultMessage = documentData.case_type === 'offer' 
      ? 'Thank you for your interest in our services. Please find attached our offer for your review.'
      : 'Thank you for your business. Please find attached your invoice.';

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px;">${documentType}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${documentData.document_number}</p>
        </div>
        
        <div style="padding: 30px; background: #f8f9fa;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName},</p>
          
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            ${customMessage || defaultMessage}
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 15px 0; color: #333;">${documentType} Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Document Number:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${documentData.document_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Date:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${new Date(documentData.created_at).toLocaleDateString()}</td>
              </tr>
              ${documentData.case_type === 'offer' && documentData.valid_until ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Valid Until:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${new Date(documentData.valid_until).toLocaleDateString()}</td>
              </tr>
              ` : ''}
              ${documentData.case_type === 'invoice' ? `
              <tr>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment Terms:</strong></td>
                <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${documentData.payment_terms} days</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 8px 0; font-size: 16px;"><strong>Total Amount:</strong></td>
                <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #667eea;">${documentData.total_amount.toFixed(2)} ${documentData.currency}</td>
              </tr>
            </table>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; margin: 20px 0;">
            Please review the attached document carefully and don't hesitate to contact us if you have any questions.
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

    const filename = `${documentData.case_type}_${documentData.document_number}.pdf`;

    // Send email
    await transporter.sendMail({
      from: smtpConfig.from_name 
        ? `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`
        : smtpConfig.from_email,
      to: recipientEmail,
      subject: emailSubject,
      html: emailHtml,
      attachments: [
        {
          filename: filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });

    // Record email in history
    const { error: historyError } = await supabase
      .from('email_history')
      .insert({
        user_id: userId,
        case_id: caseId,
        recipient_email: recipientEmail,
        recipient_name: customerName,
        subject: emailSubject,
        email_type: documentData.case_type,
        document_number: documentData.document_number,
        status: 'sent',
        smtp_config_id: smtpConfig.id,
        attachment_filename: filename,
        email_content: customMessage || defaultMessage
      });

    if (historyError) {
      console.error('Failed to save email history:', historyError);
    }

    // Update case status and sent_at timestamp
    await supabase
      .from('cases')
      .update({ 
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', caseId);

    return NextResponse.json({ 
      success: true, 
      message: `${documentType} sent successfully`,
      filename: filename
    });

  } catch (error: unknown) {
    console.error('Error sending document:', error);
    
    let errorMessage = 'Failed to send document';
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