import './styles.css';
import { supabase, supabaseConfigured } from './supabase.js';

const app = document.getElementById('app');

const REDIRECT_URL = (import.meta.env.VITE_GHG_APP_URL || '').trim();

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

function renderRedirecting() {
  app.innerHTML = `
    <div class="page">
      <div class="auth-card">
        ${brandBlock()}
        <hr class="divider" />
        <p class="auth-lead" style="margin-bottom:0;text-align:center">Redirecting…</p>
      </div>
    </div>
  `;
}

function goToApp() {
  if (!REDIRECT_URL) {
    renderLogin('VITE_GHG_APP_URL belum diset di environment variables.');
    return;
  }
  renderRedirecting();
  window.location.replace(REDIRECT_URL);
}

function renderLogin(errorMsg) {
  const configWarn = !supabaseConfigured
    ? `<div class="alert alert-warn">Supabase belum dikonfigurasi. Set <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code> di Vercel atau <code>.env.local</code>.</div>`
    : '';

  const redirectWarn = supabaseConfigured && !REDIRECT_URL
    ? `<div class="alert alert-warn">Set <code>VITE_GHG_APP_URL</code> di Vercel agar redirect setelah login berfungsi.</div>`
    : '';

  app.innerHTML = `
    <div class="page">
      <div class="auth-card">
        ${brandBlock()}
        <hr class="divider" />
        <h1 class="auth-title">Sign in</h1>
        <p class="auth-lead">Use your authorized account to access the sustainability portal.</p>
        ${configWarn}
        ${redirectWarn}
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

async function onLogin(e) {
  e.preventDefault();
  if (!supabase) return;

  const btn = document.getElementById('btn-login');
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  btn.disabled = true;
  btn.textContent = 'Signing in…';

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    renderLogin(error.message);
    return;
  }

  goToApp();
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  if (params.has('signout') && supabase) {
    await supabase.auth.signOut();
    window.history.replaceState({}, '', window.location.pathname);
    renderLogin();
    return;
  }

  if (!supabaseConfigured) {
    renderLogin();
    return;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    goToApp();
    return;
  }

  renderLogin();

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) goToApp();
    else renderLogin();
  });
}

init();
