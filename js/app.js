// Thesis Mastery: single-page app (hash router, views, practice flow).
(function () {
  "use strict";

  const api = window.TMSupabaseApi || window.TMDemoApi;
  const isDemo = api.mode === "demo";

  // ------------------------------------------------------------------ state
  const S = {
    session: null,
    profile: null,
    categories: [],
    questions: [],
    progress: new Map(),
    loaded: false,
  };

  // ------------------------------------------------------------------ helpers
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0; return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      }));
  const store = {
    get(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* ignore */ } },
    del(k) { try { localStorage.removeItem(k); } catch (_) { /* ignore */ } },
  };
  const session = {
    get(k, d = null) { try { const v = sessionStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) { /* ignore */ } },
  };

  const STATUS = {
    not_started:   { label: "Not Started",   cls: "bg-slate-100 text-slate-600 ring-slate-200",      dot: "bg-slate-400" },
    good_start:    { label: "Good Start",    cls: "bg-brand-50 text-brand-700 ring-brand-200",       dot: "bg-brand-400" },
    good_progress: { label: "Good Progress", cls: "bg-amber-50 text-amber-800 ring-amber-200",       dot: "bg-amber-500" },
    mastered:      { label: "Mastered",      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  };
  const STATUS_ORDER = ["not_started", "good_start", "good_progress", "mastered"];
  const VERDICT = {
    correct:           { label: "Correct",           cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", icon: "check" },
    partially_correct: { label: "Partially Correct", cls: "bg-amber-50 text-amber-800 ring-amber-200",       icon: "half" },
    incorrect:         { label: "Incorrect",         cls: "bg-red-50 text-red-700 ring-red-200",             icon: "x" },
  };

  const ICONS = {
    dashboard: "M3 12l9-8 9 8M5 10v10h5v-6h4v6h5V10",
    categories: "M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v6H4zM13 14h7v6h-7z",
    questions: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    practice: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
    progress: "M4 20V10M10 20V4M16 20v-7M22 20H2",
    history: "M12 8v4l3 2M3.05 11a9 9 0 11.5 4M3 4v5h5",
    profile: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0",
    admin: "M12 2l8 4v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6z",
    logout: "M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "M6 6l12 12M18 6L6 18",
    check: "M5 13l4 4L19 7",
    x: "M6 6l12 12M18 6L6 18",
    half: "M12 3a9 9 0 100 18V3z",
    search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
    left: "M15 18l-6-6 6-6",
    right: "M9 18l6-6-6-6",
    book: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM4 19.5A2.5 2.5 0 006.5 22H20v-5",
    sparkle: "M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z",
    upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
    download: "M12 4v12M7 11l5 5 5-5M4 20h16",
    plus: "M12 5v14M5 12h14",
    edit: "M4 20h4L19 9l-4-4L4 16zM14 6l4 4",
    trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  };
  const icon = (name, cls = "w-5 h-5") =>
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[name] || ""}"/></svg>`;

  const badge = (status) => {
    const s = STATUS[status] || STATUS.not_started;
    return `<span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${s.cls}"><span class="w-1.5 h-1.5 rounded-full ${s.dot}"></span>${s.label}</span>`;
  };
  const verdictBadge = (v, big = false) => {
    const s = VERDICT[v] || VERDICT.incorrect;
    return `<span class="inline-flex items-center gap-1.5 rounded-full ${big ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"} font-semibold ring-1 ${s.cls}">${icon(s.icon, big ? "w-5 h-5" : "w-3.5 h-3.5")}${s.label}</span>`;
  };
  const progressBar = (pct) => `<div class="progress-track"><div class="progress-fill" style="width:${Math.max(0, Math.min(100, pct))}%"></div></div>`;

  function fmtDate(iso, withTime = false) {
    if (!iso) return "Never";
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (!withTime) {
      if (diff < 60) return "Just now";
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
      if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} d ago`;
    }
    return d.toLocaleString("en-GB", withTime
      ? { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
      : { day: "numeric", month: "short", year: "numeric" });
  }
  const shorten = (t, n = 110) => (t.length > n ? t.slice(0, n - 1).trimEnd() + "…" : t);

  const prog = (qid) => S.progress.get(qid) || { question_id: qid, total_attempts: 0, correct_attempts: 0, status: "not_started", last_attempted_at: null };
  const catById = (id) => S.categories.find((c) => c.id === id) || { name: "Uncategorised" };
  const qById = (id) => S.questions.find((q) => q.id === id);

  // ------------------------------------------------------------------ toasts & modal
  function toast(message, type = "info", ms = 4200) {
    const colours = { info: "bg-slate-900 text-white", success: "bg-emerald-600 text-white", error: "bg-red-600 text-white", celebrate: "bg-brand-700 text-white" };
    const el = document.createElement("div");
    el.setAttribute("role", type === "error" ? "alert" : "status");
    el.className = `view-enter rounded-xl px-4 py-3 shadow-lg text-sm font-medium ${colours[type] || colours.info}`;
    el.textContent = message;
    $("#toasts").appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .3s"; setTimeout(() => el.remove(), 300); }, ms);
  }

  function openModal(title, bodyHtml, { wide = false } = {}) {
    const root = $("#modal-root");
    root.innerHTML = `
      <div class="fixed inset-0 z-40 bg-slate-900/50 flex items-start sm:items-center justify-center p-4 overflow-y-auto" data-modal-backdrop>
        <div class="view-enter bg-white rounded-2xl shadow-xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} my-8" role="dialog" aria-modal="true" aria-label="${esc(title)}">
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 class="text-lg font-semibold">${esc(title)}</h2>
            <button class="p-1.5 rounded-lg hover:bg-slate-100" data-modal-close aria-label="Close">${icon("close")}</button>
          </div>
          <div class="px-6 py-5">${bodyHtml}</div>
        </div>
      </div>`;
    const close = () => { root.innerHTML = ""; document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    $("[data-modal-close]", root).onclick = close;
    $("[data-modal-backdrop]", root).addEventListener("mousedown", (e) => { if (e.target.hasAttribute("data-modal-backdrop")) close(); });
    return { root, close };
  }

  const btn = (kind = "primary") => ({
    primary: "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 disabled:cursor-not-allowed",
    secondary: "inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60 disabled:cursor-not-allowed",
    ghost: "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60",
    danger: "inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60",
  }[kind]);
  const input = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200";
  const card = "bg-white rounded-2xl shadow-card ring-1 ring-slate-100";

  // ------------------------------------------------------------------ data
  async function loadData() {
    const [cats, qs, progress] = await Promise.all([api.listCategories(), api.listQuestions(), api.listProgress()]);
    S.categories = cats;
    S.questions = qs;
    S.progress = new Map(progress.map((p) => [p.question_id, p]));
    S.loaded = true;
  }
  async function refreshProgress() {
    const progress = await api.listProgress();
    S.progress = new Map(progress.map((p) => [p.question_id, p]));
  }

  function stats() {
    let attempted = 0, gs = 0, gp = 0, m = 0;
    S.questions.forEach((q) => {
      const p = prog(q.id);
      if (p.total_attempts > 0) attempted++;
      if (p.status === "good_start") gs++;
      else if (p.status === "good_progress") gp++;
      else if (p.status === "mastered") m++;
    });
    return { total: S.questions.length, attempted, gs, gp, m };
  }
  function categoryStats() {
    return S.categories.map((c) => {
      const qs = S.questions.filter((q) => q.category_id === c.id);
      const attempted = qs.filter((q) => prog(q.id).total_attempts > 0).length;
      const mastered = qs.filter((q) => prog(q.id).status === "mastered").length;
      return { ...c, total: qs.length, attempted, mastered, pct: qs.length ? (mastered / qs.length) * 100 : 0 };
    });
  }

  // ------------------------------------------------------------------ router
  const ROUTES = [
    { re: /^\/login$/, view: viewLogin, auth: false },
    { re: /^\/register$/, view: viewRegister, auth: false },
    { re: /^\/reset$/, view: viewReset, auth: false },
    { re: /^\/update-password$/, view: viewUpdatePassword, auth: true, bare: true },
    { re: /^\/dashboard$/, view: viewDashboard, auth: true, nav: "dashboard" },
    { re: /^\/categories$/, view: viewCategories, auth: true, nav: "categories" },
    { re: /^\/category\/(\d+)$/, view: viewCategory, auth: true, nav: "categories" },
    { re: /^\/questions$/, view: viewAllQuestions, auth: true, nav: "questions" },
    { re: /^\/practice$/, view: viewPracticeSetup, auth: true, nav: "practice" },
    { re: /^\/practice\/(\d+)$/, view: viewPractice, auth: true, nav: "practice" },
    { re: /^\/progress$/, view: viewProgress, auth: true, nav: "progress" },
    { re: /^\/history$/, view: viewHistory, auth: true, nav: "history" },
    { re: /^\/history\/(\d+)$/, view: viewHistoryDetail, auth: true, nav: "history" },
    { re: /^\/profile$/, view: viewProfile, auth: true, nav: "profile" },
    { re: /^\/admin$/, view: viewAdmin, auth: true, nav: "admin", admin: true },
  ];
  const go = (path) => { if (location.hash !== "#" + path) location.hash = path; else render(); };
  let renderToken = 0;

  async function render() {
    const token = ++renderToken;
    const path = (location.hash || "").replace(/^#/, "") || (S.session ? "/dashboard" : "/login");
    const route = ROUTES.find((r) => r.re.test(path));
    if (!route) return go(S.session ? "/dashboard" : "/login");
    if (route.auth && !S.session) return go("/login");
    if (route.auth === false && S.session) return go("/dashboard");
    if (route.admin && (!S.profile || S.profile.role !== "admin")) { toast("Administrator access only.", "error"); return go("/dashboard"); }

    const params = path.match(route.re).slice(1);
    $("#modal-root").innerHTML = "";
    if (route.auth && !route.bare) {
      if (!S.loaded) {
        try { await loadData(); } catch (e) { toast(e.message, "error"); }
      }
      ensureShell();
      setActiveNav(route.nav);
      closeDrawer();
      const main = $("#view");
      main.innerHTML = `<div class="flex items-center gap-3 text-slate-500 py-16 justify-center"><span class="spinner text-brand-600"></span> Loading…</div>`;
      try {
        await route.view(main, ...params, () => token === renderToken);
      } catch (e) {
        console.error(e);
        if (token === renderToken) main.innerHTML = errorBox(e.message);
      }
      if (token === renderToken) { main.classList.remove("view-enter"); void main.offsetWidth; main.classList.add("view-enter"); window.scrollTo(0, 0); }
    } else {
      $("#app").innerHTML = "";
      S.shell = false;
      await route.view($("#app"), ...params);
    }
  }
  const errorBox = (msg) => `<div class="${card} p-8 text-center"><p class="text-red-600 font-semibold">Something went wrong</p><p class="text-sm text-slate-500 mt-1">${esc(msg)}</p><button class="${btn("secondary")} mt-4" onclick="location.reload()">Reload</button></div>`;

  // ------------------------------------------------------------------ shell
  const NAV = [
    ["dashboard", "Dashboard", "/dashboard"],
    ["categories", "Categories", "/categories"],
    ["questions", "All Questions", "/questions"],
    ["practice", "Practice", "/practice"],
    ["progress", "Learning Progress", "/progress"],
    ["history", "Practice History", "/history"],
    ["profile", "Profile & Settings", "/profile"],
  ];
  function navHtml() {
    const items = NAV.slice();
    if (S.profile && S.profile.role === "admin") items.push(["admin", "Admin", "/admin"]);
    return items.map(([key, label, path]) =>
      `<a href="#${path}" data-nav="${key}" class="nav-link flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100">${icon(key, "w-5 h-5 text-slate-400")}${label}</a>`).join("") +
      `<button data-logout class="nav-link w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-red-50 hover:text-red-700">${icon("logout", "w-5 h-5 text-slate-400")}Logout</button>`;
  }
  function brandHtml() {
    return `<a href="#/dashboard" class="flex items-center gap-3 px-2">
      <img src="assets/logo.png" alt="" class="w-10 h-10 rounded-full ring-2 ring-brand-200" />
      <span class="text-lg font-extrabold tracking-tight text-brand-800">Thesis Mastery</span></a>`;
  }
  function ensureShell() {
    if (S.shell) { $("#nav-desktop").innerHTML = navHtml(); $("#nav-mobile").innerHTML = navHtml(); bindNav(); updateUserChip(); return; }
    $("#app").innerHTML = `
      <div class="lg:pl-72">
        <aside class="hidden lg:flex fixed inset-y-0 left-0 w-72 flex-col border-r border-slate-200 bg-white px-4 py-6">
          ${brandHtml()}
          <nav id="nav-desktop" class="mt-8 flex-1 space-y-1">${navHtml()}</nav>
          <div id="user-chip" class="mt-4"></div>
        </aside>
        <header class="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
          ${brandHtml()}
          <button id="drawer-open" class="p-2 rounded-lg hover:bg-slate-100" aria-label="Open menu">${icon("menu", "w-6 h-6")}</button>
        </header>
        <div id="drawer" class="lg:hidden fixed inset-0 z-40 hidden">
          <div class="absolute inset-0 bg-slate-900/40" id="drawer-backdrop"></div>
          <div class="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white px-4 py-6 shadow-xl flex flex-col">
            <div class="flex items-center justify-between">${brandHtml()}<button id="drawer-close" class="p-2 rounded-lg hover:bg-slate-100" aria-label="Close menu">${icon("close")}</button></div>
            <nav id="nav-mobile" class="mt-6 space-y-1 overflow-y-auto">${navHtml()}</nav>
          </div>
        </div>
        ${isDemo ? `<div class="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-900">Demo mode: data stays in this browser and answers are marked by a simple offline checker, not the AI. Add your Supabase keys in <code>js/config.js</code> to go live.</div>` : ""}
        <main id="view" class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8"></main>
      </div>`;
    S.shell = true;
    $("#drawer-open").onclick = () => $("#drawer").classList.remove("hidden");
    $("#drawer-close").onclick = closeDrawer;
    $("#drawer-backdrop").onclick = closeDrawer;
    bindNav();
    updateUserChip();
  }
  function closeDrawer() { const d = $("#drawer"); if (d) d.classList.add("hidden"); }
  function bindNav() { $$("[data-logout]").forEach((b) => (b.onclick = logout)); }
  function setActiveNav(key) { $$("[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === key)); }
  function updateUserChip() {
    const el = $("#user-chip");
    if (!el || !S.profile) return;
    const name = S.profile.full_name || S.profile.email;
    el.innerHTML = `<div class="flex items-center gap-3 rounded-xl bg-brand-50 px-3 py-3">
      <div class="w-9 h-9 rounded-full bg-brand-700 text-white grid place-items-center font-semibold">${esc((name || "?").charAt(0).toUpperCase())}</div>
      <div class="min-w-0"><p class="text-sm font-semibold truncate">${esc(name)}</p><p class="text-xs text-slate-500 truncate">${S.profile.role === "admin" ? "Administrator" : esc(S.profile.email)}</p></div></div>`;
  }
  async function logout() {
    await api.signOut();
    S.session = null; S.profile = null; S.loaded = false; S.shell = false;
    toast("You have been signed out.");
    go("/login");
  }

  // ------------------------------------------------------------------ auth views
  function authFrame(title, subtitle, body) {
    return `<div class="min-h-screen grid lg:grid-cols-2">
      <div class="hidden lg:flex flex-col justify-between p-12 text-white" style="background:radial-gradient(circle at 30% 20%,#8B5CF6 0%,#6D28D9 45%,#4C1D95 100%)">
        <div class="flex items-center gap-3"><img src="assets/logo.png" alt="" class="w-12 h-12 rounded-full ring-4 ring-white/20"/><span class="text-xl font-extrabold">Thesis Mastery</span></div>
        <div>
          <h2 class="text-4xl font-extrabold leading-tight">Walk into your defence ready.</h2>
          <p class="mt-4 text-brand-100 max-w-md">Practise every question, get feedback on what to say, how to say it and why, and track each question until you have mastered it.</p>
        </div>
        <div class="grid grid-cols-3 gap-3 text-sm">
          <div class="rounded-xl bg-white/10 p-4"><p class="font-bold">What to say</p><p class="text-brand-100 text-xs mt-1">The right facts and concepts</p></div>
          <div class="rounded-xl bg-white/10 p-4"><p class="font-bold">How to say it</p><p class="text-brand-100 text-xs mt-1">Tone, vocabulary, structure</p></div>
          <div class="rounded-xl bg-white/10 p-4"><p class="font-bold">Why</p><p class="text-brand-100 text-xs mt-1">What makes an answer strong</p></div>
        </div>
      </div>
      <div class="flex items-center justify-center p-6 sm:p-10">
        <div class="w-full max-w-md view-enter">
          <div class="lg:hidden flex flex-col items-center mb-6"><img src="assets/logo.png" alt="Thesis Mastery logo" class="w-20 h-20 rounded-full ring-4 ring-brand-100"/><p class="mt-3 text-xl font-extrabold text-brand-800">Thesis Mastery</p></div>
          <h1 class="text-2xl font-bold">${esc(title)}</h1>
          <p class="text-slate-500 mt-1 mb-6 text-sm">${subtitle}</p>
          ${isDemo ? `<div class="mb-5 rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-xs text-amber-900">Demo mode: accounts and progress are stored only in this browser. The first account you create is an administrator.</div>` : ""}
          ${body}
        </div>
      </div>
    </div>`;
  }
  const field = (label, name, type = "text", extra = "") =>
    `<label class="block"><span class="text-sm font-medium text-slate-700">${label}</span><input name="${name}" type="${type}" class="${input} mt-1.5" ${extra}/></label>`;
  const formError = `<p data-error class="hidden rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"></p>`;
  function showFormError(form, msg) { const el = $("[data-error]", form); el.textContent = msg; el.classList.remove("hidden"); }
  function busy(button, on, label) {
    if (on) { button.dataset.label = button.innerHTML; button.disabled = true; button.innerHTML = `<span class="spinner"></span> ${label || "Please wait…"}`; }
    else { button.disabled = false; if (button.dataset.label) button.innerHTML = button.dataset.label; }
  }

  function viewLogin(root) {
    root.innerHTML = authFrame("Welcome back", "Sign in to continue practising.", `
      <form class="space-y-4" novalidate>
        ${formError}
        ${field("Email", "email", "email", 'autocomplete="email" required')}
        ${field("Password", "password", "password", 'autocomplete="current-password" required')}
        <div class="flex justify-end"><a href="#/reset" class="text-sm font-medium text-brand-700 hover:underline">Forgot password?</a></div>
        <button class="${btn()} w-full" type="submit">Sign in</button>
        <p class="text-center text-sm text-slate-500">New here? <a href="#/register" class="font-semibold text-brand-700 hover:underline">Create an account</a></p>
      </form>`);
    const form = $("form", root);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = form.email.value.trim(), password = form.password.value;
      if (!email || !password) return showFormError(form, "Enter your email and password.");
      const b = $("button[type=submit]", form);
      busy(b, true, "Signing in…");
      try { await api.signIn(email, password); await afterSignIn(); }
      catch (err) { showFormError(form, err.message); busy(b, false); }
    };
  }

  function viewRegister(root) {
    root.innerHTML = authFrame("Create your account", "Your progress is saved to your account only.", `
      <form class="space-y-4" novalidate>
        ${formError}
        ${field("Full name", "name", "text", 'autocomplete="name" required')}
        ${field("Email", "email", "email", 'autocomplete="email" required')}
        ${field("Password", "password", "password", 'autocomplete="new-password" minlength="6" required')}
        ${field("Confirm password", "confirm", "password", 'autocomplete="new-password" required')}
        <button class="${btn()} w-full" type="submit">Create account</button>
        <p class="text-center text-sm text-slate-500">Already registered? <a href="#/login" class="font-semibold text-brand-700 hover:underline">Sign in</a></p>
      </form>`);
    const form = $("form", root);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const name = form.name.value.trim(), email = form.email.value.trim(), pw = form.password.value;
      if (!name || !email || !pw) return showFormError(form, "Fill in every field.");
      if (pw.length < 6) return showFormError(form, "Use a password of at least 6 characters.");
      if (pw !== form.confirm.value) return showFormError(form, "The passwords do not match.");
      const b = $("button[type=submit]", form);
      busy(b, true, "Creating account…");
      try {
        const res = await api.signUp(name, email, pw);
        if (res.needsConfirmation) {
          root.innerHTML = authFrame("Check your email", "", `<div class="${card} p-6 text-sm text-slate-600">We sent a confirmation link to <strong>${esc(email)}</strong>. Open it to activate your account, then sign in.<div class="mt-5"><a href="#/login" class="${btn()}">Back to sign in</a></div></div>`);
        } else { await afterSignIn(); }
      } catch (err) { showFormError(form, err.message); busy(b, false); }
    };
  }

  function viewReset(root) {
    root.innerHTML = authFrame("Reset your password", "We will email you a link to choose a new password.", `
      <form class="space-y-4" novalidate>
        ${formError}
        ${field("Email", "email", "email", 'autocomplete="email" required')}
        <button class="${btn()} w-full" type="submit">Send reset link</button>
        <p class="text-center text-sm"><a href="#/login" class="font-semibold text-brand-700 hover:underline">Back to sign in</a></p>
      </form>`);
    const form = $("form", root);
    form.onsubmit = async (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!email) return showFormError(form, "Enter your email.");
      const b = $("button[type=submit]", form);
      busy(b, true, "Sending…");
      try {
        await api.sendReset(email);
        root.innerHTML = authFrame("Check your email", "", `<div class="${card} p-6 text-sm text-slate-600">${isDemo ? "Demo mode cannot send email. Sign in and change your password under Profile &amp; Settings." : `If an account exists for <strong>${esc(email)}</strong>, a reset link is on its way.`}<div class="mt-5"><a href="#/login" class="${btn()}">Back to sign in</a></div></div>`);
      } catch (err) { showFormError(form, err.message); busy(b, false); }
    };
  }

  function viewUpdatePassword(root) {
    root.innerHTML = authFrame("Choose a new password", "Enter it twice to confirm.", `
      <form class="space-y-4" novalidate>
        ${formError}
        ${field("New password", "password", "password", 'autocomplete="new-password" minlength="6" required')}
        ${field("Confirm password", "confirm", "password", 'autocomplete="new-password" required')}
        <button class="${btn()} w-full" type="submit">Save password</button>
      </form>`);
    const form = $("form", root);
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (form.password.value.length < 6) return showFormError(form, "Use at least 6 characters.");
      if (form.password.value !== form.confirm.value) return showFormError(form, "The passwords do not match.");
      const b = $("button[type=submit]", form);
      busy(b, true, "Saving…");
      try { await api.updatePassword(form.password.value); toast("Password updated.", "success"); go("/dashboard"); }
      catch (err) { showFormError(form, err.message); busy(b, false); }
    };
  }

  async function afterSignIn() {
    S.session = await api.getSession();
    S.profile = await api.getProfile();
    S.loaded = false;
    go("/dashboard");
  }

  // ------------------------------------------------------------------ dashboard
  async function viewDashboard(main, alive) {
    const st = stats();
    const name = (S.profile && S.profile.full_name) ? S.profile.full_name.split(" ")[0] : "";
    main.innerHTML = `
      <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
        <div><h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight">${name ? `Welcome back, ${esc(name)}` : "Your dashboard"}</h1>
        <p class="text-slate-500 mt-1">Every correct answer moves a question closer to mastery.</p></div>
        <a href="#/practice" class="${btn()}">${icon("practice", "w-4 h-4")} Start practising</a>
      </div>
      <section class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        ${statCard("Total Questions", st.total, "questions", "text-brand-700 bg-brand-50")}
        ${statCard("Questions Attempted", st.attempted, "practice", "text-sky-700 bg-sky-50")}
        ${statCard("Good Start", st.gs, "sparkle", "text-brand-700 bg-brand-100")}
        ${statCard("Good Progress", st.gp, "progress", "text-amber-700 bg-amber-50")}
        ${statCard("Mastered", st.m, "check", "text-emerald-700 bg-emerald-50")}
      </section>
      <section class="mt-8">
        <div class="flex items-center justify-between mb-3"><h2 class="text-lg font-bold">Question categories</h2><a href="#/categories" class="text-sm font-semibold text-brand-700 hover:underline">View all</a></div>
        <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${categoryStats().map(categoryCard).join("") || emptyState("No categories yet.")}</div>
      </section>
      <section class="mt-8 grid xl:grid-cols-5 gap-6">
        <div class="xl:col-span-3"><h2 class="text-lg font-bold mb-3">Learning progress</h2><div id="dash-progress"></div></div>
        <div class="xl:col-span-2"><h2 class="text-lg font-bold mb-3">Quick Practice</h2><div id="dash-quick"></div></div>
      </section>
      <section class="mt-8"><h2 class="text-lg font-bold mb-3">Recent Learning Activity</h2><div id="dash-recent">${loadingRow()}</div></section>`;
    bindCategoryCards(main);
    renderProgressTabs($("#dash-progress", main), 6);
    renderQuickPractice($("#dash-quick", main));
    const recentRaw = await api.listAttempts({ limit: 40 });
    if (!alive()) return;
    const seen = new Set();
    const recent = recentRaw.filter((a) => !seen.has(a.question_id) && seen.add(a.question_id)).slice(0, 8);
    renderRecent($("#dash-recent", main), recent);
  }
  const loadingRow = () => `<div class="${card} p-6 text-sm text-slate-500"><span class="spinner text-brand-600"></span> Loading…</div>`;
  const emptyState = (msg, action = "") => `<div class="${card} p-8 text-center text-sm text-slate-500 col-span-full">${msg}${action ? `<div class="mt-4">${action}</div>` : ""}</div>`;
  const statCard = (label, value, ic, tone) => `
    <div class="${card} p-5">
      <div class="flex items-center justify-between"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${label}</p><span class="rounded-lg p-2 ${tone}">${icon(ic, "w-4 h-4")}</span></div>
      <p class="mt-3 text-3xl font-extrabold tracking-tight">${value}</p>
    </div>`;
  const categoryCard = (c) => `
    <button data-cat="${c.id}" class="${card} p-5 text-left hover:ring-brand-300 hover:shadow-lg transition group">
      <div class="flex items-start justify-between gap-3">
        <div><p class="font-bold text-slate-900 group-hover:text-brand-700">${esc(c.name)}</p>
        <p class="text-xs text-slate-500 mt-1 line-clamp-2">${esc(c.description || "")}</p></div>
        <span class="rounded-lg bg-brand-50 p-2 text-brand-700">${icon("categories", "w-4 h-4")}</span>
      </div>
      <dl class="mt-4 grid grid-cols-3 gap-2 text-center">
        <div class="rounded-lg bg-slate-50 py-2"><dt class="text-[11px] text-slate-500">Questions</dt><dd class="font-bold">${c.total}</dd></div>
        <div class="rounded-lg bg-slate-50 py-2"><dt class="text-[11px] text-slate-500">Attempted</dt><dd class="font-bold">${c.attempted}</dd></div>
        <div class="rounded-lg bg-emerald-50 py-2"><dt class="text-[11px] text-emerald-700">Mastered</dt><dd class="font-bold text-emerald-700">${c.mastered}/${c.total}</dd></div>
      </dl>
      <div class="mt-4"><div class="flex justify-between text-xs mb-1.5"><span class="text-slate-500">Mastery</span><span class="font-semibold text-brand-700">${c.pct.toFixed(1)}%</span></div>${progressBar(c.pct)}</div>
    </button>`;
  function bindCategoryCards(root) { $$("[data-cat]", root).forEach((b) => (b.onclick = () => go(`/category/${b.dataset.cat}`))); }

  function renderRecent(el, attempts) {
    const mastered = S.questions.map((q) => ({ q, p: prog(q.id) })).filter((x) => x.p.status === "mastered")
      .sort((a, b) => (b.p.last_attempted_at || "").localeCompare(a.p.last_attempted_at || "")).slice(0, 5);
    if (!attempts.length && !mastered.length) {
      el.innerHTML = emptyState("No practice yet. Your recent answers will appear here.", `<a class="${btn()}" href="#/practice">Practise your first question</a>`);
      return;
    }
    el.innerHTML = `<div class="grid lg:grid-cols-3 gap-4">
      <div class="${card} lg:col-span-2 divide-y divide-slate-100">
        <p class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Recently attempted</p>
        ${attempts.map((a) => { const q = qById(a.question_id); if (!q) return ""; return `
          <a href="#/practice/${q.id}" class="flex items-center gap-3 px-5 py-3 hover:bg-slate-50">
            <span class="shrink-0 w-11 text-xs font-bold text-brand-700">Q${q.number}</span>
            <span class="flex-1 min-w-0"><span class="block text-sm truncate">${esc(q.question_text)}</span>
              <span class="block text-xs text-slate-500">${esc(catById(q.category_id).name)} · ${fmtDate(a.created_at)}</span></span>
            <span class="hidden sm:flex items-center gap-2">${verdictBadge(a.verdict)}${badge(prog(q.id).status)}</span>
          </a>`; }).join("") || `<p class="px-5 py-4 text-sm text-slate-500">No attempts yet.</p>`}
      </div>
      <div class="${card} divide-y divide-slate-100">
        <p class="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Recently mastered</p>
        ${mastered.map(({ q, p }) => `<a href="#/practice/${q.id}" class="block px-5 py-3 hover:bg-slate-50"><span class="text-xs font-bold text-emerald-700">Q${q.number}</span> <span class="text-sm">${esc(shorten(q.question_text, 70))}</span><span class="block text-xs text-slate-500 mt-0.5">${p.correct_attempts} correct · ${fmtDate(p.last_attempted_at)}</span></a>`).join("") || `<p class="px-5 py-4 text-sm text-slate-500">Answer a question correctly 10 times to master it.</p>`}
      </div></div>`;
  }

  // Good Start / Good Progress / Mastered tabs (dashboard and Learning Progress page)
  function renderProgressTabs(el, limit = 0) {
    const tabs = ["good_start", "good_progress", "mastered"];
    let active = store.get("tm_progress_tab", "good_start");
    if (!tabs.includes(active)) active = "good_start";
    const draw = () => {
      const rows = S.questions.map((q) => ({ q, p: prog(q.id) })).filter((x) => x.p.status === active)
        .sort((a, b) => (b.p.last_attempted_at || "").localeCompare(a.p.last_attempted_at || ""));
      const shown = limit ? rows.slice(0, limit) : rows;
      el.innerHTML = `<div class="${card}">
        <div class="flex gap-1 p-2 border-b border-slate-100 overflow-x-auto" role="tablist">
          ${tabs.map((t) => { const n = S.questions.filter((q) => prog(q.id).status === t).length; return `<button role="tab" aria-selected="${t === active}" data-tab="${t}" class="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold ${t === active ? "bg-brand-700 text-white" : "text-slate-600 hover:bg-slate-100"}">${STATUS[t].label} <span class="ml-1 rounded-full px-1.5 text-xs ${t === active ? "bg-white/20" : "bg-slate-100"}">${n}</span></button>`; }).join("")}
        </div>
        <div class="divide-y divide-slate-100">
          ${shown.map(({ q, p }) => `
            <a href="#/practice/${q.id}" class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 px-5 py-3 hover:bg-slate-50">
              <span class="flex-1 min-w-0"><span class="text-xs font-bold text-brand-700 mr-1">Q${q.number}</span><span class="text-sm">${esc(shorten(q.question_text, 90))}</span>
              <span class="block text-xs text-slate-500">${esc(catById(q.category_id).name)}</span></span>
              <span class="flex items-center gap-3 text-xs text-slate-500"><span><strong class="text-slate-800">${p.correct_attempts}</strong> correct</span><span>${fmtDate(p.last_attempted_at)}</span>${badge(p.status)}</span>
            </a>`).join("") || `<p class="px-5 py-8 text-center text-sm text-slate-500">No questions in ${STATUS[active].label} yet.</p>`}
        </div>
        ${limit && rows.length > limit ? `<div class="px-5 py-3 border-t border-slate-100 text-right"><a href="#/progress" class="text-sm font-semibold text-brand-700 hover:underline">See all ${rows.length}</a></div>` : ""}
      </div>`;
      $$("[data-tab]", el).forEach((b) => (b.onclick = () => { active = b.dataset.tab; store.set("tm_progress_tab", active); draw(); }));
    };
    draw();
  }

  // Quick Practice: category -> pick questions -> start
  function renderQuickPractice(el, { full = false } = {}) {
    let catId = store.get("tm_quick_cat", "all");
    let selected = new Set();
    let term = "";
    const draw = () => {
      const pool = S.questions.filter((q) => (catId === "all" || q.category_id === Number(catId)) &&
        (!term || q.question_text.toLowerCase().includes(term) || String(q.number) === term));
      el.innerHTML = `<div class="${card} p-5 space-y-4">
        <div class="grid sm:grid-cols-2 gap-3">
          <label class="block"><span class="text-xs font-semibold text-slate-500">Category</span>
            <select data-qp-cat class="${input} mt-1"><option value="all">All categories</option>${S.categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(catId) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
          <label class="block"><span class="text-xs font-semibold text-slate-500">Find a question</span>
            <input data-qp-search class="${input} mt-1" placeholder="Number or words" value="${esc(term)}"/></label>
        </div>
        <div class="rounded-xl ring-1 ring-slate-100 ${full ? "max-h-[28rem]" : "max-h-64"} overflow-y-auto divide-y divide-slate-100">
          ${pool.map((q) => `<label class="flex items-start gap-3 px-3 py-2.5 hover:bg-slate-50 cursor-pointer">
            <input type="checkbox" data-qp-q="${q.id}" class="mt-1 rounded border-slate-300 text-brand-700 focus:ring-brand-400" ${selected.has(q.id) ? "checked" : ""}/>
            <span class="flex-1 text-sm"><span class="font-bold text-brand-700">Q${q.number}</span> ${esc(shorten(q.question_text, full ? 140 : 80))}</span>
            ${badge(prog(q.id).status)}</label>`).join("") || `<p class="px-3 py-6 text-center text-sm text-slate-500">No questions match.</p>`}
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <button data-qp-start class="${btn()}" ${selected.size ? "" : "disabled"}>${icon("practice", "w-4 h-4")} Start (${selected.size})</button>
          <button data-qp-random class="${btn("secondary")}" ${pool.length ? "" : "disabled"}>Random 5</button>
          <button data-qp-weak class="${btn("ghost")}" ${pool.length ? "" : "disabled"}>Least practised 5</button>
          ${selected.size ? `<button data-qp-clear class="${btn("ghost")}">Clear</button>` : ""}
        </div></div>`;
      $("[data-qp-cat]", el).onchange = (e) => { catId = e.target.value; store.set("tm_quick_cat", catId); draw(); };
      const search = $("[data-qp-search]", el);
      search.oninput = (e) => { term = e.target.value.trim().toLowerCase(); const pos = e.target.selectionStart; draw(); const s = $("[data-qp-search]", el); s.focus(); s.setSelectionRange(pos, pos); };
      $$("[data-qp-q]", el).forEach((cb) => (cb.onchange = () => { const id = Number(cb.dataset.qpQ); cb.checked ? selected.add(id) : selected.delete(id); draw(); }));
      $("[data-qp-start]", el).onclick = () => startSession([...selected]);
      $("[data-qp-random]", el).onclick = () => startSession(pool.slice().sort(() => Math.random() - 0.5).slice(0, 5).map((q) => q.id));
      $("[data-qp-weak]", el).onclick = () => startSession(pool.slice().sort((a, b) => prog(a.id).correct_attempts - prog(b.id).correct_attempts || prog(a.id).total_attempts - prog(b.id).total_attempts || a.number - b.number).slice(0, 5).map((q) => q.id));
      const clear = $("[data-qp-clear]", el); if (clear) clear.onclick = () => { selected = new Set(); draw(); };
    };
    draw();
  }
  function startSession(ids) {
    if (!ids.length) return;
    const ordered = ids.map(qById).filter(Boolean).sort((a, b) => a.number - b.number).map((q) => q.id);
    session.set("tm_queue", ordered);
    go(`/practice/${ordered[0]}`);
  }

  // ------------------------------------------------------------------ categories & question lists
  async function viewCategories(main) {
    main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Categories</h1>
      <p class="text-slate-500 mb-6">Mastery progress counts only questions you have answered correctly 10 times.</p>
      <div class="grid md:grid-cols-2 xl:grid-cols-3 gap-4">${categoryStats().map(categoryCard).join("") || emptyState("No categories yet.")}</div>`;
    bindCategoryCards(main);
  }

  async function viewCategory(main, id) {
    const c = S.categories.find((x) => x.id === Number(id));
    if (!c) { main.innerHTML = emptyState("That category does not exist.", `<a class="${btn()}" href="#/categories">Back to categories</a>`); return; }
    const cs = categoryStats().find((x) => x.id === c.id);
    main.innerHTML = `
      <a href="#/categories" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700 mb-3">${icon("left", "w-4 h-4")} Categories</a>
      <div class="${card} p-6 mb-6">
        <div class="flex flex-col md:flex-row md:items-center gap-4 justify-between">
          <div><h1 class="text-2xl font-extrabold">${esc(c.name)}</h1><p class="text-slate-500 text-sm mt-1">${esc(c.description || "")}</p></div>
          <div class="md:w-72"><div class="flex justify-between text-sm mb-1.5"><span class="text-slate-500">Mastered ${cs.mastered}/${cs.total}</span><span class="font-semibold text-brand-700">${cs.pct.toFixed(1)}%</span></div>${progressBar(cs.pct)}
          <p class="text-xs text-slate-500 mt-1.5">${cs.attempted} of ${cs.total} attempted</p></div>
        </div>
      </div>
      <div id="qlist"></div>`;
    renderQuestionList($("#qlist", main), S.questions.filter((q) => q.category_id === c.id), { key: "cat" + c.id });
  }

  async function viewAllQuestions(main) {
    main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">All Questions</h1>
      <p class="text-slate-500 mb-6">${S.questions.length} questions across ${S.categories.length} categories.</p><div id="qlist"></div>`;
    renderQuestionList($("#qlist", main), S.questions, { key: "all", showCategoryFilter: true });
  }

  function renderQuestionList(el, questions, { key, showCategoryFilter = false }) {
    const FILTERS = [["all", "All"], ["not_started", "Not Started"], ["good_start", "Good Start"], ["good_progress", "Good Progress"], ["mastered", "Mastered"], ["recent", "Attempted recently"]];
    const st = Object.assign({ filter: "all", term: "", cat: "all" }, session.get("tm_list_" + key, {}));
    let selected = new Set();
    const weekAgo = Date.now() - 7 * 86400000;
    const matches = (q) => {
      const p = prog(q.id);
      if (st.cat !== "all" && q.category_id !== Number(st.cat)) return false;
      if (st.filter === "recent") { if (!p.last_attempted_at || new Date(p.last_attempted_at).getTime() < weekAgo) return false; }
      else if (st.filter !== "all" && p.status !== st.filter) return false;
      if (st.term) {
        const t = st.term.toLowerCase();
        if (!(q.question_text.toLowerCase().includes(t) || String(q.number) === t.replace(/^q/, "") || (q.level || "").toLowerCase() === t)) return false;
      }
      return true;
    };
    const draw = () => {
      session.set("tm_list_" + key, st);
      const rows = questions.filter(matches);
      el.innerHTML = `
        <div class="${card} p-4 mb-4 space-y-3">
          <div class="flex flex-col sm:flex-row gap-3">
            <div class="relative flex-1"><span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${icon("search", "w-4 h-4")}</span>
              <input data-term class="${input} pl-9" placeholder="Search question text or number" value="${esc(st.term)}" aria-label="Search questions"/></div>
            ${showCategoryFilter ? `<select data-cat-filter class="${input} sm:w-56" aria-label="Category"><option value="all">All categories</option>${S.categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(st.cat) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select>` : ""}
          </div>
          <div class="flex flex-wrap gap-2">${FILTERS.map(([k, l]) => `<button data-filter="${k}" class="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${st.filter === k ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-600 ring-slate-200 hover:ring-brand-300"}">${l}</button>`).join("")}</div>
        </div>
        <div class="sticky top-[57px] lg:top-0 z-10 flex flex-wrap items-center justify-between gap-2 bg-slate-50/95 backdrop-blur py-2 mb-2">
          <label class="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" data-select-all class="rounded border-slate-300 text-brand-700 focus:ring-brand-400" ${rows.length && rows.every((q) => selected.has(q.id)) ? "checked" : ""}/> Select all shown (${rows.length})</label>
          <div class="flex gap-2">
            <button data-practise-selected class="${btn()}" ${selected.size ? "" : "disabled"}>${icon("practice", "w-4 h-4")} Practise selected (${selected.size})</button>
          </div>
        </div>
        <div class="space-y-3">
          ${rows.map((q) => { const p = prog(q.id); return `
            <div class="${card} p-4 sm:p-5 flex gap-3 sm:gap-4">
              <input type="checkbox" data-q="${q.id}" class="mt-1.5 rounded border-slate-300 text-brand-700 focus:ring-brand-400" ${selected.has(q.id) ? "checked" : ""} aria-label="Select question ${q.number}"/>
              <div class="flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2 mb-1.5">
                  <span class="text-sm font-extrabold text-brand-700">Q${q.number}</span>
                  ${q.level ? `<span class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">${esc(q.level)}</span>` : ""}
                  ${showCategoryFilter ? `<span class="text-xs text-slate-500">· ${esc(catById(q.category_id).name)}</span>` : ""}
                  <span class="ml-auto">${badge(p.status)}</span>
                </div>
                <p class="text-sm sm:text-[15px] text-slate-800">${esc(q.question_text)}</p>
                <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span><strong class="text-slate-800">${p.correct_attempts}</strong> correct</span>
                  <span><strong class="text-slate-800">${p.total_attempts}</strong> attempts</span>
                  <span>Last attempted: ${fmtDate(p.last_attempted_at)}</span>
                  <a href="#/practice/${q.id}" data-single="${q.id}" class="ml-auto font-semibold text-brand-700 hover:underline">Practise →</a>
                </div>
              </div>
            </div>`; }).join("") || emptyState("No questions match these filters.")}
        </div>`;
      const term = $("[data-term]", el);
      term.oninput = (e) => { st.term = e.target.value; const pos = e.target.selectionStart; draw(); const t = $("[data-term]", el); t.focus(); t.setSelectionRange(pos, pos); };
      const cf = $("[data-cat-filter]", el); if (cf) cf.onchange = (e) => { st.cat = e.target.value; draw(); };
      $$("[data-filter]", el).forEach((b) => (b.onclick = () => { st.filter = b.dataset.filter; draw(); }));
      $$("[data-q]", el).forEach((cb) => (cb.onchange = () => { const id = Number(cb.dataset.q); cb.checked ? selected.add(id) : selected.delete(id); draw(); }));
      $("[data-select-all]", el).onchange = (e) => { rows.forEach((q) => (e.target.checked ? selected.add(q.id) : selected.delete(q.id))); draw(); };
      $("[data-practise-selected]", el).onclick = () => startSession([...selected]);
      $$("[data-single]", el).forEach((a) => (a.onclick = (e) => { e.preventDefault(); session.set("tm_queue", rows.map((q) => q.id)); go(`/practice/${a.dataset.single}`); }));
    };
    draw();
  }

  // ------------------------------------------------------------------ practice
  async function viewPracticeSetup(main) {
    const queue = session.get("tm_queue", []).filter((id) => qById(id));
    main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Practice</h1>
      <p class="text-slate-500 mb-6">Choose one question or several. You will work through them one at a time.</p>
      ${queue.length ? `<div class="${card} p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><p class="font-semibold">Continue your last session</p><p class="text-sm text-slate-500">${queue.length} question${queue.length > 1 ? "s" : ""} queued</p></div><a class="${btn()}" href="#/practice/${queue[0]}">Continue</a></div>` : ""}
      <div id="qp"></div>`;
    renderQuickPractice($("#qp", main), { full: true });
  }

  const draftKey = (qid) => `tm_draft_${S.session && S.session.user ? S.session.user.id : "anon"}_${qid}`;

  async function viewPractice(main, id, alive) {
    const qid = Number(id);
    const q = qById(qid);
    if (!q) { main.innerHTML = emptyState("That question does not exist.", `<a class="${btn()}" href="#/practice">Choose a question</a>`); return; }
    const cat = catById(q.category_id);
    let queue = session.get("tm_queue", []).filter((x) => qById(x));
    if (!queue.includes(qid)) { queue = [qid]; session.set("tm_queue", queue); }
    const pos = queue.indexOf(qid);

    // Per-view state
    const sessionAttempts = [];         // attempts made on this screen, newest last
    let pending = null;                 // { text, id } for the answer being checked
    let checking = false;
    let mode = "answer";                // answer | feedback | teach

    main.innerHTML = `
      <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
        <a href="#/practice" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700">${icon("left", "w-4 h-4")} Practice</a>
        ${queue.length > 1 ? `<div class="flex items-center gap-2 text-sm">
          <button data-prev class="${btn("ghost")}" ${pos === 0 ? "disabled" : ""} aria-label="Previous question">${icon("left", "w-4 h-4")}</button>
          <span class="font-semibold text-slate-600">Question ${pos + 1} of ${queue.length}</span>
          <button data-next class="${btn("ghost")}" ${pos === queue.length - 1 ? "disabled" : ""} aria-label="Next question">${icon("right", "w-4 h-4")}</button></div>` : ""}
      </div>
      <div class="max-w-4xl mx-auto space-y-5">
        <section class="${card} p-6">
          <div class="flex flex-wrap items-center gap-2 text-sm">
            <span class="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">${esc(cat.name)}</span>
            <span class="font-extrabold text-brand-800">Question ${q.number}</span>
            ${q.level ? `<span class="text-xs font-semibold uppercase tracking-wide text-slate-400">${esc(q.level)}</span>` : ""}
            <span class="ml-auto" data-status-badge>${badge(prog(qid).status)}</span>
          </div>
          <h1 class="mt-4 text-xl sm:text-2xl font-bold leading-snug text-slate-900">${esc(q.question_text)}</h1>
          <p class="mt-3 text-xs text-slate-500" data-counts></p>
        </section>
        <section id="answer-area"></section>
        <section id="feedback-area" aria-live="polite"></section>
        <section id="compare-area"></section>
        <section id="history-area"></section>
      </div>`;

    const prev = $("[data-prev]", main), next = $("[data-next]", main);
    if (prev) prev.onclick = () => go(`/practice/${queue[pos - 1]}`);
    if (next) next.onclick = () => go(`/practice/${queue[pos + 1]}`);

    const updateCounts = () => {
      const p = prog(qid);
      $("[data-counts]", main).innerHTML = `<strong class="text-slate-700">${p.correct_attempts}</strong> correct of <strong class="text-slate-700">${p.total_attempts}</strong> attempt${p.total_attempts === 1 ? "" : "s"}${p.status !== "mastered" ? ` · ${p.correct_attempts < 5 ? 5 - p.correct_attempts + " more correct for Good Progress" : 10 - p.correct_attempts + " more correct to master"}` : " · Mastered"}`;
      $("[data-status-badge]", main).innerHTML = badge(p.status);
    };
    updateCounts();

    function drawAnswerBox(prefill = "") {
      mode = "answer";
      const draft = prefill || store.get(draftKey(qid), "");
      $("#answer-area", main).innerHTML = `
        <div class="${card} p-6">
          <label for="answer" class="block text-sm font-semibold text-slate-700 mb-2">Your answer</label>
          <textarea id="answer" class="answer-box ${input} text-[15px]" placeholder="Answer as you would in the defence room. Write as much as you need.">${esc(draft)}</textarea>
          <div class="mt-2 flex justify-between text-xs text-slate-400"><span data-saved></span><span data-wc></span></div>
          <div class="mt-4 flex flex-col sm:flex-row gap-3">
            <button data-check class="${btn()} sm:flex-1">${icon("check", "w-4 h-4")} Check My Response</button>
            <button data-teach class="${btn("secondary")} sm:flex-1">${icon("book", "w-4 h-4")} I Don't Know – Teach Me</button>
          </div>
        </div>`;
      const ta = $("#answer", main);
      const wc = () => { const n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0; $("[data-wc]", main).textContent = `${n} word${n === 1 ? "" : "s"}`; };
      wc();
      let t;
      ta.oninput = () => { wc(); clearTimeout(t); t = setTimeout(() => { store.set(draftKey(qid), ta.value); $("[data-saved]", main).textContent = "Draft saved"; }, 400); };
      ta.onkeydown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") check(); };
      $("[data-check]", main).onclick = check;
      $("[data-teach]", main).onclick = teach;
    }

    async function check() {
      if (checking) return;
      const ta = $("#answer", main);
      const text = ta.value.trim();
      if (!text) { toast("Write an answer first, or use Teach Me if you do not know it.", "error"); ta.focus(); return; }
      if (!pending || pending.text !== text) pending = { text, id: uuid() };
      checking = true;
      const b = $("[data-check]", main);
      busy(b, true, "Checking your answer…");
      $("[data-teach]", main).disabled = true;
      ta.readOnly = true;
      const before = prog(qid).status;
      try {
        const res = await api.evaluate(qid, text, pending.id);
        pending = null;
        store.del(draftKey(qid));
        await refreshProgress();
        if (!alive()) return;
        sessionAttempts.push(res);
        showFeedback(res);
        updateCounts();
        const after = res.attempt.status_after;
        if (STATUS_ORDER.indexOf(after) > STATUS_ORDER.indexOf(before)) {
          toast(after === "mastered" ? `Question ${q.number} mastered! 🎉` : `Question ${q.number} moved to ${STATUS[after].label}.`, "celebrate", 5000);
        }
        loadHistory();
      } catch (err) {
        if (!alive()) return;
        toast(err.message || "Could not check your answer.", "error", 6000);
        ta.readOnly = false;
        busy(b, false);
        $("[data-teach]", main).disabled = false;
      } finally {
        checking = false;
      }
    }

    function showFeedback(res) {
      mode = "feedback";
      const a = res.attempt;
      $("#answer-area", main).innerHTML = `
        <div class="${card} p-6">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-2"><p class="text-sm font-semibold text-slate-700">Your answer</p><span class="text-xs text-slate-400">${fmtDate(a.created_at, true)}</span></div>
          <div class="prose-answer rounded-xl bg-slate-50 p-4 text-[15px] text-slate-800">${esc(a.submitted_answer)}</div>
          <div class="mt-4 flex flex-col sm:flex-row gap-3">
            <button data-retry class="${btn()} sm:flex-1">Try Again</button>
            ${queue.length > 1 && pos < queue.length - 1 ? `<button data-next2 class="${btn("secondary")} sm:flex-1">Next question ${icon("right", "w-4 h-4")}</button>` : ""}
          </div>
        </div>`;
      $("#feedback-area", main).innerHTML = renderFeedback(a, res.reference);
      $("[data-retry]", main).onclick = () => {
        drawAnswerBox("");
        $("#feedback-area", main).innerHTML = `<details class="${card} p-5"><summary class="text-sm font-semibold text-brand-700">Show the feedback on your previous answer</summary><div class="mt-4">${renderFeedback(a, res.reference, { compact: true })}</div></details>`;
        $("#answer", main).focus();
        window.scrollTo({ top: $("#answer-area", main).offsetTop - 80, behavior: "smooth" });
      };
      const n2 = $("[data-next2]", main); if (n2) n2.onclick = () => go(`/practice/${queue[pos + 1]}`);
      drawCompare();
      $("#feedback-area", main).scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function drawCompare() {
      if (sessionAttempts.length < 2) { $("#compare-area", main).innerHTML = ""; return; }
      const [p, n] = sessionAttempts.slice(-2).map((r) => r.attempt);
      const col = (title, a) => `<div class="rounded-xl ring-1 ring-slate-100 p-4">
        <div class="flex items-center justify-between mb-2"><p class="text-xs font-semibold uppercase tracking-wide text-slate-500">${title}</p>${verdictBadge(a.verdict)}</div>
        <div class="prose-answer text-sm text-slate-700">${esc(a.submitted_answer)}</div>
        <p class="mt-3 text-xs text-slate-500">Accuracy ${a.accuracy_score ?? "–"} · Completeness ${a.completeness_score ?? "–"} · Communication ${a.communication_score ?? "–"}</p></div>`;
      $("#compare-area", main).innerHTML = `<div class="${card} p-6"><h2 class="font-bold mb-4">Compare your answers</h2><div class="grid md:grid-cols-2 gap-4">${col("Previous answer", p)}${col("New answer", n)}</div></div>`;
    }

    async function teach() {
      const b = $("[data-teach]", main);
      busy(b, true, "Preparing your lesson…");
      try {
        const res = await api.teach(qid);
        if (!alive()) return;
        mode = "teach";
        $("#feedback-area", main).innerHTML = renderLesson(res.lesson, res.reference);
        $("[data-practise-this]", main).onclick = () => {
          $("#feedback-area", main).innerHTML = `<details class="${card} p-5"><summary class="text-sm font-semibold text-brand-700">Show the lesson again</summary><div class="mt-4">${renderLesson(res.lesson, res.reference, { compact: true })}</div></details>`;
          const ta = $("#answer", main); ta.focus();
          window.scrollTo({ top: $("#answer-area", main).offsetTop - 80, behavior: "smooth" });
        };
        $("#feedback-area", main).scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (err) {
        toast(err.message || "Could not load the lesson.", "error", 6000);
      } finally {
        busy(b, false);
      }
    }

    async function loadHistory() {
      const el = $("#history-area", main);
      try {
        const attempts = await api.listAttempts({ questionId: qid, limit: 10 });
        if (!alive() || !attempts.length) { el.innerHTML = ""; return; }
        el.innerHTML = `<div class="${card} p-6"><h2 class="font-bold mb-3">Your attempts on this question</h2>
          <ol class="space-y-2">${attempts.map((a) => `<li><details class="rounded-xl ring-1 ring-slate-100">
            <summary class="flex flex-wrap items-center gap-2 px-4 py-3"><span class="text-sm text-slate-500">${fmtDate(a.created_at, true)}</span>${verdictBadge(a.verdict)}<span class="ml-auto text-xs text-slate-500">${a.correct_count_after} correct / ${a.total_count_after} attempt${a.total_count_after === 1 ? "" : "s"}</span></summary>
            <div class="px-4 pb-4"><div class="prose-answer rounded-lg bg-slate-50 p-3 text-sm">${esc(a.submitted_answer)}</div>
            <p class="mt-2 text-sm text-slate-600">${esc((a.feedback && a.feedback.overall_assessment) || "")}</p>
            <a href="#/history/${a.id}" class="mt-2 inline-block text-sm font-semibold text-brand-700 hover:underline">Open full feedback</a></div></details></li>`).join("")}</ol></div>`;
      } catch (_) { el.innerHTML = ""; }
    }

    drawAnswerBox();
    loadHistory();
  }

  // Feedback in six sections
  const listItems = (arr, cls = "") => (arr && arr.length ? `<ul class="space-y-1.5 ${cls}">${arr.map((x) => `<li class="flex gap-2"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-60"></span><span>${esc(x)}</span></li>`).join("")}</ul>` : "");
  const chips = (arr) => (arr && arr.length ? `<div class="flex flex-wrap gap-2">${arr.map((x) => `<span class="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-brand-100">${esc(x)}</span>`).join("")}</div>` : "");
  const sectionBox = (n, title, body, tone = "") => `<div class="rounded-2xl ring-1 ring-slate-100 p-5 ${tone}"><h3 class="flex items-center gap-2 font-bold text-slate-900 mb-3"><span class="grid place-items-center w-6 h-6 rounded-full bg-brand-700 text-white text-xs">${n}</span>${title}</h3><div class="text-sm text-slate-700 space-y-3">${body}</div></div>`;
  const score = (label, v) => `<div><div class="flex justify-between text-xs mb-1"><span class="text-slate-500">${label}</span><span class="font-semibold">${v ?? "–"}${v != null ? "/100" : ""}</span></div>${progressBar(v || 0)}</div>`;
  const WRONG_LABEL = { incorrect: "Incorrect", missing: "Missing", misunderstanding: "Misunderstanding", structure: "Structure", wording_or_tone: "Wording or tone" };

  function renderFeedback(a, reference = {}, { compact = false } = {}) {
    const f = a.feedback || {};
    const v = a.verdict;
    const headTone = v === "correct" ? "from-emerald-50" : v === "partially_correct" ? "from-amber-50" : "from-red-50";
    const wrong = (f.where_you_went_wrong || []).map((w) => `<li class="flex gap-2"><span class="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 h-fit">${esc(WRONG_LABEL[w.type] || w.type)}</span><span>${esc(w.detail)}</span></li>`).join("");
    return `<div class="${compact ? "" : card + " p-6"} space-y-4">
      <div class="rounded-2xl bg-gradient-to-br ${headTone} to-white ring-1 ring-slate-100 p-5">
        <h3 class="flex items-center gap-2 font-bold text-slate-900 mb-3"><span class="grid place-items-center w-6 h-6 rounded-full bg-brand-700 text-white text-xs">1</span>Overall assessment</h3>
        <div class="flex flex-wrap items-center gap-3">${verdictBadge(v, true)}${v === "correct" ? `<span class="text-sm text-emerald-700 font-semibold">+1 correct answer</span>` : `<span class="text-sm text-slate-500">Not counted towards mastery</span>`}${f.demo ? `<span class="text-xs rounded-full bg-amber-100 text-amber-900 px-2 py-0.5">Demo checker, not AI</span>` : ""}</div>
        <p class="mt-3 text-sm text-slate-700">${esc(f.overall_assessment || "")}</p>
        <div class="mt-4 grid sm:grid-cols-3 gap-4">${score("Accuracy", a.accuracy_score)}${score("Completeness", a.completeness_score)}${score("Communication", a.communication_score)}</div>
      </div>
      ${sectionBox(2, "What you got right",
        (listItems(f.what_you_got_right, "text-emerald-800") || `<p class="text-slate-500">Nothing in this answer matched the expected answer yet.</p>`) +
        (f.effective_phrases && f.effective_phrases.length ? `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 pt-1">Effective words and phrases</p>${f.effective_phrases.map((p) => `<blockquote class="border-l-4 border-emerald-300 bg-emerald-50/60 rounded-r-lg px-3 py-2 italic">"${esc(p)}"</blockquote>`).join("")}` : ""))}
      ${sectionBox(3, "Where you went wrong",
        (wrong ? `<ul class="space-y-2">${wrong}</ul>` : `<p class="text-slate-500">No problems found.</p>`) +
        (f.missing_points && f.missing_points.length ? `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500 pt-1">Missing points</p>${listItems(f.missing_points, "text-red-800")}` : ""))}
      ${sectionBox(4, "How you should have answered",
        `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Expected answer</p>
         <div class="prose-answer rounded-xl bg-brand-50/60 ring-1 ring-brand-100 p-4 text-slate-800">${esc(reference.expected_answer || "")}</div>
         ${f.how_to_improve ? `<p>${esc(f.how_to_improve)}</p>` : ""}`)}
      ${sectionBox(5, "Recommended tone and vocabulary",
        `<p><span class="font-semibold">Tone:</span> ${esc(f.recommended_tone || reference.tone || "")}</p>
         ${f.key_vocabulary && f.key_vocabulary.length ? `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Key words and phrases</p>${chips(f.key_vocabulary)}` : ""}
         ${f.structure_tips && f.structure_tips.length ? `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">How to organise it</p><ol class="list-decimal pl-5 space-y-1">${f.structure_tips.map((s) => `<li>${esc(s)}</li>`).join("")}</ol>` : ""}
         ${reference.fallback_response ? `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">If you do not know</p><p class="italic text-slate-600">${esc(reference.fallback_response)}</p>` : ""}`)}
      ${sectionBox(6, "Learning explanation", `<p>${esc(f.learning_explanation || "")}</p>`)}
    </div>`;
  }

  function renderLesson(l, reference = {}, { compact = false } = {}) {
    return `<div class="${compact ? "" : card + " p-6"} space-y-4">
      ${compact ? "" : `<div class="flex items-center gap-2"><span class="rounded-lg bg-brand-100 p-2 text-brand-700">${icon("book")}</span><h2 class="text-lg font-bold">Let's learn this one</h2>${l.demo ? `<span class="text-xs rounded-full bg-amber-100 text-amber-900 px-2 py-0.5">Demo, not AI</span>` : ""}</div>
      <p class="text-sm text-slate-500">Viewing the answer does not count as an attempt.</p>`}
      ${sectionBox(1, "The expected answer", `<div class="prose-answer rounded-xl bg-brand-50/60 ring-1 ring-brand-100 p-4 text-slate-800">${esc(reference.expected_answer || "")}</div>`)}
      ${sectionBox(2, "In simple terms", `<p>${esc(l.simple_explanation || "")}</p>`)}
      ${sectionBox(3, "The key points", listItems(l.key_points))}
      ${sectionBox(4, "How to structure your answer", `<ol class="list-decimal pl-5 space-y-1">${(l.structure || []).map((s) => `<li>${esc(s)}</li>`).join("")}</ol>`)}
      ${sectionBox(5, "Tone and vocabulary", `<p><span class="font-semibold">Tone:</span> ${esc(l.recommended_tone || reference.tone || "")}</p>${chips(l.key_vocabulary)}`)}
      ${sectionBox(6, "How to say it", `<blockquote class="prose-answer border-l-4 border-brand-300 bg-brand-50/50 rounded-r-lg px-4 py-3 italic">${esc(l.example_delivery || "")}</blockquote>
        ${l.common_mistakes && l.common_mistakes.length ? `<p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Common mistakes</p>${listItems(l.common_mistakes, "text-red-800")}` : ""}`)}
      ${compact ? "" : `<div class="pt-2"><button data-practise-this class="${btn()} w-full sm:w-auto">${icon("practice", "w-4 h-4")} Practise This Question</button></div>`}
    </div>`;
  }

  // ------------------------------------------------------------------ learning progress
  async function viewProgress(main) {
    const st = stats();
    const pct = st.total ? (st.m / st.total) * 100 : 0;
    main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Learning Progress</h1>
      <p class="text-slate-500 mb-6">1–4 correct answers is a Good Start, 5–9 is Good Progress and 10 or more is Mastered.</p>
      <div class="${card} p-6 mb-6">
        <div class="flex justify-between text-sm mb-2"><span class="font-semibold">Overall mastery</span><span class="font-semibold text-brand-700">${st.m}/${st.total} · ${pct.toFixed(1)}%</span></div>${progressBar(pct)}
        <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          ${["not_started", "good_start", "good_progress", "mastered"].map((k) => { const n = k === "not_started" ? st.total - st.gs - st.gp - st.m : k === "good_start" ? st.gs : k === "good_progress" ? st.gp : st.m; return `<div class="rounded-xl ring-1 ${STATUS[k].cls} py-3"><p class="text-2xl font-extrabold">${n}</p><p class="text-xs font-semibold">${STATUS[k].label}</p></div>`; }).join("")}
        </div>
      </div>
      <div id="tabs"></div>`;
    renderProgressTabs($("#tabs", main));
  }

  // ------------------------------------------------------------------ history
  async function viewHistory(main, alive) {
    let offset = 0;
    const page = 20;
    let verdict = "all";
    const all = [];
    main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Practice History</h1>
      <p class="text-slate-500 mb-6">Every answer you submitted, with its feedback.</p>
      <div class="flex flex-wrap gap-2 mb-4">${[["all", "All"], ["correct", "Correct"], ["partially_correct", "Partially Correct"], ["incorrect", "Incorrect"]].map(([k, l]) => `<button data-v="${k}" class="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${k === "all" ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-600 ring-slate-200"}">${l}</button>`).join("")}</div>
      <div id="hist" class="${card} divide-y divide-slate-100"></div>
      <div class="mt-4 text-center"><button id="more" class="${btn("secondary")} hidden">Load more</button></div>`;
    const draw = () => {
      const rows = all.filter((a) => verdict === "all" || a.verdict === verdict);
      $("#hist", main).innerHTML = rows.map((a) => { const q = qById(a.question_id); return `
        <a href="#/history/${a.id}" class="flex flex-col sm:flex-row sm:items-center gap-2 px-5 py-4 hover:bg-slate-50">
          <div class="flex-1 min-w-0"><p class="text-sm"><span class="font-bold text-brand-700 mr-1">Q${q ? q.number : "?"}</span>${esc(q ? shorten(q.question_text, 100) : "Deleted question")}</p>
          <p class="text-xs text-slate-500 mt-0.5">${fmtDate(a.created_at, true)} · ${q ? esc(catById(q.category_id).name) : ""}</p></div>
          <div class="flex items-center gap-2">${verdictBadge(a.verdict)}<span class="text-xs text-slate-500">${a.correct_count_after}/${a.total_count_after}</span>${badge(a.status_after)}</div>
        </a>`; }).join("") || `<p class="px-5 py-10 text-center text-sm text-slate-500">No attempts to show.</p>`;
    };
    const loadMore = async () => {
      const b = $("#more", main);
      busy(b, true, "Loading…");
      const rows = await api.listAttempts({ limit: page, offset });
      if (!alive()) return;
      all.push(...rows); offset += rows.length;
      busy(b, false);
      b.classList.toggle("hidden", rows.length < page);
      draw();
    };
    $("#more", main).onclick = loadMore;
    $$("[data-v]", main).forEach((b) => (b.onclick = () => {
      verdict = b.dataset.v;
      $$("[data-v]", main).forEach((x) => (x.className = `rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${x.dataset.v === verdict ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-600 ring-slate-200"}`));
      draw();
    }));
    await loadMore();
  }

  async function viewHistoryDetail(main, id) {
    const res = await api.getAttempt(Number(id));
    if (!res) { main.innerHTML = emptyState("That attempt was not found.", `<a class="${btn()}" href="#/history">Back to history</a>`); return; }
    const a = res.attempt, q = qById(a.question_id);
    main.innerHTML = `<a href="#/history" class="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-700 mb-3">${icon("left", "w-4 h-4")} Practice History</a>
      <div class="max-w-4xl mx-auto space-y-5">
        <section class="${card} p-6">
          <div class="flex flex-wrap items-center gap-2 text-sm"><span class="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">${q ? esc(catById(q.category_id).name) : ""}</span>
          <span class="font-extrabold text-brand-800">Question ${q ? q.number : "?"}</span><span class="ml-auto text-xs text-slate-500">${fmtDate(a.created_at, true)}</span></div>
          <h1 class="mt-3 text-xl font-bold">${esc(q ? q.question_text : "Deleted question")}</h1>
          <p class="mt-2 text-xs text-slate-500">After this attempt: ${a.correct_count_after} correct of ${a.total_count_after} · ${badge(a.status_after)}</p>
        </section>
        <section class="${card} p-6"><p class="text-sm font-semibold text-slate-700 mb-2">Your answer</p><div class="prose-answer rounded-xl bg-slate-50 p-4 text-[15px]">${esc(a.submitted_answer)}</div>
          ${q ? `<a href="#/practice/${q.id}" class="${btn()} mt-4">Practise this question again</a>` : ""}</section>
        ${renderFeedback(a, res.reference)}
      </div>`;
  }

  // ------------------------------------------------------------------ profile
  async function viewProfile(main) {
    const st = stats();
    const p = S.profile || {};
    main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">Profile &amp; Settings</h1>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <form id="pf" class="${card} p-6 space-y-4">
            <h2 class="font-bold">Your details</h2>${formError}
            ${field("Full name", "name", "text", `value="${esc(p.full_name || "")}"`)}
            <label class="block"><span class="text-sm font-medium text-slate-700">Email</span><input class="${input} mt-1.5 bg-slate-50" value="${esc(p.email || "")}" disabled/></label>
            <p class="text-xs text-slate-500">Member since ${fmtDate(p.created_at)}${p.role === "admin" ? " · Administrator" : ""}</p>
            <button class="${btn()}" type="submit">Save changes</button>
          </form>
          <form id="pw" class="${card} p-6 space-y-4">
            <h2 class="font-bold">Change password</h2>${formError}
            ${field("New password", "password", "password", 'autocomplete="new-password"')}
            ${field("Confirm new password", "confirm", "password", 'autocomplete="new-password"')}
            <button class="${btn("secondary")}" type="submit">Update password</button>
          </form>
        </div>
        <div class="space-y-6">
          <div class="${card} p-6"><h2 class="font-bold mb-4">Your numbers</h2>
            <dl class="space-y-3 text-sm">
              <div class="flex justify-between"><dt class="text-slate-500">Questions attempted</dt><dd class="font-semibold">${st.attempted}/${st.total}</dd></div>
              <div class="flex justify-between"><dt class="text-slate-500">Good Start</dt><dd class="font-semibold">${st.gs}</dd></div>
              <div class="flex justify-between"><dt class="text-slate-500">Good Progress</dt><dd class="font-semibold">${st.gp}</dd></div>
              <div class="flex justify-between"><dt class="text-slate-500">Mastered</dt><dd class="font-semibold text-emerald-700">${st.m}</dd></div>
            </dl></div>
          <div class="${card} p-6"><button data-logout2 class="${btn("danger")} w-full">${icon("logout", "w-4 h-4")} Logout</button></div>
        </div>
      </div>`;
    const pf = $("#pf", main);
    pf.onsubmit = async (e) => {
      e.preventDefault();
      const b = $("button[type=submit]", pf); busy(b, true, "Saving…");
      try { await api.updateProfile({ full_name: pf.name.value.trim() }); S.profile = await api.getProfile(); updateUserChip(); toast("Profile saved.", "success"); }
      catch (err) { showFormError(pf, err.message); }
      busy(b, false);
    };
    const pw = $("#pw", main);
    pw.onsubmit = async (e) => {
      e.preventDefault();
      if (pw.password.value.length < 6) return showFormError(pw, "Use at least 6 characters.");
      if (pw.password.value !== pw.confirm.value) return showFormError(pw, "The passwords do not match.");
      const b = $("button[type=submit]", pw); busy(b, true, "Updating…");
      try { await api.updatePassword(pw.password.value); pw.reset(); $("[data-error]", pw).classList.add("hidden"); toast("Password updated.", "success"); }
      catch (err) { showFormError(pw, err.message); }
      busy(b, false);
    };
    $("[data-logout2]", main).onclick = logout;
  }

  // ------------------------------------------------------------------ admin
  async function viewAdmin(main, alive) {
    let tab = session.get("tm_admin_tab", "questions");
    let full = await api.listQuestionsFull();
    if (!alive()) return;
    const reload = async () => { full = await api.listQuestionsFull(); S.loaded = false; await loadData(); draw(); };

    const draw = () => {
      session.set("tm_admin_tab", tab);
      main.innerHTML = `<h1 class="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">Admin</h1>
        <p class="text-slate-500 mb-6">Manage the question bank. Ordinary users can only read it.</p>
        <div class="flex gap-1 mb-5 overflow-x-auto">${[["questions", "Questions"], ["categories", "Categories"], ["import", "Import & export"]].map(([k, l]) => `<button data-atab="${k}" class="whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${tab === k ? "bg-brand-700 text-white" : "bg-white ring-1 ring-slate-200 text-slate-600"}">${l}</button>`).join("")}</div>
        <div id="admin-body"></div>`;
      $$("[data-atab]", main).forEach((b) => (b.onclick = () => { tab = b.dataset.atab; draw(); }));
      const body = $("#admin-body", main);
      if (tab === "categories") drawCategories(body);
      else if (tab === "import") drawImport(body);
      else drawQuestions(body);
    };

    function drawCategories(body) {
      body.innerHTML = `<div class="${card} overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-slate-100"><h2 class="font-bold">Categories</h2><button data-add-cat class="${btn()}">${icon("plus", "w-4 h-4")} Add category</button></div>
        <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">Name</th><th class="px-5 py-3">Description</th><th class="px-5 py-3 text-right">Questions</th><th class="px-5 py-3"></th></tr></thead>
        <tbody class="divide-y divide-slate-100">${S.categories.map((c) => `<tr><td class="px-5 py-3 font-semibold">${esc(c.name)}</td><td class="px-5 py-3 text-slate-500">${esc(c.description || "")}</td><td class="px-5 py-3 text-right font-semibold">${full.filter((q) => q.category_id === c.id).length}</td><td class="px-5 py-3 text-right"><button data-edit-cat="${c.id}" class="${btn("ghost")}">${icon("edit", "w-4 h-4")} Edit</button></td></tr>`).join("")}</tbody></table></div></div>`;
      $("[data-add-cat]", body).onclick = () => categoryModal({});
      $$("[data-edit-cat]", body).forEach((b) => (b.onclick = () => categoryModal(S.categories.find((c) => c.id === Number(b.dataset.editCat)))));
    }

    function categoryModal(c) {
      const m = openModal(c.id ? "Edit category" : "Add category", `<form class="space-y-4">${formError}
        ${field("Name", "name", "text", `value="${esc(c.name || "")}" required`)}
        <label class="block"><span class="text-sm font-medium text-slate-700">Description</span><textarea name="description" rows="3" class="${input} mt-1.5">${esc(c.description || "")}</textarea></label>
        ${field("Sort order", "sort_order", "number", `value="${esc(c.sort_order ?? S.categories.length + 1)}"`)}
        <div class="flex justify-end gap-2"><button type="button" data-cancel class="${btn("ghost")}">Cancel</button><button class="${btn()}" type="submit">Save</button></div></form>`);
      const form = $("form", m.root);
      $("[data-cancel]", m.root).onclick = m.close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        if (!form.name.value.trim()) return showFormError(form, "Enter a name.");
        const b = $("button[type=submit]", form); busy(b, true, "Saving…");
        try { await api.saveCategory({ id: c.id, name: form.name.value.trim(), description: form.description.value.trim(), sort_order: form.sort_order.value }); m.close(); toast("Category saved.", "success"); await reload(); }
        catch (err) { showFormError(form, err.message); busy(b, false); }
      };
    }

    function drawQuestions(body) {
      const st = session.get("tm_admin_q", { term: "", cat: "all" });
      const rows = full.filter((q) => (st.cat === "all" || q.category_id === Number(st.cat)) &&
        (!st.term || q.question_text.toLowerCase().includes(st.term.toLowerCase()) || String(q.number) === st.term));
      body.innerHTML = `<div class="${card} overflow-hidden">
        <div class="flex flex-col md:flex-row md:items-center gap-3 justify-between px-5 py-4 border-b border-slate-100">
          <div class="flex flex-col sm:flex-row gap-2 flex-1"><input data-aterm class="${input} sm:max-w-xs" placeholder="Search" value="${esc(st.term)}"/>
          <select data-acat class="${input} sm:max-w-xs"><option value="all">All categories</option>${S.categories.map((c) => `<option value="${c.id}" ${String(c.id) === String(st.cat) ? "selected" : ""}>${esc(c.name)} (${full.filter((q) => q.category_id === c.id).length})</option>`).join("")}</select></div>
          <button data-add-q class="${btn()}">${icon("plus", "w-4 h-4")} Add question</button>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th class="px-5 py-3">#</th><th class="px-5 py-3">Question</th><th class="px-5 py-3 hidden md:table-cell">Category</th><th class="px-5 py-3"></th></tr></thead>
        <tbody class="divide-y divide-slate-100">${rows.map((q) => `<tr><td class="px-5 py-3 font-bold text-brand-700">${q.number}</td><td class="px-5 py-3">${esc(shorten(q.question_text, 120))}<span class="block text-xs text-slate-400">${esc(q.level || "")}</span></td><td class="px-5 py-3 hidden md:table-cell text-slate-500">${esc(catById(q.category_id).name)}</td>
          <td class="px-5 py-3 text-right whitespace-nowrap"><button data-edit-q="${q.id}" class="${btn("ghost")}" aria-label="Edit question ${q.number}">${icon("edit", "w-4 h-4")}</button><button data-del-q="${q.id}" class="${btn("ghost")} hover:text-red-700" aria-label="Delete question ${q.number}">${icon("trash", "w-4 h-4")}</button></td></tr>`).join("") || `<tr><td colspan="4" class="px-5 py-8 text-center text-slate-500">No questions match.</td></tr>`}</tbody></table></div></div>`;
      const t = $("[data-aterm]", body);
      t.oninput = (e) => { st.term = e.target.value.trim(); session.set("tm_admin_q", st); const p = e.target.selectionStart; drawQuestions(body); const n = $("[data-aterm]", body); n.focus(); n.setSelectionRange(p, p); };
      $("[data-acat]", body).onchange = (e) => { st.cat = e.target.value; session.set("tm_admin_q", st); drawQuestions(body); };
      $("[data-add-q]", body).onclick = () => questionModal({ number: Math.max(0, ...full.map((q) => q.number)) + 1, category_id: st.cat !== "all" ? Number(st.cat) : (S.categories[0] || {}).id });
      $$("[data-edit-q]", body).forEach((b) => (b.onclick = () => questionModal(full.find((q) => q.id === Number(b.dataset.editQ)))));
      $$("[data-del-q]", body).forEach((b) => (b.onclick = () => {
        const q = full.find((x) => x.id === Number(b.dataset.delQ));
        const m = openModal("Delete question", `<p class="text-sm text-slate-600">Delete question ${q.number}? This also removes every user's attempts and progress on it, and cannot be undone.</p>
          <div class="mt-5 flex justify-end gap-2"><button data-cancel class="${btn("ghost")}">Cancel</button><button data-confirm class="${btn("danger")}">Delete</button></div>`);
        $("[data-cancel]", m.root).onclick = m.close;
        $("[data-confirm]", m.root).onclick = async (e) => { busy(e.currentTarget, true, "Deleting…"); try { await api.deleteQuestion(q.id); m.close(); toast("Question deleted."); await reload(); } catch (err) { toast(err.message, "error"); m.close(); } };
      }));
    }

    function questionModal(q) {
      const ta = (label, name, rows, val, help = "") => `<label class="block"><span class="text-sm font-medium text-slate-700">${label}</span>${help ? `<span class="block text-xs text-slate-400">${help}</span>` : ""}<textarea name="${name}" rows="${rows}" class="${input} mt-1.5">${esc(val || "")}</textarea></label>`;
      const m = openModal(q.id ? `Edit question ${q.number}` : "Add question", `<form class="space-y-4">${formError}
        <div class="grid sm:grid-cols-3 gap-3">
          ${field("Number", "number", "number", `value="${esc(q.number || "")}" required`)}
          <label class="block"><span class="text-sm font-medium text-slate-700">Category</span><select name="category_id" class="${input} mt-1.5">${S.categories.map((c) => `<option value="${c.id}" ${c.id === q.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
          <label class="block"><span class="text-sm font-medium text-slate-700">Level</span><select name="level" class="${input} mt-1.5">${["", "Basic", "Intermediate", "Advanced"].map((l) => `<option ${l === (q.level || "") ? "selected" : ""}>${l}</option>`).join("")}</select></label>
        </div>
        ${ta("Question", "question_text", 3, q.question_text)}
        ${ta("Expected answer", "expected_answer", 7, q.expected_answer, "The authoritative answer the AI marks against.")}
        ${ta("Tone", "tone", 2, q.tone)}
        ${ta("If you do not know", "fallback_response", 2, q.fallback_response)}
        ${ta("Evaluation criteria (optional)", "evaluation_criteria", 2, q.evaluation_criteria, "Extra points the answer must cover.")}
        <div class="flex justify-end gap-2"><button type="button" data-cancel class="${btn("ghost")}">Cancel</button><button class="${btn()}" type="submit">Save question</button></div></form>`, { wide: true });
      const form = $("form", m.root);
      $("[data-cancel]", m.root).onclick = m.close;
      form.onsubmit = async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form).entries());
        if (!data.number || !data.question_text.trim() || !data.expected_answer.trim()) return showFormError(form, "Number, question and expected answer are required.");
        const b = $("button[type=submit]", form); busy(b, true, "Saving…");
        try { await api.saveQuestion({ ...data, id: q.id }); m.close(); toast("Question saved.", "success"); await reload(); }
        catch (err) { showFormError(form, err.message); busy(b, false); }
      };
    }

    function drawImport(body) {
      body.innerHTML = `<div class="grid lg:grid-cols-2 gap-6">
        <div class="${card} p-6 space-y-4">
          <h2 class="font-bold flex items-center gap-2">${icon("upload", "w-5 h-5 text-brand-700")} Bulk import</h2>
          <p class="text-sm text-slate-600">Upload a CSV or Excel file. Columns: <code>number</code>, <code>category</code> (name), <code>level</code>, <code>question_text</code>, <code>expected_answer</code>, <code>tone</code>, <code>fallback_response</code>, <code>evaluation_criteria</code>. Rows with an existing number update that question; new numbers are added. Missing numbers are assigned automatically.</p>
          <input type="file" id="imp-file" accept=".csv,.xlsx,.xls" class="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-4 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"/>
          <div id="imp-preview"></div>
        </div>
        <div class="${card} p-6 space-y-4">
          <h2 class="font-bold flex items-center gap-2">${icon("download", "w-5 h-5 text-brand-700")} Export</h2>
          <p class="text-sm text-slate-600">Download the whole question bank, including expected answers, in the same format the importer reads.</p>
          <button data-export class="${btn("secondary")}">${icon("download", "w-4 h-4")} Download CSV (${full.length} questions)</button>
        </div></div>`;
      $("[data-export]", body).onclick = () => {
        const rows = full.map((q) => ({ number: q.number, category: catById(q.category_id).name, level: q.level || "", question_text: q.question_text, expected_answer: q.expected_answer, tone: q.tone || "", fallback_response: q.fallback_response || "", evaluation_criteria: q.evaluation_criteria || "" }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "questions");
        XLSX.writeFile(wb, "thesis-mastery-questions.csv", { bookType: "csv" });
      };
      $("#imp-file", body).onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const prev = $("#imp-preview", body);
        try {
          if (!window.XLSX) throw new Error("The spreadsheet reader did not load. Check your connection and reload.");
          const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
          const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
          const { rows, errors } = parseImport(raw);
          prev.innerHTML = `<div class="rounded-xl ring-1 ring-slate-100 p-4 space-y-3">
            <p class="text-sm"><strong>${rows.length}</strong> valid row${rows.length === 1 ? "" : "s"}${errors.length ? `, <strong class="text-red-700">${errors.length}</strong> skipped` : ""}.</p>
            ${errors.length ? `<ul class="text-xs text-red-700 max-h-28 overflow-y-auto space-y-0.5">${errors.slice(0, 50).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
            <div class="max-h-60 overflow-auto"><table class="w-full text-xs"><thead class="text-left text-slate-500"><tr><th class="py-1 pr-2">#</th><th class="py-1 pr-2">Category</th><th class="py-1">Question</th></tr></thead>
            <tbody>${rows.slice(0, 15).map((r) => `<tr class="border-t border-slate-100"><td class="py-1 pr-2 font-semibold">${r.number}</td><td class="py-1 pr-2">${esc(catById(r.category_id).name)}</td><td class="py-1">${esc(shorten(r.question_text, 80))}</td></tr>`).join("")}</tbody></table>${rows.length > 15 ? `<p class="text-xs text-slate-400 mt-1">…and ${rows.length - 15} more</p>` : ""}</div>
            <button data-do-import class="${btn()}" ${rows.length ? "" : "disabled"}>Import ${rows.length} question${rows.length === 1 ? "" : "s"}</button></div>`;
          const go2 = $("[data-do-import]", prev);
          if (go2) go2.onclick = async () => {
            busy(go2, true, "Importing…");
            try { const n = await api.importQuestions(rows); toast(`Imported ${n} questions.`, "success"); await reload(); }
            catch (err) { toast(err.message, "error", 7000); busy(go2, false); }
          };
        } catch (err) { prev.innerHTML = `<p class="text-sm text-red-700">${esc(err.message)}</p>`; }
      };
    }

    function parseImport(raw) {
      const norm = (k) => String(k).trim().toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
      const alias = { question: "question_text", text: "question_text", answer: "expected_answer", expected: "expected_answer", category_name: "category", if_you_do_not_know: "fallback_response", fallback: "fallback_response", criteria: "evaluation_criteria", no: "number", q: "number" };
      const errors = [], rows = [];
      let nextNumber = Math.max(0, ...full.map((q) => q.number));
      const used = new Set();
      raw.forEach((r, i) => {
        const o = {};
        Object.entries(r).forEach(([k, v]) => { const key = alias[norm(k)] || norm(k); o[key] = typeof v === "string" ? v.trim() : v; });
        const line = `Row ${i + 2}`;
        if (!o.question_text) return errors.push(`${line}: missing question_text`);
        if (!o.expected_answer) return errors.push(`${line}: missing expected_answer`);
        let catId = o.category_id ? Number(o.category_id) : null;
        if (!catId && o.category) { const c = S.categories.find((x) => x.name.toLowerCase() === String(o.category).toLowerCase()); catId = c ? c.id : null; }
        if (!catId || !S.categories.some((c) => c.id === catId)) return errors.push(`${line}: unknown category "${o.category || o.category_id || ""}" (add it under Categories first)`);
        let number = Number(o.number);
        if (!number) number = ++nextNumber;
        if (used.has(number)) return errors.push(`${line}: number ${number} appears twice in the file`);
        used.add(number);
        rows.push({ number, category_id: catId, level: o.level || null, question_text: String(o.question_text), expected_answer: String(o.expected_answer),
          tone: o.tone ? String(o.tone) : null, fallback_response: o.fallback_response ? String(o.fallback_response) : null, evaluation_criteria: o.evaluation_criteria ? String(o.evaluation_criteria) : null });
      });
      return { rows, errors };
    }

    draw();
  }

  // ------------------------------------------------------------------ boot
  async function boot() {
    const started = Date.now();
    api.onAuthChange(async (event, sess) => {
      if (event === "PASSWORD_RECOVERY") { S.session = sess; S.profile = await api.getProfile().catch(() => null); go("/update-password"); return; }
      if (event === "SIGNED_OUT") { S.session = null; S.profile = null; S.loaded = false; S.shell = false; }
      if (event === "TOKEN_REFRESHED" && sess) S.session = sess;
    });
    try {
      S.session = await api.getSession();
      if (S.session) S.profile = await api.getProfile();
    } catch (e) {
      console.error(e);
      toast(e.message || "Could not start the app.", "error", 8000);
    }
    window.addEventListener("hashchange", render);
    await render();
    const wait = Math.max(0, 900 - (Date.now() - started));
    setTimeout(() => { const l = $("#loader"); l.classList.add("hidden-loader"); setTimeout(() => l.remove(), 600); }, wait);
  }

  boot();
})();
