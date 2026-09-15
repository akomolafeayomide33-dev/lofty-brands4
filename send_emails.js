import nodemailer from 'nodemailer';
import fs from 'fs';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Replace with your email configuration
const transporter = nodemailer.createTransport({
    service: 'gmail', // You can change this if using another provider (e.g., SendGrid, Outlook)
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use an App Password for Gmail!
    },
});

const getEmailTemplate = (firstName) => `
Hi ${firstName},

Just a quick reminder to join the Lofty Growth Systems Fellowship WhatsApp group.

As a selected participant for Cohort 1, this is where all updates, session details, and communication will be shared ahead of our start.

If you haven’t joined yet, you can do so here:
https://chat.whatsapp.com/HyuNgJzLXHQLLP0CsMSWvv?mode=gi_t

We’ll be sharing important information shortly, so I encourage you to join as soon as possible.

Looking forward to having you fully onboard.

Best regards,
Ayomide
Founder, Lofty Brands Digital Agency
`;

const sendEmail = async (toEmail, firstName) => {
    try {
        await transporter.sendMail({
            from: `"Lofty Brands Fellowship" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: '👉 Reminder: Join the Fellowship WhatsApp Group',
            text: getEmailTemplate(firstName),
        });
        console.log(`✅ Sent to ${firstName} (${toEmail})`);
    } catch (error) {
        console.error(`❌ Failed to send to ${firstName} (${toEmail}):`, error.message);
    }
};

const sendTestEmail = async (testEmail) => {
    console.log(`Sending test email to ${testEmail}...`);
    await sendEmail(testEmail, 'Test User');
    console.log('Test email sent successfully! Check your inbox.');
};

const sendLiveEmails = async (csvFilePath) => {
    console.log('Reading CSV and sending emails...');
    const results = [];

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
            if (results.length === 0) {
                console.log('CSV is empty or could not be parsed.');
                return;
            }

            console.log(`Found ${results.length} signups. Starting to send emails...\n`);

            for (const row of results) {
                // Adjust keys based on your Formspree CSV export columns
                const email = row['Email'] || row['email'];
                const fullName = row['Full Name'] || row['Name'] || row['name'] || 'Applicant';
                const firstName = fullName.split(' ')[0]; // Extract first name

                if (email) {
                    // Send sequentially to avoid rate limiting
                    await sendEmail(email, firstName);
                    // Slight delay between emails
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log(`⚠️ Skipped a row due to missing email address:`, row);
                }
            }
            console.log('\n🎉 Finished sending all emails!');
        });
};

const run = async () => {
    const args = process.argv.slice(2);
    const mode = args[0]; // 'test' or 'live'
    const testEmailAddress = process.env.EMAIL_USER; // Default test email to sender

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error('❌ Error: EMAIL_USER and EMAIL_PASS must be set in your .env file.');
        return;
    }

    if (mode === 'test') {
        await sendTestEmail(testEmailAddress);
    } else if (mode === 'live') {
        const csvPath = path.join(__dirname, 'signups.csv');
        if (!fs.existsSync(csvPath)) {
            console.error('❌ Error: signups.csv not found in the root directory.');
            console.log('Please export your Formspree submissions as CSV, name it signups.csv, and place it in the project root.');
            return;
        }
        await sendLiveEmails(csvPath);
    } else {
        console.log('Usage: node send_emails.js [mode]');
        console.log('Modes:');
        console.log('  test   - Send a single test email to your own address');
        console.log('  live   - Read signups.csv and send to all applicants');
    }
};

run();
