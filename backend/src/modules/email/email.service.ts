import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private from: string;
  private enabled = false;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    const pass = config.get<string>('SMTP_PASS');
    this.from = config.get<string>('SMTP_FROM') ?? 'noreply@das.com';

    if (!host || host.includes('example.com') || host === 'changeme' || !user || user.includes('example.com') || user === 'changeme') {
      this.logger.warn('SMTP not configured — email notifications disabled');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: config.get<number>('SMTP_PORT') ?? 587,
      secure: false,
      auth: { user, pass },
    });
    this.enabled = true;
    this.logger.log(`Email service connected via ${host}`);
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`[Email disabled] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({ from: this.from, to, subject, html });
      this.logger.log(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
    }
  }

  async sendApplicationSubmitted(to: string, trackingNumber: string, voucherNumber: string, amount: number) {
    await this.send(
      to,
      `Application Submitted — ${trackingNumber}`,
      `<h2>Application Received</h2>
       <p>Your application <strong>${trackingNumber}</strong> has been submitted successfully.</p>
       <p>Your payment voucher: <strong>${voucherNumber}</strong></p>
       <p>Amount due: <strong>PKR ${amount.toLocaleString()}</strong></p>
       <p>Please log in to the portal to submit your payment proof.</p>`,
    );
  }

  async sendPaymentReceived(to: string, trackingNumber: string) {
    await this.send(
      to,
      `Payment Received — ${trackingNumber}`,
      `<h2>Payment Confirmed</h2>
       <p>Your payment for application <strong>${trackingNumber}</strong> has been received.</p>
       <p>Your degree is now being registered on the blockchain. You will receive another email once the process is complete.</p>`,
    );
  }

  async sendAttestationCompleted(to: string, trackingNumber: string, degreeId: string, txHash: string | null) {
    await this.send(
      to,
      `Attestation Completed — ${trackingNumber}`,
      `<h2>Degree Attestation Completed ✓</h2>
       <p>Your degree has been successfully attested and registered on the blockchain.</p>
       <p><strong>Degree ID:</strong> ${degreeId}</p>
       ${txHash ? `<p><strong>Blockchain Tx:</strong> ${txHash}</p>` : ''}
       <p>You can verify your degree at any time using the public verification portal.</p>
       <p><a href="${this.config.get('FRONTEND_URL') ?? 'http://localhost:3000'}/verify?degreeId=${degreeId}">Verify Now →</a></p>`,
    );
  }

  async sendApplicationRejected(to: string, trackingNumber: string, reason: string) {
    await this.send(
      to,
      `Application Rejected — ${trackingNumber}`,
      `<h2>Application Rejected</h2>
       <p>Your application <strong>${trackingNumber}</strong> has been rejected.</p>
       <p><strong>Reason:</strong> ${reason}</p>
       <p>Please log in to the portal for more details or to submit a new application.</p>`,
    );
  }
}
