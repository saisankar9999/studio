import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Link href="/dashboard" className="text-xl text-blue-500 hover:underline">
        Go to Interview Copilot Dashboard
      </Link>
    </div>
  );
}
