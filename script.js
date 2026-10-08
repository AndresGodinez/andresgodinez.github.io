(function () {
  var root = document.documentElement;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Idioma ES / EN ----------
  document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.dataset.setLang;
      root.lang = lang;
      root.dataset.lang = lang;
      try { localStorage.setItem('lang', lang); } catch (e) {}
    });
  });

  document.getElementById('year').textContent = new Date().getFullYear();

  // ---------- Utilidades para las escenas ----------
  // Aleatorio con semilla: la ilustración se ve igual en cada visita.
  function rng(seed) {
    return function () {
      seed |= 0; seed = seed + 0x6D2B79F5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function el(tag, attrs, parent) {
    var node = document.createElementNS(SVGNS, tag);
    for (var k in attrs) node.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(node);
    return node;
  }

  // ---------- Stack: logo de cada tecnología (gris; color de marca al pasar el mouse) ----------
  var BRAND = {
    php: '#777BB4', typescript: '#3178C6', javascript: '#E2C800', python: '#3776AB', dotnet: '#512BD4', ruby: '#CC342D',
    laravel: '#FF2D20', nodedotjs: '#5FA04E', express: '#0A0A0A', loopback: '#3F5DFF', rubyonrails: '#D30001',
    apachekafka: '#231F20', sap: '#0FAAFF', vuedotjs: '#4FC08D', nuxt: '#00C16A', react: '#149ECA', nextdotjs: '#000000',
    mysql: '#4479A1', postgresql: '#4169E1', mongodb: '#47A248', redis: '#FF4438', docker: '#2496ED', kubernetes: '#326CE5',
    argo: '#EF7B4D', githubactions: '#2088FF', traefikproxy: '#24A1C1', linux: '#E0A800', jest: '#C21325', vitest: '#14A34A',
    datadog: '#632CA6', snyk: '#4C4A73', sonarqubeserver: '#126ED3', n8n: '#EA4B71', githubcopilot: '#000000',
    modelcontextprotocol: '#000000', jira: '#0052CC', confluence: '#172B4D'
  };
  document.querySelectorAll('.chips li[data-icon]').forEach(function (li) {
    var ico = li.dataset.icon;
    li.style.setProperty('--i', 'url("images/icons/' + ico + '.svg")');
    li.style.setProperty('--b', BRAND[ico] || '#41a1cf');
    li.classList.add('has-icon');
  });

  // ---------- Hero: un cometa que ilumina las tecnologías ----------
  // El cometa recorre una curva suave que pasa por cada tecnología y regresa por lo alto
  // del cielo. Al pasar cerca, la tecnología se enciende con su ícono; después se atenúa
  // hasta desaparecer (transición en CSS).
  var heroEl = document.querySelector('.hero');
  var techSky = document.querySelector('.tech-sky');
  if (techSky && heroEl) {
    var TECH = {
      laravel: ['Laravel', 'laravel'], php: ['PHP', 'php'], vue: ['Vue', 'vuedotjs'], ts: ['TypeScript', 'typescript'],
      node: ['Node.js', 'nodedotjs'], apigee: ['Apigee', 'apigee'], lambda: ['AWS Lambda', 'lambda'],
      kafka: ['Kafka', 'apachekafka'], python: ['Python', 'python'], dynamo: ['DynamoDB', 'database'],
      docker: ['Docker', 'docker'], actions: ['GitHub Actions', 'githubactions'], datadog: ['Datadog', 'datadog']
    };
    // Puntos en % del hero. Los que no tienen tecnología (null) son el regreso del cometa por lo alto.
    var ROUTES = {
      wide: [
        ['laravel', 21, 33], ['php', 26, 22], ['vue', 31, 32], ['ts', 36, 20], ['node', 41, 31],
        ['apigee', 46, 19], ['lambda', 52, 30], ['kafka', 57, 37], ['python', 62, 30], ['dynamo', 68, 37],
        ['docker', 73, 27], ['actions', 79, 33], ['datadog', 85, 24],
        [null, 90, 13], [null, 70, 9], [null, 45, 9], [null, 24, 11], [null, 16, 22]
      ],
      narrow: [
        ['laravel', 40, 14], ['apigee', 55, 25], ['lambda', 71, 14], ['kafka', 86, 24],
        [null, 92, 33], [null, 62, 35], [null, 34, 29]
      ]
    };

    var canvas = document.createElement('canvas');
    techSky.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var chips = [], techPts = [], samples = [], total = 0, routeName = null;
    var dist = 0, last = 0, running = false, rafId = 0, trail = [], litUntil = [];
    var SPEED = 230, RADIUS = 46, TAIL_MS = 700, HOLD_MS = 900;

    // Curva Catmull-Rom cerrada que pasa por todos los puntos, muestreada para avanzar a velocidad constante
    function spline(pts) {
      var out = [], n = pts.length;
      for (var i = 0; i < n; i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        for (var k = 0; k < 40; k++) {
          var t = k / 40, t2 = t * t, t3 = t2 * t;
          out.push([
            0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
            0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
          ]);
        }
      }
      out.push(out[0]);
      var acc = 0;
      return out.map(function (p, i) {
        if (i > 0) acc += Math.hypot(p[0] - out[i - 1][0], p[1] - out[i - 1][1]);
        return [p[0], p[1], acc];
      });
    }
    function pointAt(d) {
      d = ((d % total) + total) % total;
      var lo = 0, hi = samples.length - 1;
      while (lo < hi) { var mid = (lo + hi) >> 1; if (samples[mid][2] < d) lo = mid + 1; else hi = mid; }
      var b = samples[lo], a = samples[Math.max(0, lo - 1)];
      var seg = b[2] - a[2] || 1, f = (d - a[2]) / seg;
      return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
    }

    function build() {
      var name = window.matchMedia('(max-width: 720px)').matches ? 'narrow' : 'wide';
      var w = techSky.clientWidth, h = techSky.clientHeight, dpr = window.devicePixelRatio || 1;
      var route = ROUTES[name];
      var progress = total ? dist / total : 0;
      if (name !== routeName) {
        routeName = name;
        chips.forEach(function (c) { c.remove(); });
        chips = []; litUntil = [];
        route.forEach(function (r) {
          if (!r[0]) return;
          var chip = document.createElement('div');
          chip.className = 'tech';
          chip.innerHTML = '<img src="images/icons/' + TECH[r[0]][1] + '.svg" alt=""><span>' + TECH[r[0]][0] + '</span>';
          chip.style.left = r[1] + '%';
          chip.style.top = r[2] + '%';
          techSky.appendChild(chip);
          chips.push(chip); litUntil.push(0);
        });
        progress = 0;
      }
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pts = route.map(function (r) { return [r[1] / 100 * w, r[2] / 100 * h]; });
      techPts = route.filter(function (r) { return r[0]; }).map(function (r) { return [r[1] / 100 * w, r[2] / 100 * h]; });
      samples = spline(pts);
      total = samples[samples.length - 1][2];
      dist = progress * total;
      trail = [];
      SPEED = name === 'narrow' ? 150 : 230;
      RADIUS = name === 'narrow' ? 34 : 46;
    }

    function draw(now) {
      var w = techSky.clientWidth, h = techSky.clientHeight;
      ctx.clearRect(0, 0, w, h);
      // Estela: segmentos que se adelgazan y se desvanecen con la edad
      for (var i = 1; i < trail.length; i++) {
        var age = (now - trail[i].t) / TAIL_MS;
        if (age >= 1) continue;
        ctx.strokeStyle = 'rgba(255, 255, 255, ' + ((1 - age) * 0.85).toFixed(3) + ')';
        ctx.lineWidth = (1 - age) * 3.6 + 0.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.stroke();
      }
      var head = trail[trail.length - 1];
      if (!head) return;
      var glow = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 18);
      glow.addColorStop(0, 'rgba(255, 255, 255, .95)');
      glow.addColorStop(0.35, 'rgba(200, 228, 255, .55)');
      glow.addColorStop(1, 'rgba(200, 228, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(head.x, head.y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(head.x, head.y, 3.2, 0, Math.PI * 2); ctx.fill();
    }

    function tick(now) {
      if (!running) return;
      var dt = last ? Math.min(64, now - last) : 16;
      last = now;
      dist += SPEED * dt / 1000;
      var p = pointAt(dist);
      trail.push({ x: p[0], y: p[1], t: now });
      while (trail.length && now - trail[0].t > TAIL_MS) trail.shift();
      // Encender las tecnologías cercanas y apagar las que el cometa ya dejó atrás
      techPts.forEach(function (tp, i) {
        if (Math.hypot(tp[0] - p[0], tp[1] - p[1]) < RADIUS) {
          litUntil[i] = now + HOLD_MS;
          chips[i].classList.add('lit');
        } else if (litUntil[i] && now > litUntil[i]) {
          litUntil[i] = 0;
          chips[i].classList.remove('lit');
        }
      });
      draw(now);
      rafId = requestAnimationFrame(tick);
    }
    function play() { if (!running && !reduceMotion) { running = true; last = 0; trail = []; rafId = requestAnimationFrame(tick); } }
    function stop() { running = false; cancelAnimationFrame(rafId); }

    build();
    if (reduceMotion) {
      techSky.classList.add('static');
      canvas.remove();
    } else {
      var heroVisible = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { heroVisible = e.isIntersecting; if (heroVisible && !document.hidden) play(); else stop(); });
        }).observe(heroEl);
      } else { play(); }
      document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else if (heroVisible) play(); });
    }
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 150);
    });
  }

  // ---------- Parallax del hero ----------
  var layers = Array.prototype.slice.call(document.querySelectorAll('.hero .layer'));
  var hero = document.querySelector('.hero');
  if (!reduceMotion && layers.length) {
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (y < hero.offsetHeight) {
          layers.forEach(function (layer) {
            layer.style.transform = 'translateY(' + (y * parseFloat(layer.dataset.depth)).toFixed(1) + 'px)';
          });
        }
        ticking = false;
      });
    }, { passive: true });
  }

  // ---------- Nav: cambia de estilo fuera de las escenas oscuras ----------
  var nav = document.getElementById('nav');
  var darkScenes = document.querySelectorAll('.hero, .contact-scene');
  if ('IntersectionObserver' in window) {
    var overDark = new Set();
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) overDark.add(e.target); else overDark.delete(e.target);
      });
      nav.classList.toggle('on-light', overDark.size === 0);
    }, { rootMargin: '-40px 0px -' + (window.innerHeight - 80) + 'px 0px' });
    darkScenes.forEach(function (s) { navObserver.observe(s); });
  } else {
    nav.classList.add('on-light');
  }

  // ---------- Menú en pantallas pequeñas ----------
  var menuBtn = nav.querySelector('.nav-menu');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  menuBtn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.querySelectorAll('.nav-links a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('open')) { setMenu(false); menuBtn.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target)) setMenu(false);
  });

  // ---------- Sección activa en la navegación ----------
  var spyLinks = {};
  nav.querySelectorAll('.nav-links a').forEach(function (a) { spyLinks[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var link = spyLinks[e.target.id];
        if (!link) return;
        if (e.isIntersecting) {
          Object.keys(spyLinks).forEach(function (k) {
            spyLinks[k].classList.remove('active');
            spyLinks[k].removeAttribute('aria-current');
          });
          link.classList.add('active');
          link.setAttribute('aria-current', 'true');
        } else if (link.classList.contains('active')) {
          link.classList.remove('active');
          link.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('[data-spy]').forEach(function (sec) { spy.observe(sec); });
  }

  // ---------- Aparición escalonada al hacer scroll ----------
  document.querySelectorAll('[data-stagger]').forEach(function (group) {
    Array.prototype.forEach.call(group.querySelectorAll('[data-reveal]'), function (item, idx) {
      item.style.setProperty('--stagger', (idx * 0.08) + 's');
    });
  });

  var revealItems = document.querySelectorAll('[data-reveal]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (item) { item.classList.add('in'); });
  } else {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var item = e.target;
        item.classList.add('in');
        revealObserver.unobserve(item);
        // Quita el retraso para que el hover responda de inmediato
        setTimeout(function () { item.style.setProperty('--stagger', '0s'); }, 1400);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });
    revealItems.forEach(function (item) { revealObserver.observe(item); });
  }

  // ---------- Contadores de cifras ----------
  var counters = document.querySelectorAll('[data-count]');
  function runCounter(node) {
    var target = parseInt(node.dataset.count, 10);
    var start = null, duration = 2000;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(step);
    }
    node.textContent = '0';
    setTimeout(function () { requestAnimationFrame(step); }, 300);
  }
  var beat = document.querySelector('.beat');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var countObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        runCounter(e.target);
        countObserver.unobserve(e.target);
        // El latido de "<1 s" empieza cuando terminan de contar los números
        if (beat && !beat.classList.contains('beating')) setTimeout(function () { beat.classList.add('beating'); }, 2300);
      });
    }, { threshold: 0.6 });
    counters.forEach(function (n) { countObserver.observe(n); });
  }

  // ---------- Diagrama del caso Spin: una transacción recorre el flujo en orden ----------
  // Cada conexión tiene data-slot (su paso en el flujo). En cada ciclo, un punto
  // recorre la conexión solo durante su paso; las ramas del mismo paso salen juntas.
  var STEP = 0.7; // segundos por paso
  var packetId = 0;
  document.querySelectorAll('svg.flow').forEach(function (svg) {
    if (reduceMotion) return;
    var edges = svg.querySelectorAll('.f-edges path[data-slot]');
    if (!edges.length) return;
    var steps = 0;
    edges.forEach(function (p) { steps = Math.max(steps, parseInt(p.dataset.slot, 10) + 1); });
    var cycle = (steps + 1) * STEP; // un paso extra de pausa al final del ciclo
    var layer = el('g', { class: 'f-packets', 'aria-hidden': 'true' }, svg);

    edges.forEach(function (path) {
      var slot = parseInt(path.dataset.slot, 10);
      var a = (slot * STEP / cycle).toFixed(4);
      var b = ((slot + 1) * STEP / cycle).toFixed(4);
      if (!path.id) path.id = 'edge-' + (++packetId);

      var dot = el('circle', { r: 4.5, class: 'f-packet' + (path.classList.contains('dash') ? ' dash' : '') }, layer);
      var move = el('animateMotion', {
        dur: cycle + 's', repeatCount: 'indefinite', calcMode: 'linear',
        keyPoints: slot === 0 ? '0;1;1' : '0;0;1;1',
        keyTimes: slot === 0 ? '0;' + b + ';1' : '0;' + a + ';' + b + ';1'
      }, dot);
      el('mpath', { href: '#' + path.id }, move);
      el('animate', {
        attributeName: 'opacity', dur: cycle + 's', repeatCount: 'indefinite', calcMode: 'discrete',
        values: slot === 0 ? '1;0' : '0;1;0',
        keyTimes: slot === 0 ? '0;' + b : '0;' + a + ';' + b
      }, dot);
    });

    // Solo anima mientras el diagrama está a la vista
    if ('IntersectionObserver' in window && svg.pauseAnimations) {
      svg.pauseAnimations();
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) svg.unpauseAnimations(); else svg.pauseAnimations();
        });
      }).observe(svg);
    }
  });
})();
