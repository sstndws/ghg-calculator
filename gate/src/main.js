import './styles.css';
import { supabase, supabaseConfigured } from './supabase.js';

const app = document.getElementById('app');

const LINKS = [
  {
    id: 'ghg',
    title: 'GHG Calculator',
    desc: 'Emisi GHG — Refinery, ETD, Traceability, Raw Data',
    url: import.meta.env.VITE_GHG_APP_URL || '/',
    label: 'Open application →',
  },
  {
    id: 'app2',
    title: import.meta.env.VITE_PORTAL_APP2_LABEL || 'Sustainability Dashboard',
    desc: 'Supplier due diligence, mill registry, and reporting',
    url: import.meta.env.VITE_PORTAL_APP2_URL || '#',
    label: 'Open application →',
  },
].filter((l) => l.url && l.url !== '#');

function brandLogoSvg() {
  return `
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M16 3L28 9.5V22.5L16 29L4 22.5V9.5L16 3Z" stroke="white" stroke-width="1.5" fill="none"/>
      <circle cx="16" cy="16" r="5.5" stroke="white" stroke-width="1.5" fill="none"/>
    </svg>
  `;
}

function brandBlock() {
  return `
    <div class="brand">
      <div class="brand-row">
        <div class="brand-logo">${brandLogoSvg()}</div>
        <div>
          <div class="brand-name">KPNCORP</div>
          <div class="brand-dept">Downstream — Sustainability</div>
        </div>
      </div>
      <p class="brand-tagline">Sustainable Supply. Responsible Refining.</p>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderLogin(errorMsg) {
  const configWarn = !supabaseConfigured
    ? `<div class="alert alert-warn">Supabase belum dikonfigurasi. Set <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di Vercel atau <code>.env.local</code>.</div>`
    : '';

  app.innerHTML = `
    <div class="page">
      <div class="auth-card">
        ${brandBlock()}
        <hr class="divider" />
        <h1 class="auth-title">Sign in</h1>
        <p class="auth-lead">Use your authorized account to access the sustainability portal.</p>
        ${configWarn}
        ${errorMsg ? `<div class="alert alert-error">${escapeHtml(errorMsg)}</div>` : ''}
        <form id="login-form">
          <div class="field">
            <label for="email">Email address</label>
            <input id="email" name="email" type="email" autocomplete="username" required placeholder="you@company.com" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" />
          </div>
          <button type="submit" class="btn btn-primary" id="btn-login" ${supabaseConfigured ? '' : 'disabled'}>Sign in</button>
        </form>
      </div>
    </div>
  `;

  document.getElementById('login-form')?.addEventListener('submit', onLogin);
}

function renderGate(user) {
  const cards = (LINKS.length ? LINKS : [{
    title: 'GHG Calculator',
    desc: 'Set VITE_GHG_APP_URL in environment variables',
    url: '#',
    label: 'URL not configured',
  }]).map((l) => `
    <a class="card-link" href="${escapeHtml(l.url)}" target="_blank" rel="noopener noreferrer">
      <h2>${escapeHtml(l.title)}</h2>
      <p>${escapeHtml(l.desc)}</p>
      <div class="go">${escapeHtml(l.label)}</div>
    </a>
  `).join('');

  app.innerHTML = `
    <div class="page">
      <div class="auth-card auth-card-wide">
        ${brandBlock()}
        <hr class="divider" />
        <div class="gate-header">
          <div>
            <h1 class="auth-title">Applications</h1>
            <p class="auth-lead" style="margin-bottom:0">Select an application to open.</p>
          </div>
          <div class="user-meta">
            <div class="user-email">${escapeHtml(user?.email)}</div>
            <button type="button" class="btn btn-ghost" id="btn-logout">Sign out</button>
          </div>
        </div>
        <div class="cards">${cards}</div>
        <p class="footer-note">Links open in a new tab</p>
      </div>
    </div>
  `;

  document.getElementById('btn-logout')?.addEventListener('click', onLogout);
}

async function onLogin(e) {
  e.preventDefault();
  if (!supabase) return;

  const btn = document.getElementById('btn-login');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    renderLogin(error.message);
    return;
  }

  renderGate(data.user);
}

async function onLogout() {
  if (!supabase) return;
  await supabase.auth.signOut();
  renderLogin();
}

async function init() {
  if (!supabaseConfigured) {
    renderLogin();
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    renderGate(session.user);
  } else {
    renderLogin();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) renderGate(session.user);
    else renderLogin();
  });
}

init();
