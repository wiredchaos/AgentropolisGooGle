import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-8 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-foreground">
        Feature Showcase
      </h1>
      <p className="max-w-md text-muted-foreground">
        A shadcn-style component built with Radix UI, Tailwind CSS 4, and
        TypeScript. Click below to see the live demo.
      </p>
      <Link
        href="/feature-demo"
        className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        View Demo →
      </Link>
    </div>
  );
}
