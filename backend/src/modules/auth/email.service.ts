import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('RESEND_API_KEY', '');
    this.from = this.config.get<string>('RESEND_FROM', 'VidCraft <noreply@vidcraft.icu>');
    this.resend = new Resend(apiKey || 're_placeholder');
  }

  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
    const resetUrl = `${this.config.get<string>('FRONTEND_URL', 'http://localhost:5173')}/reset-password?token=${resetToken}`;

    // 开发模式：控制台直接输出重置链接
    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.warn(`[DEV] 密码重置链接: ${resetUrl}`);
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: '重置你的 VidCraft 密码',
        html: `
          <div style="max-width:480px;margin:0 auto;font-family:Inter,system-ui,sans-serif">
            <div style="background:linear-gradient(135deg,#8B5CF6,#4648D4,#0EA5E9);padding:24px;border-radius:12px 12px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">VidCraft</h1>
            </div>
            <div style="border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <h2 style="margin:0 0 12px;font-size:18px;color:#111827">密码重置请求</h2>
              <p style="color:#6B7280;font-size:14px;line-height:1.6">我们收到了你重置密码的请求。点击下方按钮设置新密码，链接 30 分钟内有效。</p>
              <a href="${resetUrl}" style="display:inline-block;margin:16px 0;padding:12px 32px;background:linear-gradient(135deg,#8B5CF6,#4648D4);color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">重置密码</a>
              <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">如果没有请求重置密码，请忽略此邮件。链接 30 分钟后失效。</p>
              <p style="color:#9CA3AF;font-size:12px">© 2026 VidCraft</p>
            </div>
          </div>
        `,
      });

      if (error) {
        this.logger.error(`Resend send failed: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Email send error: ${(err as Error).message}`);
      return false;
    }
  }

  async sendVerificationCode(email: string, code: string): Promise<boolean> {
    if (this.config.get('NODE_ENV') === 'development') {
      this.logger.warn(`[DEV] 邮箱验证码: ${email} -> ${code}`);
    }

    try {
      const { error } = await this.resend.emails.send({
        from: this.from,
        to: email,
        subject: 'VidCraft 邮箱验证码',
        html: `
          <div style="max-width:480px;margin:0 auto;font-family:Inter,system-ui,sans-serif">
            <div style="background:linear-gradient(135deg,#8B5CF6,#4648D4,#0EA5E9);padding:24px;border-radius:12px 12px 0 0">
              <h1 style="color:#fff;margin:0;font-size:20px">VidCraft</h1>
            </div>
            <div style="border:1px solid #E5E7EB;border-top:none;padding:24px;border-radius:0 0 12px 12px">
              <h2 style="margin:0 0 12px;font-size:18px;color:#111827">验证你的邮箱</h2>
              <p style="color:#6B7280;font-size:14px;line-height:1.6">感谢注册 VidCraft！请使用以下验证码完成注册，10 分钟内有效。</p>
              <div style="margin:24px 0;padding:16px 24px;background:#F5F3FF;border-radius:8px;text-align:center">
                <span style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;letter-spacing:0.2em;color:#4648D4">${code}</span>
              </div>
              <p style="color:#9CA3AF;font-size:12px;margin:24px 0 0">如果这不是你的操作，请忽略此邮件。</p>
              <p style="color:#9CA3AF;font-size:12px">© 2026 VidCraft</p>
            </div>
          </div>
        `,
      });
      if (error) {
        this.logger.error(`Resend send failed: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      this.logger.error(`Email send error: ${(err as Error).message}`);
      return false;
    }
  }
}
