import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interview Copilot Dashboard',
  description: 'Your AI-powered assistant for acing interviews.',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}
