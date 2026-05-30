import { Injectable, Logger } from '@nestjs/common';
import https from 'https';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string;
  private readonly from: string;

  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || '';
    this.from = process.env.RESEND_FROM || 'VidCraft <noreply@vidcraft.icu>';
    this.logger.log(`EmailService: from=${this.from}`);
  }

  private send(to: string, subject: string, html: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.apiKey) { this.logger.warn('RESEND_API_KEY not set'); return resolve(false); }
      const body = JSON.stringify({ from: this.from, to, subject, html });
      const req = https.request('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      }, (res) => {
        let d = '';
        res.on('data', (c) => d += c);
        res.on('end', () => {
          try {
            const j = JSON.parse(d);
            if (res.statusCode === 200) {
              this.logger.log(`Email sent to ${to}, id=${j.id}`);
              resolve(true);
            } else {
              this.logger.error(`Resend ${res.statusCode}: ${d}`);
              resolve(false);
            }
          } catch { resolve(false); }
        });
      });
      req.on('error', (e) => { this.logger.error(`Resend error: ${e.message}`); resolve(false); });
      req.write(body);
      req.end();
    });
  }

  async sendPasswordResetCode(email: string, code: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') this.logger.warn(`[DEV] 重置验证码: ${email} -> ${code}`);
    return this.send(email, 'VidCraft 重置密码验证码', `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto"><div style="background:linear-gradient(135deg,#8B5CF6,#4648D4,#0EA5E9);padding:24px;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0;font-size:20px">VidCraft</h1></div><div style="border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px"><h2 style="margin:0 0 12px;font-size:18px;color:#111827">重置密码</h2><p style="color:#6B7280;font-size:14px;line-height:1.6">请使用以下验证码完成密码重置，10 分钟内有效。</p><div style="margin:24px 0;padding:16px 24px;background:#F5F3FF;border-radius:8px;text-align:center"><span style="font-family:monospace;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#4648D4">${code}</span></div><p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">© 2026 VidCraft</p></div></div>`);
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    if (process.env.NODE_ENV === 'development') this.logger.warn(`[DEV] 验证码: ${email} -> ${code}`);
    return this.send(email, 'VidCraft 邮箱验证码', `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto"><div style="background:linear-gradient(135deg,#8B5CF6,#4648D4,#0EA5E9);padding:24px;border-radius:12px 12px 0 0"><h1 style="color:#fff;margin:0;font-size:20px">VidCraft</h1></div><div style="border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px"><h2 style="margin:0 0 12px;font-size:18px;color:#111827">验证你的邮箱</h2><p style="color:#6B7280;font-size:14px;line-height:1.6">感谢注册！请使用以下验证码完成注册，10 分钟内有效。</p><div style="margin:24px 0;padding:16px 24px;background:#F5F3FF;border-radius:8px;text-align:center"><span style="font-family:monospace;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#4648D4">${code}</span></div><p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">© 2026 VidCraft</p></div></div>`);
  }
}
