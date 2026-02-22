/**
 * Full-page loading skeleton (no blank screen). Per rules 9.10.
 */
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="h-10 bg-surface-elevated rounded-xl animate-pulse w-2/3 mx-auto" />
        <div className="bg-surface/60 backdrop-blur-xl border border-border rounded-2xl p-6 space-y-4">
          <div className="h-12 bg-surface-elevated rounded-xl animate-pulse" />
          <div className="h-12 bg-surface-elevated rounded-xl animate-pulse" />
          <div className="h-12 bg-surface-elevated rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
