import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/booking/', '/private/'],
      },
      {
        userAgent: ['GPTBot', 'OAI-SearchBot', 'PerplexityBot'],
        allow: ['/', '/browse', '/tasker/'],
        disallow: ['/admin/', '/booking/', '/private/'],
      },
    ],
    sitemap: 'https://sewakhoj.com/sitemap.xml',
  };
}
