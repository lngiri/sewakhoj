import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tasker Platform | SewaKhoj',
  description: 'Join SewaKhoj as a Tasker, track your application, and manage your professional services.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
