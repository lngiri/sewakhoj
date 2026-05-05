import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Forgot Password | SewaKhoj',
  description: 'Reset your SewaKhoj account password securely.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
