import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Offline — ArxMint",
};

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="sovereign-card max-w-md w-full p-8 flex flex-col items-center gap-6">
        <Image
          src="/nav-logo.svg"
          alt="ArxMint"
          width={48}
          height={48}
          className="opacity-80"
        />

        <div>
          <h1 className="text-2xl font-bold text-sovereign-text mb-2">
            You&apos;re offline
          </h1>
          <p className="text-sovereign-muted text-sm leading-relaxed">
            ArxMint can&apos;t reach your node right now. Check that your node
            is running and your internet connection is active.
          </p>
        </div>

        <div className="w-full border border-border-default rounded-lg p-4 text-left text-sm text-sovereign-muted space-y-2">
          <p className="font-medium text-sovereign-text">Checklist:</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Is your ArxMint node powered on?</li>
            <li>Is your router / internet connection active?</li>
            <li>Did the Docker stack start correctly?</li>
            <li>
              Run{" "}
              <code className="bg-sovereign-panel px-1 rounded text-btc-orange text-xs">
                docker compose ps
              </code>{" "}
              to check service health.
            </li>
          </ul>
        </div>

        <Link
          href="/"
          className="sovereign-btn-outline text-sm px-6 py-2 rounded-lg"
        >
          Try again
        </Link>
      </div>
    </div>
  );
}
