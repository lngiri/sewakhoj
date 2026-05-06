import { MetadataRoute } from 'next';
import { supabase } from '@/lib/supabase';
import { services } from '@/data/services';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sewakhoj.com';

  // Base static routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/browse`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/post-task`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ];

  // Dynamic Service pages from the hardcoded services list
  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${baseUrl}/browse?service=${service.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  // Dynamic Tasker profiles from database
  // Fetch only active taskers to ensure we only index valid profiles
  const { data: taskers } = await supabase
    .from('taskers')
    .select('id, updated_at')
    .eq('status', 'active');

  const taskerRoutes: MetadataRoute.Sitemap = (taskers || []).map((tasker) => ({
    url: `${baseUrl}/tasker/${tasker.id}`,
    lastModified: new Date(tasker.updated_at || new Date()),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...serviceRoutes, ...taskerRoutes];
}
