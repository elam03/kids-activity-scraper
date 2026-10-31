import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatDiscordPayload,
  sendDiscordNotification,
  sendEmailAlert,
  dispatchAlert,
  buildScraperFailureAlert,
  buildParentComplaintAlert,
  type AlertPayload,
} from './notifications';

describe('Notifications - formatDiscordPayload', () => {
  test('formats routine briefing with green color and proper embed fields', () => {
    const payload: AlertPayload = {
      title: 'Thursday Weekend Briefing',
      message: '48 activities live for this weekend',
      priority: 'routine',
      fields: [
        { name: 'Live Events', value: '48', inline: true },
        { name: 'Pending Review', value: '3', inline: true },
      ],
      actionUrl: 'https://www.littledaysout.com/admin#events',
      actionLabel: 'Open Review Queue',
    };

    const discord = formatDiscordPayload(payload);

    assert.equal(discord.content, undefined); // No @here on routine
    assert.equal(discord.embeds.length, 1);
    const embed = discord.embeds[0];
    assert.equal(embed.title, 'Thursday Weekend Briefing');
    assert.equal(embed.description, '48 activities live for this weekend');
    assert.equal(embed.color, 0x10b981); // Emerald green
    assert.equal(embed.fields?.length, 3); // 2 fields + 1 action link field
    assert.match(embed.fields?.[2].value || '', /Open Review Queue/);
  });

  test('formats critical alert with red color and @here mention', () => {
    const payload: AlertPayload = {
      title: 'Scraper Pipeline Failure',
      message: 'Apify authentication token expired',
      priority: 'critical',
    };

    const discord = formatDiscordPayload(payload);

    assert.equal(discord.content, '@here 🚨 **Urgent Kids Calendar Alert**');
    assert.equal(discord.embeds[0].color, 0xef4444); // Red
  });

  test('formats high priority alert with amber color', () => {
    const payload: AlertPayload = {
      title: 'Parent Reported Inaccurate Event',
      message: 'Event was cancelled',
      priority: 'high',
    };

    const discord = formatDiscordPayload(payload);
    assert.equal(discord.embeds[0].color, 0xf59e0b); // Amber
  });
});

describe('Notifications - sendDiscordNotification', () => {
  test('returns error gracefully if webhookUrl is missing', async () => {
    const result = await sendDiscordNotification(
      { title: 'Test', message: 'Test message', priority: 'routine' },
      { webhookUrl: '' }
    );

    assert.equal(result.success, false);
    assert.match(result.error || '', /DISCORD_WEBHOOK_URL/i);
  });

  test('calls fetch with valid Discord embed body', async () => {
    let capturedUrl = '';
    let capturedBody: any = null;

    const mockFetch = (async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedBody = JSON.parse((init?.body as string) || '{}');
      return {
        ok: true,
        status: 204,
      } as Response;
    }) as typeof fetch;

    const result = await sendDiscordNotification(
      {
        title: 'Weekly Digest',
        message: 'Everything looks good',
        priority: 'routine',
      },
      {
        webhookUrl: 'https://discord.com/api/webhooks/123/abc',
        fetchFn: mockFetch,
      }
    );

    assert.equal(result.success, true);
    assert.equal(capturedUrl, 'https://discord.com/api/webhooks/123/abc');
    assert.equal(capturedBody?.embeds?.[0]?.title, 'Weekly Digest');
  });

  test('handles HTTP errors from Discord webhook', async () => {
    const mockFetch = (async () => {
      return {
        ok: false,
        status: 400,
        text: async () => 'Invalid Webhook Token',
      } as Response;
    }) as typeof fetch;

    const result = await sendDiscordNotification(
      { title: 'Test', message: 'Test', priority: 'routine' },
      {
        webhookUrl: 'https://discord.com/api/webhooks/invalid',
        fetchFn: mockFetch,
      }
    );

    assert.equal(result.success, false);
    assert.match(result.error || '', /400/);
  });
});

describe('Notifications - sendEmailAlert', () => {
  test('returns skipped when RESEND_API_KEY or recipient is not configured', async () => {
    const result = await sendEmailAlert(
      { title: 'Test', message: 'Test message', priority: 'high' },
      { apiKey: '', to: '' }
    );

    assert.equal(result.success, false);
    assert.equal(result.skipped, true);
  });

  test('sends email request to Resend API when configured', async () => {
    let capturedUrl = '';
    let capturedAuth = '';
    let capturedBody: any = null;

    const mockFetch = (async (url: string, init?: RequestInit) => {
      capturedUrl = url;
      capturedAuth = (init?.headers as Record<string, string>)?.[
        'Authorization'
      ] || '';
      capturedBody = JSON.parse((init?.body as string) || '{}');
      return {
        ok: true,
        status: 200,
        json: async () => ({ id: 'email-123' }),
      } as Response;
    }) as typeof fetch;

    const result = await sendEmailAlert(
      {
        title: 'Urgent: Scraper Failed',
        message: 'Instagram layout change suspected',
        priority: 'high',
        actionUrl: 'https://www.littledaysout.com/admin',
        actionLabel: 'Check Sources',
      },
      {
        apiKey: 're_12345',
        to: 'eric@example.com, megha@example.com',
        from: 'alerts@littledaysout.com',
        fetchFn: mockFetch,
      }
    );

    assert.equal(result.success, true);
    assert.equal(result.emailId, 'email-123');
    assert.equal(capturedUrl, 'https://api.resend.com/emails');
    assert.equal(capturedAuth, 'Bearer re_12345');
    assert.deepEqual(capturedBody?.to, ['eric@example.com', 'megha@example.com']);
    assert.match(capturedBody?.subject, /Urgent: Scraper Failed/);
    assert.match(capturedBody?.html, /Instagram layout change suspected/);
  });
});

describe('Notifications - dispatchAlert Routing Logic', () => {
  test('routes routine priority ONLY to Discord, skipping email', async () => {
    let discordCalled = false;
    let emailCalled = false;

    const mockFetch = (async (url: string) => {
      if (url.includes('discord')) discordCalled = true;
      if (url.includes('resend')) emailCalled = true;
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const result = await dispatchAlert(
      { title: 'Thursday Digest', message: 'All clear', priority: 'routine' },
      {
        discordWebhookUrl: 'https://discord.com/webhook',
        resendApiKey: 're_123',
        emailRecipient: 'eric@example.com',
        fetchFn: mockFetch,
      }
    );

    assert.equal(discordCalled, true);
    assert.equal(emailCalled, false);
    assert.equal(result.discord.success, true);
    assert.equal(result.email?.skipped, true);
  });

  test('routes high priority to BOTH Discord and Email', async () => {
    let discordCalled = false;
    let emailCalled = false;

    const mockFetch = (async (url: string) => {
      if (url.includes('discord')) discordCalled = true;
      if (url.includes('resend')) emailCalled = true;
      return { ok: true, status: 200, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const result = await dispatchAlert(
      { title: 'Scraper Down', message: 'Apify failure', priority: 'high' },
      {
        discordWebhookUrl: 'https://discord.com/webhook',
        resendApiKey: 're_123',
        emailRecipient: 'eric@example.com',
        fetchFn: mockFetch,
      }
    );

    assert.equal(discordCalled, true);
    assert.equal(emailCalled, true);
    assert.equal(result.discord.success, true);
    assert.equal(result.email?.success, true);
  });
});

describe('Notifications - Alert Builders', () => {
  test('buildScraperFailureAlert formats high priority alert on 1 failure and critical on 2 failures', () => {
    const alert1 = buildScraperFailureAlert('bayarea_kids', 'Rate limited by Instagram', 1);
    assert.equal(alert1.priority, 'high');
    assert.match(alert1.title, /Scraper Failure/);
    assert.match(alert1.message, /bayarea_kids/);
    assert.ok(alert1.fields?.some((f) => f.name === 'Consecutive Failures'));

    const alert2 = buildScraperFailureAlert('bayarea_kids', 'Auth failed', 2);
    assert.equal(alert2.priority, 'critical');
  });

  test('buildParentComplaintAlert formats high priority alert with event details', () => {
    const alert = buildParentComplaintAlert(
      { id: 'ev-1', title: 'Toddler Music in the Park', startDate: '2026-11-01' },
      { type: 'report_inaccurate', reason: 'cancelled', comment: 'Rain predicted, organizer posted cancellation' }
    );

    assert.equal(alert.priority, 'high');
    assert.match(alert.title, /Parent Reported/);
    assert.match(alert.message, /cancelled/i);
    assert.ok(alert.fields?.some((f) => f.name === 'Reason' && f.value.includes('cancelled')));
    assert.ok(alert.actionUrl?.includes('ev-1'));
  });
});
