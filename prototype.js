"use strict";

const device = document.querySelector("#device");
const directions = document.querySelector("#directions");
const scenarioSelect = document.querySelector("#scenario");
const announce = document.querySelector("#announce");
const themes = {
  relay: { name: "Relay", detail: "A familiar Android checklist", icon: "layers" },
  signal: { name: "Signal", detail: "A status-first control panel", icon: "pulse" },
  field: { name: "Field", detail: "Guided tester handoff", icon: "steps" },
};
const icons = {
  logo: '<path d="M3 15c4 0 5-7 9-7s5 7 9 7M3 19c4 0 5-7 9-7s5 7 9 7M3 11c4 0 5-7 9-7s5 7 9 7"/>',
  layers: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M4 14h16M9 17h6"/>',
  pulse: '<path d="M2 12h4l3-7 5 14 3-7h5"/>',
  steps: '<path d="M4 19h5v-5h5V9h6M16 5h4v4"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  phone: '<rect x="6" y="2.5" width="12" height="19" rx="3"/><path d="M10 6h4m-3 12h2"/>',
  wifi: '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0m-4 4h.01"/>',
  cell: '<path d="M5 18v-3m5 3v-6m5 6V9m5 9V6"/>',
  battery: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 10v4M5 10h12v4H5z" fill="currentColor" stroke="none"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2m0-12-2 2m-8 8-2 2"/><circle cx="12" cy="12" r="8"/>',
  code: '<path d="m8 7-5 5 5 5m8-10 5 5-5 5m-3-12-2 14"/>',
  usb: '<path d="M12 21V5m-3 3 3-3 3 3m-3 8-5-4v-2m5 8 5-4v-3"/><circle cx="7" cy="9" r="1"/><path d="M16 9h2v2h-2z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 4v3"/>',
  shield: '<path d="M12 22c-5-2.5-8-6.5-8-11V6l8-4 8 4v5c0 4.5-3 8.5-8 11Z"/><path d="m9 12 2 2 4-4"/>',
  building: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 7h.1m5.9 0h.1M9 11h.1m5.9 0h.1M9 15h.1m5.9 0h.1M11 21v-3h2v3"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8.5" cy="9" r="1.5"/><path d="m3 17 5-4 4 3 5-6 4 5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M4 21v-1.5c0-3 3.5-5 8-5s8 2 8 5V21"/>',
  link: '<path d="m10 14 4-4m-6 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m5 0 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 .5 7M20 3v5h-5"/>',
  video: '<rect x="3" y="5" width="12" height="14" rx="2"/><path d="m15 10 6-4v12l-6-4"/>',
  import: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v5h16v-5"/>',
  share: '<circle cx="5" cy="12" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="m7 11 9-5m-9 7 9 5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9m-8 12a2 2 0 0 0 4 0"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  play: '<path d="m8 5 12 7-12 7Z"/>',
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

const logo = `<span class="logo">${icon("logo")}</span><span>Setu</span>`;
document.querySelector("#review-product").innerHTML = logo;

function initialState(theme = "relay") {
  return {
    theme, signedIn: true, auth: "signup", email: "jae@example.test", verification: false,
    verificationEnds: 0, resendAfter: 0, authError: "", screen: "device",
    workspace: "solo", managed: false, enrolled: false, enrollmentRequested: false, policyBlocked: false,
    developer: false, wireless: false, usb: false, wifi: true, taps: 0,
    phoneDeveloper: false, phoneWireless: false, phoneUsb: false, phoneWifi: true,
    hosting: false, code: "", codeEnds: 0, session: "idle", connectedAt: 0, reconnectEnds: 0,
    desktopAttached: false, background: false, trusted: true, history: [], sheet: null,
    docs: [], selected: null, capture: null, captureScope: "", recordingAt: 0, protectedContent: false,
    notice: null, scenario: "setup",
  };
}

let state = initialState();
let settlementTimer;
const soloPeer = "Morgan Lee";
const peer = () => state.workspace === "corporate" ? "Riley Park" : soloPeer;
const org = "Northstar QA";
const hostName = "Pixel 8a";
const isActive = () => ["connected", "reconnecting", "offline"].includes(state.session);
const ready = () => state.developer && state.wireless && state.wifi && !state.policyBlocked;
const permitted = () => state.workspace === "solo" ? !state.managed : state.enrolled && !state.policyBlocked;
const elapsed = (stamp) => Math.max(0, Math.floor((Date.now() - stamp) / 1000));
const secondsLeft = (stamp) => Math.max(0, Math.ceil((stamp - Date.now()) / 1000));
const clock = (secs) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
const esc = (value = "") => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function button(label, action, tone = "secondary", symbol = "", attributes = "") {
  return `<button type="button" class="button ${tone}" data-action="${action}" ${attributes}>${symbol ? icon(symbol) : ""}${label}</button>`;
}

function iconButton(label, action, symbol, extra = "") {
  return `<button type="button" class="icon-button ${extra}" data-action="${action}" aria-label="${label}" title="${label}">${icon(symbol)}</button>`;
}

function row(title, detail, symbol, action = "", tone = "", attributes = "") {
  const copy = `<span class="row-icon ${tone}">${icon(symbol)}</span><span class="row-copy"><strong>${title}</strong><small>${detail}</small></span>`;
  return action
    ? `<button type="button" class="row" data-action="${action}" ${attributes}>${copy}${icon("next")}</button>`
    : `<div class="row">${copy}</div>`;
}

const rows = (...entries) => `<div class="rows">${entries.join("")}</div>`;
const actions = (...entries) => `<div class="actions">${entries.join("")}</div>`;
const stack = (...entries) => `<div class="stack">${entries.join("")}</div>`;
const art = (symbol) => `<div class="hero-art" aria-hidden="true"><i></i><b>${icon(symbol)}</b></div>`;
const panel = (contents, extra = "") => `<div class="panel ${extra}">${contents}</div>`;
const notice = (message, type = "") => `<div class="notice ${type}">${icon(type === "success" ? "check" : "info")}<span>${message}</span></div>`;
const tag = (label, tone = "", symbol = "") => `<span class="tag ${tone}">${symbol ? icon(symbol) : ""}${label}</span>`;
const section = (label, sub = "") => `<div class="section-head"><h2>${label}</h2>${sub ? `<span>${sub}</span>` : ""}</div>`;
const heading = (title, description = "", label = "") => `<div class="screen-head">${label ? `<div class="overline">${label}</div>` : ""}<h1 tabindex="-1">${title}</h1>${description ? `<p class="lede">${description}</p>` : ""}</div>`;
const metadata = (...pairs) => `<dl class="meta">${pairs.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;

function directionButtons() {
  return Object.entries(themes).map(([key, { name, detail, icon: symbol }]) =>
    `<button class="direction" type="button" data-direction="${key}" aria-pressed="${state.theme === key}">
      <span class="swatch">${icon(symbol)}</span><span><strong>${name}</strong><small>${detail}</small></span>${state.theme === key ? icon("check") : ""}
    </button>`).join("");
}

function topbar() {
  const corporate = state.workspace === "corporate";
  const label = corporate ? "Corporate" : "Solo";
  return `<div class="statusbar" aria-hidden="true"><span>9:41</span><span>${icon("wifi")}${icon("cell")}${icon("battery")}</span></div>
  <header class="topbar"><div class="brand">${logo}</div><div class="top-actions">
    ${state.signedIn ? `<button class="workspace-pill" type="button" data-action="workspace" aria-label="Workspace, ${label}">${icon(corporate ? "building" : "user")}${label}${icon("down")}</button>` : ""}
    ${state.hosting ? iconButton("Ongoing notification", "notification", "bell") : ""}
    ${iconButton("Prototype options", "review", "more", "mobile-review")}
  </div></header>`;
}

function nav() {
  const labels = {
    relay: ["Device", "Evidence", "Profile"],
    signal: ["Host", "Media", "Profile"],
    field: ["Guide", "Evidence", "Profile"],
  }[state.theme];
  const links = [["device", "phone"], ["evidence", "photo"], ["profile", "user"]];
  return `<nav class="navigation" aria-label="Setu">${links.map(([link, symbol], index) => `<button type="button"
    data-action="nav-${link}" ${state.screen === link || (link === "evidence" && state.screen === "detail") ? 'aria-current="page"' : ""}><span>${icon(symbol)}</span>${labels[index]}</button>`).join("")}</nav>`;
}

function authView() {
  if (state.verification) {
    return heading("Check your email", `Enter the six-digit sign-in code for ${esc(state.email)}.`, "Account verification")
      + `<form class="form" data-form="verify">
        <label for="email-code">Email verification code<input id="email-code" class="input" type="text" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" aria-describedby="demo-code" required></label>
        ${state.authError ? notice(state.authError, "error") : ""}
        <p class="demo-note" id="demo-code">Demo code <strong>482619</strong></p>
        <button class="button primary wide" type="submit">Verify email</button>
      </form>` + actions(button("Edit email", "edit-email", "ghost"), button("Resend code", "resend", "ghost", "", 'id="resend"'));
  }
  return `<section class="hero auth-hero">${art("phone")}<div class="overline">Setu for Android</div>
    <h1 tabindex="-1">Debug together.</h1><p>Prepare this phone, then approve who can connect.</p></section>
    ${actions(...["signup", "login"].map(mode => `<button type="button" data-action="auth-${mode}" aria-pressed="${state.auth === mode}">${mode === "signup" ? "Create account" : "Sign in"}</button>`)).replace('class="actions"', 'class="actions auth-tabs"')}
    <form class="form" data-form="email">
      <label for="email">Email address<input id="email" class="input" name="email" type="email" autocomplete="email" required placeholder="you@example.com" value="${esc(state.email)}"></label>
      ${state.authError ? notice(state.authError, "error") : ""}
      <button class="button primary wide" type="submit">${state.auth === "signup" ? "Create account with email" : "Continue with email"}</button>
      <p class="demo-note">The prototype displays a demo verification code.</p>
    </form>`;
}

function setupRows() {
  return rows(
    row("Wi-Fi", state.wifi ? "Connected to Studio Wi-Fi" : "Disconnected", state.wifi ? "check" : "wifi", "guide-wifi", state.wifi ? "good" : "warn"),
    row("Developer options", state.developer ? "Enabled" : "Required · Tap Build number seven times", state.developer ? "check" : "code", "guide-developer", state.developer ? "good" : "warn"),
    row("Wireless debugging", state.wireless ? "Enabled" : "Required for wireless hosting", state.wireless ? "check" : "wifi", "guide-wireless", state.wireless ? "good" : "warn"),
    row("USB debugging", state.usb ? "Enabled · Optional" : "Optional · For USB workflows", "usb", "guide-usb"),
  );
}

function mainAction() {
  if (!permitted()) return button("Review enrollment", "enrollment", "primary wide", "shield");
  if (state.hosting) return "";
  if (ready()) return button("Start hosting", "start-host", "primary wide", "link");
  return button("Continue setup", nextSetup(), "primary wide", "arrow");
}

function nextSetup() {
  if (state.policyBlocked) return "guide-wireless";
  if (!state.wifi) return "guide-wifi";
  if (!state.developer) return "guide-developer";
  return "guide-wireless";
}

function progress() {
  return Number(state.developer) + Number(state.wireless) + Number(state.wifi);
}

function connectionLabel() {
  const sessionLabels = { request: "Approval needed", connected: "Session active", reconnecting: "Reconnecting", offline: "Connection lost" };
  if (sessionLabels[state.session]) return sessionLabels[state.session];
  if (state.hosting) return "Hosting";
  if (state.policyBlocked) return "Restricted";
  if (!permitted()) return "Enrollment needed";
  return ready() ? "Ready to host" : "Setup needed";
}

function sessionContent() {
  if (state.session === "request") {
    return panel(`<h2>${peer()} wants to connect</h2><p class="lede">Approve remote debugging from their laptop.</p>
      ${stack(metadata(["Requester", peer()], ["Device", "Developer laptop"], ["Access", "Debug this phone"]),
      actions(button("Decline", "decline", "secondary"), button("Approve request", "approve", "primary", "check")),
      button("Stop hosting", "stop-hosting", "ghost wide", "stop"))}`);
  }
  if (isActive()) {
    const status = state.session === "connected" ? (state.desktopAttached ? "ADB attached" : "Tunnel ready · Waiting for ADB")
      : state.session === "reconnecting" ? `Trying to restore the Wi-Fi connection · <span id="reconnect-timer">${secondsLeft(state.reconnectEnds)}s</span>` : "Automatic reconnect expired. Check Wi-Fi and retry.";
    return panel(`<h2>${peer()} is ${state.session === "connected" ? "connected" : "the session owner"}</h2>
      <p class="lede">${status}</p>
      ${stack(metadata(["Elapsed", `<span id="session-elapsed">${clock(elapsed(state.connectedAt))}</span>`], ["Transport", state.session === "connected" ? "Encrypted relay" : "Unavailable"]),
        state.session === "connected" && !state.desktopAttached ? '<p class="muted">If Android asks, confirm the debugger authorization on this phone.</p>' : "",
        state.session === "connected" ? "" : button("Retry connection", "retry", "secondary wide", "refresh"),
        actions(button("End session", "end-session", "danger-button", "stop"), button("Go to background", "background", "ghost", "home")))}`);
  }
  if (!state.hosting) return "";
  const codeContent = state.workspace === "solo"
    ? panel(`<h2>Setu pairing code</h2><div class="code" id="pair-code">${secondsLeft(state.codeEnds) ? state.code : "Expired"}</div>
      <p class="timer" id="pair-timer">${secondsLeft(state.codeEnds) ? `Expires in ${clock(secondsLeft(state.codeEnds))}` : "Renew for a new code"}</p>
      <p class="lede">Share this code with the developer so they can request access.</p>`, "pair-panel")
    : panel(`<h2>Waiting for a request</h2><p class="lede">Developers with a ${org} device grant can request access.</p>`);
  return `${codeContent}${stack(
    actions(state.workspace === "solo" ? button("Renew code", "renew-code", "secondary", "refresh") : "", button("Go to background", "background", "ghost", "home")),
    button("Stop hosting", "stop-hosting", "danger-button wide", "stop"),
  )}`;
}

function relayView() {
  const count = progress();
  const live = state.hosting;
  return heading(live ? "Debugging session" : "Your device", live ? "You control who can debug this phone." : "", "")
    + `<section class="hero">${art(live ? "pulse" : "phone")}${tag(connectionLabel())}<h2>${hostName}</h2><p>Android 15 · ${state.workspace === "solo" ? "Personal device" : org}</p></section>`
    + (live ? stack(sessionContent()) : `${section("Setup checklist", `${count} of 3 ready`)}${setupRows()}${stack(mainAction())}`);
}

function signalView() {
  const live = state.hosting;
  return `<div class="signal-head"><span class="overline">Device console</span>${tag(state.wifi ? "Wi-Fi online" : "Wi-Fi offline", state.wifi ? "good" : "warn", "wifi")}</div>
    <section class="hero signal-console">${art("pulse")}<div class="overline">Local host · Android 15</div><h1 tabindex="-1">${hostName}</h1><p>${connectionLabel()}</p>
      <dl class="metrics"><div><dt>Transport</dt><dd>${state.wireless ? "Wireless debugging" : "Wireless disabled"}</dd></div>
      <div><dt>${live ? "Session" : "Readiness"}</dt><dd>${live ? (isActive() ? state.session : "Waiting for peer") : `${progress()} / 3 checks passed`}</dd></div></dl>
    </section>
    ${live ? stack(sessionContent()) : `${stack(mainAction())}${section("System checks")}${setupRows()}`}`;
}

function fieldView() {
  const live = state.hosting;
  const current = live || ready() ? 1 : 0;
  const step = state.policyBlocked ? ["Check organization policy", "Ask your administrator about debugging access for this phone."]
    : !state.wifi ? ["Connect to Wi-Fi", "Join a Wi-Fi network before enabling Wireless debugging."]
    : !state.developer ? ["Turn on Developer options", "Open About phone and tap Build number seven times."]
    : ["Enable Wireless debugging", "Open Developer options and switch on Wireless debugging."];
  return `<ol class="field-steps" aria-label="Tester journey">${["Prepare", "Host", "Share"].map((label, index) => `<li ${index === current ? 'aria-current="step"' : index < current ? 'class="past"' : ""}>${label}</li>`).join("")}</ol>
  ${heading(live ? "Guide the session" : ready() ? "You’re ready to host" : "Get your phone ready", live ? "Review who’s connecting and end the session when you’re done." : "Follow the steps on this phone before your developer connects.")}
  ${live ? sessionContent() : `<section class="hero">${art("phone")}<div class="overline">This phone</div><h2>${hostName}</h2><p>Android 15 · ${progress()} of 3 checks ready</p></section>
    ${section("Your next step")}${panel(`<span class="overline">${ready() ? "Host" : "Prepare"}</span><h2>${ready() ? "Invite your developer" : step[0]}</h2>
      <p class="muted">${ready() ? "Start hosting to let your developer request access." : step[1]}</p>${mainAction()}`, "field-task")}
    ${rows(row("All setup checks", "Wi-Fi, developer options and USB", "settings", "checks"))}`}`;
}

function deviceView() {
  const views = { relay: relayView, signal: signalView, field: fieldView };
  const policy = state.policyBlocked ? notice("Your administrator has restricted Wireless debugging on this phone.", "error")
    : state.workspace === "corporate" && !state.enrolled ? notice(`This phone needs a ${org} enrollment and a device grant.`, "warning") : "";
  return views[state.theme]() + (policy ? stack(policy) : "");
}

function evidenceView() {
  const documents = state.docs.filter((item) => item.workspace === state.workspace);
  const capture = state.recordingAt
    ? panel(`<div class="recording-panel"><div><strong>Recording screen</strong><span class="timer" id="recording-time">${clock(elapsed(state.recordingAt))}</span></div>${button("Stop recording", "stop-recording", "danger-button", "stop")}</div>`)
    : actions(button("Take screenshot", "capture-photo", "primary", "photo"), button("Record screen", "capture-video", "secondary", "video"));
  return heading("Evidence", state.theme === "field" ? "Give your developer a clear view of what happened." : "Review screenshots and recordings before sharing.", state.theme === "field" ? "3 · Share what happened" : "")
    + stack(capture, button("Import media", "import-media", "ghost wide", "import"))
    + section("Your evidence", `${documents.length} saved`)
    + (documents.length
      ? rows(...documents.map((item) => row(esc(item.name), `${item.kind} · ${item.shared ? "Shared" : "Local draft"}`, item.kind === "Recording" ? "video" : "photo", "view-evidence", "", `data-evidence="${item.id}"`)))
      : panel('<p class="muted">New captures and imports will appear here as local drafts.</p>'));
}

function selectedEvidence() {
  return state.docs.find((item) => item.id === state.selected && item.workspace === state.workspace);
}

function mediaPreview(item) {
  return `<div class="preview" role="img" aria-label="Mock ${item.kind.toLowerCase()} of a Sample Checkout screen showing a sync error">
    <div class="mock-media" aria-hidden="true"><small>Sample Checkout</small><strong>Couldn’t sync this cart</strong><i></i><i></i></div>
    ${tag(item.kind === "Recording" ? item.duration : "PNG")}
  </div>`;
}

function evidenceDetail() {
  const item = selectedEvidence();
  return heading("Review evidence", esc([item.name, item.scope].filter(Boolean).join(" · "))) + mediaPreview(item)
    + (item.kind === "Recording" ? button("Play mock preview", "play-preview", "ghost wide", "play") : "")
    + stack(
      `<label class="label" for="evidence-note">What happened?<textarea class="input" id="evidence-note" maxlength="220" placeholder="Add a short note for your developer">${esc(item.note)}</textarea></label>`,
      button("Choose share destination", "share", "primary wide", "share"),
      button("Back to evidence", "nav-evidence", "ghost wide"),
    );
}

function profileView() {
  const label = state.workspace === "corporate" ? org : "Solo workspace";
  const history = state.history.filter((item) => item.workspace === state.workspace);
  return heading("Profile & settings", "") + panel(metadata(["Email", esc(state.email)], ["Workspace", label], ["Device name", hostName]))
    + section("Device & access")
    + rows(
      row("Debugging readiness", `${progress()} of 3 required checks ready`, "settings", "checks"),
      row("Service notifications", state.hosting ? "Active foreground service" : "Appears while hosting", "bell", "notification"),
      row("Trusted access", state.trusted && state.workspace === "solo" ? "1 remembered developer" : "No remembered personal access", "shield", "trusted"),
    )
    + section("Recent sessions", `${history.length} ended`)
    + (history.length
      ? rows(...history.map((item) => row(item.name, `${item.reason} · ${item.duration}`, "clock")))
      : panel('<p class="muted">Ended sessions in this workspace will appear here.</p>'))
    + stack(button("Sign out", "sign-out", "ghost wide"));
}

function notificationCard() {
  return panel(`<h2>Setu · ${connectionLabel()}</h2>
    <p class="lede">${isActive() ? `Remote debugging with ${peer()}.` : "This device is accepting connection requests."}</p>
    ${stack(isActive() ? button("End session", "end-session", "danger-button wide", "stop") : button("Stop hosting", "stop-hosting", "danger-button wide", "stop"))}`);
}

function backgroundView() {
  return `<div class="desktop-home">${heading("Android home", "Setu can keep working in the background.")}
    ${state.hosting ? `${section("Ongoing notification")}${notificationCard()}` : notice("Setu hosting is off.")}
    ${state.recordingAt ? button("Stop recording", "stop-recording", "danger-button wide", "stop") : ""}
    ${button("Return to Setu", "foreground", "primary wide", "phone")}</div>`;
}

function simulationControls() {
  if (!state.hosting) return "";
  const items = [];
  if (state.session === "idle") {
    items.push(button("Simulate incoming request", "simulate-request", "secondary", "link"));
    if (state.workspace === "solo" && secondsLeft(state.codeEnds)) items.push(button("Simulate expired pairing code", "simulate-expired-code", "ghost", "clock"));
  }
  if (state.session === "connected") {
    if (!state.desktopAttached) items.push(button("Simulate ADB attachment", "simulate-attach", "secondary", "code"));
    items.push(button("Simulate network drop", "simulate-reconnect", "secondary", "pulse"));
    items.push(button("Simulate access revocation", "simulate-revoke", "ghost", "lock"));
  }
  return items.join("");
}

const scenarioOptions = [...scenarioSelect.options].map(({ value, textContent }) => [value, textContent]);

function sheetContent() {
  switch (state.sheet) {
    case "review": return ["Prototype options", stack(
      `<div class="review-directions">${directionButtons()}</div>`,
      `<label class="label" for="mobile-scenario">Jump to a scenario<select id="mobile-scenario" class="input" data-scenario>
        ${scenarioOptions.map(([key, label]) => `<option value="${key}" ${state.scenario === key ? "selected" : ""}>${label}</option>`).join("")}</select></label>`,
      simulationControls() || "", button(state.protectedContent ? "Allow mock capture" : "Simulate protected content", "toggle-protected", "ghost wide", "lock"),
    )];
    case "workspace": return ["Choose a workspace", rows(
      row("Solo", state.managed ? `Locked by ${org} policy` : "Host and share a pairing code", state.managed ? "lock" : "user", "choose-solo"),
      row("Corporate", state.enrolled ? `${org} · Enrolled` : "Organization enrollment and grants", "building", "choose-corporate"),
    )];
    case "solo-locked": return ["Solo is locked", stack(
      notice(`${org} requires this phone to use Corporate. Personal hosting and remembered Solo access are unavailable.`, "warning"),
      button("Review enrollment", "enrollment", "primary wide", "building"),
    )];
    case "enrollment": return ["Corporate enrollment", stack(
      panel(metadata(["Organization", org], ["Membership", "Verified for this demo"], ["This phone", state.enrolled ? "Enrolled" : "Pending enrollment"], ["Device grant", state.enrolled ? "Active" : "Unavailable"])),
      notice(state.policyBlocked ? "A device administrator has disabled Wireless debugging. Contact your administrator."
        : state.enrolled ? "Organization policy applies to debugging and evidence sharing."
        : "An administrator must enroll this phone and grant access. Signing in with an email address alone does not grant access.", state.policyBlocked ? "error" : ""),
      state.enrolled || state.enrollmentRequested ? "" : button("Request administrator help", "request-enrollment", "primary wide", "mail"),
      state.enrollmentRequested && !state.enrolled ? notice("Administrator help requested in the demo.", "success") : "",
      state.enrolled || state.policyBlocked ? "" : button("Simulate approved enrollment", "enroll", "secondary wide", "check"),
    )];
    case "checks": return ["Debugging readiness", stack(setupRows(), button("Recheck readiness", "recheck", "primary wide", "refresh"))];
    case "developer": return ["Enable Developer options", stack(
      '<ol class="step-list"><li>Open Settings, then About phone.</li><li>Tap <strong>Build number</strong> seven times.</li><li>Enter your screen lock if Android asks, then return to Setu.</li></ol>',
      notice("On Samsung, look under About phone → Software information. You can also search Settings for Build number."),
      state.policyBlocked ? notice("Your administrator manages Developer options on this phone.", "error") : button("Open Android Settings", "settings-developer", "primary wide", "settings"),
    )];
    case "wireless": return ["Enable Wireless debugging", stack(
      '<ol class="step-list"><li>Join a Wi-Fi network on Android 11 or later.</li><li>Open Settings → System → Developer options.</li><li>Turn on <strong>Wireless debugging</strong> and approve your network if Android asks. Return to Setu.</li></ol>',
      notice("Search Settings for Wireless debugging if your phone uses a different menu. Android’s own debugger pairing and the Setu pairing code are separate."),
      !state.developer ? notice("Enable Developer options before this setting becomes available.", "warning") : "",
      state.policyBlocked ? notice("Wireless debugging has been restricted by your administrator.", "error") : button("Open Android Settings", "settings-wireless", "primary wide", "settings"),
    )];
    case "usb": return ["Optional USB debugging", stack(
      '<p class="muted">Use USB debugging for a wired workflow. Setu’s wireless host only checks Wireless debugging.</p>',
      notice("Open Settings → System → Developer options → USB debugging."),
      state.policyBlocked ? notice("Developer options are managed on this phone.", "error") : button("Open Android Settings", "settings-usb", "primary wide", "settings"),
    )];
    case "wifi": return ["Check Wi-Fi", stack(
      '<p class="muted">Connect the phone to Wi-Fi to host over Wireless debugging. A network change may require Android approval again.</p>',
      button("Open Wi-Fi settings", "settings-wifi", "primary wide", "wifi"),
    )];
    case "settings-developer": return ["Android Settings", stack(
      '<p class="muted">About phone · Pixel 8a</p>',
      rows(row("Build number", state.phoneDeveloper ? "Developer options enabled" : `${state.taps} of 7 taps`, "code", "tap-build", state.phoneDeveloper ? "good" : "")),
      button("Return to Setu", "returned", "primary wide", "arrow"),
    )];
    case "settings-wireless": return ["Android Settings", stack(
      '<p class="muted">System · Developer options</p>',
      state.phoneDeveloper ? rows(row("Wireless debugging", state.phoneWireless ? "On" : "Off", "wifi", "toggle-wireless", state.phoneWireless ? "good" : "")) : notice("Turn on Developer options first.", "warning"),
      !state.phoneWifi ? notice("Connect to Wi-Fi to enable Wireless debugging.", "warning") : "",
      button("Return to Setu", "returned", "primary wide", "arrow"),
    )];
    case "settings-usb": return ["Android Settings", stack(
      '<p class="muted">System · Developer options</p>',
      state.phoneDeveloper ? rows(row("USB debugging", state.phoneUsb ? "On" : "Off", "usb", "toggle-usb", state.phoneUsb ? "good" : "")) : notice("Turn on Developer options first.", "warning"),
      button("Return to Setu", "returned", "primary wide", "arrow"),
    )];
    case "settings-wifi": return ["Android Settings", stack(
      '<p class="muted">Internet · Available networks</p>',
      rows(row("Studio Wi-Fi", state.phoneWifi ? "Connected · Tap to disconnect" : "Available · Tap to connect", "wifi", "toggle-wifi", state.phoneWifi ? "good" : "")),
      button("Return to Setu", "returned", "primary wide", "arrow"),
    )];
    case "returned": return ["Back in Setu", stack(
      '<p class="muted">Check what changed in Android Settings before continuing.</p>',
      button("Recheck readiness", "recheck", "primary wide", "refresh"),
    )];
    case "notification": return ["Service notifications", stack(
      state.hosting ? notificationCard() : '<p class="muted">Android shows an ongoing notification while the device is hosting or connected. You can stop it there when Setu is in the background.</p>',
      state.hosting && !state.background ? button("Go to background", "background", "secondary wide", "home") : "",
    )];
    case "trusted": return ["Trusted access", stack(
      state.workspace === "corporate" ? notice(`Trusted corporate access is managed by ${org} device grants.`)
        : state.trusted ? rows(row(soloPeer, "Remembered developer · Approval still required", "user")) : notice("There are no remembered developers."),
      state.trusted && state.workspace === "solo" ? button("Clear trusted access", "clear-trusted", "danger-button wide", "shield") : "",
    )];
    case "capture": return [state.capture === "Recording" ? "Start screen recording?" : "Allow screen capture?", stack(
      '<p class="muted">Android asks for permission each time Setu starts capturing. Screens with protected content may be hidden.</p>',
      `<fieldset><legend>Share with Setu</legend><label class="radio"><input name="capture-scope" type="radio" value="app" checked>One app</label><label class="radio"><input name="capture-scope" type="radio" value="screen">Entire screen</label></fieldset>`,
      actions(button("Don’t allow", "deny-capture", "secondary"), button("Allow capture", "allow-capture", "primary")),
    )];
    case "import": return ["Import media", stack(
      '<p class="muted">Choose a demo item from the simulated Android picker.</p>',
      rows(row("Checkout screenshot", "PNG · 420 KB", "photo", "import-photo"), row("Checkout recording", "MP4 · 14 sec", "video", "import-video")),
    )];
    case "share": {
      const item = selectedEvidence();
      const restricted = state.workspace === "corporate";
      return ["Share preview", stack(
        mediaPreview(item), panel(metadata(["File", esc(item.name)], ["Note", esc(item.note || "No note added")])),
        rows(row(restricted ? `${org} project inbox` : "Developer inbox", "Share to the current workspace", "share", "share-workspace"),
          row("Android share sheet", restricted ? "Blocked by organization policy" : "Preview another destination", restricted ? "lock" : "arrow", "share-external")),
        state.notice ? notice(state.notice.message, state.notice.type) : "",
      )];
    }
    case "external-destination": return ["Android share sheet", stack(
      '<p class="muted">Choose a demo app. Your draft stays available in Evidence.</p>',
      rows(row("Save to downloads", "Demo export", "import", "share-complete"), row("Mail", "Simulate destination unavailable", "mail", "share-fails")),
    )];
    default: return null;
  }
}

let sheetOpener = "";

function measureSheet() {
  const box = device.getBoundingClientRect();
  device.style.setProperty("--sheet-left", `${box.left + device.clientLeft}px`);
  device.style.setProperty("--sheet-width", `${device.clientWidth}px`);
  device.style.setProperty("--sheet-height", `${device.clientHeight * .89}px`);
  device.style.setProperty("--sheet-bottom", `${Math.max(0, innerHeight - box.bottom + device.clientTop)}px`);
}

function render({ focusHeading = false, focusAction = "", focusReview = "" } = {}) {
  const active = document.activeElement;
  const previousScreen = device.querySelector(".screen");
  const scroll = previousScreen?.scrollTop || 0;
  const previousSheet = device.querySelector(".sheet");
  const oldSheet = previousSheet?.open ? previousSheet.dataset.sheet : "";
  const action = active?.dataset?.action || "";
  if (state.sheet && !oldSheet) sheetOpener = action;
  const sheet = sheetContent();
  const page = state.background ? backgroundView()
    : !state.signedIn ? authView()
    : state.screen === "evidence" ? evidenceView()
    : state.screen === "detail" && selectedEvidence() ? evidenceDetail()
    : state.screen === "profile" ? profileView() : deviceView();

  device.dataset.theme = state.theme;
  directions.querySelectorAll("button").forEach((choice) => {
    const selected = choice.dataset.direction === state.theme;
    choice.setAttribute("aria-pressed", String(selected));
    choice.querySelector(":scope > svg")?.remove();
    if (selected) choice.insertAdjacentHTML("beforeend", icon("check"));
  });
  document.querySelector("#scenario-actions").innerHTML = simulationControls();
  scenarioSelect.value = state.scenario;
  device.innerHTML = `${topbar()}
    ${!state.background && state.hosting ? `<div class="service">${icon("bell")}<span>Setu service · ${connectionLabel()}</span>${iconButton("View ongoing notification", "notification", "next")}</div>` : ""}
    ${!state.background && state.recordingAt && state.screen !== "evidence" ? `<div class="service">${icon("video")}<span>Recording screen</span>${iconButton("Stop recording", "stop-recording", "stop")}</div>` : ""}
    <main class="screen" tabindex="-1">${state.notice && !sheet ? `<div class="feedback">${notice(state.notice.message, state.notice.type)}</div>` : ""}${page}</main>
    ${state.signedIn && !state.background ? nav() : ""}
    <div class="gesture" aria-hidden="true"><i></i></div>
    ${sheet ? `<dialog class="sheet" data-sheet="${state.sheet}" aria-labelledby="sheet-title">
      <div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head"><h2 id="sheet-title" tabindex="-1">${sheet[0]}</h2>${iconButton("Close", "close-sheet", "close")}</div>
      ${sheet[1]}</dialog>` : ""}`;
  if (!focusHeading) device.querySelector(".screen").scrollTop = scroll;
  if (sheet) {
    const dialog = device.querySelector(".sheet");
    measureSheet();
    dialog.showModal();
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeSheet();
    });
    if (focusReview) {
      dialog.querySelector(`[data-direction="${focusReview}"]`)?.focus({ preventScroll: true });
    } else if (oldSheet === state.sheet && action && dialog.querySelector(`[data-action="${action}"]`)) {
      dialog.scrollTop = previousSheet.scrollTop;
      dialog.querySelector(`[data-action="${action}"]`).focus({ preventScroll: true });
    } else {
      dialog.querySelector("#sheet-title").focus({ preventScroll: true });
    }
  } else {
    const focus = focusHeading ? device.querySelector("main h1") || device.querySelector("main")
      : device.querySelector(`[data-action="${focusAction || (oldSheet ? sheetOpener : action)}"]`)
        || document.querySelector(`#scenario-actions [data-action="${action}"]`);
    focus?.focus({ preventScroll: true });
  }
  updateTimers();
}

function flash(message, type = "") {
  state.notice = { message, type };
  announce.textContent = message;
}

function closeSheet() {
  state.sheet = null;
  state.notice = null;
  render();
}

function openSheet(name) {
  state.sheet = name;
  render();
}

function goTo(screen) {
  state.screen = screen;
  state.sheet = null;
  render({ focusHeading: true });
}

function createCode(first = false) {
  if (first) state.code = "4821-K7QZPM";
  else {
    const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    const numbers = crypto.getRandomValues(new Uint16Array(7));
    state.code = `${String(numbers[0] % 10000).padStart(4, "0")}-${[...numbers.slice(1)].map((n) => alphabet[n % alphabet.length]).join("")}`;
  }
  state.codeEnds = Date.now() + 120_000;
}

function startHosting() {
  state.sheet = null;
  if (!permitted()) return openSheet("enrollment");
  if (!ready()) return runAction(nextSetup());
  state.hosting = true;
  state.session = "idle";
  if (state.workspace === "solo") createCode(true);
  goTo("device");
}

function endSession(reason, keepHosting = true) {
  clearTimeout(settlementTimer);
  if (isActive()) state.history.unshift({ name: peer(), reason, workspace: state.workspace, duration: clock(elapsed(state.connectedAt)) });
  state.session = "idle";
  state.hosting = keepHosting && permitted() && ready();
  state.desktopAttached = false;
  state.reconnectEnds = 0;
  state.connectedAt = 0;
  if (state.hosting && state.workspace === "solo") createCode();
  else {
    state.code = "";
    state.codeEnds = 0;
  }
}

function makeEvidence(kind, mode, seconds = 0, name) {
  const item = {
    id: state.docs.length + 1,
    name: name || `${mode === "import" ? "Checkout " : ""}${kind.toLowerCase()}.${kind === "Recording" ? "mp4" : "png"}`,
    kind, duration: clock(seconds), note: "", shared: false, workspace: state.workspace,
    scope: mode === "capture" ? state.captureScope : "",
  };
  state.docs.unshift(item);
  state.selected = item.id;
  return item;
}

function saveRecording() {
  if (!state.recordingAt) return;
  makeEvidence("Recording", "capture", elapsed(state.recordingAt));
  state.recordingAt = 0;
  state.captureScope = "";
}

function applyScenario(scenario, theme = state.theme, focusHeading = false) {
  clearTimeout(settlementTimer);
  state = initialState(theme);
  state.scenario = scenario;
  if (["ready", "request", "active", "recovery", "managed", "evidence"].includes(scenario)) {
    state.developer = state.phoneDeveloper = true;
    state.wireless = state.phoneWireless = true;
    state.taps = 7;
  }
  if (["request", "active", "recovery"].includes(scenario)) {
    state.hosting = true;
    createCode(true);
    state.session = scenario === "request" ? "request" : scenario === "active" ? "connected" : "offline";
    state.connectedAt = Date.now() - 219_000;
    state.desktopAttached = scenario === "active";
  }
  if (scenario === "signup") state.signedIn = false;
  if (scenario === "managed" || scenario === "blocked") {
    state.managed = true;
    state.workspace = "corporate";
    state.policyBlocked = scenario === "blocked";
  }
  if (scenario === "evidence") {
    const item = makeEvidence("Screenshot", "import", 0, "checkout-sync.png");
    item.note = "The cart stayed on the loading screen after switching to Wi-Fi.";
    state.screen = "detail";
  }
  render({ focusHeading });
}

function recheck() {
  state.developer = state.phoneDeveloper;
  state.wifi = state.phoneWifi;
  state.wireless = state.phoneDeveloper && state.phoneWireless && !state.policyBlocked;
  state.usb = state.phoneDeveloper && state.phoneUsb;
  if (state.hosting && !ready()) endSession("Debugging became unavailable", false);
  state.sheet = null;
  flash(ready() ? "Phone is ready for wireless hosting." : "Settings checked. A required step remains.", ready() ? "success" : "");
  render({ focusAction: ready() ? "start-host" : nextSetup() });
}

function shareDone() {
  selectedEvidence().shared = true;
  flash("Evidence shared in the demo.", "success");
  goTo("evidence");
}

function runAction(action, control) {
  state.notice = null;
  if (action.startsWith("nav-")) return goTo(action.slice(4));
  if (action.startsWith("guide-")) return openSheet(action.slice(6));
  if (action.startsWith("settings-")) return openSheet(action);
  if (action.startsWith("auth-")) {
    state.email = device.querySelector("#email")?.value || state.email;
    state.auth = action.slice(5);
    state.authError = "";
    return render();
  }
  switch (action) {
    case "close-sheet": return closeSheet();
    case "review": case "checks": case "notification": case "workspace": case "trusted": case "enrollment": case "returned":
      return openSheet(action);
    case "choose-solo":
      if (state.managed) return openSheet("solo-locked");
      if (state.workspace !== "solo") {
        saveRecording();
        endSession("Workspace changed", false);
      }
      state.workspace = "solo";
      return goTo("device");
    case "choose-corporate":
      if (state.workspace !== "corporate") {
        saveRecording();
        endSession("Workspace changed", false);
      }
      state.workspace = "corporate";
      state.screen = "device";
      if (!state.enrolled || state.policyBlocked) return openSheet("enrollment");
      return goTo("device");
    case "request-enrollment":
      state.enrollmentRequested = true;
      announce.textContent = "Administrator help requested in the demo.";
      break;
    case "enroll":
      if (state.policyBlocked) return;
      state.enrolled = true;
      state.managed = true;
      state.workspace = "corporate";
      flash(`This phone is enrolled with ${org} and has a device grant.`, "success");
      return goTo("device");
    case "edit-email":
      state.verification = false;
      state.authError = "";
      break;
    case "resend":
      if (secondsLeft(state.resendAfter)) return;
      beginVerification();
      flash("A new demo verification code is available.", "success");
      break;
    case "tap-build":
      state.taps = Math.min(7, state.taps + 1);
      state.phoneDeveloper = state.taps === 7;
      announce.textContent = state.phoneDeveloper ? "Developer options enabled in the simulator." : `${state.taps} of 7 taps.`;
      break;
    case "toggle-wireless":
      if (!state.phoneWifi || !state.phoneDeveloper || state.policyBlocked) return;
      state.phoneWireless = !state.phoneWireless;
      announce.textContent = state.phoneWireless ? "Wireless debugging on." : "Wireless debugging off.";
      break;
    case "toggle-usb":
      state.phoneUsb = !state.phoneUsb;
      announce.textContent = state.phoneUsb ? "USB debugging on." : "USB debugging off.";
      break;
    case "toggle-wifi":
      state.phoneWifi = !state.phoneWifi;
      if (!state.phoneWifi) state.phoneWireless = false;
      announce.textContent = state.phoneWifi ? "Wi-Fi connected." : "Wi-Fi disconnected.";
      break;
    case "recheck": return recheck();
    case "start-host": return startHosting();
    case "renew-code":
      if (!state.hosting || state.workspace !== "solo" || state.session !== "idle") return;
      createCode();
      flash("New Setu pairing code is ready.", "success");
      break;
    case "simulate-expired-code":
      state.codeEnds = Date.now();
      state.sheet = null;
      flash("This pairing code has expired. Renew it to accept a new request.", "warning");
      break;
    case "simulate-request":
      if (!state.hosting || state.session !== "idle") return;
      state.sheet = null;
      if (state.workspace === "solo" && !secondsLeft(state.codeEnds)) {
        flash("This pairing code has expired. Renew the code and try again.", "error");
        break;
      }
      state.session = "request";
      announce.textContent = `${peer()} wants to connect.`;
      return state.background ? render() : goTo("device");
    case "approve":
      if (!state.hosting || state.session !== "request" || !permitted() || !ready()) return;
      state.session = "connected";
      state.connectedAt = Date.now();
      state.desktopAttached = false;
      flash(`${peer()} was approved. The tunnel is ready.`, "success");
      break;
    case "decline":
      state.session = "idle";
      flash(`${peer()}’s request was declined. Hosting is still on.`);
      break;
    case "simulate-attach":
      if (state.session !== "connected") return;
      state.desktopAttached = true;
      state.sheet = null;
      flash("The developer attached ADB in the demo.", "success");
      break;
    case "simulate-reconnect":
      if (state.session !== "connected") return;
      state.session = "reconnecting";
      state.desktopAttached = false;
      state.reconnectEnds = Date.now() + 8000;
      state.sheet = null;
      flash("Network interrupted. Trying to reconnect.", "warning");
      settlementTimer = setTimeout(() => {
        if (state.session !== "reconnecting") return;
        state.session = "offline";
        flash("Automatic reconnect expired.", "error");
        render();
      }, 8000);
      break;
    case "retry":
      if (!isActive() || state.session === "connected") return;
      clearTimeout(settlementTimer);
      state.reconnectEnds = 0;
      state.session = "connected";
      flash("Connection restored. The tunnel is ready.", "success");
      break;
    case "simulate-revoke":
      endSession("Access revoked", false);
      state.sheet = null;
      flash("Developer access was revoked. Hosting stopped.", "error");
      break;
    case "end-session":
      if (!isActive()) return;
      endSession("Ended on this phone");
      state.sheet = null;
      flash("Session ended. Hosting is still on.");
      break;
    case "stop-hosting":
      endSession("Hosting stopped", false);
      state.sheet = null;
      flash("Hosting stopped. This phone isn’t accepting requests.");
      break;
    case "background":
      state.background = true;
      state.sheet = null;
      return render({ focusHeading: true });
    case "foreground":
      state.background = false;
      return goTo("device");
    case "clear-trusted":
      state.trusted = false;
      announce.textContent = "Remembered access cleared.";
      break;
    case "sign-out":
      saveRecording();
      endSession("Signed out", false);
      state.signedIn = false;
      state.verification = false;
      state.verificationEnds = 0;
      state.authError = "";
      state.sheet = null;
      state.auth = "login";
      state.scenario = "signup";
      return render({ focusHeading: true });
    case "capture-photo": case "capture-video":
      if (state.recordingAt) return;
      state.capture = action === "capture-video" ? "Recording" : "Screenshot";
      return openSheet("capture");
    case "deny-capture":
      state.capture = null;
      state.sheet = null;
      flash("Screen capture was declined. You can import media instead.", "warning");
      break;
    case "allow-capture":
      state.captureScope = device.querySelector('input[name="capture-scope"]:checked')?.value === "screen" ? "Entire screen" : "One app";
      if (state.protectedContent) {
        state.capture = null;
        state.captureScope = "";
        state.sheet = null;
        flash("Android hid protected content. Capture a different app or import media.", "error");
      } else if (state.capture === "Recording") {
        state.recordingAt = Date.now();
        state.capture = null;
        state.sheet = null;
        flash("Screen recording started in the demo.");
      } else {
        makeEvidence("Screenshot", "capture");
        state.capture = null;
        state.captureScope = "";
        return goTo("detail");
      }
      break;
    case "stop-recording":
      saveRecording();
      state.background = false;
      return goTo("detail");
    case "import-media": return openSheet("import");
    case "import-photo": case "import-video":
      makeEvidence(action === "import-video" ? "Recording" : "Screenshot", "import", 14);
      return goTo("detail");
    case "view-evidence":
      state.selected = Number(control.dataset.evidence);
      return goTo("detail");
    case "play-preview": {
      const preview = device.querySelector(".preview");
      preview.classList.remove("mock-playing");
      requestAnimationFrame(() => requestAnimationFrame(() => preview.classList.add("mock-playing")));
      announce.textContent = "Playing the demo preview.";
      return;
    }
    case "share": return openSheet("share");
    case "share-workspace": return shareDone();
    case "share-external":
      if (state.workspace === "corporate") {
        flash(`${org} blocks sharing outside the organization. Your draft is saved.`, "error");
        break;
      }
      return openSheet("external-destination");
    case "share-complete":
      if (state.workspace === "solo") return shareDone();
      return;
    case "share-fails":
      flash("That destination is unavailable. Your local draft is saved.", "error");
      return openSheet("share");
    case "toggle-protected":
      state.protectedContent = !state.protectedContent;
      announce.textContent = state.protectedContent ? "Protected content simulation is on." : "Protected content simulation is off.";
      break;
    default: return;
  }
  render();
}

function beginVerification() {
  state.verification = true;
  state.verificationEnds = Date.now() + 300_000;
  state.resendAfter = Date.now() + 10_000;
  state.authError = "";
}

function updateTimers() {
  const timer = document.querySelector("#pair-timer");
  if (timer) {
    const remaining = secondsLeft(state.codeEnds);
    timer.textContent = remaining ? `Expires in ${clock(remaining)}` : "Renew for a new code";
    if (!remaining) document.querySelector("#pair-code").textContent = "Expired";
  }
  const resend = document.querySelector("#resend");
  if (resend) {
    const remaining = secondsLeft(state.resendAfter);
    resend.disabled = Boolean(remaining);
    resend.textContent = remaining ? `Resend in ${remaining}s` : "Resend code";
  }
  const session = document.querySelector("#session-elapsed");
  if (session) session.textContent = clock(elapsed(state.connectedAt));
  const recording = document.querySelector("#recording-time");
  if (recording) recording.textContent = clock(elapsed(state.recordingAt));
  const reconnect = document.querySelector("#reconnect-timer");
  if (reconnect) reconnect.textContent = `${secondsLeft(state.reconnectEnds)}s`;
}

document.addEventListener("click", (event) => {
  const direction = event.target.closest("button[data-direction]");
  if (direction) {
    state.theme = direction.dataset.direction;
    render({ focusReview: state.theme });
    return;
  }
  const control = event.target.closest("button[data-action]");
  if (control) runAction(control.dataset.action, control);
});

document.addEventListener("change", (event) => {
  if (event.target === scenarioSelect || event.target.matches("[data-scenario]")) applyScenario(event.target.value, state.theme, event.target !== scenarioSelect);
});

document.addEventListener("input", (event) => {
  if (event.target.id === "evidence-note") selectedEvidence().note = event.target.value;
});

device.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target;
  const input = new FormData(form);
  state.notice = null;
  if (form.dataset.form === "email") {
    state.email = input.get("email").trim();
    beginVerification();
    render({ focusHeading: true });
  } else if (!secondsLeft(state.verificationEnds) || input.get("code") !== "482619") {
    state.authError = secondsLeft(state.verificationEnds) ? "That code doesn’t match. Try the demo code shown below." : "That code expired. Request a new code below.";
    announce.textContent = state.authError;
    render();
    const code = document.querySelector("#email-code");
    code.value = input.get("code");
    code.focus();
  } else {
    state.verification = false;
    state.verificationEnds = 0;
    state.signedIn = true;
    flash("Email verified.", "success");
    goTo("device");
  }
});

directions.innerHTML = directionButtons();
const url = new URLSearchParams(location.search);
const requestedTheme = url.get("theme");
const requestedScenario = url.get("scenario");
applyScenario(scenarioOptions.some(([key]) => key === requestedScenario) ? requestedScenario : "setup",
  Object.hasOwn(themes, requestedTheme) ? requestedTheme : "relay");
window.addEventListener("resize", measureSheet);
setInterval(updateTimers, 1000);
