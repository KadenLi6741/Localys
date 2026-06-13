import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
      <p className="text-display font-thin leading-none text-primary">404</p>
      <h1 className="mt-2 text-heading-sm font-bold">Page not found</h1>
      <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-[4px] bg-primary px-5 py-2.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Go home
      </Link>
    </div>
  );
}
