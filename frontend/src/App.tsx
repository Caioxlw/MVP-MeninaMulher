import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Database, 
  Cpu, 
  RefreshCw, 
  AlertCircle, 
  ExternalLink, 
  Terminal, 
  Layers,
  HeartHandshake
} from 'lucide-react';


interface HealthData {
  status: 'healthy' | 'degraded';
  uptime?: number;
  timestamp: string;
  services: {
    api: {
      status: 'up' | 'down';
      port: number;
    };
    database: {
      status: 'connected' | 'disconnected';
      provider: string;
      latencyMs: number | null;
      error: string | null;
    };
  };
}

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const checkHealth = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/health');
      if (!response.ok && response.status !== 503) {
        throw new Error(`Falha HTTP ${response.status}: ${response.statusText}`);
      }
      const data: HealthData = await response.json();
      setHealth(data);
    } catch (err: any) {
      setFetchError(err.message || 'Não foi possível conectar ao servidor Express.');
      setHealth(null);
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const isApiOnline = !fetchError && health?.services.api.status === 'up';
  const isDbConnected = health?.services.database.status === 'connected';

  return (
    <div className="container">
      {/* Header com Branding */}
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <div style={{
            background: 'var(--brand-gradient)',
            padding: '0.6rem',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(236, 72, 153, 0.4)'
          }}>
            <HeartHandshake size={28} color="#ffffff" />
          </div>
          <span style={{ 
            fontSize: '1.25rem', 
            fontWeight: 700, 
            letterSpacing: '0.05em', 
            textTransform: 'uppercase',
            color: 'var(--brand-pink)' 
          }}>
            MVP Menina Mulher
          </span>
        </div>

        <h1 style={{ 
          fontSize: '2.75rem', 
          fontWeight: 800, 
          marginBottom: '0.75rem',
          background: 'linear-gradient(to right, #ffffff, #d1d5db)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Ambiente de Desenvolvimento Pronto
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', maxWidth: '640px', margin: '0 auto' }}>
          Estrutura full-stack integrada com <strong>Express.js</strong>, <strong>React</strong> e <strong>PostgreSQL</strong> via <strong>Prisma ORM</strong>.
        </p>
      </header>

      {/* Grid de Serviços */}
      <section style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f3f4f6' }}>
              Status dos Serviços
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Última verificação: {lastChecked.toLocaleTimeString()}
            </span>
          </div>
          <button 
            id="btn-refresh-health"
            onClick={checkHealth}
            disabled={loading}
            className="btn btn-secondary"
            style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          >
            <RefreshCw size={15} className={loading ? 'pulse-dot' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Verificando...' : 'Atualizar Status'}
          </button>
        </div>


        <div className="grid-cards">
          {/* Card Frontend */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.15)', 
                color: '#60a5fa', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <Cpu size={24} />
              </div>
              <span className="badge badge-success">
                <span className="pulse-dot"></span> Online
              </span>
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Frontend (React)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              Interface em execução via Vite na porta <strong>5173</strong> com suporte a TypeScript e HMR instantâneo.
            </p>
            <div className="code-box">
              <code>Vite v6 / React 19 / TS</code>
            </div>
          </div>

          {/* Card Backend API */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ 
                background: 'rgba(139, 92, 246, 0.15)', 
                color: '#a78bfa', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <Server size={24} />
              </div>
              {isApiOnline ? (
                <span className="badge badge-success">
                  <span className="pulse-dot"></span> Ativo
                </span>
              ) : (
                <span className="badge badge-error">
                  <span className="pulse-dot"></span> Inativo
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Backend (Express API)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              API REST em TypeScript rodando na porta <strong>{health?.services.api.port || 3001}</strong>.
            </p>
            <div className="code-box">
              <code>
                {isApiOnline ? `API Health: ${health?.status?.toUpperCase()}` : 'Backend desconectado'}
              </code>
            </div>
          </div>

          {/* Card PostgreSQL Database */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ 
                background: 'rgba(236, 72, 153, 0.15)', 
                color: '#f472b6', 
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)' 
              }}>
                <Database size={24} />
              </div>
              {isDbConnected ? (
                <span className="badge badge-success">
                  <span className="pulse-dot"></span> Conectado
                </span>
              ) : (
                <span className="badge badge-warning">
                  <span className="pulse-dot"></span> Pendente Config
                </span>
              )}
            </div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>Banco de Dados (PostgreSQL)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.2rem' }}>
              Gerenciado via <strong>Prisma ORM</strong>. 
              {isDbConnected 
                ? ` Latência: ${health?.services.database.latencyMs}ms` 
                : ' Serviço local detectado; requer credenciais válidas no .env'}
            </p>
            <div className="code-box">
              <code>
                {isDbConnected 
                  ? 'SELECT 1; OK (PostgreSQL 18)' 
                  : (health?.services.database.error ? 'Erro de autenticação no .env' : 'Aguardando validação')}
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* Instruções de Configuração e Ajustes do Banco */}
      {!isDbConnected && (
        <section className="glass-panel" style={{ 
          padding: '2rem', 
          marginBottom: '2.5rem', 
          borderColor: 'var(--warning-border)',
          background: 'rgba(30, 25, 18, 0.6)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <AlertCircle size={28} color="var(--warning)" style={{ flexShrink: 0, marginTop: '0.2rem' }} />
            <div>
              <h3 style={{ color: '#fbbf24', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                Configuração da Conexão com o PostgreSQL
              </h3>
              <p style={{ color: '#d1d5db', fontSize: '0.95rem', marginBottom: '1rem', lineHeight: '1.6' }}>
                O PostgreSQL 18 já está em execução na sua máquina. Para conectar a API ao banco, certifique-se de que a senha em <code>backend/.env</code> corresponde à definida na instalação:
              </p>
              <div className="code-box" style={{ marginBottom: '1rem' }}>
                DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/mvp_menina_mulher?schema=public"
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Após salvar o <code>.env</code> com sua senha, execute na raiz: <code style={{ color: '#f472b6' }}>npm run db:migrate</code> para criar o banco e as tabelas com o Prisma.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Guia de Comandos e Próximos Passos */}
      <section className="glass-panel" style={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Terminal size={22} color="var(--brand-pink)" />
          <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Comandos Rápidos do Projeto</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 600, color: '#f9fafb', marginBottom: '0.35rem' }}>Iniciar Ambos (Backend + Frontend)</div>
            <code style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>npm run dev</code>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 600, color: '#f9fafb', marginBottom: '0.35rem' }}>Executar Migrações do Prisma</div>
            <code style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>npm run db:migrate</code>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 600, color: '#f9fafb', marginBottom: '0.35rem' }}>Abrir Prisma Studio (Painel Visual)</div>
            <code style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>npm run db:studio</code>
          </div>

          <div style={{ padding: '1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ fontWeight: 600, color: '#f9fafb', marginBottom: '0.35rem' }}>Compilar TypeScript (Build)</div>
            <code style={{ color: '#6ee7b7', fontSize: '0.85rem' }}>npm run build</code>
          </div>
        </div>

        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a 
            href="/api/health" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary"
            id="link-api-health"
          >
            <ExternalLink size={16} /> Ver JSON de Health Check
          </a>
          <a 
            href="/api/info" 
            target="_blank" 
            rel="noreferrer"
            className="btn btn-secondary"
            id="link-api-info"
          >
            <Layers size={16} /> Ver Metadados da API
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: '3.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        <p>MVP Menina Mulher • Ambiente de Desenvolvimento configurado com sucesso</p>
      </footer>
    </div>
  );
};

export default App;
