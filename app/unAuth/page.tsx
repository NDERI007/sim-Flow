// app/unauthorized/page.tsx
export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center text-center">
      <div>
        <h1 className="text-3xl font-bold mb-4">Unauthorized</h1>
        <p>You don't have permission to view this page.</p>
      </div>
    </main>
  );
}
