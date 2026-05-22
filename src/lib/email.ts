import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  type: "register" | "login"
): Promise<boolean> {
  const subject =
    type === "register"
      ? "TrioZ — Код подтверждения регистрации"
      : "TrioZ — Код для входа";

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; width: 48px; height: 48px; background: linear-gradient(135deg, #8b5cf6, #6366f1); border-radius: 12px; line-height: 48px; color: white; font-weight: bold; font-size: 18px;">TZ</div>
      </div>
      <h2 style="text-align: center; color: #1a1a2e; margin-bottom: 8px;">
        ${type === "register" ? "Подтверждение регистрации" : "Вход в аккаунт"}
      </h2>
      <p style="text-align: center; color: #666; margin-bottom: 32px;">
        ${type === "register" ? "Используйте этот код для завершения регистрации:" : "Используйте этот код для входа в аккаунт:"}
      </p>
      <div style="background: #f4f0ff; border: 2px solid #8b5cf6; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px;">
        <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #5b21b6;">${code}</span>
      </div>
      <p style="text-align: center; color: #999; font-size: 14px;">
        Код действителен 10 минут.<br/>
        Если вы не запрашивали этот код, проигнорируйте это письмо.
      </p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
      <p style="text-align: center; color: #bbb; font-size: 12px;">TrioZ Ecosystem</p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@trioz.ru",
      to: email,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}
