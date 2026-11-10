/* Atelier — Art Mode for Fire TV
 * Written in ES2017 without optional chaining so it runs on older Fire TV WebViews. */
(function () {
  'use strict';

  var DREAM = location.hash.indexOf('dream') >= 0;
  var NATIVE = typeof window.Android !== 'undefined';

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function h(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function native(method) {
    if (!NATIVE || typeof Android[method] !== 'function') return undefined;
    try { return Android[method].apply(Android, Array.prototype.slice.call(arguments, 1)); }
    catch (e) { return undefined; }
  }

  /* ---------------- Storage ---------------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('atelier.' + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) { try { localStorage.setItem('atelier.' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* ---------------- Catalog ---------------- */
  var MAT_STYLES = [
    { id: 'smart', name: 'Auto: fill the TV' },
    { id: 'none', name: 'Fill screen (crop)' },
    { id: 'blur', name: 'Blurred background' },
    { id: 'gallery', name: 'Gallery wall (dark)' },
    { id: 'modern', name: 'Paper mat' },
    { id: 'shadowbox', name: 'Shadowbox' },
    { id: 'panoramic', name: 'Panoramic' },
    { id: 'triptych', name: 'Triptych' },
    { id: 'mix', name: 'Mix' }
  ];
  var MAT_COLORS = [
    { id: 'auto', name: 'Auto (from art)', c: '#e2dbcd' },
    { id: 'warm', name: 'Warm white', c: '#ece6da' },
    { id: 'polar', name: 'Polar', c: '#f2f4f5' },
    { id: 'antique', name: 'Antique', c: '#dccfb6' },
    { id: 'sand', name: 'Sand', c: '#c9bb9d' },
    { id: 'apricot', name: 'Apricot', c: '#e2b38e' },
    { id: 'seafoam', name: 'Seafoam', c: '#a7c1b4' },
    { id: 'sage', name: 'Sage', c: '#8c9782' },
    { id: 'lavender', name: 'Lavender', c: '#b3aac5' },
    { id: 'burgundy', name: 'Burgundy', c: '#5a222b' },
    { id: 'navy', name: 'Navy', c: '#1e2a3d' },
    { id: 'charcoal', name: 'Charcoal', c: '#393938' },
    { id: 'black', name: 'Black', c: '#141414' }
  ];

  // Collections are built from open-access, public-domain museum APIs.
  var COLLECTIONS = [
    { id: 'impressionism', name: 'Impressionist masters', note: 'Monet, Renoir, Pissarro, Morisot', sources: [['aic', 'impressionism'], ['cma', 'impressionism', 'Painting']] },
    { id: 'postimp', name: 'Post-Impressionism', note: 'Van Gogh, Cézanne, Gauguin, Seurat', sources: [['aic', 'post-impressionism'], ['cma', 'post-impressionism', 'Painting']] },
    { id: 'landscapes', name: 'Landscapes', note: 'Fields, forests and mountains', sources: [['aic', 'landscape painting'], ['cma', 'landscape', 'Painting']] },
    { id: 'seascapes', name: 'Seascapes', note: 'Coasts, harbors and open water', sources: [['aic', 'seascape'], ['cma', 'seascape', 'Painting']] },
    { id: 'japanese', name: 'Japanese woodblock prints', note: 'Hokusai, Hiroshige and the ukiyo-e masters', sources: [['aic', 'hiroshige'], ['aic', 'hokusai'], ['cma', 'ukiyo-e', 'Print']] },
    { id: 'stilllife', name: 'Still life and flowers', note: 'Bouquets, fruit and quiet tables', sources: [['aic', 'still life flowers'], ['cma', 'still life', 'Painting']] },
    { id: 'botanical', name: 'Botanical studies', note: 'Natural history illustration', sources: [['cma', 'botanical'], ['aic', 'botanical']] },
    { id: 'masters', name: 'Old masters', note: 'Rembrandt, Vermeer and the Golden Age', sources: [['aic', 'dutch baroque'], ['cma', 'baroque', 'Painting']] },
    { id: 'american', name: 'American art', note: 'Homer, Sargent, Cassatt, the Hudson River School', sources: [['aic', 'american painting'], ['cma', 'hudson river', 'Painting']] },
    { id: 'portraits', name: 'Portraits', note: 'Faces across five centuries', sources: [['aic', 'portrait painting'], ['cma', 'portrait', 'Painting']] },
    { id: 'animals', name: 'Animals', note: 'Horses, birds, dogs and cats', sources: [['aic', 'animals painting'], ['cma', 'animals', 'Painting']] },
    { id: 'modern', name: 'Early modern and abstract', note: 'The first steps into abstraction', sources: [['aic', 'abstraction'], ['cma', 'abstract', 'Painting']] },
    { id: 'met', name: 'Highlights from The Met', note: 'Public-domain masterpieces, New York', sources: [['met', 'painting']] }
  ];

  var DEFAULTS = {
    brightness: 7, tone: 0, interval: 0, playFrom: 'current', order: 'sequential', showInfo: true,
    mat: 'smart', fillOnly: 0, musicSource: 'off', musicStyle: 'classical', musicVolume: 4, musicAnnounce: true, musicApp: '',
    matColor: 'auto', matBright: 6, matWidth: 'standard', bezel: 'none', texture: true, sleepAfter: 4, nightMode: false
  };

  /* ---------------- State ---------------- */
  // v2: switch existing installs to the softer auto-colored mat.
  var savedSettings = store.get('settings', {}), savedMats = store.get('matByArt', {});
  if (!savedSettings.v4) {
    delete savedSettings.mat;
    savedSettings.v4 = savedSettings.v3 = true;
    Object.keys(savedMats).forEach(function (k) { delete savedMats[k].mat; });
  }
  if (!savedSettings.v3) {
    delete savedSettings.mat;
    savedSettings.v3 = true;
    Object.keys(savedMats).forEach(function (k) { delete savedMats[k].mat; });
  }
  if (!savedSettings.v2) {
    delete savedSettings.matColor;
    savedSettings.v2 = true;
    Object.keys(savedMats).forEach(function (k) { delete savedMats[k].color; });
    store.set('settings', savedSettings);
    store.set('matByArt', savedMats);
  }

  var S = {
    settings: Object.assign({}, DEFAULTS, savedSettings),
    favorites: store.get('favorites', []),
    matByArt: savedMats,
    current: store.get('current', null),
    bad: {}, dead: store.get('dead', {}), stepFrom: null, stepTries: 0,
    ctx: store.get('ctx', { list: [], name: '' }),
    cache: store.get('cache2', {}),
    aspect: store.get('aspect', {}),
    photos: [],
    menuOpen: false, detailOpen: false, sleeping: false, paused: false,
    tab: 'store', sub: null, detail: null, returnFocus: null,
    lastActivity: Date.now(), backArmedAt: 0,
    front: null, slideTimer: null, capTimer: null, showSeq: 0, pvSeq: 0, renderSeq: 0
  };

  // Pictures whose image can't be read are remembered and never shown again.
  function alive(a) { return a && !S.dead[a.id]; }
  function markDead(art, list) {
    if (!S.dead[art.id]) {
      S.dead[art.id] = 1;
      var keys = Object.keys(S.dead);
      if (keys.length > 3000) delete S.dead[keys[0]];
      store.set('dead', S.dead);
    }
    if (list) for (var i = list.length - 1; i >= 0; i--) if (list[i].id === art.id) list.splice(i, 1);
  }
  // "Only pictures that fill the screen": hides art that would need more than the chosen crop.
  function screenAr() { return (window.innerWidth || 16) / (window.innerHeight || 9); }
  function cropLoss(ar) { var sc = screenAr(); return 1 - Math.min(ar, sc) / Math.max(ar, sc); }
  function arOf(a) { return a.ar || S.aspect[a.id] || 0; }
  function fits(a) {
    var tol = S.settings.fillOnly;
    if (!tol || !a) return true;
    var ar = arOf(a);
    return !ar || cropLoss(ar) <= tol / 100;
  }
  function shown(a) { return alive(a) && fits(a); }
  function noteAspect(a, w, h) {
    if (!a || !w || !h || a.ar) return;
    S.aspect[a.id] = w / h;
    clearTimeout(noteAspect.t);
    noteAspect.t = setTimeout(function () {
      var k = Object.keys(S.aspect);
      if (k.length > 4000) k.slice(0, k.length - 4000).forEach(function (x) { delete S.aspect[x]; });
      store.set('aspect', S.aspect);
    }, 2000);
  }
  function saveSettings() { store.set('settings', S.settings); }
  function saveFavs() { store.set('favorites', S.favorites); }
  function saveCache() { store.set('cache2', S.cache); }

  /* ---------------- Networking ---------------- */
  var pending = {}, fetchSeq = 0;
  window.__nativeFetchDone = function (id, ok, body) {
    var p = pending[id];
    if (!p) return;
    delete pending[id];
    if (ok) p.resolve(body); else p.reject(new Error(body || 'Network error'));
  };
  function httpGet(url) {
    if (NATIVE && typeof Android.httpGet === 'function') {
      return new Promise(function (resolve, reject) {
        var id = ++fetchSeq;
        pending[id] = { resolve: resolve, reject: reject };
        Android.httpGet(id, url);
        setTimeout(function () {
          if (pending[id]) { delete pending[id]; reject(new Error('Timed out')); }
        }, 40000);
      });
    }
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    });
  }
  function getJSON(url) { return httpGet(url).then(function (t) { return JSON.parse(t); }); }

  var enc = encodeURIComponent;
  function cleanArtist(s) {
    if (!s) return '';
    return String(s).split('\n')[0].replace(/\s*\(.*$/, '').trim();
  }

  function aicSearch(q, limit) {
    var url = 'https://api.artic.edu/api/v1/artworks/search?q=' + enc(q) +
      '&query%5Bterm%5D%5Bis_public_domain%5D=true&limit=' + (limit || 80) +
      '&fields=id,title,artist_title,artist_display,date_display,image_id,thumbnail';
    return getJSON(url).then(function (j) {
      var base = (j.config && j.config.iiif_url) || 'https://www.artic.edu/iiif/2';
      return (j.data || []).filter(function (d) { return d.image_id; }).map(function (d) {
        var img = base + '/' + d.image_id + '/full/';
        return {
          id: 'aic:' + d.id, title: d.title || 'Untitled',
          artist: d.artist_title || cleanArtist(d.artist_display) || 'Unknown artist',
          date: d.date_display || '', source: 'Art Institute of Chicago',
          thumb: img + '400,/0/default.jpg', full: img + '1686,/0/default.jpg', alt: img + '843,/0/default.jpg',
          ar: (d.thumbnail && d.thumbnail.width && d.thumbnail.height) ? d.thumbnail.width / d.thumbnail.height : 0
        };
      });
    });
  }

  function cmaSearch(q, type, limit) {
    var url = 'https://openaccess-api.clevelandart.org/api/artworks/?q=' + enc(q) +
      '&cc0=1&has_image=1&limit=' + (limit || 80) + (type ? '&type=' + enc(type) : '');
    return getJSON(url).then(function (j) {
      return (j.data || []).filter(function (d) { return d.images && d.images.web && d.images.web.url; }).map(function (d) {
        var im = d.images, c = d.creators && d.creators[0];
        var culture = Array.isArray(d.culture) ? d.culture[0] : d.culture;
        return {
          id: 'cma:' + d.id, title: d.title || 'Untitled',
          artist: (c && cleanArtist(c.description)) || culture || 'Unknown artist',
          date: d.creation_date || '', source: 'Cleveland Museum of Art',
          thumb: im.web.url, full: (im.print && im.print.url) || im.web.url, alt: im.web.url,
          ar: (+im.web.width && +im.web.height) ? im.web.width / im.web.height : 0
        };
      });
    });
  }

  function metSearch(q, limit) {
    limit = limit || 30;
    var base = 'https://collectionapi.metmuseum.org/public/collection/v1/';
    return getJSON(base + 'search?hasImages=true&isHighlight=true&q=' + enc(q)).then(function (s) {
      var ids = (s.objectIDs || []).slice(0, limit + 15), out = [], i = 0;
      function worker() {
        if (i >= ids.length || out.length >= limit) return Promise.resolve();
        var id = ids[i++];
        return getJSON(base + 'objects/' + id).then(function (o) {
          if (o.isPublicDomain && o.primaryImage) {
            out.push({
              id: 'met:' + o.objectID, title: o.title || 'Untitled',
              artist: o.artistDisplayName || o.culture || 'Unknown artist',
              date: o.objectDate || '', source: 'The Metropolitan Museum of Art',
              thumb: o.primaryImageSmall || o.primaryImage, full: o.primaryImage, alt: o.primaryImageSmall
            });
          }
        }).catch(function () {}).then(worker);
      }
      return Promise.all([worker(), worker(), worker(), worker()]).then(function () { return out; });
    });
  }

  function runSource(s) {
    if (s[0] === 'aic') return aicSearch(s[1]);
    if (s[0] === 'cma') return cmaSearch(s[1], s[2]);
    if (s[0] === 'met') return metSearch(s[1]);
    return Promise.resolve([]);
  }

  function interleave(lists, max) {
    var out = [], seen = {}, i = 0, added = true;
    while (added && out.length < max) {
      added = false;
      lists.forEach(function (l) {
        if (i < l.length && out.length < max) {
          var a = l[i], key = (a.title + '|' + a.artist).toLowerCase();
          added = true;
          if (!seen[key] && !seen[a.id]) { seen[key] = seen[a.id] = true; out.push(a); }
        }
      });
      i++;
    }
    return out;
  }

  function loadCollection(c) {
    var hit = S.cache[c.id];
    if (hit && hit.items && hit.items.length && Date.now() - hit.t < 3 * 864e5) return Promise.resolve(hit.items.filter(alive));
    return Promise.all(c.sources.map(function (s) { return runSource(s).catch(function () { return []; }); }))
      .then(function (lists) {
        var items = interleave(lists, 120).filter(alive).slice(0, 90);
        if (items.length) { S.cache[c.id] = { t: Date.now(), items: items }; saveCache(); return items; }
        return hit && hit.items ? hit.items.filter(alive) : [];
      });
  }
  function collectionById(id) { return COLLECTIONS.filter(function (c) { return c.id === id; })[0]; }

  /* ---------------- Images & composition ---------------- */
  // Tries each source in turn (full size, medium, thumbnail); fails only if all of them fail.
  function loadImg() {
    var srcs = [];
    Array.prototype.slice.call(arguments).forEach(function (u) { if (u && srcs.indexOf(u) < 0) srcs.push(u); });
    return new Promise(function (resolve, reject) {
      var i = 0;
      function attempt() {
        if (i >= srcs.length) { reject(new Error('load')); return; }
        var im = new Image(), done = false;
        var t = setTimeout(function () { if (!done) { done = true; im.src = ''; i++; attempt(); } }, 20000);
        im.onload = function () {
          if (done) return;
          done = true; clearTimeout(t);
          if (im.naturalWidth < 2) { i++; attempt(); } else resolve(im);
        };
        im.onerror = function () { if (done) return; done = true; clearTimeout(t); i++; attempt(); };
        im.decoding = 'async';
        im.src = srcs[i];
      }
      attempt();
    });
  }
  function asMain(im) { return { src: im.src, w: im.naturalWidth || 1600, h: im.naturalHeight || 1000 }; }

  function matHex(id) {
    var m = MAT_COLORS.filter(function (x) { return x.id === id; })[0];
    return (m || MAT_COLORS[0]).c;
  }
  function isDark(hex) {
    var n = parseInt(hex.slice(1), 16);
    return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 110;
  }
  function fit(aw, ah, mw, mh) { var s = Math.min(mw / aw, mh / ah); return { w: aw * s, h: ah * s }; }
  function cssUrl(src) { return 'url("' + String(src).replace(/"/g, '%22') + '")'; }

  /* Auto mat color: a muted tone sampled from the artwork itself. */
  var toneCache = {};
  function hslHex(hh, ss, ll) {
    function f(n) {
      var k = (n + hh / 30) % 12, a = ss * Math.min(ll, 1 - ll);
      var c = ll - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
      return ('0' + Math.round(c * 255).toString(16)).slice(-2);
    }
    return '#' + f(0) + f(8) + f(4);
  }
  function mutedFrom(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn, s = 0, hh = 40;
    if (d) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
      hh *= 60; if (hh < 0) hh += 360;
    }
    // Light, low-saturation paper tone; very dark art gets a deep charcoal-toned mat instead.
    return l < 0.2 ? hslHex(hh, Math.min(s * 0.3, 0.12), 0.17) : hslHex(hh, Math.min(s * 0.5, 0.24), 0.82);
  }
  function autoMatColor(art) {
    if (toneCache[art.id]) return Promise.resolve(toneCache[art.id]);
    return new Promise(function (resolve) {
      var im = new Image(), done = false;
      var t = setTimeout(function () { fin(null); }, 8000);
      function fin(c) {
        if (done) return;
        done = true; clearTimeout(t);
        if (c) toneCache[art.id] = c;
        resolve(c || '#e2dbcd');
      }
      im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = c.height = 24;
          var x = c.getContext('2d'); x.drawImage(im, 0, 0, 24, 24);
          var d = x.getImageData(0, 0, 24, 24).data, r = 0, g = 0, b = 0, n = 0;
          for (var i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
          fin(mutedFrom(r / n, g / n, b / n));
        } catch (e) { fin(null); }
      };
      im.onerror = function () { fin(null); };
      im.src = art.thumb;
    });
  }
  function resolveCfg(art) {
    var cfg = matFor(art);
    if (cfg.color !== 'auto') return Promise.resolve(cfg);
    return autoMatColor(art).then(function (hx) { cfg.hex = hx; return cfg; });
  }
  var WIDTHS = { slim: 0.08, standard: 0.115, wide: 0.165 };

  /* Lays out one artwork (or three for "mix") on a mat inside `el`, like a real framed print. */
  function compose(el, main, cfg, extras) {
    var W = el.clientWidth || window.innerWidth, H = el.clientHeight || window.innerHeight;
    var mw = WIDTHS[S.settings.matWidth] || WIDTHS.standard, grow;
    var mat = cfg.mat;
    var dpr = window.devicePixelRatio || 1;
    // Largest size a picture can be shown without visible blur (1.5x its own pixels).
    function sharpFit(maxW, maxH) {
      var f0 = fit(main.w, main.h, maxW, maxH), cap = (main.w * 1.5) / dpr;
      if (f0.w > cap) f0 = { w: cap, h: cap * main.h / main.w };
      return f0;
    }
    // Auto: fill the screen when the picture is close to TV shape (crops at most ~12%),
    // otherwise show it whole over a blurred, dimmed copy of itself.
    if (mat === 'smart') {
      var arS = main.w / main.h, scr = W / H, loss = 1 - Math.min(arS, scr) / Math.max(arS, scr);
      var tolA = Math.max(0.12, (S.settings.fillOnly || 0) / 100);
      mat = (loss <= tolA && (main.w * 2 >= W * dpr || S.settings.fillOnly)) ? 'none' : 'blur';
    }
    if (mat === 'none' || mat === 'blur' || mat === 'gallery') {
      el.innerHTML = '';
      el.style.fontSize = (H / 100) + 'px';
      var pic = h('div', 'aperture');
      if (mat === 'none') {
        el.style.backgroundColor = '#000';
        pic.style.cssText = 'left:0;top:0;width:' + W + 'px;height:' + H + 'px;background-image:' + cssUrl(main.src);
        el.appendChild(pic);
        return;
      }
      if (mat === 'blur') {
        el.style.backgroundColor = '#000';
        var bg = h('div', 'blur-bg');
        bg.style.backgroundImage = cssUrl(main.thumb || main.src);
        el.appendChild(bg);
        el.appendChild(h('div', 'blur-shade'));
        var fb = sharpFit(W, H);
        pic.className = 'aperture lifted';
        pic.style.cssText = 'left:' + (W - fb.w) / 2 + 'px;top:' + (H - fb.h) / 2 + 'px;width:' + fb.w + 'px;height:' + fb.h +
          'px;background-image:' + cssUrl(main.src);
        el.appendChild(pic);
        return;
      }
      // Gallery wall: dark wall, soft spotlight, picture in a slim black frame.
      el.style.backgroundColor = '#1b1a18';
      el.appendChild(h('div', 'spotlight'));
      var mg = H * (0.06 * ({ slim: 0.7, standard: 1, wide: 1.6 }[S.settings.matWidth] || 1));
      var fg = sharpFit(W - 2 * mg, H - 2 * mg);
      pic.className = 'aperture framed';
      pic.style.cssText = 'left:' + (W - fg.w) / 2 + 'px;top:' + (H - fg.h) / 2 + 'px;width:' + fg.w + 'px;height:' + fg.h +
        'px;background-image:' + cssUrl(main.src);
      el.appendChild(pic);
      return;
    }
    if (mat === 'mix' && !(extras && extras.length >= 2)) mat = 'modern';
    var col = cfg.hex || matHex(cfg.color);
    grow = 0.115 - mw;
    el.innerHTML = '';
    el.style.fontSize = (H / 100) + 'px';
    el.style.backgroundColor = mat === 'none' ? '#000' : col;
    if (mat !== 'none') {
      el.appendChild(h('div', 'paper'));
      // Dims only the mat and adds soft room light, so it reads as paper rather than a glowing screen.
      var light = h('div', 'mat-light');
      light.style.backgroundColor = 'rgba(0,0,0,' + ((10 - S.settings.matBright) * 0.065) + ')';
      el.appendChild(light);
    }

    var bev = Math.max(2, Math.round(H * 0.007));
    var core = isDark(col) ? 'rgba(255,255,255,.22)' : '#f4efe3';
    function ap(x, y, w, ht, src, extra) {
      var d = h('div', 'aperture');
      d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + ht +
        'px;background-image:' + cssUrl(src) + ';' + (extra || '');
      el.appendChild(d);
      return d;
    }
    function bevel(d) {
      d.classList.add('bevel');
      d.style.boxShadow = '0 0 0 ' + bev + 'px ' + core + ', 0 0 0 ' + (bev + 1) + 'px rgba(0,0,0,.10)';
      return d;
    }

    var f, m, d;
    switch (mat) {
      case 'shadowbox':
        m = H * (mw - 0.015);
        f = sharpFit(W - 2 * m, H - 2 * m);
        d = ap((W - f.w) / 2, (H - f.h) / 2, f.w, f.h, main.src);
        d.style.boxShadow = '0 ' + (H * 0.014) + 'px ' + (H * 0.045) + 'px rgba(0,0,0,.45), 0 ' +
          (H * 0.004) + 'px ' + (H * 0.008) + 'px rgba(0,0,0,.35)';
        el.appendChild(h('div', 'box-depth'));
        break;
      case 'panoramic':
        var pw = W * (0.84 + grow), ph = pw / 2.6;
        if (ph > H * 0.56) { ph = H * 0.56; pw = ph * 2.6; }
        bevel(ap((W - pw) / 2, (H - ph) / 2, pw, ph, main.src));
        break;
      case 'triptych':
        var ar = Math.max(main.w / main.h, 1.5);
        f = fit(ar, 1, W * (0.84 + grow), H * (0.7 + grow));
        var g = W * 0.022, panel = (f.w - 2 * g) / 3, x0 = (W - f.w) / 2, y0 = (H - f.h) / 2;
        var sc = Math.max(f.w / main.w, f.h / main.h), bw = main.w * sc, bh = main.h * sc;
        var ox = (f.w - bw) / 2, oy = (f.h - bh) / 2;
        for (var i = 0; i < 3; i++) {
          var px = i * (panel + g);
          bevel(ap(x0 + px, y0, panel, f.h, main.src,
            'background-size:' + bw + 'px ' + bh + 'px;background-position:' + (ox - px) + 'px ' + oy + 'px'));
        }
        break;
      case 'mix':
        m = H * (mw - 0.03);
        var gap = H * 0.04, aw = W - 2 * m - gap, ah = H - 2 * m, lw = aw * 0.6, rw = aw - lw, rh = (ah - gap) / 2;
        bevel(ap(m, m, lw, ah, main.src));
        bevel(ap(m + lw + gap, m, rw, rh, extras[0].src));
        bevel(ap(m + lw + gap, m + rh + gap, rw, rh, extras[1].src));
        break;
      default: // modern
        m = H * mw;
        f = sharpFit(W - 2 * m, H - 2 * m);
        bevel(ap((W - f.w) / 2, (H - f.h) / 2, f.w, f.h, main.src));
    }
  }

  function usesMat(m) { return ['modern', 'shadowbox', 'panoramic', 'triptych', 'mix'].indexOf(m) >= 0; }
  function matFor(art) {
    var o = art && S.matByArt[art.id];
    return { mat: (o && o.mat) || S.settings.mat, color: (o && o.color) || S.settings.matColor };
  }
  function setMatFor(art, patch) {
    S.matByArt[art.id] = Object.assign(matFor(art), patch);
    store.set('matByArt', S.matByArt);
  }

  // The next two works in the same list, for the "Mix" mat.
  function extrasFor(art, list, useThumb) {
    list = list || [];
    var start = 0;
    for (var i = 0; i < list.length; i++) if (list[i].id === art.id) start = i;
    var picks = [];
    for (var k = 1; k < list.length && picks.length < 2; k++) {
      var a = list[(start + k) % list.length];
      if (a.id !== art.id) picks.push(a);
    }
    if (picks.length < 2) return Promise.resolve(null);
    return Promise.all(picks.map(function (a) {
      return useThumb ? loadImg(a.thumb, a.alt, a.full) : loadImg(a.full, a.alt, a.thumb);
    })).then(function (ims) { return ims.map(asMain); }).catch(function () { return null; });
  }

  /* ---------------- Art Mode ---------------- */
  var stageA = $('#stageA'), stageB = $('#stageB');

  function showArt(art, opts) {
    opts = opts || {};
    if (!art) return Promise.resolve();
    var token = ++S.showSeq, cfg;
    return resolveCfg(art).then(function (c) {
      cfg = c;
      return loadImg(art.full, art.alt, art.thumb);
    }).then(function (im) {
      if (token !== S.showSeq) return false;
      var main = asMain(im);
      main.thumb = art.thumb;
      noteAspect(art, main.w, main.h);
      if (opts.inStep && !fits(art)) { S.bad[art.id] = true; return false; }
      var extrasP = cfg.mat === 'mix' ? extrasFor(art, playlist(), false) : Promise.resolve(null);
      return extrasP.then(function (extras) {
        if (token !== S.showSeq) return false;
        var back = S.front === stageA ? stageB : stageA, old = S.front;
        back.classList.toggle('instant', !!opts.instant);
        back.classList.remove('show');
        compose(back, main, cfg, extras);
        back.style.zIndex = 2;
        if (old) old.style.zIndex = 1;
        // next frame so the fade runs
        requestAnimationFrame(function () { requestAnimationFrame(function () { back.classList.add('show'); }); });
        if (old) setTimeout(function () { if (S.front !== old) old.classList.remove('show'); }, opts.instant ? 50 : 1700);
        S.front = back;
        S.current = art;
        store.set('current', art);
        $('#empty').classList.add('hidden');
        if (!opts.quiet) showCaption(art);
        delete S.bad[art.id];
        scheduleSlideshow();
        preloadNext();
        return true;
      });
    }).catch(function () {
      if (token !== S.showSeq) return false;
      S.bad[art.id] = true;
      if (Object.keys(S.dead).length || S.current) {
        // Only blacklist for good if the thumbnail is also unreadable (not just a network blip).
        loadImg(art.thumb).catch(function () { if (navigator.onLine !== false) markDead(art); });
      }
      if (!opts.inStep) {
        toast('“' + art.title + '” couldn’t be loaded.');
        scheduleSlideshow();
      }
      return false;
    });
  }

  // Warms the cache with the next picture so changes are instant, and finds broken ones early.
  function preloadNext() {
    var l = playlist(), i = indexIn(l, S.current);
    if (l.length < 2) return;
    var a = l[(i + 1) % l.length];
    if (a && !S.bad[a.id]) loadImg(a.full, a.alt, a.thumb).catch(function () { S.bad[a.id] = true; });
  }
  function indexIn(l, art) {
    for (var k = 0; k < l.length; k++) if (art && l[k].id === art.id) return k;
    return -1;
  }

  function rerenderCurrent() { if (S.current) showArt(S.current, { instant: true, quiet: true }); }

  function playlist() {
    var pf = S.settings.playFrom, l;
    if (pf === 'favorites') l = S.favorites;
    else if (pf === 'photos') l = S.photos;
    else if (pf === 'saved') l = S.favorites.concat(S.photos);
    else l = S.ctx.list;
    if (!l || !l.length) l = (S.ctx.list && S.ctx.list.length) ? S.ctx.list : S.favorites.concat(S.photos);
    var all = (l || []).filter(alive), ok = all.filter(fits);
    return ok.length ? ok : all;
  }

  // Moves to the next/previous picture, skipping any that won't load.
  function step(dir, auto) {
    var l = playlist();
    if (!l.length) { toast('Nothing to play yet. Choose art from the menu.'); return; }
    var usable = l.filter(function (a) { return !S.bad[a.id]; });
    if (!usable.length) { S.bad = {}; usable = l; }   // everything failed once: try them all again
    var from = S.stepFrom || S.current, i = indexIn(l, from), pick = null;

    if (auto && S.settings.order === 'shuffle' && usable.length > 1) {
      var pool = usable.filter(function (a) { return !(S.current && a.id === S.current.id); });
      pick = pool[Math.floor(Math.random() * pool.length)];
    } else {
      if (i < 0) i = dir > 0 ? -1 : l.length;
      for (var n = 1; n <= l.length; n++) {
        var cand = l[((i + dir * n) % l.length + l.length) % l.length];
        if (!S.bad[cand.id]) { pick = cand; break; }
      }
    }
    if (!pick) return;
    var tries = (S.stepTries || 0) + 1;
    S.stepFrom = pick;
    S.stepTries = tries;
    showArt(pick, { inStep: true }).then(function (ok) {
      if (ok) { S.stepFrom = null; S.stepTries = 0; if (tries > 1) toast('Skipped a picture that couldn’t be loaded'); return; }
      if (S.stepFrom !== pick) return;          // the viewer already moved on
      if (tries < 8 && !(usable.length === 1)) { step(dir, auto); return; }
      S.stepFrom = null; S.stepTries = 0;
      toast('These pictures couldn’t be loaded. Check the internet connection.');
      scheduleSlideshow();
    });
  }

  function scheduleSlideshow() {
    clearTimeout(S.slideTimer);
    var mins = S.settings.interval || (DREAM ? 10 : 0);
    if (!mins || S.paused || S.sleeping) return;
    S.slideTimer = setTimeout(function () { step(1, true); }, mins * 60000);
  }

  function showCaption(art, force) {
    if (!art || (!S.settings.showInfo && !force)) return;
    var cap = $('#caption');
    $('.cap-title', cap).textContent = art.title;
    $('.cap-meta', cap).textContent = [art.artist, art.date].filter(Boolean).join(', ') +
      (art.source && !art.photo ? '  ·  ' + art.source : '');
    cap.classList.add('show');
    clearTimeout(S.capTimer);
    S.capTimer = setTimeout(function () { cap.classList.remove('show'); }, 7000);
  }

  function isNight() { var hr = new Date().getHours(); return hr >= 22 || hr < 6; }
  function applyDisplay() {
    var st = S.settings;
    var dim = (10 - st.brightness) * 0.068;
    if (st.nightMode && isNight()) dim = 1 - (1 - dim) * 0.45;
    $('#dim').style.opacity = dim;
    var tone = $('#tone');
    tone.style.backgroundColor = st.tone >= 0 ? 'rgb(255,168,86)' : 'rgb(140,182,255)';
    tone.style.opacity = Math.abs(st.tone) * 0.05;
    $('#bezel').className = 'bezel-' + st.bezel;
    $('#matte').style.display = st.texture ? 'block' : 'none';
  }

  /* ---------------- Toast & clock ---------------- */
  var toastTimer;
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('show'); }, 3200);
  }
  function tickClock() {
    $('#clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  /* ---------------- Focus management (D-pad) ---------------- */
  function topLayer() { return S.detailOpen ? $('#detail') : $('#menu'); }
  function visible(el) { return el.offsetParent !== null && !el.classList.contains('disabled-nav'); }
  var focusedEl = null;
  function markFocused(el) {
    if (focusedEl && focusedEl !== el) focusedEl.classList.remove('focused');
    focusedEl = el;
    if (el && el.classList) el.classList.add('focused');
    // Leaving the tab bar cancels a pending tab switch, so it can't redraw under you.
    if (el && el.classList && !el.classList.contains('tab')) clearTimeout(tabTimer);
  }
  function currentFocus() {
    var a = document.activeElement;
    if (a && a !== document.body && a.classList && a.classList.contains('focusable')) return a;
    return (focusedEl && document.body.contains(focusedEl)) ? focusedEl : a;
  }
  document.addEventListener('focusin', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('focusable')) markFocused(e.target);
  });
  function focusEl(el) {
    if (!el) return;
    markFocused(el);
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
    catch (e) { el.scrollIntoView(false); }
  }

  function moveFocus(dir) {
    var els = $$('.focusable', topLayer()).filter(visible);
    var cur = currentFocus();
    if (!cur || els.indexOf(cur) < 0) { focusEl(els[0]); return; }
    var r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var best = null, bestScore = Infinity, horiz = dir === 'left' || dir === 'right';
    els.forEach(function (el) {
      if (el === cur) return;
      var q = el.getBoundingClientRect(), ex = q.left + q.width / 2, ey = q.top + q.height / 2;
      var primary, overlap, cross;
      if (horiz) {
        if (dir === 'right' ? ex <= cx + 1 : ex >= cx - 1) return;
        primary = dir === 'right' ? q.left - r.right : r.left - q.right;
        overlap = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
        cross = Math.abs(ey - cy);
      } else {
        if (dir === 'down' ? ey <= cy + 1 : ey >= cy - 1) return;
        primary = dir === 'down' ? q.top - r.bottom : r.top - q.bottom;
        overlap = Math.min(r.right, q.right) - Math.max(r.left, q.left);
        cross = Math.abs(ex - cx);
      }
      var score = Math.max(primary, 0) + (overlap > 0 ? cross * 0.3 : 2000 + cross * 2);
      if (score < bestScore) { bestScore = score; best = el; }
    });
    if (best) focusEl(best);
  }

  function activate(el) {
    if (!el) return;
    if (typeof el._activate === 'function') el._activate();
    else if (el.click) el.click();
  }

  /* ---------------- UI builders ---------------- */
  function button(label, cls, fn) {
    var b = h('button', 'btn focusable ' + (cls || ''), label);
    b._activate = fn;
    b.onclick = fn;
    return b;
  }

  function isFav(art) { return S.favorites.some(function (a) { return a.id === art.id; }); }

  function card(art, list) {
    var c = h('div', 'card focusable pending');
    c.tabIndex = -1;
    var th = h('div', 'thumb'), im = document.createElement('img');
    im.decoding = 'async'; im.alt = '';
    im.onload = function () {
      if (im.naturalWidth < 2) { im.onerror(); return; }
      noteAspect(art, im.naturalWidth, im.naturalHeight);
      if (!fits(art)) { dropCard(c, list, art, 'No pictures here fill the screen.'); return; }
      c.classList.remove('pending');
      var p = c.parentNode;
      if (p) $$('.skeleton', p).forEach(function (sk) { sk.remove(); });
    };
    im.onerror = function () {
      markDead(art, list);
      dropCard(c, null, art, 'No pictures here could be loaded.');
    };
    im.src = art.thumb;
    th.appendChild(im);
    if (S.current && S.current.id === art.id) th.appendChild(h('span', 'badge', 'On the wall'));
    if (isFav(art)) th.appendChild(h('span', 'badge fav', '♥'));
    c.appendChild(th);
    var m = h('div', 'meta');
    m.appendChild(h('div', 't', art.title));
    m.appendChild(h('div', 'a', art.artist));
    c.appendChild(m);
    c._activate = function () { openDetail(art, list); };
    c.onclick = c._activate;
    return c;
  }

  function dropCard(c, list, art, emptyMsg) {
    if (list) for (var i = list.length - 1; i >= 0; i--) if (list[i].id === art.id) list.splice(i, 1);
    var p = c.parentNode, hadFocus = document.activeElement === c;
    c.remove();
    if (p && !$('.card.focusable:not(.more):not(.add)', p) && !$('.skeleton', p) && !p.querySelector('.status')) {
      p.innerHTML = '';
      p.appendChild(h('div', 'status', emptyMsg));
    }
    if (hadFocus) moveFocus('right');
  }

  function tileCard(cls, big, label, fn) {
    var c = h('div', 'card focusable ' + cls);
    c.tabIndex = -1;
    var th = h('div', 'thumb');
    th.appendChild(h('div', 'big', big));
    th.appendChild(h('div', 'lbl', label));
    c.appendChild(th);
    c.appendChild(h('div', 'meta'));
    c._activate = fn; c.onclick = fn;
    return c;
  }

  function skeletons(n) {
    var f = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var c = h('div', 'card skeleton');
      c.appendChild(h('div', 'thumb'));
      var m = h('div', 'meta'); m.appendChild(h('div', 't', '\u00a0')); c.appendChild(m);
      f.appendChild(c);
    }
    return f;
  }

  function viewHead(title, text, actions) {
    var head = h('div', 'view-head'), left = h('div');
    left.appendChild(h('h1', null, title));
    if (text) left.appendChild(h('p', null, text));
    head.appendChild(left);
    if (actions && actions.length) {
      var a = h('div', 'head-actions');
      actions.forEach(function (b) { a.appendChild(b); });
      head.appendChild(a);
    }
    return head;
  }

  function grid(list, ctxName, leading) {
    var g = h('div', 'grid');
    if (leading) g.appendChild(leading);
    list.forEach(function (a) { g.appendChild(card(a, list)); });
    g._ctxName = ctxName;
    return g;
  }

  /* ---------------- Menu ---------------- */
  function openMenu(tab) {
    if (DREAM) return;
    S.menuOpen = true;
    $('#menu').classList.remove('hidden');
    $('#caption').classList.remove('show');
    tickClock();
    renderTab(tab || S.tab, true);
  }
  function closeMenu() {
    S.menuOpen = false; S.sub = null;
    $('#menu').classList.add('hidden');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  var tabTimer;
  var TAB_RENDER = { store: renderStore, photos: renderPhotos, favorites: renderFavorites,
    music: function (p) { renderMusic(p); }, settings: renderSettings };

  function renderTab(tab, focusContent) {
    clearTimeout(tabTimer);
    S.tab = tab; S.sub = null; S.renderSeq++;
    $$('.tab').forEach(function (t) { t.classList.toggle('active', t.getAttribute('data-tab') === tab); });
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    TAB_RENDER[tab](p);
    if (focusContent) focusEl($('.focusable', p) || $('.tab.active'));
  }

  // Highlighting a tab switches to it, like the TV's own menu.
  $$('.tab').forEach(function (t) {
    var tab = t.getAttribute('data-tab');
    t._activate = function () { renderTab(tab, true); };
    t.onclick = t._activate;
    t.addEventListener('focus', function () {
      clearTimeout(tabTimer);
      if (tab !== S.tab || S.sub) tabTimer = setTimeout(function () { renderTab(tab, false); }, 220);
    });
  });

  function setContext(list, name) {
    S.ctx = { list: list.slice(0, 120), name: name || '' };
    store.set('ctx', S.ctx);
  }

  function playList(list, name) {
    if (!list.length) { toast('There is nothing here to play yet.'); return; }
    setContext(list, name);
    S.settings.playFrom = 'current';
    var note = '';
    if (!S.settings.interval) { S.settings.interval = 30; note = ', changing every 30 minutes'; }
    saveSettings();
    var start = S.settings.order === 'shuffle' ? list[Math.floor(Math.random() * list.length)] : list[0];
    closeMenu();
    showArt(start);
    toast('Playing ' + (name || 'selection') + note);
  }

  /* Art Store */
  function renderStore(p) {
    var seq = S.renderSeq;
    p.appendChild(viewHead('Art Store', 'Free, public-domain works from the Art Institute of Chicago, the Cleveland Museum of Art and The Met.',
      [button('Search the collections', '', openSearch)]));
    var rows = COLLECTIONS.map(function (c) {
      var row = h('section', 'row'), title = h('h2', null, c.name);
      title.appendChild(h('small', null, c.note));
      row.appendChild(title);
      var scroll = h('div', 'row-scroll'), track = h('div', 'row-track');
      track.appendChild(skeletons(6));
      scroll.appendChild(track); row.appendChild(scroll); p.appendChild(row);
      return { c: c, track: track };
    });
    var i = 0;
    function next() {
      if (i >= rows.length || seq !== S.renderSeq) return Promise.resolve();
      var r = rows[i++];
      return loadCollection(r.c).then(function (items) {
        if (seq !== S.renderSeq) return;
        var hadFocus = r.track.contains(document.activeElement);
        r.track.innerHTML = '';
        if (!items.length) {
          r.track.appendChild(h('div', 'status', 'This collection could not be reached. Check the internet connection and try again.'));
          return;
        }
        var showList = items.filter(fits);
        if (!showList.length) {
          r.track.appendChild(h('div', 'status', 'No pictures in this collection fill the screen.'));
          return;
        }
        showList.slice(0, 22).forEach(function (a) { r.track.appendChild(card(a, showList)); });
        r.track.appendChild(skeletons(3));
        r.track.appendChild(tileCard('more', '›', 'See all ' + showList.length, function () { openCollection(r.c); }));
        if (hadFocus) focusEl($('.focusable', r.track));
      }).then(next);
    }
    next(); next(); // two rows load in parallel
  }

  function openCollection(c) {
    S.sub = { type: 'collection' }; S.renderSeq++;
    var seq = S.renderSeq, p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    var play = button('Play this collection', 'primary', function () { });
    p.appendChild(viewHead(c.name, c.note + '. Press Back to return to the Art Store.', [play]));
    var status = h('div', 'status', 'Loading…');
    p.appendChild(status);
    focusEl(play);
    loadCollection(c).then(function (items) {
      if (seq !== S.renderSeq) return;
      status.remove();
      play._activate = play.onclick = function () { playList(items, c.name); };
      items = items.filter(fits);
      var g = grid(items, c.name);
      p.appendChild(g);
      focusEl(play);
    });
  }

  function openSearch() {
    S.sub = { type: 'search' }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    p.appendChild(viewHead('Search', 'Try an artist, a subject or a place: Monet, cats, Venice, snow.'));
    var wrap = h('div', 'search-wrap'), inp = document.createElement('input');
    inp.type = 'search'; inp.className = 'search focusable'; inp.placeholder = 'Search public-domain art';
    inp.setAttribute('enterkeyhint', 'search');
    var go = button('Search', 'primary', run);
    wrap.appendChild(inp); wrap.appendChild(go);
    p.appendChild(wrap);
    var results = h('div');
    p.appendChild(results);
    inp._activate = function () { inp.focus(); inp.click(); };
    inp.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 && inp.value.trim()) { e.preventDefault(); e.stopPropagation(); run(); }
    });
    function run() {
      var q = inp.value.trim();
      if (!q) { inp.focus(); return; }
      inp.blur();
      var seq = ++S.renderSeq;
      S.sub = { type: 'search' };
      results.innerHTML = '';
      results.appendChild(h('div', 'status', 'Searching for “' + q + '”…'));
      Promise.all([aicSearch(q, 30).catch(function () { return []; }), cmaSearch(q, null, 30).catch(function () { return []; })])
        .then(function (lists) {
          if (seq !== S.renderSeq) return;
          var items = interleave(lists, 60).filter(shown);
          results.innerHTML = '';
          if (!items.length) {
            results.appendChild(h('div', 'status', 'No public-domain art matched “' + q + '”. Try a broader word.'));
            focusEl(inp);
            return;
          }
          var playBtn = button('Play these results', '', function () { playList(items, '“' + q + '”'); });
          var bar = h('div', 'search-wrap');
          bar.appendChild(h('div', 'status', items.length + ' works'));
          bar.appendChild(playBtn);
          results.appendChild(bar);
          var g = grid(items, q);
          results.appendChild(g);
          focusEl(playBtn);
        });
    }
    focusEl(inp);
  }

  /* My Photos */
  function refreshPhotos() {
    var raw = native('listPhotos');
    var arr = [];
    try { arr = raw ? JSON.parse(raw) : []; } catch (e) {}
    if (!NATIVE && S.simPhotos) arr = S.simPhotos.slice();
    S.photos = arr.map(function (p) {
      var d = new Date(p.time);
      return {
        id: 'photo:' + p.name, photo: p.name, title: 'My photo',
        artist: d.toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' }),
        date: '', source: 'My Photos', thumb: p.thumb, full: p.url, alt: p.thumb
      };
    });
  }

  function renderPhotos(p) {
    refreshPhotos();
    var play = button('Play my photos', 'primary', function () { playList(S.photos, 'My Photos'); });
    p.appendChild(viewHead('My Photos',
      S.photos.length ? S.photos.length + ' photo' + (S.photos.length === 1 ? '' : 's') + ' on this TV.' :
        'Send pictures from your phone and they appear here, ready to frame.', S.photos.length ? [play] : []));
    var add = tileCard('add', '+', 'Add from phone', openUpload);
    p.appendChild(grid(S.photos.filter(fits), 'My Photos', add));
  }

  function openUpload() {
    S.sub = { type: 'upload' }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = '';
    var url = native('uploadUrl') || '';
    var qr = native('uploadQr') || '';
    var done = button('Done', 'primary', function () { renderTab('photos', true); });
    p.appendChild(viewHead('Add photos from your phone', null, [done]));
    var box = h('div', 'upload');
    if (qr) {
      var q = h('div', 'qr'), img = document.createElement('img');
      img.src = qr; img.alt = 'QR code for ' + url;
      q.appendChild(img); box.appendChild(q);
    }
    var steps = h('div', 'steps');
    if (url) {
      steps.appendChild(h('p', null, 'Connect your phone to the same Wi-Fi network as this Fire TV, then scan the code or open:'));
      steps.appendChild(h('div', 'url', url));
      steps.appendChild(h('p', null, 'Choose your photos and tap Send. They show up here as soon as they arrive.'));
      var cnt = h('p', 'count', photoCountText());
      cnt.id = 'photoCount';
      steps.appendChild(cnt);
    } else if (NATIVE) {
      steps.appendChild(h('p', null, 'This Fire TV is not connected to a local network. Connect it to Wi-Fi or Ethernet and open this page again.'));
    } else {
      steps.appendChild(h('p', null, 'Phone upload works on the Fire TV. In the simulator, use “Add photos from this computer” in the side panel instead.'));
    }
    box.appendChild(steps);
    p.appendChild(box);
    focusEl(done);
  }

  function photoCountText() {
    return S.photos.length === 1 ? '1 photo on this TV' : S.photos.length + ' photos on this TV';
  }

  window.onPhotosChanged = function () {
    refreshPhotos();
    var c = $('#photoCount');
    if (c) c.textContent = photoCountText();
    toast('New photo received');
    if (S.menuOpen && S.tab === 'photos' && !S.sub) renderTab('photos', false);
  };

  /* Favorites */
  function renderFavorites(p) {
    var play = button('Play favorites', 'primary', function () { playList(S.favorites, 'Favorites'); });
    p.appendChild(viewHead('Favorites',
      S.favorites.length ? 'Your personal gallery. Open any work to change its mat or remove it.' :
        'Open any artwork and choose Add to favorites to build your own gallery here.',
      S.favorites.length ? [play] : []));
    S.favorites = S.favorites.filter(alive);
    var favShown = S.favorites.filter(fits);
    if (S.favorites.length && !favShown.length) p.appendChild(h('div', 'status', 'None of your favorites fill the screen. Turn off “Only pictures that fill the screen” in Settings to see them.'));
    if (favShown.length) p.appendChild(grid(favShown, 'Favorites'));
  }

  /* Settings */
  function fmtInterval(v) {
    if (!v) return 'Off';
    if (v < 60) return v + ' min';
    if (v < 1440) return (v / 60) + (v === 60 ? ' hour' : ' hours');
    return '1 day';
  }
  var SETTINGS = [
    { group: 'Picture' },
    { key: 'brightness', label: 'Brightness', values: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], clamp: true, bar: true, fmt: String },
    { key: 'tone', label: 'Color tone', values: [-4, -3, -2, -1, 0, 1, 2, 3, 4], clamp: true,
      fmt: function (v) { return v === 0 ? 'Standard' : (v < 0 ? 'Cool ' + (-v) : 'Warm ' + v); } },
    { key: 'texture', label: 'Matte finish', hint: 'Soft canvas grain that reduces the screen look', values: [true, false],
      fmt: function (v) { return v ? 'On' : 'Off'; } },
    { key: 'bezel', label: 'Frame bezel', hint: 'Draws a picture-frame border around the screen', values: ['none', 'white', 'beige', 'teak', 'walnut', 'black'],
      fmt: function (v) { return v === 'none' ? 'None' : v.charAt(0).toUpperCase() + v.slice(1); } },
    { group: 'Picture style' },
    { key: 'mat', label: 'Picture style', hint: 'Auto fills the TV, or blurs the edges for pictures that don’t fit', values: MAT_STYLES.map(function (m) { return m.id; }),
      fmt: function (v) { return MAT_STYLES.filter(function (m) { return m.id === v; })[0].name; } },
    { key: 'fillOnly', label: 'Only pictures that fill the screen', hint: 'Hides art that would need more than a light crop to fill the TV',
      values: [0, 6, 12, 20], fmt: function (v) { return { 0: 'Off', 6: 'On (strict)', 12: 'On', 20: 'On (relaxed)' }[v]; } },
    { key: 'matBright', label: 'Mat brightness', hint: 'Paper mat styles only', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], clamp: true, bar: true, fmt: String },
    { key: 'matWidth', label: 'Border width', hint: 'Paper mat and gallery wall', values: ['slim', 'standard', 'wide'],
      fmt: function (v) { return { slim: 'Slim', standard: 'Standard', wide: 'Wide' }[v]; } },
    { key: 'matColor', label: 'Mat color', hint: 'Paper mat styles only', swatch: true, values: MAT_COLORS.map(function (m) { return m.id; }),
      fmt: function (v) { return MAT_COLORS.filter(function (m) { return m.id === v; })[0].name; } },
    { group: 'Slideshow' },
    { key: 'interval', label: 'Change every', values: [0, 3, 10, 30, 60, 180, 720, 1440], fmt: fmtInterval },
    { key: 'playFrom', label: 'Play from', values: ['current', 'favorites', 'photos', 'saved'],
      fmt: function (v) {
        return { current: S.ctx.name ? 'Current: ' + S.ctx.name : 'Current selection', favorites: 'Favorites', photos: 'My Photos', saved: 'Favorites + photos' }[v];
      } },
    { key: 'order', label: 'Order', values: ['sequential', 'shuffle'], fmt: function (v) { return v === 'shuffle' ? 'Shuffle' : 'In order'; } },
    { key: 'showInfo', label: 'Show art info', hint: 'Title and artist appear briefly when the art changes', values: [true, false],
      fmt: function (v) { return v ? 'On' : 'Off'; } },
    { group: 'Power' },
    { key: 'sleepAfter', label: 'Sleep after', hint: 'Turns the art off after no remote use; Fire TV can then sleep', values: [0, 1, 2, 4, 8, 12, 24],
      fmt: function (v) { return v ? v + (v === 1 ? ' hour' : ' hours') : 'Off'; } },
    { key: 'nightMode', label: 'Night mode', hint: 'Dims the art between 10 PM and 6 AM', values: [false, true],
      fmt: function (v) { return v ? 'On' : 'Off'; } }
  ];

  function stepperEl(def, get, set) {
    var r = h('div', 'stepper focusable');
    r.tabIndex = -1;
    function draw() {
      r.innerHTML = '';
      var l = h('span', 'lbl', def.label);
      if (def.hint) l.appendChild(h('span', 'hint', def.hint));
      r.appendChild(l);
      var la = h('span', 'arr', '‹');
      la.onclick = function (ev) { ev.stopPropagation(); focusEl(r); r._step(-1); };
      r.appendChild(la);
      var v = h('span', 'val'), val = get();
      if (def.bar) {
        var bar = h('span', 'bar');
        for (var i = 1; i <= 10; i++) bar.appendChild(h('i', i <= val ? 'on' : ''));
        v.appendChild(bar);
      }
      if (def.swatch) {
        var sw = h('span', 'swatch');
        sw.style.background = val === 'auto' ? 'linear-gradient(135deg,#e2b38e,#ece6da 45%,#a7c1b4 75%,#b3aac5)' : matHex(val);
        v.appendChild(sw);
      }
      v.appendChild(document.createTextNode(def.fmt(val)));
      r.appendChild(v);
      var ra = h('span', 'arr', '›');
      ra.onclick = function (ev) { ev.stopPropagation(); focusEl(r); r._step(1); };
      r.appendChild(ra);
    }
    r._step = function (d) {
      var vals = def.values, i = vals.indexOf(get());
      if (i < 0) i = 0;
      var n = i + d;
      if (def.clamp) n = Math.max(0, Math.min(vals.length - 1, n));
      else n = (n + vals.length) % vals.length;
      set(vals[n]);
      draw();
    };
    r._activate = function () { r._step(1); };
    r.onclick = function () { focusEl(r); r._step(1); };
    r._redraw = draw;
    draw();
    return r;
  }

  function renderSettings(p) {
    p.appendChild(viewHead('Settings', 'Use ◀ ▶ to change a setting. Changes apply to the wall straight away.'));
    var list = h('div', 'settings');
    SETTINGS.forEach(function (def) {
      if (def.group) { list.appendChild(h('div', 'group-title', def.group)); return; }
      list.appendChild(stepperEl(def,
        function () { return S.settings[def.key]; },
        function (v) {
          S.settings[def.key] = v;
          saveSettings();
          applyDisplay();
          if (/^mat/.test(def.key)) rerenderCurrent();
          if (def.key === 'interval' || def.key === 'playFrom') scheduleSlideshow();
          if (def.key === 'fillOnly') {
            if (S.current && !fits(S.current)) step(1); else rerenderCurrent();
          }
        }));
    });
    var reset = button('Refresh the art store', '', function () {
      S.cache = {}; saveCache(); toast('The art store will reload fresh collections');
    });
    reset.style.marginLeft = '0';
    reset.style.marginTop = '3vh';
    list.appendChild(reset);
    var about = h('div', 'about focusable');
    about.tabIndex = -1;
    about.textContent = 'Atelier shows public-domain and CC0 artwork from the open-access programs of the Art Institute of Chicago, ' +
      'the Cleveland Museum of Art and The Metropolitan Museum of Art. Your own photos stay on this TV.';
    list.appendChild(about);
    p.appendChild(list);
  }

  /* ---------------- Detail ---------------- */
  var dMatDef = { label: 'Picture style', values: MAT_STYLES.map(function (m) { return m.id; }),
    fmt: function (v) { return MAT_STYLES.filter(function (m) { return m.id === v; })[0].name; } };
  var dColDef = { label: 'Mat color', swatch: true, values: MAT_COLORS.map(function (m) { return m.id; }),
    fmt: function (v) { return MAT_COLORS.filter(function (m) { return m.id === v; })[0].name; } };

  function buildDetailSteppers() {
    var art = S.detail.art;
    var mat = stepperEl(dMatDef, function () { return matFor(art).mat; },
      function (v) { setMatFor(art, { mat: v }); afterMatChange(); });
    var col = stepperEl(dColDef, function () { return matFor(art).color; },
      function (v) { setMatFor(art, { color: v }); afterMatChange(); });
    mat.id = 'dMat'; col.id = 'dColor';
    $('#dMat').replaceWith(mat);
    $('#dColor').replaceWith(col);
  }
  function afterMatChange() {
    var art = S.detail.art;
    $('#dColor').classList.toggle('disabled', !usesMat(matFor(art).mat));
    renderPreview();
    if (S.current && S.current.id === art.id) rerenderCurrent();
  }

  function openDetail(art, list) {
    S.detailOpen = true;
    S.detail = { art: art, list: list || [art] };
    S.returnFocus = document.activeElement;
    $('#detail').classList.remove('hidden');
    $('.d-source').textContent = art.source || '';
    $('.d-title').textContent = art.title;
    $('.d-artist').textContent = art.artist || '';
    $('.d-date').textContent = art.date || '';
    $('#dDel').style.display = art.photo ? '' : 'none';
    buildDetailSteppers();
    $('#dColor').classList.toggle('disabled', !usesMat(matFor(art).mat));
    updateDetailButtons();
    renderPreview();
    focusEl($('#dShow'));
  }
  function updateDetailButtons() {
    var art = S.detail.art;
    $('#dFav').textContent = isFav(art) ? '♥  In favorites (press to remove)' : '♡  Add to favorites';
    $('#dShow').textContent = (S.current && S.current.id === art.id) ? 'On the wall now. Return to Art Mode' : 'Display on wall';
  }
  function closeDetail() {
    S.detailOpen = false;
    S.pvSeq++;
    $('#detail').classList.add('hidden');
    if (S.menuOpen) {
      var rf = S.returnFocus;
      if (rf && document.body.contains(rf)) focusEl(rf);
      else focusEl($('.focusable', $('#panel')));
    }
  }
  function renderPreview() {
    var d = S.detail, art = d.art, pv = $('#pv'), token = ++S.pvSeq, cfg;
    resolveCfg(art).then(function (c) {
      cfg = c;
      return cfg.mat === 'mix' ? extrasFor(art, d.list, true) : null;
    }).then(function (extras) {
      loadImg(art.thumb, art.full).then(function (im) {
        if (token === S.pvSeq) { var mn = asMain(im); mn.thumb = art.thumb; compose(pv, mn, cfg, extras); }
        return loadImg(art.full, art.alt);
      }).then(function (im) {
        if (token === S.pvSeq) { var mn = asMain(im); mn.thumb = art.thumb; compose(pv, mn, cfg, extras); }
      }).catch(function () {});
    });
  }

  $('#dShow')._activate = $('#dShow').onclick = function () {
    var d = S.detail;
    if (!(S.current && S.current.id === d.art.id)) {
      var name = $('#panel .view-head h1') ? $('#panel .view-head h1').textContent : '';
      if (S.tab === 'store' && !S.sub) {
        var row = S.returnFocus && S.returnFocus.closest && S.returnFocus.closest('.row');
        name = row ? $('h2', row).firstChild.textContent : 'Art Store';
      }
      setContext(d.list, name);
      S.settings.playFrom = 'current';
      saveSettings();
      showArt(d.art);
    }
    closeDetail();
    closeMenu();
  };
  $('#dFav')._activate = $('#dFav').onclick = function () {
    var art = S.detail.art;
    if (isFav(art)) {
      S.favorites = S.favorites.filter(function (a) { return a.id !== art.id; });
      toast('Removed from favorites');
    } else {
      S.favorites.unshift(art);
      toast('Added to favorites');
    }
    saveFavs();
    updateDetailButtons();
    if (S.tab === 'favorites' && !S.sub) renderTab('favorites', false);
  };
  $('#dDel')._activate = $('#dDel').onclick = function () {
    var art = S.detail.art;
    if (!art.photo) return;
    native('deletePhoto', art.photo);
    if (!NATIVE) S.simPhotos = S.simPhotos.filter(function (p) { return p.name !== art.photo; });
    S.favorites = S.favorites.filter(function (a) { return a.id !== art.id; }); saveFavs();
    S.ctx.list = S.ctx.list.filter(function (a) { return a.id !== art.id; }); store.set('ctx', S.ctx);
    refreshPhotos();
    toast('Photo deleted');
    var wasCurrent = S.current && S.current.id === art.id;
    S.returnFocus = null;
    closeDetail();
    renderTab(S.tab, true);
    if (wasCurrent) step(1);
  };

  /* ---------------- Background music ---------------- */
  // Free, music-only internet radio. Each style has hand-picked stations, plus a fallback
  // search of the free Radio Browser directory if those are unavailable.
  var MUSIC_STYLES = [
    { id: 'classical', name: 'Classical', note: 'Calm orchestral and chamber music', bg: ['#6a5640', '#2b231b'],
      streams: [['Radio Swiss Classic', 'https://stream.srg-ssr.ch/m/rsc_de/mp3_128']], tags: ['classical', 'classical music'] },
    { id: 'piano', name: 'Solo piano', note: 'Quiet piano that suits any art', bg: ['#4d4f57', '#1f2024'],
      streams: [], tags: ['piano', 'solo piano', 'classical piano'] },
    { id: 'jazz', name: 'Jazz', note: 'Smooth and classic jazz', bg: ['#6b3f2c', '#2a1812'],
      streams: [['Radio Swiss Jazz', 'https://stream.srg-ssr.ch/m/rsj/mp3_128'], ['SomaFM Sonic Universe', 'https://ice2.somafm.com/sonicuniverse-128-mp3']], tags: ['jazz', 'smooth jazz'] },
    { id: 'ambient', name: 'Ambient', note: 'Slow, spacious soundscapes', bg: ['#33505a', '#141f24'],
      streams: [['SomaFM Drone Zone', 'https://ice2.somafm.com/dronezone-128-mp3']], tags: ['ambient', 'meditation'] },
    { id: 'chill', name: 'Chill and lo-fi', note: 'Mellow downtempo beats', bg: ['#5a4a66', '#211a27'],
      streams: [['SomaFM Groove Salad', 'https://ice2.somafm.com/groovesalad-128-mp3'], ['SomaFM Fluid', 'https://ice2.somafm.com/fluid-128-mp3']], tags: ['lofi', 'chillout'] },
    { id: 'acoustic', name: 'Acoustic and folk', note: 'Guitars, voices and strings', bg: ['#6a6040', '#29251a'],
      streams: [['SomaFM Folk Forward', 'https://ice2.somafm.com/folkfwd-128-mp3']], tags: ['acoustic', 'folk'] },
    { id: 'lounge', name: 'Lounge', note: 'Soft vocals and easy grooves', bg: ['#6a3f4c', '#29171d'],
      streams: [['SomaFM Lush', 'https://ice2.somafm.com/lush-128-mp3'], ['SomaFM Secret Agent', 'https://ice2.somafm.com/secretagent-128-mp3']], tags: ['lounge'] },
    { id: 'worship', name: 'Hymns and worship', note: 'Hymns, choirs and worship music', bg: ['#5c5a6e', '#22212b'],
      streams: [], tags: ['worship', 'hymns', 'christian'] },
    { id: 'easy', name: 'Easy listening', note: 'Gentle pop and familiar songs', bg: ['#40606a', '#182529'],
      streams: [['Radio Swiss Pop', 'https://stream.srg-ssr.ch/m/rsp/mp3_128']], tags: ['easy listening', 'oldies'] }
  ];
  var MUSIC_APPS = [
    { id: 'spotify', name: 'Spotify', pkg: 'com.spotify.tv.android', bg: ['#1f5c38', '#0d2617'],
      tip: 'Pick a playlist in Spotify on the TV, or on your phone tap the speaker icon and choose this Fire TV.' },
    { id: 'amazon', name: 'Amazon Music', pkg: 'com.amazon.bueller.music', bg: ['#1f4f63', '#0c2029'],
      tip: 'Start a playlist in Amazon Music, or just say “Alexa, play relaxing jazz” into the remote.' },
    { id: 'apple', name: 'Apple Music', pkg: 'com.apple.android.music', bg: ['#6a2a3a', '#2a1017'],
      tip: 'Start a playlist in Apple Music on the TV.' }
  ];
  function musicStyle(id) { return MUSIC_STYLES.filter(function (m) { return m.id === id; })[0]; }

  var audio = new Audio();
  audio.preload = 'none';
  var M = { token: 0, cands: [], idx: -1, fetched: false, playing: false, blocked: false, timer: null, fade: null };

  function musicTarget() {
    var v = Math.pow((S.settings.musicVolume || 4) / 10, 1.6);
    if (S.settings.nightMode && isNight()) v *= 0.6;
    return Math.max(0, Math.min(1, v));
  }
  function fadeTo(target, ms, done) {
    clearInterval(M.fade);
    var start = audio.volume, t0 = Date.now();
    M.fade = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / (ms || 2500));
      try { audio.volume = start + (target - start) * k; } catch (e) {}
      if (k >= 1) { clearInterval(M.fade); if (done) done(); }
    }, 60);
  }

  function radioBrowser(tags) {
    var hosts = ['de1', 'de2', 'fi1', 'at1', 'nl1'];
    function query(hi, ti) {
      if (ti >= tags.length) return Promise.resolve([]);
      if (hi >= hosts.length) return query(0, ti + 1);
      var url = 'https://' + hosts[hi] + '.api.radio-browser.info/json/stations/search?tag=' + enc(tags[ti]) +
        '&is_https=true&hidebroken=true&order=clickcount&reverse=true&limit=25';
      return getJSON(url).then(function (list) {
        var out = (list || []).filter(function (x) {
          var u = x.url_resolved || x.url || '';
          return u.indexOf('https://') === 0 && !x.hls && /MP3|AAC/i.test(x.codec || 'MP3');
        }).map(function (x) { return { name: (x.name || 'Radio').trim(), url: x.url_resolved || x.url }; });
        return out.length ? out : query(0, ti + 1);
      }, function () { return query(hi + 1, ti); });
    }
    return query(0, 0);
  }

  function musicStart(announce) {
    var st = musicStyle(S.settings.musicStyle);
    musicHalt();
    if (DREAM || S.settings.musicSource !== 'free' || !st || S.sleeping) { renderMusicStatus(); return; }
    var tok = ++M.token;
    M.cands = st.streams.map(function (x) { return { name: x[0], url: x[1] }; });
    M.idx = -1; M.fetched = false; M.style = st;
    nextStream(tok, announce);
  }
  function nextStream(tok, announce) {
    if (tok !== M.token) return;
    clearTimeout(M.timer);
    M.idx++;
    if (M.idx >= M.cands.length) {
      if (!M.fetched) {
        M.fetched = true;
        radioBrowser(M.style.tags).then(function (list) {
          if (tok !== M.token) return;
          var have = {}; M.cands.forEach(function (c) { have[c.url] = 1; });
          list.forEach(function (c) { if (!have[c.url]) { have[c.url] = 1; M.cands.push(c); } });
          M.idx--; nextStream(tok, announce);
        });
        return;
      }
      M.now = null;
      renderMusicStatus();
      toast('Couldn’t reach any ' + M.style.name.toLowerCase() + ' stations. Trying again in 2 minutes.');
      M.timer = setTimeout(function () { if (tok === M.token) musicStart(false); }, 120000);
      return;
    }
    var c = M.cands[M.idx];
    M.playing = false; M.now = c;
    try { audio.volume = 0; } catch (e) {}
    audio.src = c.url;
    M.timer = setTimeout(function () { if (tok === M.token && !M.playing) nextStream(tok, announce); }, 12000);
    M.announce = announce;
    var p;
    try { p = audio.play(); } catch (e) {}
    if (p && p.catch) p.catch(function (err) {
      if (tok !== M.token) return;
      if (err && err.name === 'NotAllowedError') {
        clearTimeout(M.timer);
        M.blocked = true;
        toast('Press OK or click the TV to start the music');
      }
    });
    renderMusicStatus();
  }
  audio.addEventListener('playing', function () {
    if (M.playing) return;
    M.playing = true; M.blocked = false;
    clearTimeout(M.timer);
    fadeTo(musicTarget(), 3000);
    if (M.announce && M.now) toast('♪ ' + M.style.name + ' · ' + M.now.name);
    M.announce = false;
    renderMusicStatus();
  });
  function streamDropped() {
    if (S.settings.musicSource !== 'free' || !M.style || !M.now) return;
    var tok = M.token, c = M.now;
    c.fails = (c.fails || 0) + 1;
    if (M.playing && c.fails < 3) M.idx--;            // a station that was working: reconnect to it
    M.playing = false;
    clearTimeout(M.timer);
    M.timer = setTimeout(function () { nextStream(tok, false); }, 1500);
  }
  audio.addEventListener('error', function () { if (audio.getAttribute('src')) streamDropped(); });
  audio.addEventListener('ended', streamDropped);

  function musicHalt() {
    M.token++;
    clearTimeout(M.timer); clearInterval(M.fade);
    M.playing = false; M.blocked = false;
    try { audio.pause(); } catch (e) {}
    audio.removeAttribute('src');
    try { audio.load(); } catch (e) {}
  }
  function musicStop() {
    if (!M.playing) { musicHalt(); renderMusicStatus(); return; }
    var tok = M.token;
    fadeTo(0, 1200, function () { if (tok === M.token) { musicHalt(); renderMusicStatus(); } });
  }
  function musicUnblock() {
    if (!M.blocked) return;
    M.blocked = false;
    try { var p = audio.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
  }
  function setMusic(source, style) {
    S.settings.musicSource = source;
    if (style) S.settings.musicStyle = style;
    saveSettings();
    if (source === 'free') musicStart(true); else musicStop();
  }
  window.onAppPause = function () { musicHalt(); };
  window.onAppResume = function () { if (S.settings.musicSource === 'free' && !S.sleeping) musicStart(false); };
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.onAppPause(); else window.onAppResume();
  });

  /* Music tab */
  function musicTile(name, note, bg, badge, fn) {
    var c = h('div', 'card focusable music-tile');
    c.tabIndex = -1;
    var th = h('div', 'thumb');
    th.style.background = 'linear-gradient(150deg,' + bg[0] + ' 0%,' + bg[1] + ' 100%)';
    th.appendChild(h('div', 'mt-name', name));
    th.appendChild(h('div', 'mt-note', note));
    if (badge) th.appendChild(h('span', 'badge', badge));
    c.appendChild(th);
    c._activate = fn; c.onclick = fn;
    return c;
  }
  function renderMusicStatus() {
    var el = $('#musicStatus');
    if (!el) return;
    var st = S.settings;
    if (st.musicSource === 'free' && M.style) {
      el.textContent = M.playing ? '♪ Now playing: ' + M.style.name + (M.now ? ' · ' + M.now.name : '') :
        (M.blocked ? 'Press OK to start the music.' : 'Connecting to ' + M.style.name.toLowerCase() + '…');
    } else if (st.musicSource === 'app') {
      el.textContent = 'Using your music app. Atelier stays silent so your music isn’t interrupted.';
    } else {
      el.textContent = 'Music is off.';
    }
  }
  function renderMusic(p) {
    p.appendChild(viewHead('Music', 'Free background music while your art is on the wall, or play from your own music app.'));
    var status = h('div', 'status music-status'); status.id = 'musicStatus';
    p.appendChild(status);

    p.appendChild(h('div', 'group-title', 'Free music'));
    var g = h('div', 'grid');
    var st = S.settings;
    g.appendChild(musicTile('Off', 'No music', ['#3a3936', '#1c1b19'], st.musicSource === 'off' ? 'Selected' : '', function () {
      setMusic('off'); renderTab('music', false); focusEl($('.music-tile'));
    }));
    MUSIC_STYLES.forEach(function (m, i) {
      var on = st.musicSource === 'free' && st.musicStyle === m.id;
      g.appendChild(musicTile(m.name, m.note, m.bg, on ? 'Playing' : '', function () {
        setMusic('free', m.id); renderTab('music', false); focusEl($$('.music-tile')[i + 1]);
      }));
    });
    p.appendChild(g);

    var list = h('div', 'settings');
    list.style.marginTop = '2vh';
    list.appendChild(stepperEl({ label: 'Music volume', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], clamp: true, bar: true, fmt: String },
      function () { return S.settings.musicVolume; },
      function (v) { S.settings.musicVolume = v; saveSettings(); if (M.playing) fadeTo(musicTarget(), 400); }));
    list.appendChild(stepperEl({ label: 'Show station name', hint: 'Briefly when the music starts', values: [true, false], fmt: function (v) { return v ? 'On' : 'Off'; } },
      function () { return S.settings.musicAnnounce; },
      function (v) { S.settings.musicAnnounce = v; saveSettings(); }));
    p.appendChild(list);

    p.appendChild(h('div', 'group-title', 'Your music app'));
    var g2 = h('div', 'grid');
    MUSIC_APPS.forEach(function (a, i) {
      var on = st.musicSource === 'app' && st.musicApp === a.id;
      g2.appendChild(musicTile(a.name, 'Open ' + a.name + ', start your music, then come back', a.bg, on ? 'Selected' : '', function () {
        S.settings.musicApp = a.id;
        setMusic('app');
        renderTab('music', false);
        focusEl($$('.music-tile')[MUSIC_STYLES.length + 1 + i]);
        if (!NATIVE) { toast('On the Fire TV this opens ' + a.name); return; }
        if (native('launchApp', a.pkg)) toast('When your music is playing, press Home and open Atelier again');
        else toast(a.name + ' isn’t installed on this Fire TV. You can get it from the Amazon Appstore.');
      }));
    });
    p.appendChild(g2);
    var how = h('div', 'about focusable');
    how.tabIndex = -1;
    how.textContent = 'How it works: Atelier opens your music app. Start a playlist there (Spotify can also be started from your phone ' +
      'by choosing this Fire TV as the speaker, and Amazon Music by asking Alexa). Then press Home and open Atelier again. ' +
      'The music keeps playing while your art is on screen, and Atelier stays silent so it doesn’t interrupt. ' +
      MUSIC_APPS.map(function (a) { return a.tip; }).join(' ');
    p.appendChild(how);
    renderMusicStatus();
  }

  /* ---------------- Sleep ---------------- */
  function noteActivity() { S.lastActivity = Date.now(); }
  function enterSleep() {
    S.sleeping = true;
    clearTimeout(S.slideTimer);
    closeDetail(); closeMenu();
    $('#sleep').classList.remove('hidden');
    native('setKeepScreenOn', false);
    musicStop();
  }
  function wake() {
    S.sleeping = false;
    $('#sleep').classList.add('hidden');
    native('setKeepScreenOn', true);
    noteActivity();
    scheduleSlideshow();
    if (S.settings.musicSource === 'free') musicStart(false);
  }
  setInterval(function () {
    if (M.playing) { var tv = musicTarget(); if (Math.abs(audio.volume - tv) > 0.02) fadeTo(tv, 3000); }
    var hrs = S.settings.sleepAfter;
    if (!DREAM && hrs && !S.sleeping && Date.now() - S.lastActivity > hrs * 3600000) enterSleep();
    applyDisplay();
    if (S.menuOpen) tickClock();
  }, 30000);

  /* ---------------- Remote input ---------------- */
  window.handleBack = function () {
    noteActivity();
    if (S.sleeping) { wake(); return true; }
    if (S.detailOpen) { closeDetail(); return true; }
    if (S.menuOpen) {
      if (S.sub) { renderTab(S.tab, true); return true; }
      closeMenu();
      return true;
    }
    if (DREAM) return false;
    if (Date.now() - S.backArmedAt < 2500) return false;
    S.backArmedAt = Date.now();
    toast('Press Back again to leave Art Mode');
    return true;
  };

  window.onRemote = function (cmd) {
    noteActivity();
    if (S.sleeping) { wake(); return; }
    if (cmd === 'menu') {
      if (S.detailOpen) closeDetail();
      else if (S.menuOpen) closeMenu();
      else openMenu();
    } else if (cmd === 'next' || cmd === 'prev') {
      if (!S.menuOpen && !S.detailOpen) step(cmd === 'next' ? 1 : -1);
    } else if (cmd === 'playpause') {
      S.paused = !S.paused;
      scheduleSlideshow();
      toast(S.paused ? 'Slideshow paused' : (S.settings.interval ? 'Slideshow resumed, every ' + fmtInterval(S.settings.interval) : 'Slideshow is off. Set Change every in Settings.'));
    }
  };

  function keyOf(e) {
    switch (e.keyCode) {
      case 37: return 'left';
      case 38: return 'up';
      case 39: return 'right';
      case 40: return 'down';
      case 13: case 23: return 'ok';
      case 27: return 'back';
      case 8: return (e.target && e.target.tagName === 'INPUT') ? null : 'back';
      case 77: return 'menu';
      case 32: return (e.target && e.target.tagName === 'INPUT') ? null : 'playpause';
      case 219: return 'prev';
      case 221: return 'next';
      default: return null;
    }
  }

  function artKey(k) {
    if (k === 'left' || k === 'right') { S.stepFrom = null; S.stepTries = 0; step(k === 'left' ? -1 : 1); }
    else if (k === 'down') showCaption(S.current, true);
    else if (k === 'ok' || k === 'up' || k === 'menu') openMenu();
  }

  function exitApp() {
    if (NATIVE) { native('exitApp'); return; }
    if (window.parent !== window) window.parent.postMessage({ atelier: 'exit' }, '*');
  }

  // Returns false when the key should keep its normal behavior (typing in the search box).
  function handleKey(k) {
    noteActivity();
    musicUnblock();
    if (S.sleeping) { wake(); return true; }
    if (k === 'back') { if (!window.handleBack()) exitApp(); return true; }
    if (k === 'menu') { window.onRemote('menu'); return true; }
    if (k === 'playpause' || k === 'prev' || k === 'next') { window.onRemote(k); return true; }
    var a = currentFocus();
    var inInput = a && a.tagName === 'INPUT';
    if (inInput && (k === 'left' || k === 'right')) return false;
    if (!S.menuOpen && !S.detailOpen) { artKey(k); return true; }
    if (k === 'ok') { activate(a && a !== document.body ? a : null); return true; }
    if ((k === 'left' || k === 'right') && a && typeof a._step === 'function') { a._step(k === 'left' ? -1 : 1); return true; }
    moveFocus(k);
    return true;
  }

  document.addEventListener('keydown', function (e) {
    if (DREAM) return;
    var k = keyOf(e);
    if (!k) { noteActivity(); if (S.sleeping) wake(); return; }
    if (handleKey(k)) e.preventDefault();
  });

  // Messages from the desktop simulator (simulator.html).
  S.simPhotos = [];
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.atelier !== 'sim') return;
    if (m.key) handleKey(m.key);
    else if (m.remote) window.onRemote(m.remote);
    else if (m.photos) {
      m.photos.forEach(function (p) {
        S.simPhotos.unshift({ name: p.name, url: p.url, thumb: p.url, time: Date.now() });
      });
      window.onPhotosChanged();
    } else if (m.reset) {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('atelier.') === 0) localStorage.removeItem(k); }); } catch (x) {}
      location.reload();
    }
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { rerenderCurrent(); if (S.detailOpen) renderPreview(); }, 300);
  });

  /* ---------------- Start ---------------- */
  document.addEventListener('click', musicUnblock);

  function init() {
    applyDisplay();
    if (S.settings.musicSource === 'free') musicStart(false);
    refreshPhotos();
    tickClock();
    if (S.current) {
      showArt(S.current, { instant: true, inStep: true }).then(function (ok) { if (!ok) step(1); });
      return;
    }
    // First run: hang something beautiful, then open the Art Store.
    var first = COLLECTIONS[0];
    loadCollection(first).then(function (items) {
      if (items.length) {
        setContext(items, first.name);
        showArt(items[0], { instant: true });
      } else if (S.photos.length) {
        setContext(S.photos, 'My Photos');
        showArt(S.photos[0], { instant: true });
      } else {
        $('#empty').classList.remove('hidden');
      }
      if (!DREAM) openMenu('store');
    });
  }
  init();
})();
