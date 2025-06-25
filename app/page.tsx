import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-fuchsia-100 via-white to-fuchsia-50 p-6">
      <div className="animate-fade-in max-w-xl text-center">
        <h1 className="mb-4 text-6xl font-bold text-fuchsia-700 drop-shadow-md">
          You Good, Homie? 👊
        </h1>
        <p className="mb-8 text-xl text-gray-700">
          Slide in em Dms. Manage contacts. All in one Dashboard
        </p>
        <div className="space-x-4">
          <Link
            href="/login"
            className="inline-block rounded-lg bg-fuchsia-600 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:opacity-90"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="inline-block rounded-lg bg-fuchsia-400 px-6 py-3 text-white shadow-lg transition hover:scale-105 hover:opacity-90"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  );
}
