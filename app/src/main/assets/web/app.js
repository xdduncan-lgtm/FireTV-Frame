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

  /* ---------------- Catalogue ---------------- */
  var MAT_STYLES = [
    { id: 'smart', name: 'Auto (fits each picture)' },
    { id: 'none', name: 'None' },
    { id: 'modern', name: 'Modern' },
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
    { id: 'seascapes', name: 'Seascapes', note: 'Coasts, harbours and open water', sources: [['aic', 'seascape'], ['cma', 'seascape', 'Painting']] },
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
    mat: 'smart', matColor: 'auto', matBright: 6, matWidth: 'standard', bezel: 'none', texture: true, sleepAfter: 4, nightMode: false
  };

  /* ---------------- State ---------------- */
  // v2: switch existing installs to the softer auto-coloured mat.
  var savedSettings = store.get('settings', {}), savedMats = store.get('matByArt', {});
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
    bad: {}, stepFrom: null, stepTries: 0,
    ctx: store.get('ctx', { list: [], name: '' }),
    cache: store.get('cache', {}),
    photos: [],
    menuOpen: false, detailOpen: false, sleeping: false, paused: false,
    tab: 'store', sub: null, detail: null, returnFocus: null,
    lastActivity: Date.now(), backArmedAt: 0,
    front: null, slideTimer: null, capTimer: null, showSeq: 0, pvSeq: 0, renderSeq: 0
  };

  function saveSettings() { store.set('settings', S.settings); }
  function saveFavs() { store.set('favorites', S.favorites); }
  function saveCache() { store.set('cache', S.cache); }

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
      '&query%5Bterm%5D%5Bis_public_domain%5D=true&limit=' + (limit || 40) +
      '&fields=id,title,artist_title,artist_display,date_display,image_id';
    return getJSON(url).then(function (j) {
      var base = (j.config && j.config.iiif_url) || 'https://www.artic.edu/iiif/2';
      return (j.data || []).filter(function (d) { return d.image_id; }).map(function (d) {
        var img = base + '/' + d.image_id + '/full/';
        return {
          id: 'aic:' + d.id, title: d.title || 'Untitled',
          artist: d.artist_title || cleanArtist(d.artist_display) || 'Unknown artist',
          date: d.date_display || '', source: 'Art Institute of Chicago',
          thumb: img + '400,/0/default.jpg', full: img + '1686,/0/default.jpg', alt: img + '843,/0/default.jpg'
        };
      });
    });
  }

  function cmaSearch(q, type, limit) {
    var url = 'https://openaccess-api.clevelandart.org/api/artworks/?q=' + enc(q) +
      '&cc0=1&has_image=1&limit=' + (limit || 40) + (type ? '&type=' + enc(type) : '');
    return getJSON(url).then(function (j) {
      return (j.data || []).filter(function (d) { return d.images && d.images.web && d.images.web.url; }).map(function (d) {
        var im = d.images, c = d.creators && d.creators[0];
        var culture = Array.isArray(d.culture) ? d.culture[0] : d.culture;
        return {
          id: 'cma:' + d.id, title: d.title || 'Untitled',
          artist: (c && cleanArtist(c.description)) || culture || 'Unknown artist',
          date: d.creation_date || '', source: 'Cleveland Museum of Art',
          thumb: im.web.url, full: (im.print && im.print.url) || im.web.url, alt: im.web.url
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
    if (hit && hit.items && hit.items.length && Date.now() - hit.t < 3 * 864e5) return Promise.resolve(hit.items);
    return Promise.all(c.sources.map(function (s) { return runSource(s).catch(function () { return []; }); }))
      .then(function (lists) {
        var items = interleave(lists, 48);
        if (items.length) { S.cache[c.id] = { t: Date.now(), items: items }; saveCache(); return items; }
        return hit && hit.items ? hit.items : [];
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

  /* Auto mat colour: a muted tone sampled from the artwork itself. */
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
    if (mat === 'smart') {
      var arS = main.w / main.h, screenAr = W / H, bias = { slim: 0.75, standard: 1, wide: 1.35 }[S.settings.matWidth] || 1;
      if (Math.abs(arS - screenAr) < 0.12 && main.w >= 1200) {
        mat = 'modern'; mw = 0.055 * bias;              // TV-shaped: thin border, nearly full screen
      } else if (arS < 0.95) {
        mat = 'modern'; mw = 0.06 * bias;               // portrait: use the full height
      } else if (arS > 2.1) {
        mat = 'modern'; mw = 0.07 * bias;               // panorama: use the full width
      } else {
        mat = 'modern'; mw = 0.095 * bias;              // landscape / square
      }
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
      case 'none':
        ap(0, 0, W, H, main.src);
        break;
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
    return l || [];
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
  function focusEl(el) {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    try { el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }
    catch (e) { el.scrollIntoView(false); }
  }

  function moveFocus(dir) {
    var els = $$('.focusable', topLayer()).filter(visible);
    var cur = document.activeElement;
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
    var c = h('div', 'card focusable');
    c.tabIndex = -1;
    var th = h('div', 'thumb'), im = document.createElement('img');
    im.loading = 'lazy'; im.decoding = 'async'; im.alt = ''; im.src = art.thumb;
    im.onerror = function () { th.classList.add('broken'); im.remove(); };
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
  var TAB_RENDER = { store: renderStore, photos: renderPhotos, favorites: renderFavorites, settings: renderSettings };

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
        items.slice(0, 14).forEach(function (a) { r.track.appendChild(card(a, items)); });
        r.track.appendChild(tileCard('more', '›', 'See all ' + items.length, function () { openCollection(r.c); }));
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
      var g = grid(items, c.name);
      p.appendChild(g);
      focusEl($('.card', g) || play);
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
          var items = interleave(lists, 60);
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
          focusEl($('.card', g));
        });
    }
    focusEl(inp);
  }

  /* My Photos */
  function refreshPhotos() {
    var raw = native('listPhotos');
    var arr = [];
    try { arr = raw ? JSON.parse(raw) : []; } catch (e) {}
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
    p.appendChild(grid(S.photos, 'My Photos', add));
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
      steps.appendChild(h('p', null, 'Phone upload works in the Fire TV app. In a desktop browser preview this feature is unavailable.'));
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

  /* Favourites */
  function renderFavorites(p) {
    var play = button('Play favourites', 'primary', function () { playList(S.favorites, 'Favourites'); });
    p.appendChild(viewHead('Favourites',
      S.favorites.length ? 'Your personal gallery. Open any work to change its mat or remove it.' :
        'Open any artwork and choose Add to favourites to build your own gallery here.',
      S.favorites.length ? [play] : []));
    if (S.favorites.length) p.appendChild(grid(S.favorites, 'Favourites'));
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
    { key: 'tone', label: 'Colour tone', values: [-4, -3, -2, -1, 0, 1, 2, 3, 4], clamp: true,
      fmt: function (v) { return v === 0 ? 'Standard' : (v < 0 ? 'Cool ' + (-v) : 'Warm ' + v); } },
    { key: 'texture', label: 'Matte finish', hint: 'Soft canvas grain that reduces the screen look', values: [true, false],
      fmt: function (v) { return v ? 'On' : 'Off'; } },
    { key: 'bezel', label: 'Frame bezel', hint: 'Draws a picture-frame border around the screen', values: ['none', 'white', 'beige', 'teak', 'walnut', 'black'],
      fmt: function (v) { return v === 'none' ? 'None' : v.charAt(0).toUpperCase() + v.slice(1); } },
    { group: 'Mats' },
    { key: 'mat', label: 'Default mat style', hint: 'Used for art without its own mat', values: MAT_STYLES.map(function (m) { return m.id; }),
      fmt: function (v) { return MAT_STYLES.filter(function (m) { return m.id === v; })[0].name; } },
    { key: 'matBright', label: 'Mat brightness', hint: 'Dims the mat without dimming the art', values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], clamp: true, bar: true, fmt: String },
    { key: 'matWidth', label: 'Mat width', values: ['slim', 'standard', 'wide'],
      fmt: function (v) { return { slim: 'Slim', standard: 'Standard', wide: 'Wide' }[v]; } },
    { key: 'matColor', label: 'Default mat colour', hint: 'Auto picks a soft tone from each picture', swatch: true, values: MAT_COLORS.map(function (m) { return m.id; }),
      fmt: function (v) { return MAT_COLORS.filter(function (m) { return m.id === v; })[0].name; } },
    { group: 'Slideshow' },
    { key: 'interval', label: 'Change every', values: [0, 3, 10, 30, 60, 180, 720, 1440], fmt: fmtInterval },
    { key: 'playFrom', label: 'Play from', values: ['current', 'favorites', 'photos', 'saved'],
      fmt: function (v) {
        return { current: S.ctx.name ? 'Current: ' + S.ctx.name : 'Current selection', favorites: 'Favourites', photos: 'My Photos', saved: 'Favourites + photos' }[v];
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
      r.appendChild(h('span', 'arr', '‹'));
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
      r.appendChild(h('span', 'arr', '›'));
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
    about.textContent = 'Atelier shows public-domain and CC0 artwork from the open-access programmes of the Art Institute of Chicago, ' +
      'the Cleveland Museum of Art and The Metropolitan Museum of Art. Your own photos stay on this TV.';
    list.appendChild(about);
    p.appendChild(list);
  }

  /* ---------------- Detail ---------------- */
  var dMatDef = { label: 'Mat style', values: MAT_STYLES.map(function (m) { return m.id; }),
    fmt: function (v) { return MAT_STYLES.filter(function (m) { return m.id === v; })[0].name; } };
  var dColDef = { label: 'Mat colour', swatch: true, values: MAT_COLORS.map(function (m) { return m.id; }),
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
    $('#dColor').classList.toggle('disabled', matFor(art).mat === 'none');
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
    $('#dColor').classList.toggle('disabled', matFor(art).mat === 'none');
    updateDetailButtons();
    renderPreview();
    focusEl($('#dShow'));
  }
  function updateDetailButtons() {
    var art = S.detail.art;
    $('#dFav').textContent = isFav(art) ? '♥  In favourites (press to remove)' : '♡  Add to favourites';
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
        if (token === S.pvSeq) compose(pv, asMain(im), cfg, extras);
        return loadImg(art.full, art.alt);
      }).then(function (im) {
        if (token === S.pvSeq) compose(pv, asMain(im), cfg, extras);
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
      toast('Removed from favourites');
    } else {
      S.favorites.unshift(art);
      toast('Added to favourites');
    }
    saveFavs();
    updateDetailButtons();
    if (S.tab === 'favorites' && !S.sub) renderTab('favorites', false);
  };
  $('#dDel')._activate = $('#dDel').onclick = function () {
    var art = S.detail.art;
    if (!art.photo) return;
    native('deletePhoto', art.photo);
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

  /* ---------------- Sleep ---------------- */
  function noteActivity() { S.lastActivity = Date.now(); }
  function enterSleep() {
    S.sleeping = true;
    clearTimeout(S.slideTimer);
    closeDetail(); closeMenu();
    $('#sleep').classList.remove('hidden');
    native('setKeepScreenOn', false);
  }
  function wake() {
    S.sleeping = false;
    $('#sleep').classList.add('hidden');
    native('setKeepScreenOn', true);
    noteActivity();
    scheduleSlideshow();
  }
  setInterval(function () {
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
      default: return null;
    }
  }

  function artKey(k) {
    if (k === 'left' || k === 'right') { S.stepFrom = null; S.stepTries = 0; step(k === 'left' ? -1 : 1); }
    else if (k === 'down') showCaption(S.current, true);
    else if (k === 'ok' || k === 'up' || k === 'menu') openMenu();
  }

  document.addEventListener('keydown', function (e) {
    if (DREAM) return;
    noteActivity();
    if (S.sleeping) { e.preventDefault(); wake(); return; }
    var k = keyOf(e);
    if (!k) return;
    if (k === 'back') { e.preventDefault(); if (!window.handleBack()) native('exitApp'); return; }
    if (k === 'menu') { e.preventDefault(); window.onRemote('menu'); return; }
    var a = document.activeElement;
    var inInput = a && a.tagName === 'INPUT';
    if (inInput && (k === 'left' || k === 'right')) return;
    e.preventDefault();
    if (!S.menuOpen && !S.detailOpen) { artKey(k); return; }
    if (k === 'ok') { activate(a && a !== document.body ? a : null); return; }
    if ((k === 'left' || k === 'right') && a && typeof a._step === 'function') { a._step(k === 'left' ? -1 : 1); return; }
    moveFocus(k);
  });

  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { rerenderCurrent(); if (S.detailOpen) renderPreview(); }, 300);
  });

  /* ---------------- Start ---------------- */
  function init() {
    applyDisplay();
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
