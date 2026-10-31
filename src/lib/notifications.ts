/**
 * Two-Tier Alert & Notification Dispatcher
 *
 * Tier 1: Routine Weekly Digests -> Private Discord Channel (#kids-calendar-ops)
 * Tier 2: High-Priority / Critical Exceptions -> BOTH Discord AND Direct Email (via Resend)
 */

export type AlertPriority = 'routine' | 'high' | 'critical';

export interface AlertField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface AlertPayload {
  title: string;
  message: string;
  priority: AlertPriority;
  fields?: AlertField[];
  actionUrl?: string;
  actionLabel?: string;
  sourceHandle?: string;
  eventId?: string;
}

export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields?: AlertField[];
  timestamp?: string;
  footer?: { text: string };
}

export interface DiscordMessagePayload {
  content?: string;
  embeds: DiscordEmbed[];
}

export interface NotificationResult {
  discord: {
    success: boolean;
    error?: string;
  };
  email?: {
    success: boolean;
    skipped?: boolean;
    emailId?: string;
    error?: string;
  };
}

const COLOR_MAP: Record<AlertPriority, number> = {
  routine: 0x10b981, // Emerald Green
  high: 0xf59e0b,    // Amber / Warning
  critical: 0xef4444, // Red / Critical
};

/**
 * Formats an AlertPayload into a structured Discord webhook message.
 */
export function formatDiscordPayload(payload: AlertPayload): DiscordMessagePayload {
  const color = COLOR_MAP[payload.priority] || COLOR_MAP.routine;

  const fields: AlertField[] = [...(payload.fields || [])];

  if (payload.actionUrl) {
    const label = payload.actionLabel || 'View Details';
    fields.push({
      name: '🔗 Action Link',
      value: `[${label}](${payload.actionUrl})`,
      inline: false,
    });
  }

  const embed: DiscordEmbed = {
    title: payload.title,
    description: payload.message,
    color,
    fields: fields.length > 0 ? fields : undefined,
    timestamp: new Date().toISOString(),
    footer: {
      text: 'Kids Activity Calendar Ops',
    },
  };

  const discordPayload: DiscordMessagePayload = {
    embeds: [embed],
  };

  if (payload.priority === 'critical') {
    discordPayload.content = '@here 🚨 **Urgent Kids Calendar Alert**';
  }

  return discordPayload;
}

/**
 * Sends a notification to the configured Discord incoming webhook.
 */
export async function sendDiscordNotification(
  payload: AlertPayload,
  options: {
    webhookUrl?: string;
    fetchFn?: typeof fetch;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = options.webhookUrl ?? process.env.DISCORD_WEBHOOK_URL;
  const fetchFn = options.fetchFn ?? fetch;

  if (!webhookUrl || webhookUrl.trim() === '') {
    return {
      success: false,
      error: 'DISCORD_WEBHOOK_URL is not set',
    };
  }

  try {
    const discordBody = formatDiscordPayload(payload);
    const response = await fetchFn(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(discordBody),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        error: `Discord webhook failed with HTTP ${response.status}: ${errText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Sends a high-priority email alert using the Resend REST API.
 */
export async function sendEmailAlert(
  payload: AlertPayload,
  options: {
    apiKey?: string;
    to?: string;
    from?: string;
    fetchFn?: typeof fetch;
  } = {}
): Promise<{ success: boolean; skipped?: boolean; emailId?: string; error?: string }> {
  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const toRaw = options.to ?? process.env.ALERT_EMAIL_RECIPIENT;
  const from =
    options.from ??
    process.env.ALERT_EMAIL_FROM ??
    'Kids Calendar Alerts <onboarding@resend.dev>';
  const fetchFn = options.fetchFn ?? fetch;

  if (!apiKey || !toRaw) {
    return {
      success: false,
      skipped: true,
      error: 'RESEND_API_KEY or ALERT_EMAIL_RECIPIENT not configured',
    };
  }

  const recipients = toRaw
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    return {
      success: false,
      skipped: true,
      error: 'No valid recipient email addresses found',
    };
  }

  try {
    const prefix = payload.priority === 'critical' ? '[CRITICAL]' : '[HIGH PRIORITY]';
    const subject = `${prefix} ${payload.title}`;

    const fieldsHtml = (payload.fields || [])
      .map(
        (f) =>
          `<div style="margin-bottom: 8px;"><strong>${escapeHtml(f.name)}:</strong> ${escapeHtml(f.value)}</div>`
      )
      .join('');

    const actionHtml = payload.actionUrl
      ? `<div style="margin-top: 20px;">
           <a href="${payload.actionUrl}" style="background-color: #6366f1; color: white; padding: 10px 18px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
             ${escapeHtml(payload.actionLabel || 'View in Admin Panel')} &rarr;
           </a>
         </div>`
      : '';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="font-size: 13px; font-weight: bold; text-transform: uppercase; color: ${payload.priority === 'critical' ? '#ef4444' : '#f59e0b'}; margin-bottom: 8px;">
          Kids Activity Calendar Alert (${payload.priority.toUpperCase()})
        </div>
        <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">${escapeHtml(payload.title)}</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #334155;">${escapeHtml(payload.message)}</p>
        ${fieldsHtml ? `<div style="background-color: #f8fafc; padding: 14px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 16px; font-size: 14px;">${fieldsHtml}</div>` : ''}
        ${actionHtml}
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 28px; margin-bottom: 12px;" />
        <div style="font-size: 11px; color: #94a3b8;">
          Sent automatically by Kids Activity Calendar Monitoring Engine at ${new Date().toUTCString()}
        </div>
      </div>
    `;

    const response = await fetchFn('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: recipients,
        subject,
        html,
        text: `${payload.title}\n\n${payload.message}\n\n${(payload.fields || []).map((f) => `${f.name}: ${f.value}`).join('\n')}\n\n${payload.actionUrl || ''}`,
      }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      return {
        success: false,
        error: `Resend API error (${response.status}): ${JSON.stringify(errJson)}`,
      };
    }

    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      emailId: data?.id,
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
    };
  }
}

/**
 * Dispatches alerts according to priority:
 * - Routine -> Discord Only
 * - High / Critical -> Discord AND Email
 */
export async function dispatchAlert(
  payload: AlertPayload,
  options: {
    discordWebhookUrl?: string;
    resendApiKey?: string;
    emailRecipient?: string;
    emailFrom?: string;
    fetchFn?: typeof fetch;
  } = {}
): Promise<NotificationResult> {
  // 1. Always send to Discord
  const discordResult = await sendDiscordNotification(payload, {
    webhookUrl: options.discordWebhookUrl,
    fetchFn: options.fetchFn,
  });

  // 2. High & Critical alerts also send direct Email
  let emailResult: { success: boolean; skipped?: boolean; emailId?: string; error?: string } | undefined;

  if (payload.priority === 'high' || payload.priority === 'critical') {
    emailResult = await sendEmailAlert(payload, {
      apiKey: options.resendApiKey,
      to: options.emailRecipient,
      from: options.emailFrom,
      fetchFn: options.fetchFn,
    });
  } else {
    emailResult = {
      success: false,
      skipped: true,
      error: 'Routine priority alerts are delivered to Discord only',
    };
  }

  return {
    discord: discordResult,
    email: emailResult,
  };
}

/**
 * Formats a high-priority scraper failure alert.
 */
export function buildScraperFailureAlert(
  sourceHandle: string,
  error: string,
  consecutiveFailures = 1
): AlertPayload {
  const appUrl = (process.env.APP_URL || 'https://www.littledaysout.com').replace(/\/$/, '');

  return {
    title: `Scraper Failure: @${sourceHandle}`,
    message: `Instagram scraper failed for account @${sourceHandle}. Review channel or token credentials.`,
    priority: consecutiveFailures >= 2 ? 'critical' : 'high',
    sourceHandle,
    fields: [
      { name: 'Channel', value: `@${sourceHandle}`, inline: true },
      { name: 'Consecutive Failures', value: `${consecutiveFailures}`, inline: true },
      { name: 'Error Message', value: error.slice(0, 300), inline: false },
    ],
    actionUrl: `${appUrl}/admin#sources`,
    actionLabel: 'Check Sources in Admin',
  };
}

/**
 * Formats a high-priority parent feedback/complaint alert.
 */
export function buildParentComplaintAlert(
  event: { id: string; title: string; startDate: string },
  feedback: { type: string; reason?: string | null; comment?: string | null }
): AlertPayload {
  const appUrl = (process.env.APP_URL || 'https://www.littledaysout.com').replace(/\/$/, '');
  const reasonText = feedback.reason || 'inaccurate_details';

  return {
    title: `Parent Reported Issue: "${event.title.slice(0, 50)}"`,
    message: `A parent flagged this active event as inaccurate (${reasonText}). Please review or edit event details.`,
    priority: 'high',
    eventId: event.id,
    fields: [
      { name: 'Event Title', value: event.title, inline: false },
      { name: 'Event Date', value: event.startDate, inline: true },
      { name: 'Reason', value: reasonText, inline: true },
      ...(feedback.comment ? [{ name: 'Parent Comment', value: feedback.comment, inline: false }] : []),
    ],
    actionUrl: `${appUrl}/admin?eventId=${encodeURIComponent(event.id)}#events`,
    actionLabel: 'Review Event in Admin',
  };
}

/**
 * Formats the Thursday morning weekend briefing payload.
 */
export function buildWeeklyBriefingPayload(summary: {
  activeEventsCount: number;
  pendingReviewCount: number;
  averageAccuracy: number;
  helpfulnessRatio: number;
  pendingItems?: Array<{ title: string; date: string; location?: string | null }>;
}): AlertPayload {
  const appUrl = (process.env.APP_URL || 'https://www.littledaysout.com').replace(/\/$/, '');

  const fields: AlertField[] = [
    { name: 'Live Weekend Events', value: `${summary.activeEventsCount}`, inline: true },
    { name: 'Pending Review', value: `${summary.pendingReviewCount}`, inline: true },
    { name: 'Accuracy Score', value: `${summary.averageAccuracy}%`, inline: true },
  ];

  if (summary.pendingItems && summary.pendingItems.length > 0) {
    const list = summary.pendingItems
      .slice(0, 3)
      .map((item, idx) => `${idx + 1}. **${item.title}** (${item.date})`)
      .join('\n');
    fields.push({
      name: '⏳ Items Needing Your Approval',
      value: list,
      inline: false,
    });
  }

  return {
    title: '📅 Thursday Kids Calendar Briefing',
    message: `Ready for the weekend! ${summary.activeEventsCount} activities live, ${summary.pendingReviewCount} items awaiting your review.`,
    priority: 'routine',
    fields,
    actionUrl: `${appUrl}/admin#events`,
    actionLabel: 'Open Review Queue',
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
