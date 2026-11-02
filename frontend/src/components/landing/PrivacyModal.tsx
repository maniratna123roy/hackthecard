import { useEffect } from "react";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  isAccepted: boolean;
}

export function PrivacyModal({ isOpen, onClose, onAccept, isAccepted }: PrivacyModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto border-2 border-foreground bg-background p-6 shadow-[8px_8px_0_var(--foreground)] md:p-8">
        <div className="flex items-start justify-between border-b-2 border-foreground pb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-pop-red">Legal & Ethics</span>
            <h2 id="privacy-title" className="text-3xl font-bold tracking-tight">Privacy Policy</h2>
          </div>
          <button
            onClick={onClose}
            className="border-2 border-foreground bg-card px-3 py-1 font-bold transition-colors hover:bg-pop-red hover:text-white"
            aria-label="Close privacy modal"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            HackTheCard is built with transparency and user privacy as core principles. We do not track, profile, or monetize your personal information.
          </p>

          <div>
            <h3 className="text-base font-bold text-foreground">1. Data Collection & Usage</h3>
            <p className="mt-1">
              We only request publicly available information from the official GitHub REST API and contribution services (such as your public username, repositories, primary languages, star counts, and contribution graphs). We never request access to private repositories, email addresses, or account credentials.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">2. Ephemeral Storage</h3>
            <p className="mt-1">
              Data fetched from GitHub is held in temporary memory solely for caching (up to 10 minutes) to comply with GitHub rate limits and provide responsive card rendering. We do not maintain any persistent database of user accounts or generated cards.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">3. No Cookies or Trackers</h3>
            <p className="mt-1">
              We do not use tracking cookies, analytics pixels, or third-party advertising networks. Your card preferences and policy acceptance state are stored strictly on your local device.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">4. Generated Artwork Ownership</h3>
            <p className="mt-1">
              Any PNG card generated on this platform is rendered locally in your browser. You own your exported images and are free to distribute or print them without restriction.
            </p>
          </div>

          <div>
            <h3 className="text-base font-bold text-foreground">5. Third-Party Services</h3>
            <p className="mt-1">
              Public metrics are fetched directly from GitHub's public API. When viewing linked profiles or repositories, GitHub's own terms and privacy policy apply.
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t-2 border-foreground pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="border-2 border-foreground bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => {
              onAccept();
              onClose();
            }}
            className="brutal-btn px-6 py-2.5 text-sm font-semibold"
          >
            {isAccepted ? "Accepted ✓" : "Accept Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}
