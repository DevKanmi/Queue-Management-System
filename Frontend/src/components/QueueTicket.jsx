/**
 * Large queue number display (student queue status). Used in Milestone 3.
 */
export default function QueueTicket({ queueNumber, label = 'Your queue number' }) {
  return (
    <div className="text-center py-6">
      <p className="text-sm text-text-muted uppercase tracking-wider mb-2">{label}</p>
      <p
        className="text-5xl sm:text-6xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"
        style={{ textShadow: '0 0 40px var(--primary-glow)' }}
      >
        {queueNumber}
      </p>
    </div>
  );
}
