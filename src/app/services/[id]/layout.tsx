import { Metadata } from "next";
import { services } from "@/data/services";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const staticService = services.find((s) => s.id === id);

  if (staticService) {
    return {
      title: `${staticService.nameEn} Services in Nepal | SewaKhoj`,
      description: staticService.descriptionEn || `Book verified and trusted ${staticService.nameEn} professionals in Nepal today.`,
      openGraph: {
        title: `${staticService.nameEn} - Expert Services | SewaKhoj`,
        description: staticService.descriptionEn || `Book verified and trusted ${staticService.nameEn} professionals in Nepal.`,
        url: `https://sewakhoj.com/services/${id}`,
        type: 'website',
      }
    };
  }

  // Fallback if not found statically
  return {
    title: 'Service Not Found | SewaKhoj',
    description: 'The requested service could not be found.',
  };
}

export default function ServiceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
