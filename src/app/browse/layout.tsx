import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Browse Taskers | SewaKhoj',
  description: 'Find and book the best local professionals, cleaners, plumbers, and more in Nepal.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
