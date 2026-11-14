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
    mat: 'smart', fillOnly: 0, aiStyle: 'oil', aiCount: 8, aiKey: '', musicSource: 'off', musicStyle: 'classical', musicVolume: 4, musicAnnounce: true, musicApp: '',
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
        if (isGen(srcs[i])) genSrc(srcs[i]).then(function (u) { im.src = u; }, function () { im.onerror(); });
        else im.src = srcs[i];
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
      if (isGen(art.thumb)) genSrc(art.thumb).then(function (u) { im.src = u; }, function () { fin(null); });
      else im.src = art.thumb;
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
      main.thumb = isGen(art.thumb) ? main.src : art.thumb;
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
      if (!art.ai && (Object.keys(S.dead).length || S.current)) {
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
    else if (S.ctx.album && albumById(S.ctx.album)) l = albumPhotos(albumById(S.ctx.album));
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
      if (!art.ai) markDead(art, list);
      dropCard(c, null, art, 'No pictures here could be loaded.');
    };
    if (isGen(art.thumb)) genSrc(art.thumb).then(function (u) { im.src = u; }, function () { im.onerror(); });
    else im.src = art.thumb;
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
    ai: function (p) { renderAi(p); }, music: function (p) { renderMusic(p); }, settings: renderSettings };

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
    S.ctx = { list: list.slice(0, 120), name: name || '', album: null };
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

  /* Albums: groups of your own photos. Stored on the TV by photo file name. */
  S.albums = store.get('albums', []);
  function saveAlbums() {
    store.set('albums', S.albums);
    native('setAlbums', JSON.stringify(S.albums.map(function (a) { return { id: a.id, name: a.name, count: a.photos.length }; })));
  }
  function albumById(id) { return S.albums.filter(function (a) { return a.id === id; })[0]; }
  function albumByName(name) {
    var n = String(name || '').trim().toLowerCase();
    return S.albums.filter(function (a) { return a.name.toLowerCase() === n; })[0];
  }
  function newAlbum(name) {
    name = String(name || '').trim().slice(0, 60);
    if (!name) return null;
    var a = albumByName(name);
    if (a) return a;
    a = { id: 'al' + Date.now() + Math.floor(Math.random() * 1000), name: name, photos: [], created: Date.now() };
    S.albums.push(a);
    saveAlbums();
    return a;
  }
  // Photos of an album, newest first, skipping any that were deleted from the TV.
  function albumPhotos(a) {
    if (!a) return [];
    var byName = {};
    S.photos.forEach(function (ph) { byName[ph.photo] = ph; });
    return a.photos.map(function (n) { return byName[n]; }).filter(Boolean);
  }
  function photoCount(n) { return n + ' photo' + (n === 1 ? '' : 's'); }
  function playAlbum(a) {
    var list = albumPhotos(a);
    if (!list.length) { toast('“' + a.name + '” has no photos yet. Choose “Add or remove photos”.'); return; }
    playList(list, a.name);
    S.ctx.album = a.id; store.set('ctx', S.ctx);
  }

  function albumTile(a) {
    var list = albumPhotos(a), c = h('div', 'card focusable album-tile');
    c.tabIndex = -1;
    var th = h('div', 'thumb');
    if (list.length) {
      var im = document.createElement('img');
      im.alt = ''; im.decoding = 'async'; im.src = list[0].thumb;
      th.appendChild(im);
    } else {
      th.appendChild(h('div', 'big', '▢'));
    }
    th.appendChild(h('span', 'badge', photoCount(list.length)));
    c.appendChild(th);
    var m = h('div', 'meta');
    m.appendChild(h('div', 't', a.name));
    m.appendChild(h('div', 'a', 'Album'));
    c.appendChild(m);
    c._activate = c.onclick = function () { openAlbum(a.id); };
    return c;
  }

  function renderPhotos(p) {
    refreshPhotos();
    var play = button('Play all photos', 'primary', function () { playList(S.photos, 'My Photos'); });
    var mk = button('New album', '', function () { askName('New album', 'Name your album, for example “Family”, “Christmas 2026” or “Lake trip”.', '', function (name) {
      var a = newAlbum(name);
      if (a) { toast('Album “' + a.name + '” created'); openAlbum(a.id); }
    }); });
    p.appendChild(viewHead('My Photos',
      S.photos.length ? photoCount(S.photos.length) + ' on this TV' + (S.albums.length ? ', in ' + S.albums.length + ' album' + (S.albums.length === 1 ? '' : 's') : '') + '.' :
        'Send pictures from your phone and they appear here, ready to frame.', S.photos.length ? [play, mk] : [mk]));

    p.appendChild(h('div', 'group-title', 'Albums'));
    var ag = h('div', 'grid');
    S.albums.forEach(function (a) { ag.appendChild(albumTile(a)); });
    ag.appendChild(tileCard('add', '+', 'New album', mk._activate));
    p.appendChild(ag);

    p.appendChild(h('div', 'group-title', 'All photos'));
    var add = tileCard('add', '+', 'Add from phone', openUpload);
    p.appendChild(grid(S.photos.filter(fits), 'My Photos', add));
  }

  function openAlbum(id) {
    var a = albumById(id);
    if (!a) { renderTab('photos', true); return; }
    S.sub = { type: 'album', id: id }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    var list = albumPhotos(a);
    var play = button('Play this album', 'primary', function () { playAlbum(a); });
    var edit = button('Add or remove photos', '', function () { pickAlbumPhotos(a); });
    var ren = button('Rename', '', function () {
      askName('Rename album', 'Type a new name for “' + a.name + '”.', a.name, function (name) {
        name = name.trim().slice(0, 60);
        if (!name) return;
        var other = albumByName(name);
        if (other && other !== a) { toast('You already have an album called “' + other.name + '”'); openAlbum(a.id); return; }
        a.name = name; saveAlbums(); openAlbum(a.id);
      });
    });
    var del = button('Delete album', 'danger', function () {
      if (del._armed) {
        S.albums = S.albums.filter(function (x) { return x !== a; }); saveAlbums();
        toast('Album deleted. Your photos are still in My Photos.');
        renderTab('photos', true);
        return;
      }
      del._armed = true; del.textContent = 'Press again to delete';
      setTimeout(function () { del._armed = false; del.textContent = 'Delete album'; }, 4000);
    });
    p.appendChild(viewHead(a.name, photoCount(list.length) + '. Deleting the album keeps the photos.', [play, edit, ren, del]));
    if (list.length) p.appendChild(grid(list.filter(fits), a.name));
    else p.appendChild(h('div', 'status', 'No photos yet. Choose “Add or remove photos”, or pick this album on your phone when sending photos.'));
    focusEl(list.length ? play : edit);
  }

  // Selection grid: OK toggles a photo in or out of the album.
  function pickAlbumPhotos(a) {
    S.sub = { type: 'albumpick', id: a.id }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    var chosen = {};
    a.photos.forEach(function (n) { chosen[n] = true; });
    var countEl;
    var done = button('Done', 'primary', function () {
      a.photos = S.photos.filter(function (ph) { return chosen[ph.photo]; }).map(function (ph) { return ph.photo; });
      saveAlbums();
      toast('“' + a.name + '” now has ' + photoCount(a.photos.length));
      openAlbum(a.id);
    });
    p.appendChild(viewHead('Choose photos for “' + a.name + '”', 'Press OK on a photo to add or remove it, then choose Done.', [done]));
    countEl = h('div', 'status music-status');
    p.appendChild(countEl);
    function updateCount() {
      var n = Object.keys(chosen).filter(function (k) { return chosen[k]; }).length;
      countEl.textContent = photoCount(n) + ' selected';
    }
    var g = h('div', 'grid');
    S.photos.forEach(function (ph) {
      var c = h('div', 'card focusable pick' + (chosen[ph.photo] ? ' picked' : ''));
      c.tabIndex = -1;
      var th = h('div', 'thumb'), im = document.createElement('img');
      im.alt = ''; im.decoding = 'async'; im.src = ph.thumb;
      th.appendChild(im);
      th.appendChild(h('span', 'check', '✓'));
      c.appendChild(th);
      var m = h('div', 'meta'); m.appendChild(h('div', 'a', ph.artist)); c.appendChild(m);
      c._activate = c.onclick = function () {
        chosen[ph.photo] = !chosen[ph.photo];
        c.classList.toggle('picked', !!chosen[ph.photo]);
        updateCount();
      };
      g.appendChild(c);
    });
    if (!S.photos.length) p.appendChild(h('div', 'status', 'There are no photos on this TV yet. Send some from your phone first.'));
    p.appendChild(g);
    updateCount();
    focusEl($('.card', g) || done);
  }

  // Small text-entry screen used for album names.
  function askName(title, text, value, cb) {
    var back = S.sub;
    S.sub = { type: 'askname' }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    p.appendChild(viewHead(title, text));
    var wrap = h('div', 'search-wrap'), inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'search focusable'; inp.placeholder = 'Album name'; inp.value = value || '';
    inp.maxLength = 60;
    var ok = button('Save', 'primary', run);
    wrap.appendChild(inp); wrap.appendChild(ok);
    p.appendChild(wrap);
    inp._activate = function () { inp.focus(); inp.click(); };
    inp.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 && inp.value.trim()) { e.preventDefault(); e.stopPropagation(); run(); }
    });
    function run() {
      var v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      inp.blur();
      cb(v);
    }
    focusEl(inp);
  }

  function openUpload() {
    S.sub = { type: 'upload' }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = '';
    var status = native('uploadStatus');               // also restarts the upload server if it stopped
    var url = status === 'nonetwork' ? '' : (native('uploadUrl') || '');
    var qr = url ? (native('uploadQr') || '') : '';
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
      if (status === 'noserver') steps.appendChild(h('p', 'warn', 'The photo receiver didn’t start. Press Back and open this page again, or restart Atelier.'));
      var cnt = h('p', 'count', photoCountText());
      cnt.id = 'photoCount';
      steps.appendChild(cnt);
      steps.appendChild(h('p', 'tips', 'Page won’t open on your phone? Make sure the phone is on the same Wi-Fi as the TV, not a guest network ' +
        'and not mobile data. Turn off any VPN on the phone. Keep Atelier open on the TV while sending. If your phone warns that the ' +
        'connection isn’t secure, that’s expected for a device on your home network: choose to continue.'));
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

  window.onPhotosChanged = function (name, album) {
    refreshPhotos();
    if (name && album) {
      var a = newAlbum(album);
      if (a && a.photos.indexOf(name) < 0) { a.photos.unshift(name); saveAlbums(); }
    }
    var c = $('#photoCount');
    if (c) c.textContent = photoCountText();
    toast(album ? 'New photo added to “' + album + '”' : 'New photo received');
    if (S.menuOpen && S.tab === 'photos' && !S.sub) renderTab('photos', false);
    if (S.menuOpen && S.sub && S.sub.type === 'album') openAlbum(S.sub.id);
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
        if (token === S.pvSeq) { var mn = asMain(im); mn.thumb = isGen(art.thumb) ? mn.src : art.thumb; compose(pv, mn, cfg, extras); }
        return loadImg(art.full, art.alt);
      }).then(function (im) {
        if (token === S.pvSeq) { var mn = asMain(im); mn.thumb = isGen(art.thumb) ? mn.src : art.thumb; compose(pv, mn, cfg, extras); }
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
    S.albums.forEach(function (al) { al.photos = al.photos.filter(function (n) { return n !== art.photo; }); });
    saveAlbums();
    refreshPhotos();
    toast('Photo deleted');
    var wasCurrent = S.current && S.current.id === art.id;
    S.returnFocus = null;
    closeDetail();
    renderTab(S.tab, true);
    if (wasCurrent) step(1);
  };

  /* ---------------- Studio art (drawn on the TV) ---------------- */
  var STUDIO_THEMES = [
    { type: 'mountains', name: 'Mountain sunsets', note: 'Layered peaks at dusk', bg: ['#a0614a', '#2a1a22'] },
    { type: 'mist', name: 'Misty mountains', note: 'Soft ridges and morning haze', bg: ['#7d8c86', '#26302d'] },
    { type: 'ocean', name: 'Ocean horizons', note: 'Calm seas and low sun', bg: ['#4a6d86', '#16222b'] },
    { type: 'hills', name: 'Tuscan hills', note: 'Rolling hills and cypress trees', bg: ['#a07a46', '#2e2214'] },
    { type: 'dunes', name: 'Desert dunes', note: 'Warm sand and long shadows', bg: ['#b07a50', '#33200f'] },
    { type: 'forest', name: 'Pine forests in fog', note: 'Quiet woods, layer on layer', bg: ['#4f6258', '#18201c'] },
    { type: 'stars', name: 'Starry nights', note: 'Milky Way over the hills', bg: ['#2a3060', '#0a0c1c'] },
    { type: 'colorfield', name: 'Color fields', note: 'Soft-edged abstract color', bg: ['#8a4a40', '#2a1512'] },
    { type: 'bauhaus', name: 'Bauhaus geometry', note: 'Mid-century shapes and color', bg: ['#b05a3c', '#22303a'] }
  ];
  var SKIES = [
    { name: 'dusk', top: '#2c3560', hor: '#ec9a72', sun: '#ffe2a8', far: '#7a5468', near: '#1d1726' },
    { name: 'dawn', top: '#8fa2c4', hor: '#f6c9a8', sun: '#fff3dc', far: '#a58a98', near: '#3a2c3c' },
    { name: 'gold', top: '#d9a25e', hor: '#f7e1b0', sun: '#fff7e2', far: '#b98a5e', near: '#3e2a1e' },
    { name: 'day', top: '#86aed0', hor: '#e6eef0', sun: '#fffbe8', far: '#93aab6', near: '#2c4250' },
    { name: 'sage', top: '#b9c2b0', hor: '#efe8d2', sun: '#fff7e0', far: '#9ea88f', near: '#36412f' },
    { name: 'rose', top: '#6d5a86', hor: '#f2b7a6', sun: '#ffe9d6', far: '#9a7088', near: '#2c2034' }
  ];
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hexRgb(x) { var n = parseInt(x.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b);
    return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
  }
  function mixHex(a, b, t) {
    var A = hexRgb(a), B = hexRgb(b);
    return '#' + [0, 1, 2].map(function (i) { return ('0' + Math.round(A[i] + (B[i] - A[i]) * t).toString(16)).slice(-2); }).join('');
  }

  // Draws one artwork. The same type and seed always give the same picture, so only the seed is saved.
  function paintStudio(type, seed, W, H) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var x = c.getContext('2d'), r = rng(seed), sky = SKIES[Math.floor(r() * SKIES.length)];
    function pick(arr) { return arr[Math.floor(r() * arr.length)]; }
    function skyGrad(top, hor, yh) {
      var g = x.createLinearGradient(0, 0, 0, yh);
      g.addColorStop(0, top); g.addColorStop(1, hor);
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    function sun(cx, cy, rad, col, glow) {
      var g = x.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad * glow);
      g.addColorStop(0, col); g.addColorStop(0.25, col); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.globalAlpha = 0.55; x.fillStyle = g; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
      x.fillStyle = col; x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.fill();
    }
    function ridge(base, amp, color, waves, jag) {
      var ph = [], fr = [];
      for (var i = 0; i < waves; i++) { ph.push(r() * 6.28); fr.push((1 + r() * 3) * (i + 1)); }
      function yAt(px) {
        var v = 0;
        for (var j = 0; j < waves; j++) v += Math.sin(px / W * fr[j] * Math.PI + ph[j]) / (j + 1);
        return base - v * amp;
      }
      x.fillStyle = color; x.beginPath(); x.moveTo(0, H);
      for (var px = 0; px <= W; px += 4) x.lineTo(px, yAt(px) + (jag ? (r() - 0.5) * jag * H * 0.002 : 0));
      x.lineTo(W, H); x.closePath(); x.fill();
      return yAt;
    }
    function haze(y, h, col, a) {
      var g = x.createLinearGradient(0, y - h, 0, y + h);
      var rgb = hexRgb(col).join(',');
      g.addColorStop(0, 'rgba(' + rgb + ',0)'); g.addColorStop(0.5, 'rgba(' + rgb + ',1)'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
      x.globalAlpha = a; x.fillStyle = g; x.fillRect(0, y - h, W, h * 2); x.globalAlpha = 1;
    }
    function pine(px, base, h, col) {
      x.fillStyle = col; x.beginPath();
      var w = h * 0.32;
      for (var t = 0; t < 4; t++) {
        var y1 = base - h * (0.18 + t * 0.22), y0 = base - h * (t * 0.2);
        x.moveTo(px - w * (1 - t * 0.2), y0); x.lineTo(px, y1 - h * 0.1); x.lineTo(px + w * (1 - t * 0.2), y0);
      }
      x.fill();
      x.fillRect(px - h * 0.02, base - h * 0.08, h * 0.04, h * 0.1);
    }
    var hor, i;
    switch (type) {
      case 'mist':
      case 'mountains':
        if (type === 'mist') sky = pick([SKIES[1], SKIES[3], SKIES[4]]);
        hor = H * (0.5 + r() * 0.12);
        skyGrad(sky.top, sky.hor, hor);
        sun(W * (0.25 + r() * 0.5), hor - H * (0.08 + r() * 0.15), H * 0.055, sky.sun, 5);
        var n = 6;
        for (i = 0; i < n; i++) {
          var t = i / (n - 1);
          ridge(hor + H * 0.06 * i + H * 0.02, H * (0.12 - t * 0.05), mix(mixHex(sky.far, sky.hor, 0.45), sky.near, t), 4, type === 'mist' ? 0 : 1);
          if (i < n - 2) haze(hor + H * 0.06 * i + H * 0.05, H * 0.06, sky.hor, type === 'mist' ? 0.45 : 0.2);
        }
        break;
      case 'ocean':
        hor = H * (0.52 + r() * 0.08);
        skyGrad(sky.top, sky.hor, hor);
        var sx = W * (0.3 + r() * 0.4);
        sun(sx, hor - H * (0.02 + r() * 0.1), H * 0.05, sky.sun, 6);
        var sg = x.createLinearGradient(0, hor, 0, H);
        sg.addColorStop(0, mix(sky.hor, sky.far, 0.5)); sg.addColorStop(1, sky.near);
        if (r() > 0.4) ridge(hor + 2, H * 0.02, mix(sky.far, sky.hor, 0.3), 3, 0);
        x.fillStyle = sg; x.fillRect(0, hor, W, H - hor);
        for (var k = 0; k < 900; k++) {
          var yy = hor + Math.pow(r(), 1.6) * (H - hor), spread = (yy - hor) / (H - hor);
          var xx = sx + (r() - 0.5) * W * (0.08 + spread * 0.5);
          x.globalAlpha = 0.25 * (1 - spread * 0.6); x.fillStyle = sky.sun;
          x.fillRect(xx, yy, W * (0.004 + r() * 0.02) * (0.5 + spread), Math.max(1, H * 0.002));
        }
        x.globalAlpha = 1;
        break;
      case 'hills':
        sky = pick([SKIES[2], SKIES[1], SKIES[4], SKIES[0]]);
        hor = H * 0.48;
        skyGrad(sky.top, sky.hor, hor + H * 0.1);
        sun(W * (0.2 + r() * 0.6), hor - H * 0.12, H * 0.045, sky.sun, 5);
        var greens = ['#a5a46a', '#86894f', '#6a7240', '#4f5a31', '#3a4524'];
        for (var hi = 0; hi < 5; hi++) {
          var base = hor + H * (0.04 + hi * 0.1);
          if (hi > 0) haze(base - H * 0.03, H * 0.035, sky.hor, 0.16);
          var yAt = ridge(base, H * 0.05, mix(mixHex(greens[hi], sky.hor, 0.5 - hi * 0.1), greens[hi], hi / 4), 3, 0);
          if (hi > 0 && hi < 4) {
            var trees = 3 + Math.floor(r() * 6), groupX = r() * W;
            for (var ti = 0; ti < trees; ti++) {
              var tx = (groupX + (r() - 0.5) * W * 0.35 + W) % W, th = H * (0.05 + hi * 0.035), ty = yAt(tx) + th * 0.08;
              x.fillStyle = mixHex('#2c3820', sky.hor, 0.4 - hi * 0.1);
              x.beginPath();
              if (x.ellipse) x.ellipse(tx, ty - th * 0.5, th * 0.11, th * 0.5, 0, 0, Math.PI * 2);
              else x.arc(tx, ty - th * 0.5, th * 0.15, 0, Math.PI * 2);
              x.fill();
            }
          }
        }
        break;
      case 'dunes':
        sky = pick([SKIES[2], SKIES[0], SKIES[5], SKIES[3]]);
        hor = H * 0.5;
        skyGrad(sky.top, sky.hor, hor);
        sun(W * (0.15 + r() * 0.7), hor - H * 0.1, H * 0.05, sky.sun, 5);
        var sand = ['#e2b07c', '#d49a63', '#c4844e', '#a86c3c', '#8a5530'];
        for (var di = 0; di < 5; di++) {
          var by = hor + H * (0.02 + di * 0.1);
          var lg = x.createLinearGradient(0, 0, W, 0);
          var lit = mixHex(sand[di], sky.sun, 0.25), shade = mixHex(sand[di], '#3a2016', 0.35);
          if (r() > 0.5) { lg.addColorStop(0, lit); lg.addColorStop(1, shade); } else { lg.addColorStop(0, shade); lg.addColorStop(1, lit); }
          ridge(by, H * 0.06, lg, 2, 0);
        }
        break;
      case 'forest':
        sky = pick([SKIES[3], SKIES[4], SKIES[1]]);
        skyGrad(mixHex(sky.top, '#ffffff', 0.25), mixHex(sky.hor, '#ffffff', 0.3), H);
        var layers = 5, deep = pick(['#1f3328', '#22302f', '#2a2f26']);
        for (var li = 0; li < layers; li++) {
          var lt = li / (layers - 1), lb = H * (0.55 + lt * 0.42), col = mix(mixHex(sky.hor, '#ffffff', 0.2), deep, 0.25 + lt * 0.75);
          x.fillStyle = col; x.fillRect(0, lb - H * 0.02, W, H);
          var count = 18 + li * 6;
          for (var pi = 0; pi < count; pi++) pine(r() * W, lb, H * (0.12 + lt * 0.22) * (0.7 + r() * 0.6), col);
          if (li < layers - 1) haze(lb - H * 0.05, H * 0.07, mixHex(sky.hor, '#ffffff', 0.4), 0.4);
        }
        break;
      case 'stars':
        var top = pick(['#060a1c', '#0b0f26', '#0d0a1e']), low = pick(['#26305a', '#3a2f5a', '#1f3a52']);
        skyGrad(top, low, H * 0.85);
        x.save(); x.translate(W / 2, H / 2); x.rotate(-0.5 + r());
        var band = x.createLinearGradient(0, -H * 0.22, 0, H * 0.22);
        band.addColorStop(0, 'rgba(200,190,255,0)'); band.addColorStop(0.5, 'rgba(210,200,255,0.14)'); band.addColorStop(1, 'rgba(200,190,255,0)');
        x.fillStyle = band; x.fillRect(-W, -H * 0.22, W * 2, H * 0.44);
        for (var mw = 0; mw < 2600; mw++) {
          var off = (r() + r() + r() - 1.5) * H * 0.18;
          x.globalAlpha = 0.08 + r() * 0.35; x.fillStyle = r() > 0.8 ? '#ffd9c0' : '#dfe6ff';
          x.fillRect((r() - 0.5) * W * 1.6, off, 1.6 * W / 1920 + 0.4, 1.6 * W / 1920 + 0.4);
        }
        x.restore();
        for (var st = 0; st < 700; st++) {
          var sz = r() < 0.04 ? 2.6 : 1.2;
          x.globalAlpha = 0.3 + r() * 0.7; x.fillStyle = '#ffffff';
          x.beginPath(); x.arc(r() * W, r() * H * 0.8, Math.max(0.5, sz * (W / 1920)), 0, 6.28); x.fill();
        }
        x.globalAlpha = 1;
        ridge(H * 0.86, H * 0.05, '#080a14', 3, 0);
        for (var sp = 0; sp < 14; sp++) pine(r() * W, H * 0.9, H * (0.1 + r() * 0.12), '#05060c');
        break;
      case 'colorfield':
        var fields = pick([['#7a2f2a', '#c76b3c', '#e3b16a'], ['#1f3b4d', '#5d8aa8', '#cfd8d6'], ['#3d3a5c', '#8a6a9a', '#e0b8a8'],
          ['#2f4a3a', '#8aa37a', '#e8dcb0'], ['#5a2a3a', '#b4566a', '#f0c4a8'], ['#2a2a2a', '#7a6a5a', '#d8c8a8']]);
        x.fillStyle = mixHex(fields[0], '#000000', 0.25); x.fillRect(0, 0, W, H);
        var mg = H * 0.1, rows = 2 + Math.floor(r() * 2), gapf = H * 0.05, rh = (H - 2 * mg - gapf * (rows - 1)) / rows;
        for (var ri = 0; ri < rows; ri++) {
          var colr = fields[(ri + 1) % fields.length];
          for (var pass = 0; pass < 14; pass++) {
            var j = H * 0.012;
            x.globalAlpha = 0.09; x.fillStyle = colr;
            x.fillRect(W * 0.14 + (r() - 0.5) * j, mg + ri * (rh + gapf) + (r() - 0.5) * j, W * 0.72 + (r() - 0.5) * j, rh + (r() - 0.5) * j);
          }
          x.globalAlpha = 0.85; x.fillRect(W * 0.15, mg + ri * (rh + gapf) + H * 0.01, W * 0.7, rh - H * 0.02);
        }
        x.globalAlpha = 1;
        break;
      default: // bauhaus
        var pal = pick([['#efe6d4', '#c8553d', '#e2a545', '#2f4858', '#86a397'], ['#f1e9db', '#a33b2c', '#d9b25c', '#1e3d4c', '#c9a690'],
          ['#ece4d0', '#d1774f', '#3f5e5a', '#e8b34a', '#2b2b2b']]);
        x.fillStyle = pal[0]; x.fillRect(0, 0, W, H);
        var cols = 4, rws = 2, pad = H * 0.08, cw = (W - pad * 2) / cols, ch = (H - pad * 2) / rws;
        for (var gy = 0; gy < rws; gy++) for (var gx = 0; gx < cols; gx++) {
          var X0 = pad + gx * cw, Y0 = pad + gy * ch, s2 = Math.min(cw, ch);
          x.save(); x.beginPath(); x.rect(X0, Y0, cw, ch); x.clip();
          x.fillStyle = pal[1 + Math.floor(r() * 4)]; x.fillRect(X0, Y0, cw, ch);
          x.fillStyle = pal[1 + Math.floor(r() * 4)];
          var shape = Math.floor(r() * 4);
          x.beginPath();
          if (shape === 0) x.arc(X0 + cw / 2, Y0 + ch / 2, s2 * 0.36, 0, Math.PI * 2);
          else if (shape === 1) { x.moveTo(X0, Y0 + ch); x.arc(X0, Y0 + ch, s2 * 0.9, -Math.PI / 2, 0); }
          else if (shape === 2) { x.arc(X0 + cw / 2, Y0 + ch, cw / 2, Math.PI, 0); }
          else { x.rect(X0 + cw * 0.15, Y0, cw * 0.18, ch); x.rect(X0 + cw * 0.5, Y0, cw * 0.18, ch); }
          x.fill(); x.restore();
        }
    }
    // Canvas grain and a soft vignette, so it reads as a print rather than a screen.
    var g2 = document.createElement('canvas'); g2.width = g2.height = 128;
    var gx2 = g2.getContext('2d'), id = gx2.createImageData(128, 128);
    for (var q = 0; q < id.data.length; q += 4) { var v = 110 + r() * 40; id.data[q] = id.data[q + 1] = id.data[q + 2] = v; id.data[q + 3] = 40; }
    gx2.putImageData(id, 0, 0);
    x.globalAlpha = 0.5; x.fillStyle = x.createPattern(g2, 'repeat'); x.fillRect(0, 0, W, H);
    var vg = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.7);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.25)');
    x.globalAlpha = 1; x.fillStyle = vg; x.fillRect(0, 0, W, H);
    return c;
  }

  var genCache = {}, genOrder = [];
  function isGen(u) { return typeof u === 'string' && u.indexOf('gen:') === 0; }
  function genSrc(spec) {
    if (genCache[spec]) return Promise.resolve(genCache[spec]);
    return new Promise(function (resolve, reject) {
      try {
        var parts = spec.split(':'), small = parts[3] === 't';
        var c = paintStudio(parts[1], +parts[2], small ? 480 : 1920, small ? 270 : 1080);
        var keep = function (u) {
          genCache[spec] = u; genOrder.push(spec);
          if (genOrder.length > 60) {
            var old = genOrder.shift();
            if (genCache[old] && genCache[old].indexOf('blob:') === 0) URL.revokeObjectURL(genCache[old]);
            delete genCache[old];
          }
          resolve(u);
        };
        if (c.toBlob) c.toBlob(function (b) { keep(b ? URL.createObjectURL(b) : c.toDataURL('image/jpeg', 0.92)); }, 'image/jpeg', 0.92);
        else keep(c.toDataURL('image/jpeg', 0.92));
      } catch (e) { reject(e); }
    });
  }

  function startStudioSet(th) {
    var n = S.settings.aiCount || 8, now = new Date();
    var set = { id: String(now.getTime()), name: th.name, style: 'Studio art', created: now.getTime(), items: [], studio: true };
    for (var i = 0; i < n; i++) {
      var spec = 'gen:' + th.type + ':' + Math.floor(Math.random() * 1e9);
      set.items.push({ id: 'st:' + set.id + ':' + i, title: th.name + ' no. ' + (i + 1), artist: 'Studio art, drawn on your TV',
        date: now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }), source: 'Studio art',
        thumb: spec + ':t', full: spec, ar: 16 / 9, ai: true });
    }
    S.aiSets.unshift(set); saveAiSets();
    toast('“' + th.name + '” is ready: ' + n + ' new pictures.');
    renderTab('ai', false);
    var tr = $('#aiset-' + set.id);
    focusEl(tr ? $('.card', tr) : null);
  }

  /* ---------------- AI Art ---------------- */
  // New paintings generated on a theme by Pollinations.ai (free, no account). The free service
  // allows about one image every 15 seconds, so a set is painted one picture at a time.
  var AI_THEMES = [
    { name: 'Tuscan villas at sunset', prompt: 'a Tuscan villa terrace overlooking rolling hills, cypress trees and vineyards', bg: ['#8a5a32', '#2e1d10'] },
    { name: 'Peaceful seaside mornings', prompt: 'a calm seaside at dawn with gentle waves and a quiet shoreline', bg: ['#3f6a80', '#14232b'] },
    { name: 'Mountain lakes', prompt: 'a still alpine lake surrounded by pine forests and snowy mountains', bg: ['#3f6158', '#13201d'] },
    { name: 'Gardens in bloom', prompt: 'a lush flower garden in full bloom with winding paths', bg: ['#6a4a5e', '#24171f'] },
    { name: 'Cozy winter cabins', prompt: 'a cozy log cabin in a snowy forest with warm glowing windows', bg: ['#4a5566', '#171b22'] },
    { name: 'Autumn countryside', prompt: 'rolling autumn countryside with golden trees, a stone wall and a winding lane', bg: ['#8a5a28', '#2b1b0c'] },
    { name: 'Lighthouses and coasts', prompt: 'a lighthouse on a rocky coastline with crashing waves', bg: ['#3d5a70', '#121c24'] },
    { name: 'Japanese gardens', prompt: 'a serene Japanese garden with a koi pond, maple trees and a wooden bridge', bg: ['#6a3a32', '#241310'] },
    { name: 'Holy Land landscapes', prompt: 'the hills and ancient stone villages of the Holy Land with olive trees', bg: ['#7a6440', '#2a2214'] },
    { name: 'Wildflower meadows', prompt: 'a sunlit wildflower meadow with distant hills', bg: ['#5e6a3a', '#1f2412'] },
    { name: 'Paris in the rain', prompt: 'a Paris street on a rainy evening with glowing cafes and reflections', bg: ['#4a4a5e', '#18181f'] },
    { name: 'Abstract color fields', prompt: 'soft abstract color fields with layered translucent shapes', bg: ['#6a4040', '#241515'] }
  ];
  var AI_STYLES = [
    { id: 'oil', name: 'Oil painting', text: 'oil painting on canvas, rich brushwork, museum quality, warm natural light' },
    { id: 'impressionist', name: 'Impressionist', text: 'impressionist painting, visible brushstrokes, luminous color, 19th-century French style' },
    { id: 'watercolor', name: 'Watercolor', text: 'delicate watercolor painting on textured paper, soft washes of color' },
    { id: 'pastel', name: 'Soft pastel', text: 'soft pastel artwork, gentle muted palette, dreamy light' },
    { id: 'photo', name: 'Fine-art photo', text: 'fine art landscape photograph, natural light, high detail' },
    { id: 'minimal', name: 'Minimalist', text: 'minimalist modern art print, simple shapes, calm muted palette' }
  ];
  var AI_VARIATIONS = ['at golden hour', 'in soft morning light', 'wide panoramic view', 'with gentle mist',
    'in late afternoon light', 'under a dramatic sky', 'seen from a quiet path', 'in the blue hour at dusk',
    'in early spring', 'on a bright clear day', 'with soft clouds', 'framed by trees'];

  S.aiSets = store.get('aisets', []);
  S.gen = null;
  function saveAiSets() { store.set('aisets', S.aiSets.slice(0, 30)); }
  function aiStyle(id) { return AI_STYLES.filter(function (x) { return x.id === id; })[0] || AI_STYLES[0]; }
  function aiUrl(prompt, seed) {
    var key = S.settings.aiKey;
    if (key) return 'https://gen.pollinations.ai/image/' + enc(prompt) + '?width=1920&height=1080&seed=' + seed +
      '&model=flux&nologo=true&safe=true&key=' + enc(key);
    return 'https://image.pollinations.ai/prompt/' + enc(prompt) + '?width=1920&height=1080&seed=' + seed + '&nologo=true&safe=true';
  }
  function aiGap() { return S.settings.aiKey ? 3000 : 48000; }          // free tier: one picture every 45 seconds
  // The free service sometimes sends a yellow "Free limit reached" notice instead of a picture. Spot it.
  function isLimitNotice(url) {
    return new Promise(function (resolve) {
      var im = new Image(), done = false;
      var t = setTimeout(function () { fin(false); }, 15000);
      function fin(v) { if (!done) { done = true; clearTimeout(t); resolve(v); } }
      im.crossOrigin = 'anonymous';
      im.onload = function () {
        try {
          var c = document.createElement('canvas'); c.width = 32; c.height = 18;
          var x = c.getContext('2d'); x.drawImage(im, 0, 0, 32, 18);
          var d = x.getImageData(0, 0, 32, 18).data, hit = 0, n = 0;
          for (var i = 0; i < d.length; i += 4) {
            n++;
            if (d[i] > 165 && d[i] < 235 && d[i + 1] > 140 && d[i + 1] < 205 && d[i + 2] > 55 && d[i + 2] < 130 && d[i] - d[i + 2] > 70) hit++;
          }
          fin(hit / n > 0.45);
        } catch (e) { fin(false); }
      };
      im.onerror = function () { fin(false); };
      im.src = url;
    });
  }
  function cap(t) { return t.charAt(0).toUpperCase() + t.slice(1); }

  // Waits for one generated picture; generation can take a while, so allow up to 2 minutes.
  function genLoad(url) {
    return new Promise(function (resolve, reject) {
      var im = new Image(), done = false;
      var t = setTimeout(function () { if (!done) { done = true; im.src = ''; reject(new Error('timeout')); } }, 120000);
      im.onload = function () { if (done) return; done = true; clearTimeout(t); im.naturalWidth > 1 ? resolve(im) : reject(new Error('empty')); };
      im.onerror = function () { if (done) return; done = true; clearTimeout(t); reject(new Error('load')); };
      im.src = url;
    });
  }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  function startAiSet(theme, prompt) {
    if (S.gen && S.gen.running) { toast('Still painting “' + S.gen.set.name + '”. Stop it first, or wait for it to finish.'); return; }
    var st = aiStyle(S.settings.aiStyle), n = S.settings.aiCount || 8, now = new Date();
    var set = { id: String(now.getTime()), name: theme, style: st.name, created: now.getTime(), items: [] };
    S.aiSets.unshift(set);
    saveAiSets();
    var gen = S.gen = { set: set, total: n, done: 0, running: true, stop: false };
    var vars = AI_VARIATIONS.slice().sort(function () { return Math.random() - 0.5; });
    var i = 0, fails = 0;
    toast('Painting ' + n + ' new pictures of “' + theme + '”. This takes a few minutes.');
    function next() {
      if (gen.stop || i >= n) return finish();
      var v = vars[i % vars.length], seed = Math.floor(Math.random() * 1e9), t0 = Date.now();
      var full = prompt + ', ' + v + ', ' + st.text + ', no text, no letters, no signature, no frame, no border';
      var url = aiUrl(full, seed);
      renderAiStatus();
      genLoad(url).then(function (im) {
        return isLimitNotice(url).then(function (limited) {
          if (limited) throw new Error('limit');
          return im;
        });
      }).then(function (im) {
        if (gen.stop) return;
        var art = {
          id: 'ai:' + set.id + ':' + i, title: theme + ', ' + v, artist: st.name + ' · AI generated',
          date: now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }),
          source: 'AI Art (Pollinations)', thumb: url, full: url, ar: im.naturalWidth / im.naturalHeight, ai: true
        };
        set.items.push(art); saveAiSets();
        gen.done++; i++; fails = 0;
        addAiCard(set, art);
        return wait(Math.max(0, aiGap() - (Date.now() - t0)));
      }, function (err) {
        fails++;
        if (err && err.message === 'limit') gen.limited = (gen.limited || 0) + 1;
        if (gen.limited >= 3) { gen.stop = true; gen.limitStop = true; return; }
        if (fails >= 3) { i++; fails = 0; }          // skip this one after three tries
        return wait(aiGap() + 4000);
      }).then(next);
    }
    function finish() {
      gen.running = false;
      if (!set.items.length) {
        S.aiSets = S.aiSets.filter(function (x) { return x !== set; }); saveAiSets();
        toast(gen.limitStop ? 'The free AI service’s limit was reached. Add a free key, or try Studio art.' :
          gen.stop ? 'Stopped.' : 'The AI art service isn’t responding right now. Please try again later.');
      } else if (gen.limitStop) {
        toast('Saved ' + set.items.length + ' pictures. The free limit was reached; a free key makes this faster.');
      } else {
        toast((gen.stop ? 'Stopped. ' : '') + '“' + theme + '” is ready: ' + set.items.length + ' new pictures.');
      }
      renderAiStatus();
      if (S.menuOpen && S.tab === 'ai' && !S.sub) renderTab('ai', false);
    }
    next();
    if (S.menuOpen && S.tab === 'ai') renderTab('ai', false);
  }

  function renderAiStatus() {
    var el = $('#aiStatus');
    if (!el) return;
    var g = S.gen;
    if (g && g.running) {
      el.textContent = 'Painting “' + g.set.name + '”: ' + g.done + ' of ' + g.total + ' done. You can keep browsing or go back to your art.';
    } else {
      el.textContent = S.settings.aiKey ? 'Your free key is set, so each AI picture takes a few seconds.' :
        'Without a key, the free AI service allows one picture every 45 seconds. Studio art is instant and unlimited.';
    }
    var stop = $('#aiStop');
    if (stop) stop.style.display = (g && g.running) ? '' : 'none';
  }
  function addAiCard(set, art) {
    var track = $('#aiset-' + set.id);
    if (!track) return;
    $$('.skeleton', track).slice(0, 1).forEach(function (sk) { sk.remove(); });
    var more = $('.card.more', track);
    track.insertBefore(card(art, set.items), more || null);
  }

  function renderAi(p) {
    var stop = button('Stop painting', '', function () { if (S.gen) S.gen.stop = true; toast('Stopping after the current picture…'); });
    stop.id = 'aiStop';
    p.appendChild(viewHead('AI Art', 'Brand-new pictures on a theme you choose, made to fit your TV exactly.', [stop]));
    var status = h('div', 'status music-status'); status.id = 'aiStatus';
    p.appendChild(status);

    var opts = h('div', 'settings');
    opts.appendChild(stepperEl({ label: 'Art style', values: AI_STYLES.map(function (x) { return x.id; }), fmt: function (v) { return aiStyle(v).name; } },
      function () { return S.settings.aiStyle; }, function (v) { S.settings.aiStyle = v; saveSettings(); }));
    opts.appendChild(stepperEl({ label: 'Pictures per set', values: [4, 8, 12],
      fmt: function (v) { return v + ' pictures' + (S.settings.aiKey ? '' : ' (AI: about ' + Math.ceil(v * 50 / 60) + ' min)'); } },
      function () { return S.settings.aiCount; }, function (v) { S.settings.aiCount = v; saveSettings(); }));
    var keyRow = h('div', 'stepper focusable'); keyRow.tabIndex = -1;
    var kl = h('span', 'lbl', 'Free Pollinations key'); kl.appendChild(h('span', 'hint', 'Optional. Makes AI pictures much faster and removes the watermark'));
    keyRow.appendChild(kl); keyRow.appendChild(h('span', 'val', S.settings.aiKey ? 'Set ✓' : 'Not set'));
    keyRow._activate = keyRow.onclick = openAiKey;
    opts.appendChild(keyRow);
    p.appendChild(opts);

    p.appendChild(h('div', 'group-title', 'Studio art: instant and unlimited, drawn right on your TV'));
    var gs = h('div', 'grid');
    STUDIO_THEMES.forEach(function (t) {
      gs.appendChild(musicTile(t.name, t.note, t.bg, '', function () { startStudioSet(t); }));
    });
    p.appendChild(gs);

    p.appendChild(h('div', 'group-title', 'AI paintings from the internet (Pollinations)'));
    var g = h('div', 'grid');
    g.appendChild(musicTile('Your own theme', 'Type anything: “our lake house in fall”', ['#4a4741', '#1c1b19'], '', openAiCustom));
    AI_THEMES.forEach(function (t) {
      g.appendChild(musicTile(t.name, 'Paint a new set', t.bg, '', function () { startAiSet(t.name, t.prompt); }));
    });
    p.appendChild(g);

    if (S.aiSets.length) p.appendChild(h('div', 'group-title', 'Your AI collections'));
    S.aiSets.forEach(function (set) {
      var row = h('section', 'row'), title = h('h2', null, set.name);
      title.appendChild(h('small', null, set.style + ' · ' + new Date(set.created).toLocaleDateString([], { month: 'short', day: 'numeric' }) +
        ' · ' + set.items.length + ' pictures'));
      row.appendChild(title);
      var scroll = h('div', 'row-scroll'), track = h('div', 'row-track');
      track.id = 'aiset-' + set.id;
      set.items.forEach(function (a) { track.appendChild(card(a, set.items)); });
      var g2 = S.gen;
      if (g2 && g2.running && g2.set === set) track.appendChild(skeletons(g2.total - g2.done));
      track.appendChild(tileCard('more', '▶', 'Play this set', function () { playList(set.items.slice(), set.name); }));
      track.appendChild(tileCard('more', '✕', 'Delete this set', function () {
        if (S.gen && S.gen.running && S.gen.set === set) S.gen.stop = true;
        S.aiSets = S.aiSets.filter(function (x) { return x !== set; }); saveAiSets();
        toast('Deleted “' + set.name + '”');
        renderTab('ai', true);
      }));
      scroll.appendChild(track); row.appendChild(scroll); p.appendChild(row);
    });
    renderAiStatus();
  }

  function openAiKey() {
    S.sub = { type: 'aikey' }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    var url = native('uploadUrl');
    p.appendChild(viewHead('Free Pollinations key', 'With a free account, AI pictures take seconds instead of a minute each, without the watermark.'));
    var steps = h('div', 'steps');
    steps.appendChild(h('p', null, '1. On your phone or computer, go to enter.pollinations.ai and sign up for free.'));
    steps.appendChild(h('p', null, '2. Create an API key there and copy it.'));
    steps.appendChild(h('p', null, url ? '3. Easiest: on your phone, open ' + url + '/key and paste the key there. Or type it below.' :
      '3. Paste the key below.'));
    p.appendChild(steps);
    var wrap = h('div', 'search-wrap'), inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'search focusable'; inp.placeholder = 'Paste or type your key';
    inp.value = S.settings.aiKey || '';
    var save = button('Save key', 'primary', function () {
      var k = inp.value.trim();
      if (k && !/^[A-Za-z0-9_\-]{8,200}$/.test(k)) { toast('That doesn’t look like a Pollinations key'); return; }
      window.onAiKey(k);
      renderTab('ai', true);
    });
    wrap.appendChild(inp); wrap.appendChild(save);
    p.appendChild(wrap);
    if (S.settings.aiKey) {
      var rm = button('Remove key', 'danger', function () { window.onAiKey(''); renderTab('ai', true); });
      rm.style.marginLeft = '0';
      p.appendChild(rm);
    }
    inp._activate = function () { inp.focus(); inp.click(); };
    focusEl(inp);
  }
  window.onAiKey = function (k) {
    S.settings.aiKey = k || '';
    saveSettings();
    toast(k ? 'Key saved. AI pictures will now be much faster.' : 'Key removed.');
    if (S.menuOpen && S.tab === 'ai' && !S.sub) renderTab('ai', false);
  };

  function openAiCustom() {
    S.sub = { type: 'aicustom' }; S.renderSeq++;
    var p = $('#panel');
    p.innerHTML = ''; p.scrollTop = 0;
    p.appendChild(viewHead('Your own theme', 'Describe the scene you’d like. For example: “a red barn in a snowy field”, “sailboats in a harbor at dusk”.'));
    var wrap = h('div', 'search-wrap'), inp = document.createElement('input');
    inp.type = 'text'; inp.className = 'search focusable'; inp.placeholder = 'Describe a scene';
    inp.setAttribute('enterkeyhint', 'go');
    var go = button('Paint it', 'primary', run);
    wrap.appendChild(inp); wrap.appendChild(go);
    p.appendChild(wrap);
    p.appendChild(h('div', 'status', 'Style: ' + aiStyle(S.settings.aiStyle).name + ' · ' + S.settings.aiCount + ' pictures. Change these on the AI Art page.'));
    inp._activate = function () { inp.focus(); inp.click(); };
    inp.addEventListener('keydown', function (e) {
      if (e.keyCode === 13 && inp.value.trim()) { e.preventDefault(); e.stopPropagation(); run(); }
    });
    function run() {
      var q = inp.value.trim().slice(0, 200);
      if (!q) { inp.focus(); return; }
      inp.blur();
      renderTab('ai', true);
      startAiSet(cap(q), q);
    }
    focusEl(inp);
  }

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
    var typing = document.activeElement && document.activeElement.tagName === 'INPUT';
    if (typing && ['up', 'down', 'ok', 'back'].indexOf(k) < 0) return false;   // let letters reach the text box
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
        var nm = 'sim-' + Date.now() + '-' + Math.floor(Math.random() * 1e6) + '-' + p.name;
        S.simPhotos.unshift({ name: nm, url: p.url, thumb: p.url, time: Date.now() });
        if (m.album) { var al = newAlbum(m.album); if (al) al.photos.unshift(nm); }
      });
      saveAlbums();
      window.onPhotosChanged(null, null);
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
    saveAlbums();
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
