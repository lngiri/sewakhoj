import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale = 'en' }: { locale?: string }) => ({
  locale,
  messages: (await import(`../messages/${locale}.json`).catch(() => ({ default: {} }))).default,
}));
