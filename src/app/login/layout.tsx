import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | SewaKhoj',
  description: 'Sign in to your SewaKhoj account to book taskers or manage your jobs.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
