export default async function DeveloperDashboard() {
  return (
    <div className="p-8">
      <div className="text-xs tracking-[3px] uppercase text-chimera-gold mb-2">Developer Portal</div>
      <h1 className="font-display text-4xl tracking-tight text-white mb-8">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="glass p-5 rounded-xl border border-chimera-border">
          <div className="text-sm text-chimera-text-muted mb-1">API Status</div>
          <div className="text-2xl font-semibold text-green-400">Operational</div>
        </div>
        <div className="glass p-5 rounded-xl border border-chimera-border">
          <div className="text-sm text-chimera-text-muted mb-1">Environment</div>
          <div className="text-2xl font-semibold text-white capitalize">
            {process.env.NODE_ENV}
          </div>
        </div>
        <div className="glass p-5 rounded-xl border border-chimera-border">
          <div className="text-sm text-chimera-text-muted mb-1">Portal</div>
          <div className="text-2xl font-semibold text-chimera-gold">Developer</div>
        </div>
      </div>

      <div className="glass p-6 rounded-xl border border-chimera-border">
        <h2 className="font-display text-xl tracking-tight text-white mb-4">Quick Links</h2>
        <ul className="space-y-2 text-chimera-text-secondary text-sm">
          <li>
            <a href="/api/health" className="text-chimera-gold hover:text-white transition" target="_blank">
              GET /api/health
            </a>
            {' '}— Health check endpoint
          </li>
          <li>
            <span className="text-chimera-text-muted">GET /api/auth/me</span>
            {' '}— Current session info
          </li>
        </ul>
      </div>
    </div>
  );
}
