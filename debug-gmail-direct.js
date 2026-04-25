import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

async function testDirectGmailSend() {
  console.log('🔍 Testing Direct Gmail SMTP Connection...\n');
  console.log('SMTP User:', process.env.SMTP_USER);
  console.log('SMTP Password:', process.env.SMTP_PASSWORD ? '✅ Present' : '❌ Missing');
  
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      }
    });

    console.log('\n📤 Attempting to verify transporter...');
    await transporter.verify();
    console.log('✅ Transporter verified successfully');

    console.log('\n📧 Sending test notification email...');
    const info = await transporter.sendMail({
      from: `"TaskSync" <${process.env.SMTP_USER}>`,
      to: 'tasksyncscheduler@gmail.com',
      subject: '🧪 Test Notification Email',
      html: `
        <h1>Test Notification</h1>
        <p>This is a test notification email from TaskSync.</p>
        <p>Sent at: ${new Date().toISOString()}</p>
      `
    });

    console.log('✅ Email sent successfully!');
    console.log('📨 Response ID:', info.response);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
  }
}

testDirectGmailSend();
