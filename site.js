/* Work with John Adams — small, quiet behaviours shared by every page.
   Everything here is an enhancement: each page reads fully without it. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Time: all dates are Western Massachusetts time ------------------ */
  // Preview another day by adding ?now=2026-10-01 (or a full ISO time) to any page.
  var nowParam = new URLSearchParams(location.search).get("now");
  var NOW = nowParam ? new Date(/T/.test(nowParam) ? nowParam : nowParam + "T12:00:00-04:00") : new Date();
  if (isNaN(NOW)) { NOW = new Date(); nowParam = null; }
  var TZ = "America/New_York";

  // Date states: an element shows from data-from (inclusive) until data-until (exclusive).
  document.querySelectorAll("[data-from], [data-until]").forEach(function (el) {
    var from = el.getAttribute("data-from");
    var until = el.getAttribute("data-until");
    var before = from ? NOW < new Date(from) : false;
    var after = until ? NOW >= new Date(until) : false;
    el.hidden = before || after;
  });

  // While previewing a date, carry it from page to page.
  if (nowParam) {
    document.querySelectorAll("a[href]").forEach(function (a) {
      var m = a.getAttribute("href").match(/^([\w-]+\.html)(#.*)?$/);
      if (m) a.setAttribute("href", m[1] + "?now=" + encodeURIComponent(nowParam) + (m[2] || ""));
    });
  }

  /* ---- Header: a hairline once the page moves -------------------------- */
  var header = document.querySelector(".site-header");
  var onScroll = function () { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---- Fade and settle, once, as things arrive ------------------------- */
  // The lineage threads (D6) rest here.
  var settle = document.querySelectorAll(".reveal, .lineage");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.2 });
    settle.forEach(function (el) { io.observe(el); });
  } else {
    settle.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- D2: reading time, in breaths ------------------------------------ */
  var ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
    "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  var TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function words(n) {
    if (n < 20) return ONES[n];
    if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? "-" + ONES[n % 10] : "");
    return String(n);
  }
  var readTime = document.querySelector(".read-time");
  var main = document.querySelector("main");
  if (readTime && main) {
    var walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT, {
      acceptNode: function (node) {
        var p = node.parentElement;
        if (!p || p.closest("[hidden], script, style, svg, [aria-hidden='true']")) return NodeFilter.FILTER_REJECT;
        if (p.closest("details:not([open])") && !p.closest("summary")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var count = 0, node;
    while ((node = walker.nextNode())) count += (node.nodeValue.match(/\S+/g) || []).length;
    var minutes = Math.max(1, Math.round(count / 200));
    var breaths = Math.round(count / 200 * 60 / 8 / 5) * 5;
    var m = words(minutes);
    var article = /^(eight|eleven|eighteen|eighty)/.test(m) ? "an" : "a";
    readTime.textContent = "About " + article + " " + m + "-minute read, or " + words(breaths) + " slow breaths.";
    readTime.hidden = false;
  }

  /* ---- D3: the week, quartered ----------------------------------------- */
  document.querySelectorAll(".week").forEach(function (week) {
    week.querySelectorAll("li[data-q]").forEach(function (li) {
      li.addEventListener("mouseenter", function () { week.setAttribute("data-active", li.getAttribute("data-q")); });
      li.addEventListener("mouseleave", function () { week.removeAttribute("data-active"); });
    });
  });

  /* ---- Testimonials: a carousel, one voice at a time ------------------ */
  // Swipe, arrow keys, the arrows or the segments move between voices. Nothing advances on its own.
  document.querySelectorAll("[data-carousel]").forEach(function (box) {
    var track = box.querySelector(".carousel-track");
    var slides = Array.prototype.slice.call(track.querySelectorAll(".slide"));
    var prev = box.querySelector("[data-prev]");
    var next = box.querySelector("[data-next]");
    var count = box.querySelector(".carousel-count");
    var dotsBox = box.querySelector(".carousel-dots");
    if (!slides.length) return;
    var current = -1;
    var dots = slides.map(function (slide, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show " + (i + 1) + " of " + slides.length);
      b.addEventListener("click", function () { go(i); });
      if (dotsBox) dotsBox.appendChild(b);
      return b;
    });
    function show(i) {
      if (i === current) return;
      current = i;
      dots.forEach(function (d, j) { if (j === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current"); });
      if (prev) prev.disabled = i === 0;
      if (next) next.disabled = i === slides.length - 1;
      if (count) count.textContent = (i + 1) + " of " + slides.length;
    }
    function nearest() {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) return slides.length - 1;
      var step = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 1;
      return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / step)));
    }
    function go(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      track.scrollTo({ left: slides[i].offsetLeft - slides[0].offsetLeft, behavior: reduceMotion ? "auto" : "smooth" });
      show(i);
    }
    // Longer words are shown to the same number of lines as the rest, with a way to read all of them.
    slides.forEach(function (slide) {
      var quote = slide.querySelector("blockquote");
      var more = slide.querySelector(".slide-more");
      if (!quote || !more) return;
      var measure = function () {
        if (!slide.classList.contains("is-open")) more.hidden = quote.scrollHeight <= quote.clientHeight + 2;
      };
      more.addEventListener("click", function () {
        var open = slide.classList.toggle("is-open");
        more.setAttribute("aria-expanded", String(open));
        more.textContent = open ? "Show less" : "Read all of it";
      });
      measure();
      window.addEventListener("resize", measure);
    });
    if (prev) prev.addEventListener("click", function () { go(current - 1); });
    if (next) next.addEventListener("click", function () { go(current + 1); });
    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { ticking = false; show(nearest()); });
    }, { passive: true });
    box.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(current + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(current - 1); }
    });
    // Arriving with someone's name in the address (for example #virginia) opens on their words.
    // It runs again after load, because the browser's own jump to the anchor can nudge the track.
    function toHash() {
      var id = location.hash ? decodeURIComponent(location.hash.slice(1)) : "";
      var target = id ? document.getElementById(id) : null;
      var i = target ? slides.indexOf(target) : -1;
      if (i < 0) return;
      track.scrollTo({ left: target.offsetLeft - slides[0].offsetLeft, behavior: "instant" });
      show(i);
    }
    show(0);
    toHash();
    window.addEventListener("load", function () { requestAnimationFrame(toHash); });
    window.addEventListener("hashchange", toHash);
  });

  /* ---- D7: one breath before you apply --------------------------------- */
  document.querySelectorAll("[data-breath]").forEach(function (box) {
    var btn = box.querySelector(".breath-btn");
    var say = box.querySelector(".breath-say");
    var scope = box.closest("section") || document;
    var next = scope.querySelector("[data-app-link]");
    var running = false;
    if (!btn || !say) return;
    btn.addEventListener("click", function () {
      if (running) return;
      if (reduceMotion) {
        say.textContent = "Breathe in for a count of four, and out for six. Whenever you’re ready.";
        return;
      }
      running = true;
      btn.setAttribute("aria-disabled", "true");
      box.classList.add("is-in");
      say.textContent = "Breathe in…";
      setTimeout(function () {
        box.classList.remove("is-in");
        say.textContent = "…and out.";
      }, 4000);
      setTimeout(function () {
        say.textContent = "Whenever you’re ready.";
        btn.removeAttribute("aria-disabled");
        running = false;
        if (next && next.offsetParent !== null) next.focus();
      }, 10000);
    });
  });

  /* ---- D8: welcome back, after the application tab --------------------- */
  var KEY = "wwja-app-opened";
  document.querySelectorAll("[data-app-link]").forEach(function (a) {
    a.addEventListener("click", function () {
      try { sessionStorage.setItem(KEY, String(Date.now())); } catch (e) { /* storage unavailable */ }
    });
  });
  var welcome = document.getElementById("welcome-back");
  function welcomeBack() {
    if (!welcome || !welcome.hidden) return;
    var opened = null;
    try { opened = sessionStorage.getItem(KEY); } catch (e) { return; }
    if (opened && Date.now() - Number(opened) >= 60000) {
      welcome.hidden = false;
      if (!reduceMotion) welcome.classList.add("notice-enter");
    }
  }
  welcomeBack();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") welcomeBack();
  });

  /* ---- Copy the address ------------------------------------------------ */
  document.querySelectorAll(".copy-email").forEach(function (btn) {
    var status = btn.parentElement.querySelector(".copy-status");
    var timer;
    function say(msg) {
      if (!status) return;
      status.textContent = msg;
      clearTimeout(timer);
      timer = setTimeout(function () { status.textContent = ""; }, 4000);
    }
    function selectAddress() {
      var scope = btn.closest(".footer-block, .panel, section") || document;
      var text = Array.prototype.find.call(scope.querySelectorAll(".email-text"), function (el) { return el.offsetParent !== null; });
      if (text) {
        var range = document.createRange();
        range.selectNodeContents(text);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
      say("Selected. Press ⌘C or Ctrl+C to copy.");
    }
    btn.addEventListener("click", function () {
      var addr = btn.getAttribute("data-email");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).then(function () { say("Copied."); }, selectAddress);
      } else {
        selectAddress();
      }
    });
  });

  /* ---- D9: the season, from John's window ------------------------------ */
  var season = document.querySelector("[data-season]");
  if (season) {
    var month = +new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "numeric" }).format(NOW);
    var line = month >= 9 && month <= 11 ? "as the leaves turn"
      : month === 12 || month <= 2 ? "in the quiet of winter"
      : month <= 5 ? "as the ground thaws"
      : "in the long light of summer";
    season.textContent = "From Western Massachusetts, " + line + ".";
  }

  /* ---- The brand fields drift as they pass through the viewport -------- */
  // Each piece gets --m, from -1 as it enters at the bottom, through 0 mid-screen, to 1 as it
  // leaves at the top. The stylesheet turns that into a slow turn, lean and flow.
  var fields = document.querySelectorAll("[data-drift]");
  if (fields.length && "IntersectionObserver" in window && !reduceMotion) {
    var onScreen = new Set(), queued = false;
    var place = function () {
      queued = false;
      var vh = window.innerHeight;
      onScreen.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (vh - r.top) / (vh + r.height)));
        var m = p * 2 - 1;
        el.style.setProperty("--m", m.toFixed(3));
      });
    };
    var queue = function () { if (!queued) { queued = true; requestAnimationFrame(place); } };
    var watch = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) onScreen.add(e.target); else onScreen.delete(e.target); });
      queue();
    }, { rootMargin: "80px 0px" });
    fields.forEach(function (el) { watch.observe(el); });
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
  }

  /* ---- For anyone who looks under the surface -------------------------- */
  if (window.console && console.log) {
    console.log(
      "%cYou looked under the surface.%c\nIf you’re curious about the fall cohort: talk.to.johnadams@gmail.com",
      "font: italic 300 18px/1.6 Newsreader, Georgia, serif; color: #7d5d0c;",
      "font: 13px/1.6 system-ui, sans-serif; color: #655b4f;"
    );
  }
})();
