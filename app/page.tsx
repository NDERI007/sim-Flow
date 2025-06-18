export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="max-w-xl text-center">
        <h1 className="mb-4 text-5xl font-semibold">Welcome to KevsSMS</h1>
        <p className="mb-8 text-lg text-gray-700">
          Send bulk messages, manage users, and track delivery — all from one
          beautiful dashboard.
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block rounded-lg bg-fuchsia-600 px-6 py-3 text-white shadow transition hover:opacity-90"
          >
            Login
          </a>
          <a
            href="/register"
            className="inline-block rounded-lg bg-fuchsia-400 px-6 py-3 text-white shadow transition hover:opacity-90"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
