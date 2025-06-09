import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(request: Request) {
  try {
    const { userId, recipientEmail } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
    }

    if (!recipientEmail) {
      return NextResponse.json({ error: 'Missing recipient email' }, { status: 400 });
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

    // Create transporter
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

    // Verify connection
    await transporter.verify();

    // Send test email
    const testEmailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>SMTP Test Email</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 32px; text-align: center; }
            .content { padding: 32px; }
            .footer { background-color: #f1f5f9; padding: 24px; text-align: center; color: #64748b; font-size: 14px; }
            .badge { display: inline-block; background-color: #10b981; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; margin: 16px 0; }
            .info-box { background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 16px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; font-size: 28px;">🎉 SMTP Test Successful!</h1>
              <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your email configuration is working perfectly</p>
            </div>
            
            <div class="content">
              <div class="badge">✅ Connection Verified</div>
              
              <h2 style="color: #1e293b; margin-top: 24px;">Configuration Details</h2>
              
              <div class="info-box">
                <p style="margin: 0;"><strong>SMTP Host:</strong> ${smtpConfig.host}:${smtpConfig.port}</p>
                <p style="margin: 8px 0 0 0;"><strong>From:</strong> ${smtpConfig.from_name || 'N/A'} &lt;${smtpConfig.from_email}&gt;</p>
                <p style="margin: 8px 0 0 0;"><strong>Security:</strong> ${smtpConfig.use_tls ? 'TLS' : smtpConfig.use_ssl ? 'SSL' : 'None'}</p>
                <p style="margin: 8px 0 0 0;"><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
              </div>
              
              <p style="color: #64748b; line-height: 1.6;">
                This test email confirms that your SMTP configuration is properly set up and ready to send emails. 
                You can now confidently use this configuration for your application's email functionality.
              </p>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 24px 0;">
                <p style="margin: 0; color: #166534;"><strong>✨ What's Next?</strong></p>
                <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px;">
                  Your email system is ready! You can now send transactional emails, notifications, and other automated messages.
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">Test email sent from your SMTP configuration</p>
              <p style="margin: 8px 0 0 0;">Generated by Kontor Mai v2</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const info = await transporter.sendMail({
      from: smtpConfig.from_name 
        ? `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`
        : smtpConfig.from_email,
      to: recipientEmail, // Send to the specified recipient
      subject: '✅ SMTP Test Email - Configuration Verified',
      html: testEmailHtml,
      text: `SMTP Test Successful!\n\nYour email configuration is working perfectly.\n\nConfiguration Details:\n- Host: ${smtpConfig.host}:${smtpConfig.port}\n- From: ${smtpConfig.from_email}\n- Security: ${smtpConfig.use_tls ? 'TLS' : smtpConfig.use_ssl ? 'SSL' : 'None'}\n- Sent at: ${new Date().toLocaleString()}\n\nThis test email confirms that your SMTP configuration is properly set up and ready to send emails.`,
    });

    return NextResponse.json({ 
      success: true, 
      messageId: info.messageId,
      recipient: recipientEmail
    });

  } catch (error: unknown) {
    console.error('Error sending test email:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to send test email';
    if (error && typeof error === 'object' && 'code' in error) {
      const errorCode = (error as { code: string }).code;
      if (errorCode === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check your username and password.';
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