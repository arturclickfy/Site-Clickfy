const fallbackConfig = {
  whatsapp: '5554981254077',
  instagram: 'https://www.instagram.com/clickfy.caminhoes/',
  founderInstagram: 'https://www.instagram.com/eusouarturr/',
  clients: [], cases: [], videos: []
};
let config = fallbackConfig;
const $ = (selector) => document.querySelector(selector);

const themeToggle = $('#theme-toggle');
function applyTheme(theme, persist = true) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
  themeToggle.title = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
  themeToggle.querySelector('.theme-label').textContent = dark ? 'Tema claro' : 'Tema escuro';
  document.querySelector('meta[name="theme-color"]').content = dark ? '#101512' : '#fafaf8';
  if (persist) { try { localStorage.setItem('clickfy-theme', dark ? 'dark' : 'light'); } catch { /* Theme remains usable without storage. */ } }
}
applyTheme(document.documentElement.dataset.theme, false);
themeToggle.addEventListener('click', () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));

function safeUrl(value, allowRelative = false) {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (allowRelative && /^data:image\/(?:png|jpeg|webp|gif);base64,[a-zA-Z0-9+/=]+$/.test(value)) return value;
  try {
    const url = new URL(value, window.location.href);
    if (url.protocol !== 'https:' && !(allowRelative && url.origin === location.origin)) return null;
    return url.href;
  } catch { return null; }
}

function whatsappUrl(number, message) {
  const digits = String(number || '').replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(digits)) throw new Error('WhatsApp indisponível. Fale com a Clickfy pelo Instagram.');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function closeDialog(dialog) {
  dialog.close();
  if (dialog.id === 'video-dialog') $('#video-player').replaceChildren();
}

document.querySelectorAll('[data-close-dialog]').forEach(button => {
  button.addEventListener('click', () => closeDialog(button.closest('dialog')));
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => { if (event.target === dialog) closeDialog(dialog); });
  dialog.addEventListener('close', () => { if (dialog.id === 'video-dialog') $('#video-player').replaceChildren(); });
});
$('#privacy-open').addEventListener('click', () => $('#privacy-dialog').showModal());

const menu = $('.menu-toggle');
menu.addEventListener('click', () => {
  const open = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(open));
  $('#navigation').classList.toggle('is-open', open);
});
$('#navigation').addEventListener('click', event => {
  if (event.target.closest('a')) {
    menu.setAttribute('aria-expanded', 'false');
    $('#navigation').classList.remove('is-open');
  }
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    menu.setAttribute('aria-expanded', 'false');
    $('#navigation').classList.remove('is-open');
  }
});

function renderClients(clients) {
  const group = $('#client-group');
  if (clients.length) {
    group.replaceChildren(...clients.map(client => {
      const target = safeUrl(client.url);
      const el = document.createElement(target ? 'a' : 'span');
      el.className = 'client-logo';
      el.title = client.name;
      if (target) {
        el.href = target; el.target = '_blank'; el.rel = 'noopener noreferrer';
        el.setAttribute('aria-label', `Conhecer ${client.name}`);
      }
      if (/^#[a-fA-F0-9]{6}$/.test(client.background || '')) {
        const channels = client.background.slice(1).match(/.{2}/g).map(hex => parseInt(hex, 16));
        const brightness = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        el.classList.toggle('dark-source', brightness < 120);
      }
      const logo = safeUrl(client.logo, true);
      const name = document.createElement('span');
      name.className = 'logo-fallback';
      name.textContent = client.name;
      name.hidden = !!logo;
      if (logo) {
        const viewport = document.createElement('span');
        viewport.className = 'logo-viewport';
        const validView = Array.isArray(client.logoView) && client.logoView.length === 4 && client.logoView.every(n => typeof n === 'number' && Number.isFinite(n));
        const [x, y, w, h] = validView ? client.logoView : [0, 0, 1, 1];
        const safeView = x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1.001 && y + h <= 1.001;
        const view = safeView ? [x, y, w, h] : [0, 0, 1, 1];
        const aspect = Math.max(0.2, Math.min(8, (Number(client.logoAspect) || 1) * view[2] / view[3]));
        viewport.style.width = Math.min(132, 52 * aspect) + 'px';
        viewport.style.height = Math.min(52, 132 / aspect) + 'px';
        const image = document.createElement('img');
        image.src = logo; image.alt = client.name; image.loading = 'eager'; image.decoding = 'async';
        image.style.width = 100 / view[2] + '%';
        image.style.height = 100 / view[3] + '%';
        image.style.left = -100 * view[0] / view[2] + '%';
        image.style.top = -100 * view[1] / view[3] + '%';
        image.addEventListener('error', () => { viewport.remove(); name.hidden = false; el.classList.add('logo-missing'); });
        viewport.append(image);
        el.append(viewport);
      }
      el.append(name);
      return el;
    }));
  }
  $('#client-track').querySelectorAll('.client-group[aria-hidden="true"]').forEach(el => el.remove());
  const clone = group.cloneNode(true);
  clone.removeAttribute('id'); clone.setAttribute('aria-hidden', 'true'); clone.setAttribute('inert', '');
  clone.querySelectorAll('img').forEach(img => { img.alt = ''; });
  $('#client-track').append(clone);
  $('#client-track').style.animationDuration = Math.max(38, clients.length * 4.5) + 's';
}

const motionButton = $('#motion-toggle');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function updateMotionButton() {
  const paused = $('#client-track').classList.contains('is-paused');
  motionButton.setAttribute('aria-pressed', String(paused));
  motionButton.textContent = paused ? 'Retomar carrossel ▶' : 'Pausar carrossel Ⅱ';
  motionButton.hidden = reducedMotion.matches;
}
motionButton.addEventListener('click', () => { $('#client-track').classList.toggle('is-paused'); updateMotionButton(); });
function moveClients(direction) {
  const track = $('#client-track');
  track.classList.add('is-paused');
  const animation = track.getAnimations()[0];
  if (animation) {
    const duration = animation.effect.getTiming().duration;
    const count = Math.max(1, $('#client-group').childElementCount);
    animation.currentTime = ((Number(animation.currentTime) || 0) + direction * duration / count + duration) % duration;
  } else {
    const tile = track.querySelector('.client-logo');
    $('.client-marquee').scrollBy({left: direction * (tile?.getBoundingClientRect().width || 230), behavior: 'auto'});
  }
  updateMotionButton();
}
$('#client-previous').addEventListener('click', () => moveClients(-1));
$('#client-next').addEventListener('click', () => moveClients(1));
reducedMotion.addEventListener('change', updateMotionButton);
updateMotionButton();

function renderCases(cases) {
  const grid = $('#case-grid');
  grid.replaceChildren(...cases.map(item => {
    const url = safeUrl(item.url), imageUrl = safeUrl(item.image, true);
    if (!url || !imageUrl) return null;
    const article = document.createElement('article'); article.className = 'case-card';
    const media = document.createElement('a'); media.className = 'case-media'; media.href = url; media.target = '_blank'; media.rel = 'noopener noreferrer'; media.setAttribute('aria-label', `Ver caso: ${item.title}`);
    const image = document.createElement('img'); image.src = imageUrl; image.alt = item.title; image.loading = 'lazy'; image.width = 640; image.height = 800;
    const arrow = document.createElement('span'); arrow.className = 'case-arrow'; arrow.textContent = '↗'; arrow.setAttribute('aria-hidden', 'true');
    media.append(image, arrow);
    const category = document.createElement('p'); category.className = 'eyebrow'; category.textContent = item.category;
    const title = document.createElement('h3'); title.textContent = item.title;
    const description = document.createElement('p'); description.textContent = item.description;
    const link = document.createElement('a'); link.className = 'text-link'; link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Conhecer o caso completo ↗';
    article.append(media, category, title, description, link);
    return article;
  }).filter(Boolean));
  if (!grid.childElementCount) {
    const p = document.createElement('p'); p.textContent = 'Conheça os trabalhos e bastidores no Instagram da Clickfy.'; grid.append(p);
  }
}

function videoSource(value) {
  const url = safeUrl(value, true);
  if (!url) return null;
  const parsed = new URL(url);
  if (/\.mp4$/i.test(parsed.pathname)) return {type: 'file', url};
  let id = null;
  if (parsed.hostname === 'youtu.be') id = parsed.pathname.slice(1);
  if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(parsed.hostname)) {
    id = parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)$/)?.[1];
  }
  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) return {type: 'youtube', url: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`};
  return null;
}

function renderVideos(videos) {
  const grid = $('#video-grid'); grid.replaceChildren();
  for (const item of videos) {
    const source = videoSource(item.url);
    if (!source) continue;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'video-card'; button.setAttribute('aria-label', `Assistir: ${item.title}`);
    const cover = document.createElement('span'); cover.className = 'video-cover';
    const poster = safeUrl(item.poster, true);
    if (poster) { const img = document.createElement('img'); img.src = poster; img.alt = ''; img.loading = 'lazy'; cover.append(img); }
    const play = document.createElement('span'); play.className = 'video-play'; play.textContent = '▶'; play.setAttribute('aria-hidden', 'true'); cover.append(play);
    const title = document.createElement('strong'); title.textContent = item.title; button.append(cover, title);
    button.addEventListener('click', () => {
      const player = document.createElement(source.type === 'file' ? 'video' : 'iframe');
      player.src = source.url;
      if (source.type === 'file') { player.controls = true; player.autoplay = true; player.playsInline = true; }
      else { player.title = item.title; player.allow = 'autoplay; fullscreen; picture-in-picture'; player.allowFullscreen = true; player.referrerPolicy = 'strict-origin-when-cross-origin'; }
      $('#video-player').replaceChildren(player); $('#video-dialog').showModal();
    });
    grid.append(button);
  }
  $('#videos').hidden = !grid.childElementCount;
}

$('#contact-form').addEventListener('submit', event => {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  const error = $('#form-error'); error.hidden = true;
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const company = String(data.get('company') || '').trim();
  const segment = String(data.get('segment') || '').trim();
  const goal = String(data.get('goal') || '').trim();
  if (name.length < 2 || company.length < 2 || !segment || goal.length < 10) {
    error.textContent = 'Preencha seu nome, a empresa, o segmento e um pouco sobre o que você procura.'; error.hidden = false; return;
  }
  const message = `Olá, Artur! Vim pelo site da Clickfy e quero conversar sobre o marketing da minha empresa.\n\nMeu nome: ${name}\nEmpresa: ${company}\nSegmento: ${segment}\n\nO que quero melhorar:\n${goal}`;
  try {
    $('#message-preview').textContent = message;
    $('#whatsapp-submit').href = whatsappUrl(config.whatsapp, message);
    $('#message-dialog').showModal();
  } catch (e) { error.textContent = e.message; error.hidden = false; }
});

async function init() {
  try {
    const embedded = document.getElementById('clickfy-content');
    if (embedded) {
      config = {...fallbackConfig, ...JSON.parse(embedded.textContent)};
    } else {
      const response = await fetch('content.json', {cache: 'no-cache'});
      if (!response.ok) throw new Error('Content unavailable');
      const data = await response.json(); config = {...fallbackConfig, ...data};
    }
  } catch { /* Core contact and navigation remain available. */ }
  renderClients(Array.isArray(config.clients) ? config.clients.filter(c => typeof c.name === 'string' && c.name.trim()) : []);
  renderCases(Array.isArray(config.cases) ? config.cases : []);
  renderVideos(Array.isArray(config.videos) ? config.videos : []);
  const instagram = safeUrl(config.instagram);
  if (instagram) document.querySelectorAll('[data-instagram]').forEach(a => a.href = instagram);
  const founder = safeUrl(config.founderInstagram);
  if (founder) document.querySelectorAll('[data-founder-instagram]').forEach(a => a.href = founder);
  try { document.querySelectorAll('[data-direct-whatsapp]').forEach(a => a.href = whatsappUrl(config.whatsapp, 'Olá, Artur! Quero conversar sobre o marketing da minha empresa.')); } catch { /* Form shows a useful error for an invalid configuration. */ }
  $('#year').textContent = new Date().getFullYear();
}
init();

// A small, scroll-linked shift connects the opening artwork to the page.
// The page itself retains native scrolling and honors motion preferences.
const scrollLayers = [...document.querySelectorAll('[data-scroll-depth]')];
let scrollFrame = 0;
function paintScrollLayers() {
  scrollFrame = 0;
  const progress = reducedMotion.matches ? 0 : Math.min(window.scrollY, 900);
  const intensity = window.innerWidth < 540 ? 0.55 : 1;
  scrollLayers.forEach(layer => {
    const shift = progress * Number(layer.dataset.scrollDepth) * intensity;
    layer.style.setProperty('--scroll-shift', `${shift.toFixed(2)}px`);
  });
}
function requestScrollPaint() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(paintScrollLayers);
}
window.addEventListener('scroll', requestScrollPaint, {passive: true});
window.addEventListener('resize', requestScrollPaint, {passive: true});
reducedMotion.addEventListener('change', requestScrollPaint);
requestScrollPaint();
