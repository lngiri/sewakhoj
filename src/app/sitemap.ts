import { MetadataRoute } from 'next';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { services } from '@/data/services';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sewakhoj.com';
  const supabase = await createServerSupabaseClient();

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
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/post-task`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/diaspora`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Dynamic Service pages
  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${baseUrl}/services/${service.id}`,
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // City+Service landing pages (high SEO value)
  const topCities = ["kathmandu", "lalitpur", "bhaktapur", "pokhara", "biratnagar", "butwal", "chitwan", "birgunj"];
  const topServices = ["plumbing", "cleaning", "electrical", "moving", "tutoring", "cooking", "painting", "gardening", "tech-help", "driver", "caretaking", "pet-care"];
  
  const cityServiceRoutes: MetadataRoute.Sitemap = [];
  for (const city of topCities) {
    for (const svc of topServices) {
      cityServiceRoutes.push({
        url: `${baseUrl}/services/${svc}/${city}`,
        lastModified: new Date(),
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }

  // Blog pages
  const blogRoutes: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${baseUrl}/blog/plumber-kathmandu-cost`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/blog/home-cleaning-service-nepal`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/blog/electrician-near-me-kathmandu`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/blog/home-services-app-nepal`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/blog/emergency-plumber-nepal`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/blog/cleaning-services-price-nepal`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // Dynamic Tasker profiles
  const { data: taskers } = await supabase
    .from('taskers')
    .select('id, updated_at')
    .eq('status', 'active');

  const taskerRoutes: MetadataRoute.Sitemap = (taskers || []).map((tasker: any) => ({
    url: `${baseUrl}/tasker/${tasker.id}`,
    lastModified: new Date(tasker.updated_at || new Date()),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticRoutes, ...serviceRoutes, ...cityServiceRoutes, ...blogRoutes, ...taskerRoutes];
}
