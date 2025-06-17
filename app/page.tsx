export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white p-6">
      <div className="text-center max-w-xl">
        <h1 className="text-5xl font-bold mb-4 text-[--fuchsia-electric] drop-shadow">
          Welcome to KevsSMS
        </h1>
        <p className="text-gray-700 text-lg mb-8">
          Send bulk messages, manage users, and track delivery — all from one
          beautiful dashboard.
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="inline-block px-6 py-3 bg-fuchsia-600 text-white rounded-lg shadow hover:opacity-90 transition"
          >
            Login
          </a>
          <a
            href="/register"
            className="inline-block px-6 py-3 bg-fuchsia-400 text-white rounded-lg shadow hover:opacity-90 transition"
          >
            Register
          </a>
        </div>
      </div>
    </main>
  );
}
