import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center bg-white px-6">
      <div className="text-center">
        <p className="text-7xl font-extrabold tracking-tight text-forest-800">404</p>
        <h1 className="mt-4 text-xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-gray-500">
          The page you are looking for does not exist or is no longer active.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block rounded-full bg-forest-800 px-6 py-3 text-sm font-semibold text-white transition hover:bg-forest-900"
        >
          Go to MenuSheet home
        </Link>
      </div>
    </div>
  );
}
