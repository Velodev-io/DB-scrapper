interface Stats {
  total: number; done: number; uploading: number; queued: number; failed: number
}

export function StatusBar({ stats }: { stats: Stats }) {
  if (stats.total === 0) return null

  return (
    <div className="upload-status-bar" role="status">
      {stats.uploading > 0 && (
        <span className="status-badge uploading">↑ Uploading {stats.uploading}</span>
      )}
      {stats.queued > 0 && (
        <span className="status-badge queued">📶 {stats.queued} queued (no signal)</span>
      )}
      {stats.failed > 0 && (
        <span className="status-badge failed">⚠ {stats.failed} failed — tap to retry</span>
      )}
      <span className="status-badge total">{stats.done}/{stats.total} saved</span>
    </div>
  )
}
