(function () {
  'use strict';
  var EMAIL = 'rio@backendoperators.com';
  var TARGET = Date.parse('2026-12-20T16:00:00+08:00');
  var state = { phase: 'closed', attend: null, sent: false, sending: false, err: '', songSent: false, confetti: false };
  var openedAt = 0, cft = null;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function conds() {
    var a = state.attend, p = state.phase;
    return {
      showIntro: p !== 'done', introClosed: p === 'closed', introOpen: p === 'opening',
      confetti: state.confetti,
      songOpen: !state.songSent, songSent: state.songSent,
      sent: state.sent, notSent: !state.sent,
      yesOn: a === 'yes', yesOff: a !== 'yes', noOn: a === 'no', noOff: a !== 'no',
      hasErr: !!state.err
    };
  }
  function texts() {
    return {
      thanksLine: state.attend === 'no'
        ? "We'll miss you dearly, and we're so grateful you let us know. You'll be in our hearts on the day."
        : "Your reply is in. We can't wait to celebrate with you on December 20. See you in the garden!",
      errMsg: state.err,
      sendLabel: state.sending ? 'Sending…' : 'Send my RSVP'
    };
  }
  function render() {
    var c = conds();
    $$('[data-if]').forEach(function (el) { el.hidden = !c[el.getAttribute('data-if')]; });
    var t = texts();
    $$('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); if (k in t) el.textContent = t[k]; });
    var intro = $('.intro');
    if (intro) {
      intro.classList.toggle('opening', state.phase === 'opening' || state.phase === 'leaving');
      intro.classList.toggle('leaving', state.phase === 'leaving');
    }
    var ttl = $('.ttl');
    if (ttl) ttl.classList.toggle('go', state.phase === 'leaving' || state.phase === 'done');
    document.documentElement.style.overflow = state.phase === 'done' ? '' : 'hidden';
  }
  function set(patch) { for (var k in patch) state[k] = patch[k]; render(); }

  // ---------- countdown ----------
  var last = {};
  function tick() {
    var left = Math.max(0, TARGET - Date.now());
    var vals = {
      days: String(Math.floor(left / 86400000)),
      hours: String(Math.floor((left % 86400000) / 3600000)).padStart(2, '0'),
      mins: String(Math.floor((left % 3600000) / 60000)).padStart(2, '0'),
      secs: String(Math.floor((left % 60000) / 1000)).padStart(2, '0')
    };
    Object.keys(vals).forEach(function (k) {
      var el = $('[data-cd="' + k + '"]');
      if (!el || last[k] === vals[k]) return;
      el.textContent = vals[k];
      if (last[k] !== undefined) { el.classList.remove('fa', 'fb'); void el.offsetWidth; el.classList.add(Number(vals[k]) % 2 ? 'fa' : 'fb'); }
      last[k] = vals[k];
    });
  }

  // ---------- intro ----------
  function openIntro() { if (state.phase !== 'closed') return; openedAt = Date.now(); set({ phase: 'opening' }); }
  function enterSite() {
    if (state.phase !== 'opening') return;
    set({ phase: 'leaving' });
    setTimeout(function () { set({ phase: 'done' }); window.scrollTo(0, 0); }, 750);
  }

  // ---------- email ----------
  function post(data) {
    return fetch('https://formsubmit.co/ajax/' + encodeURIComponent(EMAIL), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(Object.assign({ _template: 'table', _captcha: 'false' }, data))
    }).then(function (r) { if (!r.ok) throw new Error('send failed'); return r.json(); })
      .then(function (j) { if (j && String(j.success) === 'false') throw new Error(j.message || 'send failed'); return j; });
  }
  function val(id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }
  function sendRsvp() {
    if (state.sending) return;
    var a = state.attend, names = val('names'), count = val('count'), phone = val('phone'), message = val('msg');
    if (!a) return set({ err: 'Please choose whether you can join us.' });
    if (!names) return set({ err: 'Please list the full name of each invited guest.' });
    if (a === 'yes' && !count) return set({ err: 'Please tell us how many will be attending.' });
    if (!phone) return set({ err: 'Please add a contact number so we can reach you.' });
    set({ sending: true, err: '' });
    post({
      _subject: (a === 'no' ? 'RSVP (declined): ' : 'New RSVP: ') + names.split('\n')[0] + (a === 'no' ? '' : ' (' + count + ')'),
      'Answer': a === 'no' ? 'Regretfully declines' : 'Joyfully accepts',
      'Guest names': names.replace(/\n/g, ', '),
      'Number attending': a === 'no' ? '0' : count,
      'Contact number': phone,
      'Message for the couple': message || '-'
    }).then(function () { set({ sending: false, sent: true }); })
      .catch(function () { set({ sending: false, err: 'Something went wrong sending your RSVP. Please try again, or message us in the group chat.' }); });
  }
  function sendSong() {
    var song = val('song');
    if (!song) return;
    post({ _subject: 'New song request: ' + song, 'Song request': song })
      .then(function () { set({ songSent: true }); var i = document.getElementById('song'); if (i) i.value = ''; })
      .catch(function () { set({ songSent: true }); });
  }

  var actions = {
    tapIntro: function () {
      if (state.phase === 'closed') openIntro();
      else if (state.phase === 'opening' && Date.now() - openedAt > 1400) enterSite();
    },
    openBtn: function (e) { e.stopPropagation(); openIntro(); },
    enterBtn: function (e) { e.stopPropagation(); enterSite(); },
    pickYes: function () { clearTimeout(cft); set({ attend: 'yes', confetti: true, err: '' }); cft = setTimeout(function () { set({ confetti: false }); }, 4200); },
    pickNo: function () { clearTimeout(cft); set({ attend: 'no', confetti: false, err: '' }); },
    send: sendRsvp,
    reset: function () { set({ sent: false }); },
    sendSong: sendSong,
    moreSong: function () { set({ songSent: false }); }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    while (el) {
      var fn = actions[el.getAttribute('data-action')];
      if (fn) fn(e);
      if (e.cancelBubble) break;
      el = el.parentElement ? el.parentElement.closest('[data-action]') : null;
    }
  });
  document.addEventListener('submit', function (e) { e.preventDefault(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'song') { e.preventDefault(); sendSong(); }
  });

  // ---------- calendar file ----------
  try {
    var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Rio and Jay//Wedding//EN', 'BEGIN:VEVENT',
      'UID:rio-jay-20261220@rioandjaywedding.com', 'DTSTAMP:20261008T000000Z',
      'DTSTART:20261220T080000Z', 'DTEND:20261220T150000Z', "SUMMARY:Rio & Jay's Wedding",
      'LOCATION:The VFarm Bamban\\, Bamban\\, Tarlac',
      'DESCRIPTION:Guest arrival at 4:00 PM. Map: https://maps.app.goo.gl/Hsd22ERwynX1Ghrp9',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    var url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    $$('[data-ics]').forEach(function (a) { a.href = url; });
  } catch (e) {}

  // ---------- scroll reveals ----------
  var rv = $$('[data-rv]');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.18 });
    rv.forEach(function (el) { io.observe(el); });
  } else rv.forEach(function (el) { el.classList.add('in'); });

  render();
  tick();
  setInterval(tick, 1000);
})();
