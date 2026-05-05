import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post a Task | SewaKhoj',
  description: 'Describe your service needs and get connected with reliable local taskers in Nepal.',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
