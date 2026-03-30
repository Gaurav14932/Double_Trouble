import { NextRequest, NextResponse } from 'next/server';
import {
  normalizeAppLanguage,
  processChatMessage,
} from '@/lib/chat-service';
import {
  buildTelegramHelpMessage,
  buildTelegramMissingQueryMessage,
  buildTelegramUnsupportedMessage,
  buildTelegramWelcomeMessage,
  formatTelegramReply,
  getTelegramConfig,
  getTelegramWebhookUrl,
  isTelegramWebhookAuthorized,
  parseTelegramInput,
  sendTelegramPhotoMessage,
  sendTelegramTextMessage,
  type TelegramUpdate,
} from '@/lib/telegram';
import { renderDefaultersChartPng, renderStatusChartPng } from '@/lib/telegram-charts';
import { getPropertyTaxSummary } from '@/lib/summary';

export const runtime = 'nodejs';

export async function GET() {
  const config = getTelegramConfig();

  return NextResponse.json({
    status: 'ok',
    configured: Boolean(config.token),
    webhookPath: '/api/telegram/webhook',
    webhookUrl: config.baseUrl ? getTelegramWebhookUrl(config.baseUrl) : null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const config = getTelegramConfig();

    if (!config.token) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Telegram bot token is not configured.',
        },
        { status: 503 }
      );
    }

    if (!isTelegramWebhookAuthorized(request, config.secretToken)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid Telegram webhook secret.',
        },
        { status: 401 }
      );
    }

    const update = (await request.json()) as TelegramUpdate;
    const incomingMessage = update.message ?? update.edited_message;

    if (!incomingMessage?.chat?.id) {
      return NextResponse.json({
        ok: true,
        ignored: true,
      });
    }

    if (!incomingMessage.text?.trim()) {
      await sendTelegramTextMessage(
        config.token,
        incomingMessage.chat.id,
        buildTelegramUnsupportedMessage()
      );

      return NextResponse.json({
        ok: true,
        ignored: true,
      });
    }

    const parsedInput = parseTelegramInput(incomingMessage.text);

    if (parsedInput.command === 'start') {
      await sendTelegramTextMessage(
        config.token,
        incomingMessage.chat.id,
        buildTelegramWelcomeMessage()
      );

      return NextResponse.json({ ok: true });
    }

    if (parsedInput.command === 'help') {
      await sendTelegramTextMessage(
        config.token,
        incomingMessage.chat.id,
        buildTelegramHelpMessage()
      );

      return NextResponse.json({ ok: true });
    }

    if (parsedInput.command === 'charts') {
      await sendTelegramTextMessage(
        config.token,
        incomingMessage.chat.id,
        'Generating charts...'
      );

      try {
        const summary = await getPropertyTaxSummary();
        const statusChart = await renderStatusChartPng(summary);
        const defaultersChart = await renderDefaultersChartPng(summary);

        await sendTelegramPhotoMessage(
          config.token,
          incomingMessage.chat.id,
          statusChart,
          'pie_chart.png',
          'Property Tax Status'
        );

        if (!defaultersChart) {
          await sendTelegramTextMessage(
            config.token,
            incomingMessage.chat.id,
            'No defaulters found to generate the bar chart.'
          );

          return NextResponse.json({ ok: true });
        }

        await sendTelegramPhotoMessage(
          config.token,
          incomingMessage.chat.id,
          defaultersChart,
          'bar_chart.png',
          'Top Defaulters'
        );

        return NextResponse.json({ ok: true });
      } catch (error) {
        console.error('[TelegramWebhook] /charts failed:', error);

        await sendTelegramTextMessage(
          config.token,
          incomingMessage.chat.id,
          'Failed to fetch data'
        );

        return NextResponse.json({ ok: true });
      }
    }

    if (!parsedInput.query) {
      await sendTelegramTextMessage(
        config.token,
        incomingMessage.chat.id,
        buildTelegramMissingQueryMessage(parsedInput.language)
      );

      return NextResponse.json({ ok: true });
    }

    const language = normalizeAppLanguage(
      parsedInput.language,
      parsedInput.query
    );
    const chatResult = await processChatMessage({
      message: parsedInput.query,
      language,
    });

    await sendTelegramTextMessage(
      config.token,
      incomingMessage.chat.id,
      formatTelegramReply(chatResult.payload)
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TelegramWebhook] Error:', error);

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
