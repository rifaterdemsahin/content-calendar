/**
 * Content Engine - Universal Menu Search Component
 * Provides global Cmd+K / Ctrl+K / '/' shortcut, menu search trigger,
 * instant fuzzy search over sections, calendar videos, docs, and Key Vault secrets.
 */
(function () {
  'use strict';

  // Pre-indexed catalog of sections, videos, docs, and secrets
  const INDEX = [
    // Navigation & Main Sections
    { title: '🗓️ Calendar & Schedule', category: 'Section', desc: 'Weekly video schedule, shorts, long-form tutorials, and Skool lives', url: 'index.html#calendar', tags: ['schedule', 'planner', 'videos', 'weekly', 'december', 'january'] },
    { title: '🎥 Studio & Setups', category: 'Section', desc: 'Hardware, A-Roll desk, B-Roll angles, Sixth Form College setup', url: 'index.html#production', tags: ['camera', 'microphone', 'desk', 'hardware', 'recording'] },
    { title: '⛔ Blocked Days', category: 'Page', desc: 'Travel days, Thursday blocked travel, Wednesday recording, Sunday cohorts', url: 'blocked.html', tags: ['offline', 'travel', 'blocked', 'calendar', 'constraints'] },
    { title: '🎬 Latest Videos', category: 'Section', desc: 'Recent YouTube uploads, views, performance stats, and breakout videos', url: 'index.html#latest', tags: ['youtube', 'views', 'recent', 'videos', 'channel'] },
    { title: '📈 Past Stats & Analytics', category: 'Section', desc: 'Historical performance, watch time, subscriber velocity, and top videos', url: 'index.html#performance', tags: ['analytics', 'metrics', 'retention', 'watch time', 'history'] },
    { title: '🎯 OKRs & Objectives', category: 'Section', desc: 'Objectives and Key Results: 1,000 subscribers, 4,000 watch hours, Skool MRR', url: 'index.html#okrs', tags: ['okr', 'goals', 'targets', 'subscribers', 'watch hours', 'kpi'] },
    { title: '📊 Growth Projections', category: 'Section', desc: 'Modelled growth curves, weekly milestones, watch hour forecasts', url: 'index.html#projections', tags: ['forecast', 'numbers', 'growth', 'model', 'projection'] },
    { title: '💰 Monetization & Revenue', category: 'Section', desc: '5-tier monetization engine: YouTube YPP, Skool community ($49/mo), consulting', url: 'index.html#monetization', tags: ['money', 'revenue', 'pricing', 'skool', 'consulting', 'business'] },
    { title: '💡 Strategic Rationale', category: 'Section', desc: 'Content strategy, AI coding agent transformation, developer pilot positioning', url: 'index.html#rationale', tags: ['strategy', 'why', 'niche', 'pilot', 'positioning'] },
    { title: '🛡️ Reality Check & Sanity', category: 'Section', desc: '10.5 hours/week production cap, burn-out prevention, feasibility audit', url: 'index.html#sanity', tags: ['capacity', 'hours', 'budget', 'workload', 'limits'] },
    { title: '🔐 Azure Key Vault', category: 'Page', desc: 'Secret inventory, dp-kv-deliverypilot, managed identity, security runbook', url: 'key-vault.html', tags: ['key vault', 'secrets', 'azure', 'security', 'pat', 'tokens', 'keys'] },
    { title: '📋 Requirements Checklist', category: 'Page', desc: 'KV-1 to KV-12 requirements, inputs needed from owner, Claude guidance', url: 'requirements.html', tags: ['requirements', 'audit', 'inputs', 'p0', 'p1', 'verification'] },
    { title: '🧭 Expectations & Scope', category: 'Page', desc: 'What the assistant can and cannot do, delivery pilot operating boundaries', url: 'expectations.html', tags: ['scope', 'expectations', 'guarantees', 'capabilities'] },
    { title: '📅 Weekly Direction Report', category: 'Report', desc: 'This week: planned vs published, direction check, course correction. Refreshed weekly', url: 'week.html', tags: ['report', 'weekly', 'this week', 'direction', 'on track', 'plan', 'review'] },
    { title: '🚀 Channel Performance Report', category: 'Report', desc: 'Video views, views per day, winners and weak formats, recommended actions. Refreshed weekly', url: 'performance.html', tags: ['report', 'performance', 'stats', 'views', 'analytics', 'actions', 'youtube'] },
    { title: '✅ What Works / ⛔ What Doesn\'t', category: 'Report', desc: 'Two pillars: cost-saving dev tooling and data-backed career takes; stop mindset Shorts and narrow commentary', url: 'what-works.html', tags: ['what works', 'what does not work', 'pillars', 'strategy', 'diagram', 'formats', 'shorts', 'report'] },
    { title: '📖 My Story', category: 'Page', desc: 'Rifat Erdem Sahin: Turkish background, USA exchange student, two tries at university, 10 years in Cambridge UK, Mongolian DNA, Ottoman history, 40+ contracts in 8 countries, tutoring to real estate to DevOps, SRE and AI, self-learning, AI raising the skills bar', url: 'story.html', tags: ['story', 'about', 'bio', 'rifat', 'immigrant', 'self-learning', 'degree', 'turkey', 'usa', 'exchange student', 'britain', 'linkedin'] },
    { title: '💡 Inspiration', category: 'Page', desc: 'Lessons from Gary Stevenson (Garys Economics) and NetworkChuck mapped to your two pillars; side-by-side and experiments', url: 'inspiration.html', tags: ['inspiration', 'gary stevenson', 'garys economics', 'networkchuck', 'creators', 'style', 'format', 'ritual'] },
    { title: '🎨 Formats I Like', category: 'Page', desc: 'Single-line animation (La Linea style), animated co-host (Roger Rabbit style), comic strips, comedy sketches, episodic sci-fi series (Star Trek style), with original characters', url: 'formats.html', tags: ['formats', 'la linea', 'line', 'roger rabbit', 'comic', 'comedy', 'sketch', 'sci-fi', 'star trek', 'series', 'animation', 'co-host', 'remotion', 'flow', 'style'] },
    { title: '🌸 Ikigai', category: 'Page', desc: 'Love: AI and human intelligence, learning from high-tech videos, physics, RTS games, stand-up. Inspired by Elon Musk, Susan Boyle, Max Amini, Tony Robbins. Good at: projects. Paid: migration contracts. World needs: skilling up, courage to be a Delivery Pilot', url: 'ikigai.html', tags: ['ikigai', 'purpose', 'why', 'love', 'games', 'migrations', 'delivery pilot', 'skills', 'mission', 'elon musk', 'susan boyle', 'max amini', 'tony robbins', 'interstellar', 'physics', 'optimism'] },
    { title: '🧠 What I Care About', category: 'Page', desc: 'AI and human intelligence; maps of consciousness, Lacan, UML, enterprise patterns, space travel, real-time strategy games (Command & Conquer)', url: 'interests.html', tags: ['interests', 'care', 'ai', 'human intelligence', 'consciousness', 'lacan', 'uml', 'enterprise patterns', 'space', 'physics', 'interstellar', 'games', 'command and conquer', 'rts'] },
    { title: '🧑‍🏫 My Mentors', category: 'Page', desc: 'Linus Tech Tips, Ali Abdaal, İlker Canıkligil, Patrick Bet-David, Tony Robbins, David Hawkins, Eric Wroolie: what each teaches and how it shows on the channel', url: 'mentors.html', tags: ['mentors', 'linus', 'linus tech tips', 'ali abdaal', 'ilker canikligil', 'patrick bet-david', 'pbd', 'valuetainment', 'tony robbins', 'david hawkins', 'eric wroolie'] },
    { title: '📜 Research: AGI, Work & Meaning', category: 'Page', desc: "Erdem's research paper: AGI, what happens to the workforce, and how people find meaning; threads, channel videos and content plan", url: 'research.html', tags: ['research', 'paper', 'agi', 'workforce', 'jobs', 'meaning', 'purpose', 'future of work'] },
    { title: '💎 Value Check', category: 'Page', desc: 'Is there genuine value in every video? Five-question score, audience, proof and rationale per video; editable', url: 'value.html', tags: ['value', 'rationale', 'audience', 'score', 'videos', 'quality', 'why'] },

    // Calendar Content & Video Blueprints (direct item targeting with rationale)
    { title: 'Stop Writing Repetitive Python Scripts', category: 'Calendar', desc: 'Week 1 Mon Short: 45s speedrun. Rationale: Top-of-funnel friction remover demonstrating high-velocity agentic flow.', url: 'index.html#w1-item-1', tags: ['python', 'n8n', 'short', 'llm', 'speedrun', 'rationale'] },
    { title: 'Building an n8n AI Agent from Scratch', category: 'Calendar', desc: 'Week 1 Wed Long Video: 18m tutorial. Rationale: Technical authority anchor with downloadable workflow JSON for Skool conversion.', url: 'index.html#w1-item-2', tags: ['n8n', 'agent', 'long-form', 'workflow', 'json', 'rationale'] },
    { title: 'Live Workflow Debugging Clinic', category: 'Calendar', desc: 'Week 1 Sun 13:30 Skool Live. Rationale: Community activation & live workflow debugging to drive 30-day retention.', url: 'index.html#w1-item-3', tags: ['skool', 'live', 'clinic', 'debugging', 'members', 'rationale'] },
    { title: 'The 1 Mistake in n8n Loops', category: 'Calendar', desc: 'Week 1 Sat Short: Repurposed highlight. Rationale: 48-hr repurposing of rate-limit lesson; captures error search traffic.', url: 'index.html#w1-item-4', tags: ['n8n', 'loop', 'error', 'short', 'repurposed', 'rationale'] },
    { title: 'Are Software Engineers Obsolete?', category: 'Calendar', desc: 'Week 2 Mon Short. Rationale: Provocative identity shift from syntax writer to delivery pilot; sparks debate.', url: 'index.html#w2-item-1', tags: ['career', 'engineers', 'pilots', 'future', 'short', 'rationale'] },
    { title: 'Managing 5 AI Coding Agents Concurrently', category: 'Calendar', desc: 'Week 2 Wed Long Video: Claude Code + Cursor demo. Rationale: Proof of delivery pilot multi-agent orchestration.', url: 'index.html#w2-item-2', tags: ['claude code', 'cursor', 'orchestration', 'multi-agent', 'long-form', 'rationale'] },
    { title: '3 Terminal Tools Every Pilot Needs', category: 'Calendar', desc: 'Week 2 Fri Short. Rationale: Fast terminal productivity hacks for technical credibility; drives Skool dotfiles.', url: 'index.html#w2-item-3', tags: ['terminal', 'cli', 'tools', 'productivity', 'short', 'rationale'] },
    { title: 'Delivery Pilot Module: Part 1', category: 'Calendar', desc: 'Week 2 Sat Coursera Module: 3 x 5m lessons. Rationale: Cornerstone educational masterclass for Skool Classroom.', url: 'index.html#w2-item-4', tags: ['course', 'module', 'skool', 'pilot', 'rationale'] },
    { title: 'Why Simple Vector Search Fails', category: 'Calendar', desc: 'Week 3 Mon Short. Rationale: Diagnoses production pitfalls in naive chunking; sets up hybrid agentic search.', url: 'index.html#w3-item-1', tags: ['vector search', 'rag', 'short', 'embeddings', 'rationale'] },
    { title: 'RAG is NOT Dead: Build an Agentic System', category: 'Calendar', desc: 'Week 3 Wed Long Video: 25m tutorial. Rationale: High-intent enterprise search breakout target; open-source hybrid repo.', url: 'index.html#w3-item-2', tags: ['rag', 'hybrid search', 'tutorial', 'agentic', 'repo', 'rationale'] },
    { title: 'RAG Architecture Troubleshooting', category: 'Calendar', desc: 'Week 3 Sun 13:30 Skool Live. Rationale: Live member vector DB teardowns; high-touch feedback driving paid tier conversion.', url: 'index.html#w3-item-3', tags: ['rag', 'troubleshooting', 'skool', 'live', 'vector db', 'rationale'] },
    { title: 'Double RAG Accuracy in 60s', category: 'Calendar', desc: 'Week 3 Sat Short. Rationale: 60s tactical win on semantic chunking & reranking; links to full RAG build.', url: 'index.html#w3-item-4', tags: ['rag', 'reranking', 'accuracy', 'short', 'rationale'] },
    { title: 'One Agent vs Multi-Agent Swarms', category: 'Calendar', desc: 'Week 4 Mon Short. Rationale: Heuristic rule of thumb preventing premature swarm over-engineering.', url: 'index.html#w4-item-1', tags: ['multi-agent', 'swarms', 'scale', 'short', 'rationale'] },
    { title: 'Deploying Agents on Cloud VPS & Docker', category: 'Calendar', desc: 'Week 4 Wed Long Video: 20m production deployment. Rationale: Bridges local scripts to 24/7 cloud VPS & Docker.', url: 'index.html#w4-item-2', tags: ['docker', 'deploy', 'vps', 'cloud', 'systemd', 'agents', 'production', 'rationale'] },
    { title: 'My $10/Month Production AI Stack', category: 'Calendar', desc: 'Week 4 Fri Short. Rationale: Lean $10/mo stack breakdown; proves indie developers can ship autonomous pipelines.', url: 'index.html#w4-item-3', tags: ['stack', 'infrastructure', 'cost', 'short', 'rationale'] },
    { title: 'Multi-Agent Swarms: Part 2', category: 'Calendar', desc: 'Week 4 Sat Coursera Module: 3 x 5m lessons. Rationale: Advanced masterclass capstone on multi-agent deployment.', url: 'index.html#w4-item-4', tags: ['multi-agent', 'swarms', 'course', 'skool', 'rationale'] },

    // Azure Storage & Azure Key Vault Secrets
    { title: 'Azure Blob Storage (Notes & Rationales)', category: 'Storage', desc: 'Azure Storage container: notes holding JSON blobs with content anchors & rationales', url: 'key-vault.html', tags: ['azure storage', 'blob', 'notes', 'rationale', 'storage', 'json'] },

    // Azure Key Vault Secrets & Deployment
    { title: 'ANTHROPIC-API-KEY', category: 'Key Vault', desc: 'Azure Key Vault secret: Passed into Daytona sandbox so Claude agent can run', url: 'key-vault.html', tags: ['anthropic', 'api key', 'claude', 'secret', 'vault'] },
    { title: 'DAYTONA-API-KEY', category: 'Key Vault', desc: 'Azure Key Vault secret: Provisions ephemeral Daytona dev sandbox environments', url: 'key-vault.html', tags: ['daytona', 'sandbox', 'workspace', 'secret', 'vault'] },
    { title: 'github-pat', category: 'Key Vault', desc: 'Azure Key Vault secret: GitHub Personal Access Token for git push & pull requests', url: 'key-vault.html', tags: ['github', 'pat', 'token', 'git', 'pr', 'secret', 'vault'] },
    { title: 'CC-ADMIN-TOKEN', category: 'Key Vault', desc: 'Azure Key Vault secret: Guards notes & chat endpoints with constant-time compare', url: 'key-vault.html', tags: ['admin token', 'auth', 'security', 'secret', 'vault'] },
    { title: 'CC-ENTRA-CLIENT-SECRET', category: 'Key Vault', desc: 'Azure Key Vault secret: Microsoft Entra OIDC login client secret for Fly.io', url: 'key-vault.html', tags: ['entra', 'microsoft', 'oidc', 'oauth', 'secret', 'fly'] },
    { title: 'CC-SESSION-SECRET', category: 'Key Vault', desc: 'Azure Key Vault secret: HMAC key for signing secure HTTP-only session cookies', url: 'key-vault.html', tags: ['session', 'cookie', 'hmac', 'secret', 'fly'] },
    { title: 'CLAUDE-CODE-OAUTH-TOKEN', category: 'Key Vault', desc: 'Azure Key Vault secret: Claude Code Pro/Team subscription token for sandbox', url: 'key-vault.html', tags: ['claude code', 'oauth', 'token', 'subscription', 'vault'] },
    { title: 'KILO-API-KEY', category: 'Key Vault', desc: 'Azure Key Vault secret: Search and data enrichment API key', url: 'key-vault.html', tags: ['kilo', 'api', 'search', 'secret', 'vault'] },
    { title: 'Deploy Script (scripts/deploy.sh)', category: 'Deploy', desc: 'Automated deployment pulling secrets from Azure Key Vault into Fly.io & Azure', url: 'README.md', tags: ['deploy', 'fly', 'azure', 'key vault', 'script', 'bash'] }
  ];

  const BADGE_COLORS = {
    'Section': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Page': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Calendar': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'Key Vault': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Deploy': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Default': 'bg-slate-700/40 text-slate-300 border-slate-600/40'
  };

  let activeIndex = -1;
  let filteredResults = [];
  let modalEl = null;
  let inputEl = null;
  let resultsListEl = null;

  function isMac() {
    return /mac|iphone|ipad|ipod/i.test(navigator.userAgent || '');
  }

  function highlightMatches(text, query) {
    if (!query) return escapeHtml(text);
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    return escapeHtml(text).replace(regex, '<span class="text-indigo-400 font-semibold bg-indigo-950/60 px-0.5 rounded">$1</span>');
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function performSearch(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) {
      // Return top quick suggestions
      return INDEX.slice(0, 8);
    }
    const terms = q.split(/\s+/).filter(Boolean);

    const matches = INDEX.map((item) => {
      let score = 0;
      const titleLower = item.title.toLowerCase();
      const descLower = item.desc.toLowerCase();
      const catLower = item.category.toLowerCase();
      const tags = item.tags || [];

      for (const t of terms) {
        if (titleLower.includes(t)) {
          score += 10;
          if (titleLower.startsWith(t)) score += 5;
        }
        if (catLower.includes(t)) score += 6;
        if (tags.some(tag => tag.toLowerCase().includes(t))) score += 5;
        if (descLower.includes(t)) score += 2;
      }

      return { item, score };
    }).filter(m => m.score > 0);

    matches.sort((a, b) => b.score - a.score);
    return matches.map(m => m.item);
  }

  function renderResults(results, query) {
    filteredResults = results;
    activeIndex = results.length > 0 ? 0 : -1;
    resultsListEl.innerHTML = '';

    if (results.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'py-10 text-center text-slate-400';
      empty.innerHTML = `
        <div class="text-3xl mb-2">🔍</div>
        <div class="font-medium text-slate-300">No results found for "${escapeHtml(query)}"</div>
        <div class="text-xs text-slate-500 mt-1">Try searching for <span class="text-indigo-400">calendar</span>, <span class="text-indigo-400">key vault</span>, <span class="text-indigo-400">deploy</span>, or <span class="text-indigo-400">okrs</span></div>
      `;
      resultsListEl.appendChild(empty);
      return;
    }

    results.forEach((item, idx) => {
      const row = document.createElement('div');
      const badgeClass = BADGE_COLORS[item.category] || BADGE_COLORS['Default'];
      const isSelected = idx === activeIndex;

      row.className = `search-item flex items-start gap-3 p-3 rounded-xl cursor-pointer transition text-left ${
        isSelected ? 'bg-indigo-600/20 border border-indigo-500/40' : 'hover:bg-slate-800/60 border border-transparent'
      }`;
      row.setAttribute('data-index', idx);
      row.setAttribute('role', 'option');
      row.setAttribute('aria-selected', isSelected ? 'true' : 'false');

      row.innerHTML = `
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${badgeClass}">${escapeHtml(item.category)}</span>
            <span class="font-semibold text-sm text-slate-100 truncate">${highlightMatches(item.title, query)}</span>
          </div>
          <div class="text-xs text-slate-400 line-clamp-1">${highlightMatches(item.desc, query)}</div>
        </div>
        <div class="text-slate-500 text-xs self-center flex items-center gap-1 pl-2">
          <i class="fas fa-arrow-turn-down fa-rotate-90 text-[10px] opacity-70"></i>
        </div>
      `;

      row.addEventListener('click', () => selectItem(item));
      row.addEventListener('mouseenter', () => updateActiveIndex(idx));
      resultsListEl.appendChild(row);
    });

    scrollActiveIntoView();
  }

  function updateActiveIndex(idx) {
    const items = resultsListEl.querySelectorAll('.search-item');
    if (items[activeIndex]) {
      items[activeIndex].className = items[activeIndex].className
        .replace('bg-indigo-600/20 border-indigo-500/40', 'hover:bg-slate-800/60 border-transparent');
      items[activeIndex].setAttribute('aria-selected', 'false');
    }
    activeIndex = idx;
    if (items[activeIndex]) {
      items[activeIndex].className = items[activeIndex].className
        .replace('hover:bg-slate-800/60 border-transparent', 'bg-indigo-600/20 border-indigo-500/40');
      items[activeIndex].setAttribute('aria-selected', 'true');
      scrollActiveIntoView();
    }
  }

  function scrollActiveIntoView() {
    const items = resultsListEl.querySelectorAll('.search-item');
    if (items[activeIndex]) {
      items[activeIndex].scrollIntoView({ block: 'nearest' });
    }
  }

  function selectItem(item) {
    if (!item || !item.url) return;
    closeModal();

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const targetUrl = item.url;

    // Check if target is an anchor on current page
    if (targetUrl.startsWith('#') || targetUrl.startsWith(currentPath + '#') || (currentPath === 'index.html' && targetUrl.startsWith('index.html#'))) {
      const anchor = targetUrl.includes('#') ? targetUrl.split('#')[1] : null;
      if (anchor) {
        const el = document.getElementById(anchor);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight target temporarily
          el.classList.add('ring-2', 'ring-indigo-500', 'transition', 'duration-500');
          setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500'), 2500);
          try { history.pushState(null, '', '#' + anchor); } catch (e) {}
          return;
        }
      }
    }

    // Otherwise navigate
    window.location.href = targetUrl;
  }

  function openModal() {
    if (!modalEl) createModal();
    modalEl.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    inputEl.value = '';
    renderResults(performSearch(''), '');
    setTimeout(() => inputEl.focus(), 50);
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  function createModal() {
    modalEl = document.createElement('div');
    modalEl.id = 'cc-search-modal';
    modalEl.className = 'fixed inset-0 z-[100] flex items-start justify-center pt-14 sm:pt-20 px-4 bg-slate-950/80 backdrop-blur-md hidden';
    modalEl.setAttribute('role', 'dialog');
    modalEl.setAttribute('aria-modal', 'true');
    modalEl.setAttribute('aria-label', 'Search content calendar');

    modalEl.innerHTML = `
      <div class="relative w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col max-h-[82vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <!-- Search Input Bar -->
        <div class="flex items-center px-4 py-3.5 border-b border-slate-800/80 gap-3 bg-slate-900/90">
          <i class="fas fa-search text-indigo-400 text-sm"></i>
          <input
            id="cc-search-input"
            type="text"
            autocomplete="off"
            spellcheck="false"
            placeholder="Search topics, videos, OKRs, Key Vault secrets..."
            class="flex-1 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
            aria-autocomplete="list"
            aria-controls="cc-search-results"
          />
          <button id="cc-search-clear" type="button" class="text-slate-500 hover:text-slate-300 text-xs px-1.5 py-0.5 rounded transition" title="Clear">
            <i class="fas fa-times"></i>
          </button>
          <kbd class="hidden sm:inline-block text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">ESC</kbd>
        </div>

        <!-- Suggestions / Results Container -->
        <div id="cc-search-results" class="flex-1 overflow-y-auto p-2 space-y-1" role="listbox">
        </div>

        <!-- Footer Shortcuts -->
        <div class="px-4 py-2.5 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div class="flex items-center gap-3">
            <span><kbd class="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">↑↓</kbd> navigate</span>
            <span><kbd class="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">↵</kbd> select</span>
            <span><kbd class="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">esc</kbd> close</span>
          </div>
          <span class="text-indigo-400/90">Content Engine</span>
        </div>
      </div>
    `;

    document.body.appendChild(modalEl);

    inputEl = modalEl.querySelector('#cc-search-input');
    resultsListEl = modalEl.querySelector('#cc-search-results');
    const clearBtn = modalEl.querySelector('#cc-search-clear');

    // Click backdrop to close
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeModal();
    });

    clearBtn.addEventListener('click', () => {
      inputEl.value = '';
      inputEl.focus();
      renderResults(performSearch(''), '');
    });

    inputEl.addEventListener('input', (e) => {
      const q = e.target.value;
      renderResults(performSearch(q), q);
    });

    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (filteredResults.length > 0) {
          updateActiveIndex((activeIndex + 1) % filteredResults.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (filteredResults.length > 0) {
          updateActiveIndex((activeIndex - 1 + filteredResults.length) % filteredResults.length);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredResults.length) {
          selectItem(filteredResults[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    });
  }

  // Bind or inject search button into the menu
  function initMenuButton() {
    let btn = document.getElementById('menu-search-btn');
    if (!btn) {
      // Find header navigation or actions
      const header = document.querySelector('header');
      if (!header) return;

      const rightGroup = header.querySelector('.flex.items-center.space-x-3') ||
                         header.querySelector('a[href*="youtube.com"]')?.parentElement ||
                         header.querySelector('.max-w-7xl, .max-w-5xl');

      btn = document.createElement('button');
      btn.id = 'menu-search-btn';
      btn.type = 'button';
      btn.className = 'flex items-center gap-2 px-2.5 sm:px-3 py-1.5 text-xs text-slate-300 bg-slate-900/90 hover:bg-slate-800 hover:text-white border border-slate-700/80 rounded-lg transition shadow-sm group';
      btn.setAttribute('aria-label', 'Search content');

      const kbdText = isMac() ? '⌘K' : 'Ctrl+K';
      btn.innerHTML = `
        <i class="fas fa-search text-indigo-400 group-hover:text-indigo-300 transition-colors text-xs"></i>
        <span class="hidden sm:inline font-medium">Search...</span>
        <kbd class="hidden md:inline-flex items-center text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">${kbdText}</kbd>
      `;

      if (rightGroup && rightGroup.firstChild) {
        rightGroup.insertBefore(btn, rightGroup.firstChild);
      } else if (header) {
        header.appendChild(btn);
      }
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal();
    });
  }

  // Global keyboard shortcuts (Cmd+K, Ctrl+K, '/')
  document.addEventListener('keydown', (e) => {
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
                          document.activeElement?.isContentEditable;

    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (modalEl && !modalEl.classList.contains('hidden')) {
        closeModal();
      } else {
        openModal();
      }
    } else if (e.key === '/' && !isInputActive) {
      e.preventDefault();
      openModal();
    } else if (e.key === 'Escape' && modalEl && !modalEl.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Initialize once DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenuButton);
  } else {
    initMenuButton();
  }

  // Export helper for programmatic access if needed
  window.CCSearch = {
    open: openModal,
    close: closeModal,
    index: INDEX
  };
})();
