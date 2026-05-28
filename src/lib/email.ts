import nodemailer from "nodemailer";

const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";

const transportConfig: nodemailer.TransportOptions = {
  host: process.env.SMTP_HOST || "localhost",
  port: parseInt(process.env.SMTP_PORT || "25"),
  secure: process.env.SMTP_SECURE === "true",
  tls: { rejectUnauthorized: false },
} as nodemailer.TransportOptions;

if (smtpUser) {
  (transportConfig as Record<string, unknown>).auth = {
    user: smtpUser,
    pass: smtpPass,
  };
}

const transporter = nodemailer.createTransport(transportConfig);

export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

type EmailType = "register" | "login" | "reset";

const SUBJECTS: Record<EmailType, string> = {
  register: "Kod podtverzhdeniya registracii - TrioZ",
  login: "Kod dlya vhoda - TrioZ",
  reset: "Sbros parolya - TrioZ",
};

const TITLES: Record<EmailType, string> = {
  register: "Подтверждение регистрации",
  login: "Вход в аккаунт",
  reset: "Сброс пароля",
};

const DESCRIPTIONS: Record<EmailType, string> = {
  register: "Используйте этот код для завершения регистрации:",
  login: "Используйте этот код для входа в аккаунт:",
  reset: "Используйте этот код для сброса пароля:",
};

function buildHtml(code: string, type: EmailType): string {
  return `<!DOCTYPE html>
<html lang="ru">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f17;padding:40px 0">
<tr><td align="center">
<table width="480" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;border:1px solid rgba(139,92,246,0.2);overflow:hidden">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#8b5cf6 0%,#6366f1 100%);padding:32px 40px;text-align:center">
    <div style="display:inline-block;width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;line-height:56px;color:#fff;font-weight:800;font-size:22px;letter-spacing:1px;margin-bottom:12px">TZ</div>
    <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:700">${TITLES[type]}</h1>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:32px 40px">
    <p style="color:#a5a5c0;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center">${DESCRIPTIONS[type]}</p>
    <div style="background:#252542;border:2px solid #8b5cf6;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">
      <span style="font-size:36px;font-weight:800;letter-spacing:10px;color:#c4b5fd">${code}</span>
    </div>
    <p style="color:#6b6b8a;font-size:13px;line-height:1.5;text-align:center;margin:0">
      Kod dejstvitelen 10 minut.<br>
      Esli vy ne zaprashivali etot kod, proignoriruyte eto pismo.
    </p>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.05);text-align:center">
    <span style="color:#4a4a6a;font-size:12px">TrioZ Ecosystem</span>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildText(code: string, type: EmailType): string {
  return `${TITLES[type]}\n\n${DESCRIPTIONS[type]}\n\n${code}\n\nKod dejstvitelen 10 minut.\nEsli vy ne zaprashivali etot kod, proignoriruyte eto pismo.\n\n-- TrioZ Ecosystem`;
}

export async function sendVerificationEmail(
  email: string,
  code: string,
  type: EmailType
): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: {
        name: "TrioZ",
        address: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@trioz.ru",
      },
      to: email,
      subject: SUBJECTS[type],
      text: buildText(code, type),
      html: buildHtml(code, type),
      headers: {
        "X-Mailer": "TrioZ Ecosystem",
        "X-Priority": "1",
      },
      encoding: "quoted-printable",
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}
