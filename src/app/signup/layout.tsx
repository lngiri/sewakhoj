import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign Up | SewaKhoj',
  description: 'Create a new SewaKhoj account to start booking services or becoming a tasker in Nepal.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
