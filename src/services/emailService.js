import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCaspApprovalEmail({ email, businessName, caspId, apiKey }) {
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'noreply@sove.africa',
    to: email,
    subject: 'Welcome to Sove Arc — Your API credentials are ready',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c0c0e; color: #ffffff; padding: 40px; border-radius: 8px;">
        <h1 style="color: #C8A96E; font-size: 28px; margin-bottom: 8px;">Sove</h1>
        <p style="color: #888; font-size: 12px; margin-bottom: 32px; text-transform: uppercase; letter-spacing: 2px;">Identity Infrastructure for Africa</p>
        
        <h2 style="color: #ffffff; font-size: 20px;">Welcome, ${businessName}</h2>
        <p style="color: #cccccc;">Your application to join the Sove Arc Travel Rule network has been approved. Below are your credentials — keep them secure.</p>
        
        <div style="background: #1a1a1d; border: 1px solid #C8A96E; border-radius: 6px; padding: 24px; margin: 24px 0;">
          <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">CASP ID</p>
          <p style="color: #C8A96E; font-family: monospace; font-size: 14px; margin: 0 0 20px;">${caspId}</p>
          
          <p style="color: #888; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">API KEY</p>
          <p style="color: #ffffff; font-family: monospace; font-size: 13px; margin: 0; word-break: break-all;">${apiKey}</p>
        </div>
        
        <p style="color: #888; font-size: 12px;">Include your API key on every request as a header:</p>
        <div style="background: #111; border-radius: 4px; padding: 12px; margin: 8px 0 24px;">
          <code style="color: #C8A96E; font-size: 12px;">x-api-key: ${apiKey}</code>
        </div>
        
        <p style="color: #cccccc;">API documentation: <a href="https://api.sove.africa/docs" style="color: #C8A96E;">api.sove.africa/docs</a></p>
        
        <hr style="border: none; border-top: 1px solid #2a2a2e; margin: 32px 0;" />
        <p style="color: #555; font-size: 11px;">Sove by Eoniix — Identity Infrastructure for Africa. If you did not request this, contact hello@sove.africa immediately.</p>
      </div>
    `
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  return true;
}
