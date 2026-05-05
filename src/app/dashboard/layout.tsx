import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | SewaKhoj',
  description: 'Manage your tasks, bookings, profile, and earnings securely on SewaKhoj.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
