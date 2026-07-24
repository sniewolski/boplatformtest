(function () {
  "use strict";

  // ---- Config (safe to edit) ---------------------------------------------
  var SUPABASE_URL = "https://ezmtptfptyzoxqmcgebi.supabase.co";
  var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6bXRwdGZwdHl6b3hxbWNnZWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMTgyMjIsImV4cCI6MjA5NzY5NDIyMn0.sdrVKgzHjL9N_BA8j3NIdSZWNONsMahfdK5vrPEIiFw"; // public anon JWT — safe in a public file
  var ENDPOINT = SUPABASE_URL + "/rest/v1/tracker_events";

  // URL params that carry a tracked source. V1: only ?video=. Add lines later.
  var SOURCE_PARAMS = { video: "video" };      // paramName -> source_type

  // Calendly param holding the unique booking id (confirm on first real booking).
  var BOOKING_ID_PARAM = "invitee_uuid";
  var CONFIRMED_PATH = "/confirmed";           // marks the post-booking page
  var BOOK_CTA_MATCH = "form.typeform.com";    // links that count as the book CTA
  var THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

  // ---- Storage keys ------------------------------------------------------
  var K_VISITOR = "slt_visitor_id";
  var K_SOURCE = "slt_source";      // {type, value, ts}
  var K_BOOK_SENT = "slt_book_sent";
  var K_BOOKED = "slt_booked";      // per-visitor booking dedup flag

  // ---- Helpers -----------------------------------------------------------
  function getItem(k){ try { return localStorage.getItem(k); } catch(e){ return null; } }
  function setItem(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  function uuid(){
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch(e){}
    return "v-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
  }
  function param(name){
    try { return new URLSearchParams(location.search).get(name); } catch(e){ return null; }
  }
  function visitorId(){
    var id = getItem(K_VISITOR);
    if (!id){ id = uuid(); setItem(K_VISITOR, id); }
    return id;
  }
  function readSourceFromUrl(){
    for (var p in SOURCE_PARAMS){
      if (!SOURCE_PARAMS.hasOwnProperty(p)) continue;
      var v = param(p);
      if (v) return { type: SOURCE_PARAMS[p], value: v, ts: Date.now() };
    }
    return null;
  }
  function storeSource(src){ try { setItem(K_SOURCE, JSON.stringify(src)); } catch(e){} }
  function effectiveSource(){
    var s = null;
    try { s = JSON.parse(getItem(K_SOURCE) || "null"); } catch(e){ s = null; }
    if (s && s.ts && (Date.now() - s.ts) <= THIRTY_DAYS_MS) return s;
    return null; // stale or absent => direct
  }
  function send(payload){
    try {
      fetch(ENDPOINT, {
        method: "POST",
        keepalive: true,
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + SUPABASE_ANON_KEY,
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(payload)
      }).catch(function(){});
    } catch(e){}
  }
  function logEvent(type, extra){
    var src = effectiveSource();
    var row = {
      event_type: type,
      visitor_id: visitorId(),
      source_type: src ? src.type : null,
      source_value: src ? src.value : null
    };
    if (extra) for (var k in extra) if (extra.hasOwnProperty(k)) row[k] = extra[k];
    send(row);
  }

  // ---- Behaviours --------------------------------------------------------
  function onBookClick(){
    if (getItem(K_BOOK_SENT) === "1") return; // client optimisation; DB is the guarantee
    setItem(K_BOOK_SENT, "1");
    logEvent("book_button");
  }
  function wireBookCta(){
    document.addEventListener("click", function(e){
      try {
        var t = e.target;
        var a = t && t.closest ? t.closest('a[href*="' + BOOK_CTA_MATCH + '"]') : null;
        if (a) onBookClick();
      } catch(err){}
    }, true);
  }
  function onLandingPage(){
    var urlSrc = readSourceFromUrl();
    if (urlSrc) storeSource(urlSrc);   // last-touch overwrite, fresh window
    visitorId();
    logEvent("click", { referrer: document.referrer || null });
    wireBookCta();
  }
  function onConfirmedPage(){
    if (!getItem(K_VISITOR)) return;    // never passed through a tracked page
    if (getItem(K_BOOKED) === "1") return; // already logged for this visitor
    setItem(K_BOOKED, "1");
    logEvent("booking");
  }

  // ---- Route -------------------------------------------------------------
  try {
    if (location.pathname.indexOf(CONFIRMED_PATH) !== -1) onConfirmedPage();
    else onLandingPage();
  } catch(e){}
})();
