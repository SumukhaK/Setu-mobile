"use strict";

const device = document.querySelector("#device");
const scenarios = document.querySelector("#scenario");
const announce = document.querySelector("#announce");
const reviewControls = document.querySelector("#scenario-actions");
const org = "Northstar QA";
const demoDeviceId = () => state.managed ? "qa-pixel8a-07" : "pixel-8a-casey";
const demoCode = (generation) => `4821-${String(512903 + generation * 137).padStart(6, "0").slice(-6)}`;
const transportLabels = { lan: "Direct LAN", "relay-wss": "Encrypted relay · WSS", "relay-ws": "Relay · WS", "relay-tcp": "Relay · TCP" };
const pathLabels = { UP: "Path up", DOWN: "Reconnecting", LOST: "Path lost" };
const escaped = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
const icons = {
  logo: '<path d="M3 15c4 0 5-7 9-7s5 7 9 7M3 19c4 0 5-7 9-7s5 7 9 7M3 11c4 0 5-7 9-7s5 7 9 7"/>',
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
  link: '<path d="m10 14 4-4m-6 6-1 1a3.5 3.5 0 0 1-5-5l4-4a3.5 3.5 0 0 1 5 0m5 0 1-1a3.5 3.5 0 0 1 5 5l-4 4a3.5 3.5 0 0 1-5 0"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 .5 7M20 3v5h-5"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-2 7-2 9h16c0-2-2-2-2-9m-8 12a2 2 0 0 0 4 0"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  home: '<path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-6h6v6"/>',
  pulse: '<path d="M2 12h4l3-7 5 14 3-7h5"/>',
};

function icon(name) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name]}</svg>`;
}

const logo = `<span class="logo">${icon("logo")}</span><span>Setu</span>`;
document.querySelector("#review-product").innerHTML = logo;
const scenarioOptions = [...scenarios.options].map(({ value, textContent }) => [value, textContent]);

function defaultState(scenario) {
  return {
    scenario, screen: "device", sheet: "", settingsPage: "",
    model: "Pixel 8a", oem: "Pixel", android: 15, network: "wifi",
    developer: false, wireless: false, usb: false, usbAuthorized: false, usbThisBoot: false, legacyAllowed: false,
    battery: "unreviewed", notification: "unrequested", taps: 0, fgsBackground: false, locked: false,
    managed: false, token: false, policy: false, blocked: false, ack: false, queuedPolicy: "",
    host: "idle", adbdWarning: false, failedAttempts: 0, codeGeneration: 0, pathStatus: null,
    sessions: [], selectedSession: "", pendingEnds: new Set(),
    installError: false, usbInstall: false, usbSecurity: false, nextGuide: "", notice: null,
  };
}

let state = defaultState("setup");
let startTimer;
let sheetOpener = "";
let sheetOpenerPeer = "";

function path() {
  return state.android >= 11 && state.network === "wifi" ? "wireless" : "usb";
}

function readyForHost() {
  return state.developer && (path() === "wireless" ? state.wireless : state.legacyAllowed && state.usb && state.usbAuthorized && state.usbThisBoot);
}

function gate() {
  if (state.blocked) return "blocked";
  if (state.managed && state.token && !state.ack) return "transition";
  if (state.managed && (!state.token || !state.policy)) return "missing";
  return "";
}

function nextStep() {
  if (path() === "usb" && !state.legacyAllowed) return "legacy-restricted";
  if (!state.developer) return "developer";
  if (path() === "wireless" && !state.wireless) return "wireless";
  if (path() === "usb" && (!state.usb || !state.usbAuthorized || !state.usbThisBoot)) return "usb";
  if (state.battery === "unreviewed") return "battery";
  if (state.android >= 13 && state.notification === "unrequested") return "permission";
  return "";
}

const active = () => state.host !== "idle";
const mode = () => state.managed ? "Corporate" : "Solo";
const pathLabel = () => path() === "wireless" ? "Wireless debugging" : "USB bootstrap";
const notificationVisible = () => active() && state.notification === "allowed" && !state.locked;
const relatedEndpoint = () => path() === "wireless" ? "192.0.2.24:37821" : "127.0.0.1:5555";

function button(label, action, tone = "secondary", symbol = "", attributes = "") {
  return `<button type="button" class="button ${tone}" data-action="${action}" ${attributes}>${symbol ? icon(symbol) : ""}${label}</button>`;
}

function iconButton(label, action, symbol) {
  return `<button class="icon-button" type="button" data-action="${action}" aria-label="${label}" title="${label}">${icon(symbol)}</button>`;
}

function row(title, detail, symbol, action = "", tone = "") {
  const copy = `<span class="row-icon ${tone}">${icon(symbol)}</span><span class="row-copy"><strong>${title}</strong><small>${detail}</small></span>`;
  return action ? `<button type="button" class="row" data-action="${action}">${copy}${icon("next")}</button>`
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
const heading = (title, detail = "", label = "") => `<div class="screen-head">${label ? `<div class="overline">${label}</div>` : ""}<h1 tabindex="-1">${title}</h1>${detail ? `<p class="lede">${detail}</p>` : ""}</div>`;
const metadata = (...pairs) => `<dl class="meta">${pairs.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}</dl>`;

function topbar() {
  return `<div class="statusbar" aria-hidden="true"><span>9:41</span><span>${icon(state.network === "wifi" ? "wifi" : "cell")}${icon("cell")}${icon("battery")}</span></div>
    <header class="topbar"><div class="brand">${logo}</div><div class="top-actions">
      ${state.fgsBackground ? "" : `<span class="mode-label">${icon(state.managed ? "building" : "phone")}${mode()}</span>`}
      ${notificationVisible() && !state.fgsBackground ? iconButton("Open foreground notification", "open-notification", "bell") : ""}
      ${iconButton("Prototype options", "review", "more")}
    </div></header>`;
}

function nav() {
  const links = [["device", "phone", "Device"], ["settings", "settings", "Settings"]];
  return `<nav class="navigation" aria-label="Setu">${links.map(([key, symbol, label]) => `<button type="button"
    data-action="nav-${key}" ${state.screen === key ? 'aria-current="page"' : ""}><span>${icon(symbol)}</span>${label}</button>`).join("")}</nav>`;
}

function progressMark(current) {
  return `<ol class="field-steps" aria-label="Device setup progress">${["Prepare", "Debugger", "Host"].map((label, index) =>
    `<li ${index === current ? 'aria-current="step"' : index < current ? 'class="past"' : ""}>${label}</li>`).join("")}</ol>`;
}

function deviceCard(status, symbol = "phone", extra = "") {
  return `<section class="hero ${extra}">${art(symbol)}${tag(status)}<h2>${state.model}</h2><p>Android ${state.android} · ${state.network === "wifi" ? "Wi-Fi connected" : "Cellular only"}</p></section>`;
}

function taskDetails(step) {
  const tasks = {
    developer: ["Turn on Developer options", "On this phone, tap Build number seven times in Android Settings."],
    wireless: ["Enable Wireless debugging", "On Wi-Fi, open Developer options and switch on Wireless debugging."],
    usb: ["Prepare ADB over USB", "Use an authorized local lab workstation for the one-per-boot USB setup."],
    battery: ["Check battery restrictions", "Review this phone’s battery settings so hosting can continue in the background."],
    permission: ["Allow hosting notifications", "Android asks whether Setu can show an ongoing notice while hosting."],
    "legacy-restricted": ["This phone needs a trusted lab", "USB bootstrap requires an approved, isolated lab setup and OEM support. Use Wi-Fi on Android 11 or later when available."],
  };
  return tasks[step];
}

function setupView() {
  const step = nextStep();
  const ready = !step;
  const [title, description] = taskDetails(step) || ["Start hosting", "Start the device agent when the desktop is ready to connect."];
  const stage = ready ? 2 : state.developer && ["wireless", "usb", "legacy-restricted"].includes(step) ? 1 : readyForHost() ? 2 : 0;
  return progressMark(stage)
    + heading(ready ? "Ready to host" : "Get your phone ready", ready ? "Check the setup then start the device agent." : "The setup guide follows your Android version and network.")
    + deviceCard(pathLabel(), path() === "wireless" ? "wifi" : "usb")
    + section("Your next step", ready ? "" : stage === 1 ? "Debugger" : "Readiness")
    + panel(`<h2>${title}</h2><p class="lede">${description}</p>${ready
      ? button("Start Hosting", "start-hosting", "primary wide", "link")
      : button(step === "legacy-restricted" ? "See lab requirements" : "Continue setup", "continue-setup", "primary wide", "arrow")}`, "field-task")
    + stack(rows(row("All readiness checks", "Developer options, transport and background hosting", "settings", "checks")));
}

function managementView(kind) {
  if (kind === "transition") {
    return heading("Your organization now manages this device", `${org} sent an enrollment token through Android device management.`, "Corporate enrollment")
      + deviceCard("Organization managed", "shield")
      + stack(panel('<h2>How access works</h2><p class="lede">Your organization controls which developers can connect. Start hosting again after reviewing the policy. Corporate mode uses device grants.</p>'),
        button("I understand", "acknowledge-management", "primary wide", "check"));
  }
  if (kind === "blocked") {
    return heading("Debugging is restricted", "Your organization’s device policy has disabled debugging on this phone.", "Blocked")
      + deviceCard("Policy enforced", "lock")
      + stack(notice("Hosting is stopped. Contact your IT administrator to request an approved device or a policy update.", "error"),
        button("Recheck IT policy", "refresh-policy", "secondary wide", "refresh"));
  }
  return heading("Waiting for IT policy configuration", `Ask ${org} to finish managing this phone before hosting can start.`, "PolicyMissing")
    + deviceCard("Corporate setup pending", "shield")
    + stack(panel(metadata(["Missing", state.token ? "Device policy configuration" : "Enrollment token"], ["Hosting", "Unavailable"])),
      notice("Solo hosting is unavailable on a device with managed configuration.", "warning"),
      button("Recheck IT policy", "refresh-policy", "primary wide", "refresh"));
}

function hostStatus() {
  if (state.host === "starting") return "Starting";
  if (state.host === "reconnecting") return "Agent restarting";
  return state.adbdWarning ? "Debugger unavailable" : "Host online";
}

function stopControl() {
  return button("Stop hosting", "stop-hosting", "danger-button wide", "stop");
}

function sessionCards() {
  const items = state.sessions.map(({ id, peerLabel, transport, kind, path: status }) => {
    const name = escaped(peerLabel.trim() || "Unnamed computer");
    const channel = Object.hasOwn(transportLabels, transport) ? transportLabels[transport] : "Unknown transport";
    const pending = state.pendingEnds.has(id);
    const label = `${pending ? "Ending" : "End session for"} ${name}`;
    return `<li class="peer-session" data-session-id="${escaped(id)}"><div class="peer-identity">
      <span>Connected as (unverified)</span><strong>${name}</strong>
      <p>${kind === "adb-pair" ? "Android debugger pairing" : "ADB debugging"} · ${channel}</p>
      ${tag(pathLabels[status], status === "UP" ? "" : "warn")}</div>
      ${button(pending ? "Ending…" : "End", "end-peer", "secondary", "", `aria-label="${label}"${pending ? " disabled" : ""}`)}</li>`;
  }).join("");
  return section("Open sessions", String(state.sessions.length))
    + (items ? `<ul class="peer-list" aria-label="Open desktop sessions">${items}</ul>` : panel('<p class="muted">No desktop sessions are open. This phone is still hosting.</p>'));
}

function pathNotice() {
  if (state.pathStatus?.state === "DOWN" && state.sessions.some((session) => session.id === state.pathStatus.sessionId)) {
    return notice("Holding a session while its connection recovers. The ADB stream stays open during the rejoin window.", "warning");
  }
  if (state.pathStatus?.state === "LOST") return notice("A session’s network path was lost. Its ADB stream closed. Reattach the debugger from Setu Desktop when the phone is reachable.", "warning");
  return "";
}

function hostView() {
  const online = state.host === "online";
  const pairing = state.managed ? "" : panel(`<h2>Setu pairing code</h2><div class="code" id="pair-code">${demoCode(state.codeGeneration)}</div><p class="lede">Enter this in Setu Desktop. Pairing pins that desktop’s key.</p>`, "pair-panel");
  return progressMark(2) + heading("Hosting", state.managed ? "Organization device grants control developer access." : "Keep Setu running while your desktop connects.")
    + deviceCard(hostStatus(), "pulse", "host-hero")
    + `<div class="host-actions">${stopControl()}${button("Go to background", "background", "ghost wide", "home")}</div>`
    + (!online ? stack(notice(state.host === "starting" ? "Starting the device agent." : "The Android SDK is restarting the host process.", "warning"))
      : stack(
        state.adbdWarning ? notice("Android’s local debugger is unreachable. The host is online, but ADB cannot attach.", "warning") : "",
        state.adbdWarning ? button("Fix Android debugger", "fix-adbd", "secondary wide", "settings") : "",
        state.notification === "denied" ? notice("Notifications are off. Setu can keep hosting. Return here to stop hosting.", "warning") : "",
        pathNotice(),
        !state.sessions.length ? pairing : "",
        sessionCards(),
        state.sessions.length ? pairing : "",
        !state.adbdWarning && path() === "wireless" ? rows(row("Pair the Android debugger", "Android system code and optional port", "code", "show-android-pairing")) : "",
        panel(metadata(...(state.managed ? [["Managed by", org]] : []), ["Device ID", demoDeviceId()],
          ["Device-side ADB endpoint", state.adbdWarning ? "Unavailable" : relatedEndpoint()])),
      ));
}

function batteryStatus() {
  return state.battery === "exempt" ? "Exemption reported" : state.battery === "current" ? "Current restrictions retained" : "Check recommended";
}

function notificationStatus() {
  if (state.android < 13) return "Manage in Android Settings";
  return state.notification === "allowed" ? "Allowed" : state.notification === "denied" ? "Denied · Hosting can still run" : "Permission required for drawer visibility";
}

function settingsView() {
  return heading("Device settings", "Review Android readiness and management.")
    + rows(
      row("Readiness checks", `${pathLabel()} · Android ${state.android}`, "phone", "checks"),
      row("Battery optimization", batteryStatus(), "battery", "guide-battery"),
      row("Notifications", notificationStatus(), "bell", "guide-permission"),
      row("Device management", state.managed ? org : "Solo · Personal device", "shield", "management-info"),
      state.oem === "Xiaomi" ? row("Xiaomi install restrictions", state.installError ? "INSTALL_FAILED_USER_RESTRICTED" : "USB installation guidance", "lock", "miui-help") : "",
    );
}

function notificationCard() {
  const count = state.sessions.length;
  const status = state.sessions.some((session) => session.path === "DOWN") ? "Reconnecting a session"
    : count === 1 ? "1 open session" : count > 1 ? `${count} open sessions` : hostStatus();
  return panel(`<div class="notice-title">${icon("bell")}<h2>Setu remote debugging</h2></div><p class="lede">${status}</p>${stack(stopControl())}`);
}

function backgroundView() {
  return `<div class="desktop-home">${heading(state.locked ? "Android lock screen" : "Android home", "")}
    ${notificationVisible() ? `${section("Ongoing notification")}${notificationCard()}`
      : notice(!active() ? "Setu hosting is stopped."
        : state.locked ? "Setu’s ongoing notice is hidden on the lock screen."
        : "Notifications are off. The foreground service may appear in Android’s Active apps. Return to Setu to stop hosting.", "warning")}
    ${button(state.locked ? "Unlock preview" : "Return to Setu", state.locked ? "unlock-preview" : "foreground", "primary wide", state.locked ? "lock" : "phone")}</div>`;
}

function simulationControls() {
  const controls = [];
  if (state.host === "online" && !state.managed && !state.fgsBackground) {
    controls.push(button("Simulate successful Setu pairing", "simulate-pairing", "secondary", "check"),
      button("Simulate failed PAKE attempt", "simulate-pake-failure", "ghost", "lock"));
  }
  if (active() && !state.fgsBackground) {
    controls.push(button("Simulate debugger loss", "simulate-adbd-loss", "ghost", "pulse"),
      button("Simulate agent restart", "simulate-reconnect", "ghost", "refresh"));
  }
  const first = state.sessions[0];
  if (first?.path === "UP") controls.push(button("Simulate session path down", "simulate-path-down", "ghost", "pulse"));
  if (first?.path === "DOWN") {
    controls.push(button("Simulate session path recovery", "simulate-path-up", "ghost", "refresh"),
      button("Simulate session path loss", "simulate-path-lost", "ghost", "pulse"));
  }
  if (state.host === "reconnecting") controls.push(button("Simulate host online", "simulate-online", "secondary", "check"));
  if (state.fgsBackground && !state.locked) controls.push(button("Simulate lock screen", "simulate-lock", "ghost", "lock"));
  if (!state.managed) controls.push(button("Simulate EMM enrollment", "simulate-emm", "ghost", "building"));
  if (state.managed && (!state.policy || !state.token) && !state.blocked) controls.push(button("Simulate IT policy arrival", "simulate-policy", "secondary", "building"));
  if (state.managed && !state.blocked) controls.push(button("Simulate IT blocking debugging", "simulate-block", "ghost", "lock"));
  if (path() === "usb" && state.usbThisBoot) controls.push(button("Simulate phone reboot", "simulate-reboot", "ghost", "refresh"));
  return controls.join("");
}

function guideContent(step) {
  switch (step) {
    case "developer":
      return ["Enable Developer options", stack(
        '<ol class="step-list"><li>Open Settings, then About phone.</li><li>Tap <strong>Build number</strong> seven times. Enter your screen lock if Android asks.</li><li>Return to Setu to recheck.</li></ol>',
        notice("On Samsung, look under About phone → Software information. Menu labels vary by model."),
        button("Open Android Settings", "settings-developer", "primary wide", "settings"),
      )];
    case "wireless":
      return ["Enable Wireless debugging", stack(
        '<ol class="step-list"><li>Keep this Android 11 or later phone on Wi-Fi.</li><li>Open Developer options and turn on <strong>Wireless debugging</strong>. Approve the network if Android asks.</li><li>Return to Setu. After starting hosting, open Android’s separate pairing dialog when the developer is ready.</li></ol>',
        state.developer ? button("Open Android Settings", "settings-wireless", "primary wide", "settings")
          : button("Enable Developer options first", "guide-developer", "primary wide", "code"),
      )];
    case "usb":
      return ["Prepare ADB over USB", stack(
        notice("Use an authorized local workstation and an isolated, approved lab. Never forward port 5555 or expose it to other network devices.", "warning"),
        '<ol class="step-list"><li>Enable USB debugging. Connect by USB and authorize the workstation’s RSA key on Android.</li><li>On the authorized workstation, run <code>adb tcpip 5555</code> once per boot if this OEM permits it.</li><li>After the lab confirms endpoint reachability and isolation, unplug and use the selected network. Repeat the local USB setup after a reboot.</li></ol>',
        state.developer ? button("Open USB setup", "settings-usb", "primary wide", "usb")
          : button("Enable Developer options first", "guide-developer", "primary wide", "code"),
      )];
    case "legacy-restricted":
      return ["USB bootstrap is unavailable", stack(
        notice("An administrator or lab owner must approve the legacy transport, and the OEM must allow it. Hosting stays off without both.", "warning"),
        '<p class="muted">If possible, join Wi-Fi on Android 11 or later to use Wireless debugging. Ask IT which devices and networks are approved.</p>',
      )];
    case "battery": {
      const manufacturerPath = {
        Pixel: "Settings → Apps → Setu → App battery usage. Look for Unrestricted or Allow background usage.",
        Xiaomi: "Settings → Apps → Permissions → Background autostart. Turn on Setu if allowed. In Setu’s Battery saver setting, look for No restrictions.",
        Samsung: "Settings → Battery and device care → Battery → Background usage limits → Never sleeping apps. Add Setu if allowed.",
        ColorOS: "Settings → Apps → App management → Setu → Battery usage. Look for Allow background activity or App battery management.",
      }[state.oem];
      return ["Check battery restrictions", stack(
        '<p class="muted">Android and manufacturer battery settings can interrupt background hosting. Look for an exemption if company policy permits it.</p>',
        notice(manufacturerPath),
        state.oem === "Pixel" ? "" : button(`Try ${state.oem} battery shortcut`, "oem-shortcut", "secondary wide", "settings"),
        state.notice ? notice(state.notice.message, state.notice.type) : "",
        button("Open battery settings", "settings-battery", "primary wide", "battery"),
        button("Keep current setting", "skip-battery", "ghost wide"),
      )];
    }
    case "permission":
      return ["What the notification shows", stack(
        '<p class="muted">While hosting, Setu’s ongoing notice offers Stop hosting. The notice never includes Setu or Android pairing codes. The companion uses Android’s <code>VISIBILITY_SECRET</code> to hide the notice on a secure lock screen.</p>',
        notice(state.android >= 13
          ? "Android 13+ asks for POST_NOTIFICATIONS. Declining can hide the notice from the drawer. Hosting can still run, and you can stop it in Setu."
          : "Manage Setu’s notice in Android Settings."),
        button(state.android >= 13 ? "Review notification permission" : "Open notification settings", "settings-permission", "primary wide", "bell"),
      )];
    default: return null;
  }
}

function returnFromSettings() {
  return button("Return to Setu", "return-from-settings", "primary wide", "arrow");
}

function settingsSheet() {
  switch (state.settingsPage) {
    case "developer": return ["Android Settings · About phone", stack(
      rows(row("Build number", state.developer ? "Developer options enabled" : `${state.taps} of 7 taps`, "code", "tap-build", state.developer ? "good" : "")),
      returnFromSettings(),
    )];
    case "wireless": return ["Android Settings · Developer options", stack(
      rows(row("Wireless debugging", state.wireless ? "On" : "Off", "wifi", "toggle-wireless", state.wireless ? "good" : "")),
      returnFromSettings(),
    )];
    case "usb": return ["Local USB setup", stack(
      rows(
        row("USB debugging", state.usb ? "On" : "Off", "usb", "toggle-usb", state.usb ? "good" : ""),
        row("Authorize local workstation", state.usbAuthorized ? "RSA key authorized" : "Confirm Android’s RSA prompt on the phone", "shield", state.usb ? "authorize-usb" : ""),
        row("Confirm local ADB bootstrap", state.usbThisBoot ? "Endpoint confirmed for this boot" : "Confirm endpoint reachability and lab isolation", "check", state.usbAuthorized && !state.usbThisBoot ? "confirm-usb" : ""),
      ),
      returnFromSettings(),
    )];
    case "battery": return ["Android Settings · Battery", stack(
      rows(row("Battery optimization exemption", state.battery === "exempt" ? "Exemption reported" : "Standard restrictions", "battery", "toggle-battery", state.battery === "exempt" ? "good" : "")),
      '<p class="muted">Even with an exemption, verify background operation on the actual model.</p>',
      returnFromSettings(),
    )];
    case "permission": return [state.android >= 13 ? "Allow Setu to send notifications?" : "Android Settings · Notifications", stack(
      '<p class="muted">Show an ongoing notice with a Stop hosting action while Setu is hosting.</p>',
      actions(button("Don’t allow", "deny-notifications", "secondary"), button("Allow", "allow-notifications", "primary")),
    )];
    case "miui": return ["Xiaomi Settings · Developer options", stack(
      '<p class="muted">Preview these OEM settings only on a device where your administrator permits USB installation.</p>',
      rows(
        row("Install via USB", state.usbInstall ? "On" : "Off", "usb", "toggle-install-via-usb", state.usbInstall ? "good" : ""),
        row("USB debugging (Security settings)", state.usbSecurity ? "On" : "Off", "shield", "toggle-usb-security", state.usbSecurity ? "good" : ""),
      ),
      notice("After changing the settings, ask the developer to retry the install. The desktop reports whether the install succeeds."),
      button("Return to Setu", "close-sheet", "primary wide", "arrow"),
    )];
    default: return null;
  }
}

function readinessChecks() {
  return rows(
    row("Developer options", state.developer ? "Enabled" : "Required · Tap Build number seven times", "code", "guide-developer", state.developer ? "good" : "warn"),
    row(pathLabel(), path() === "wireless" ? (state.wireless ? "Enabled" : "Required · Android 11+ on Wi-Fi")
      : !state.legacyAllowed ? "Unavailable under current lab policy" : state.usbThisBoot ? "Ready for this boot" : "Required · Authorized local workstation",
    path() === "wireless" ? "wifi" : "usb", `guide-${path() === "usb" && !state.legacyAllowed ? "legacy-restricted" : path()}`, readyForHost() ? "good" : "warn"),
    row("Battery optimization", batteryStatus(), "battery", "guide-battery"),
    row("Foreground notice", notificationStatus(), "bell", "guide-permission"),
  );
}

function sheetContent() {
  if (state.sheet === "guide") return guideContent(state.nextGuide);
  if (state.sheet === "settings") return settingsSheet();
  switch (state.sheet) {
    case "returned": return ["Back in Setu", stack(
      '<p class="muted">Recheck device readiness after this Settings change.</p>',
      button("Recheck readiness", "recheck-readiness", "primary wide", "refresh"),
    )];
    case "review": return ["Prototype options", stack(
      `<label class="label" for="mobile-scenario">Jump to a scenario<select id="mobile-scenario" class="input" data-scenario>
        ${scenarioOptions.map(([key, label]) => `<option value="${key}" ${state.scenario === key ? "selected" : ""}>${label}</option>`).join("")}</select></label>`,
      simulationControls(),
      '<p class="muted">The preview uses fictional device and SDK events. It does not change Android settings or open any connections.</p>',
    )];
    case "checks": return ["Device readiness", readinessChecks()];
    case "management": return ["Device management", stack(
      panel(metadata(["Mode", mode()], ["Organization", state.managed ? org : "None"], ["Policy", state.blocked ? "Debugging restricted"
        : state.managed ? state.token && state.policy ? "Configuration received" : "Waiting for IT" : "Personal device"])),
      state.managed ? '<p class="muted">Rechecking refreshes policy status. The device agent applies new settings when it starts again.</p>'
        : '<p class="muted">Solo is local-first. The phone needs no account. Android device management can enroll this phone in Corporate.</p>',
      button("Recheck IT policy", "refresh-policy", "secondary wide", "refresh"),
    )];
    case "notification": return ["Notification drawer", notificationVisible() ? notificationCard() : notice("Setu’s notice is unavailable.")];
    case "end-peer": {
      const session = state.sessions.find(({ id }) => id === state.selectedSession);
      if (!session) return ["Session already closed", button("Done", "close-sheet", "secondary wide")];
      return ["End this session?", stack(
        panel(metadata(["Connected as (unverified)", escaped(session.peerLabel.trim() || "Unnamed computer")])),
        `<p class="muted">${session.path === "UP"
          ? "Setu sends a final close to the desktop so it can end the session without retrying."
          : "Setu ends the session on this phone now. Its connection to the computer is down, so the computer may not see the end until it reconnects or times out."} Other sessions and existing access stay in place.</p>`,
        actions(button("Cancel", "close-sheet", "secondary"), button("End session", "confirm-end-peer", "danger-button", "stop")),
      )];
    }
    case "android-pairing": return ["Pair the Android debugger", stack(
      '<ol class="step-list"><li>On the phone, open Developer options → Wireless debugging → Pair device with pairing code.</li><li>Leave the Android pairing dialog open. In Setu Desktop, select this phone and choose Pair Android Debugger.</li><li>Enter the six-digit Android system code. Leave the port blank to discover it automatically, or enter the temporary pairing port shown by Android.</li></ol>',
      button("Preview Android pairing screen", "preview-system-pairing", "primary wide", "code"),
      notice("Setu Desktop pairs the Android debugger through the tunnel using session.pair_adb. Connect the debugger after pairing succeeds."),
    )];
    case "android-system-code": return ["Android pairing screen", stack(
      panel(metadata(["System pairing code", '<code>836104</code>'], ["Temporary pairing port", '<code>37193</code>'])),
      '<p class="muted">Demo values. Enter the six-digit system code in Setu Desktop. If discovery fails, also enter the temporary pairing port shown here. Keep this dialog open while the desktop pairs.</p>',
      notice("Android debugger pairing uses its own system code and port. Solo device pairing uses the 10-digit Setu code."),
    )];
    case "miui": return ["Xiaomi install restricted", stack(
      notice("INSTALL_FAILED_USER_RESTRICTED", "error"),
      state.blocked ? '<p class="muted">Your organization restricts USB installation. Ask IT to review the app and policy.</p>'
        : '<p class="muted">On supported MIUI builds, open Developer options and check Install via USB and USB debugging (Security settings). Approve Android’s own install prompts only where IT permits.</p>',
      state.blocked ? "" : button("Try Xiaomi settings shortcut", "miui-shortcut", "secondary wide", "settings"),
      state.notice ? notice(state.notice.message, state.notice.type) : "",
      state.blocked || !state.notice ? "" : button("Preview manual Xiaomi settings", "settings-miui", "primary wide", "settings"),
      '<p class="muted">Some builds omit these settings or require a managed install. Ask IT if they are unavailable.</p>',
    )];
    default: return null;
  }
}

function measureSheet() {
  const box = device.getBoundingClientRect();
  device.style.setProperty("--sheet-left", `${box.left + device.clientLeft}px`);
  device.style.setProperty("--sheet-width", `${device.clientWidth}px`);
  device.style.setProperty("--sheet-height", `${device.clientHeight * .89}px`);
  device.style.setProperty("--sheet-bottom", `${Math.max(0, innerHeight - box.bottom + device.clientTop)}px`);
}

function render({ headingFocus = false } = {}) {
  const action = document.activeElement?.dataset.action || "";
  const focusedPeer = document.activeElement?.closest("[data-session-id]")?.dataset.sessionId || "";
  const scroll = device.querySelector(".screen")?.scrollTop || 0;
  const oldDialog = device.querySelector("dialog[open]");
  const oldDialogKey = oldDialog?.dataset.sheetKey || "";
  const oldDialogScroll = oldDialog?.scrollTop || 0;
  const nextDialogKey = [state.sheet, state.nextGuide, state.settingsPage].join("-");
  if (state.sheet && !oldDialog) {
    sheetOpener = action;
    sheetOpenerPeer = focusedPeer;
  }
  const sheet = sheetContent();
  const policyGate = gate();
  const page = state.fgsBackground ? backgroundView() : state.screen === "settings" ? settingsView() : policyGate ? managementView(policyGate) : active() ? hostView() : setupView();
  scenarios.value = state.scenario;
  reviewControls.innerHTML = simulationControls();
  document.querySelector("#device-caption").textContent = `${state.model} · Android prototype`;
  device.innerHTML = `${topbar()}<main class="screen" tabindex="-1">
    ${state.notice && !sheet ? `<div class="feedback">${notice(state.notice.message, state.notice.type)}</div>` : ""}${page}</main>
    ${state.fgsBackground ? "" : nav()}<div class="gesture" aria-hidden="true"><i></i></div>
    ${sheet ? `<dialog class="sheet" data-sheet-key="${nextDialogKey}" aria-labelledby="sheet-title">
      <div class="sheet-handle" aria-hidden="true"></div><div class="sheet-head"><h2 id="sheet-title" tabindex="-1">${sheet[0]}</h2>${iconButton("Close", "close-sheet", "close")}</div>
      ${sheet[1]}</dialog>` : ""}`;
  const screen = device.querySelector(".screen");
  if (!headingFocus) screen.scrollTop = scroll;
  if (sheet) {
    const dialog = device.querySelector("dialog");
    measureSheet();
    dialog.showModal();
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeSheet();
    });
    const repeatedButton = oldDialogKey === nextDialogKey && action ? dialog.querySelector(`[data-action="${action}"]`) : null;
    if (repeatedButton) dialog.scrollTop = oldDialogScroll;
    (repeatedButton || dialog.querySelector("#sheet-title")).focus({ preventScroll: true });
  } else if (headingFocus) {
    (screen.querySelector("h1") || screen).focus({ preventScroll: true });
  } else {
    const selectedAction = oldDialog ? sheetOpener : action;
    const peer = oldDialog ? sheetOpenerPeer : focusedPeer;
    const owner = peer ? [...device.querySelectorAll("[data-session-id]")].find((row) => row.dataset.sessionId === peer) : document;
    owner?.querySelector(`[data-action="${selectedAction}"]`)?.focus({ preventScroll: true });
  }
}

function flash(message, type = "") {
  state.notice = { message, type };
  announce.textContent = message;
}

function closeSheet() {
  state.notice = null;
  state.sheet = "";
  render();
}

function openSheet(sheet) {
  state.sheet = sheet;
  render();
}

function openGuide(guide) {
  state.nextGuide = guide;
  openSheet("guide");
}

function showDevice() {
  state.screen = "device";
  state.sheet = "";
  state.fgsBackground = false;
  state.locked = false;
  render({ headingFocus: true });
}

function stopAgent() {
  clearTimeout(startTimer);
  state.host = "idle";
  state.adbdWarning = false;
  state.failedAttempts = 0;
  state.codeGeneration = 0;
  clearSessions();
}

function clearSessions() {
  state.sessions = [];
  state.pendingEnds.clear();
  state.pathStatus = null;
}

// Mirrors SetuManager.sessions. An accepted end command leaves the row until session_close.
function applySessionEvent(type, fields) {
  if (type === "session_open") {
    state.sessions = [...state.sessions.filter(({ id }) => id !== fields.id), { ...fields, path: "UP" }];
  } else if (type === "session_close") {
    state.pendingEnds.delete(fields.id);
    state.sessions = state.sessions.filter(({ id }) => id !== fields.id);
  } else {
    const pathState = { path_down: "DOWN", path_up: "UP", path_lost: "LOST" }[type];
    state.pathStatus = { sessionId: fields.id, state: pathState, transport: fields.transport };
    state.sessions = state.sessions.map((session) => session.id === fields.id
      ? { ...session, path: pathState, transport: fields.transport ?? session.transport }
      : session);
  }
}

function updateAndroidSessions(rows) {
  if (!Array.isArray(rows)) return;
  state.sessions = rows.filter(row => typeof row?.id === "string" && row.id).map(row => ({
    id: row.id,
    peerLabel: typeof row.peerLabel === "string" ? row.peerLabel : "",
    transport: typeof row.transport === "string" ? row.transport : "",
    kind: row.kind === "adb-pair" ? "adb-pair" : "adb",
    path: ["UP", "DOWN", "LOST"].includes(row.path) ? row.path : "UP",
  }));
  for (const id of state.pendingEnds) {
    if (!state.sessions.some(session => session.id === id)) {
      state.pendingEnds.delete(id);
      flash("Session ended on Android. Hosting is still on.", "success");
    }
  }
  render();
}

window.setuAndroidSessions = updateAndroidSessions;

async function endSessionPreview(id) {
  state.sheet = "";
  if (state.host !== "online" || state.pendingEnds.has(id) || !state.sessions.some((session) => session.id === id)) {
    flash("The agent could not accept this end request. Check the current session list.", "warning");
    return render({ headingFocus: true });
  }
  const preview = state;
  state.pendingEnds.add(id);
  render({ headingFocus: true });
  if (typeof window.setuAndroidEndSession === "function") {
    let accepted = false;
    try { accepted = await window.setuAndroidEndSession(id); } catch { /* Surface an unavailable end action. */ }
    if (state === preview && !accepted && state.pendingEnds.delete(id)) {
      flash("The agent could not accept this end request. Check the current session list.", "warning");
      render();
    }
    return;
  }
  setTimeout(() => {
    if (state !== preview || !state.pendingEnds.has(id)) return;
    applySessionEvent("session_close", { id, reason: "ended_on_device" });
    flash("Session ended on Android. Hosting is still on.", "success");
    render();
  }, 350);
}

function startHosting() {
  if (gate() || nextStep() || !readyForHost() || active()) return;
  state.host = "starting";
  showDevice();
  startTimer = setTimeout(() => {
    if (state.host !== "starting" || gate()) return;
    state.host = "online";
    announce.textContent = "Host online.";
    render();
  }, 220);
}

function applyScenario(scenario, headingFocus = false) {
  clearTimeout(startTimer);
  state = defaultState(scenario);
  const hostScenarios = ["hosting", "hosting-empty", "hosting-unnamed", "path-down", "path-lost", "adbd", "notifications-denied", "managed-hosting"];
  const prepared = ["ready", ...hostScenarios, "reconnecting", "policy-missing", "token-missing", "managed-transition", "blocked"];
  if (prepared.includes(scenario)) {
    state.developer = state.wireless = true;
    state.taps = 7;
    state.battery = "exempt";
    state.notification = "allowed";
  }
  if (["wifi", "samsung", "coloros", "miui"].includes(scenario)) {
    state.developer = true;
    state.taps = 7;
  }
  if (scenario === "usb" || scenario === "cellular") {
    state.android = scenario === "usb" ? 10 : 15;
    state.network = scenario === "cellular" ? "cellular" : "wifi";
    state.model = "Lab Android";
    state.legacyAllowed = true;
    state.developer = true;
    state.taps = 7;
    state.notification = state.android < 13 ? "allowed" : "unrequested";
  }
  if (["policy-missing", "token-missing", "managed-transition", "managed-hosting", "blocked"].includes(scenario)) {
    state.managed = true;
    state.token = scenario !== "token-missing";
    state.policy = !["policy-missing", "token-missing"].includes(scenario);
    state.ack = scenario !== "managed-transition";
    state.blocked = scenario === "blocked";
  }
  if (hostScenarios.includes(scenario)) state.host = "online";
  if (["hosting", "hosting-unnamed", "path-down", "path-lost", "managed-hosting"].includes(scenario)) {
    const id = "4be1c0d2a9f37e11";
    applySessionEvent("session_open", { id, peerLabel: scenario === "hosting-unnamed" ? "desktop-3fa9c1d2" : "QA Workstation", transport: "relay-wss", kind: "adb" });
    applySessionEvent("session_open", {
      id: "5bf2d5b8a8c4f012",
      peerLabel: scenario === "hosting-unnamed" ? "alice@northstar.example" : "Test Bench 02",
      transport: state.managed ? "relay-wss" : "lan",
      kind: scenario === "hosting-unnamed" ? "adb-pair" : "adb",
    });
    if (scenario === "path-down") applySessionEvent("path_down", { id, transport: "relay-wss" });
    if (scenario === "path-lost") {
      applySessionEvent("path_lost", { id });
      applySessionEvent("session_close", { id, reason: "path_lost" });
    }
  }
  if (scenario === "adbd") {
    state.wireless = false;
    state.adbdWarning = true;
  }
  if (scenario === "reconnecting") state.host = "reconnecting";
  if (scenario === "notifications-denied") state.notification = "denied";
  if (scenario === "miui") {
    state.oem = "Xiaomi";
    state.model = "Xiaomi 13";
    state.installError = true;
    state.screen = "settings";
  }
  if (scenario === "samsung" || scenario === "coloros") {
    state.oem = scenario === "samsung" ? "Samsung" : "ColorOS";
    state.model = scenario === "samsung" ? "Galaxy S24" : "OPPO Find X7";
    state.wireless = true;
  }
  announce.textContent = "";
  render({ headingFocus });
}

function completeReadiness() {
  state.sheet = "";
  if (active()) state.adbdWarning = !readyForHost();
  flash(active() && state.adbdWarning ? "Android’s debugger is still unavailable." : "Readiness checked.",
    active() && state.adbdWarning ? "warning" : "success");
  render({ headingFocus: true });
}

function applyPolicyPreview() {
  if (state.queuedPolicy) {
    const previouslyEnrolled = state.token;
    state.token = state.policy = true;
    state.queuedPolicy = "";
    if (!previouslyEnrolled) state.ack = false;
    state.sheet = "";
    if (state.notification === "unrequested" && state.android < 13) state.notification = "allowed";
    flash(gate() === "transition"
      ? "IT enrollment received. Review the management notice."
      : "IT policy received. It takes effect when you start hosting.", "success");
    return showDevice();
  }
  state.sheet = "";
  flash(state.blocked ? "IT policy still restricts debugging." : state.managed && (!state.token || !state.policy)
    ? "Still waiting for IT configuration." : "Policy status refreshed.", state.blocked ? "error" : "");
  render({ headingFocus: true });
}

function runAction(action, control) {
  state.notice = null;
  if (action.startsWith("nav-")) {
    state.screen = action.slice(4);
    state.sheet = "";
    return render({ headingFocus: true });
  }
  if (action.startsWith("guide-")) {
    const step = action.slice(6);
    if (state.blocked && ["developer", "wireless", "usb"].includes(step)) return showDevice();
    return openGuide(step);
  }
  if (action.startsWith("settings-")) {
    state.settingsPage = action.slice(9);
    if (state.blocked && ["developer", "wireless", "usb", "miui"].includes(state.settingsPage)) return showDevice();
    return openSheet("settings");
  }

  switch (action) {
    case "close-sheet": return closeSheet();
    case "continue-setup":
      if (!gate() && nextStep()) return openGuide(nextStep());
      return;
    case "review": case "checks": return openSheet(action);
    case "management-info": return openSheet("management");
    case "return-from-settings": return openSheet("returned");
    case "recheck-readiness": return completeReadiness();
    case "tap-build":
      state.taps = Math.min(7, state.taps + 1);
      state.developer = state.taps === 7;
      announce.textContent = state.developer ? "Developer options enabled." : `${state.taps} of 7 taps.`;
      break;
    case "toggle-wireless":
      state.wireless = !state.wireless;
      announce.textContent = state.wireless ? "Wireless debugging on." : "Wireless debugging off.";
      break;
    case "toggle-usb":
      state.usb = !state.usb;
      if (!state.usb) state.usbAuthorized = state.usbThisBoot = false;
      announce.textContent = state.usb ? "USB debugging on." : "USB debugging off.";
      break;
    case "authorize-usb":
      if (!state.legacyAllowed || !state.usb) return;
      state.usbAuthorized = true;
      announce.textContent = "Local workstation authorized in the preview.";
      break;
    case "confirm-usb":
      if (!state.legacyAllowed || !state.usbAuthorized) return;
      state.usbThisBoot = true;
      announce.textContent = "Local bootstrap confirmed for this boot.";
      break;
    case "toggle-battery":
      state.battery = state.battery === "exempt" ? "current" : "exempt";
      announce.textContent = batteryStatus();
      break;
    case "skip-battery":
      if (state.battery === "unreviewed") state.battery = "current";
      return closeSheet();
    case "oem-shortcut":
      flash("The manufacturer shortcut is unavailable in this preview. Follow the manual path above.", "warning");
      break;
    case "allow-notifications": case "deny-notifications":
      state.notification = action === "allow-notifications" ? "allowed" : "denied";
      return openSheet("returned");
    case "start-hosting": return startHosting();
    case "stop-hosting":
      stopAgent();
      state.sheet = "";
      flash("Hosting stopped. The device agent and its connections have stopped.", "success");
      return render({ headingFocus: true });
    case "fix-adbd": return openGuide(path());
    case "open-notification":
      if (notificationVisible()) return openSheet("notification");
      return;
    case "end-peer":
      state.selectedSession = control.closest("[data-session-id]").dataset.sessionId;
      return openSheet("end-peer");
    case "confirm-end-peer": return endSessionPreview(state.selectedSession);
    case "show-android-pairing":
      if (state.host === "online" && path() === "wireless" && !state.adbdWarning) return openSheet("android-pairing");
      return;
    case "preview-system-pairing": return openSheet("android-system-code");
    case "background":
      state.fgsBackground = true;
      state.sheet = "";
      return render({ headingFocus: true });
    case "foreground": return showDevice();
    case "unlock-preview":
      state.locked = false;
      state.sheet = "";
      return render({ headingFocus: true });
    case "acknowledge-management":
      state.ack = true;
      return showDevice();
    case "refresh-policy": return applyPolicyPreview();
    case "miui-help": return openSheet("miui");
    case "miui-shortcut":
      flash("The Xiaomi shortcut is unavailable. Open Settings → Developer options or ask IT for a managed installation.", "warning");
      break;
    case "toggle-install-via-usb":
      if (state.blocked || state.oem !== "Xiaomi") return;
      state.usbInstall = !state.usbInstall;
      announce.textContent = state.usbInstall ? "Install via USB on." : "Install via USB off.";
      break;
    case "toggle-usb-security":
      if (state.blocked || state.oem !== "Xiaomi") return;
      state.usbSecurity = !state.usbSecurity;
      announce.textContent = state.usbSecurity ? "USB debugging security settings on." : "USB debugging security settings off.";
      break;
    case "simulate-pairing": case "simulate-pake-failure": {
      if (state.host !== "online" || state.managed || state.fgsBackground) return;
      const accepted = action === "simulate-pairing";
      if (!accepted) state.failedAttempts += 1;
      if (accepted || state.failedAttempts === 3) {
        state.failedAttempts = 0;
        state.codeGeneration += 1;
        flash(accepted ? "Pairing succeeded. The SDK issued a new code." : "The SDK issued a new code after three failed PAKE attempts.", "success");
      } else {
        flash(`Failed attempt ${state.failedAttempts} of 3. The pairing code stays the same.`, "warning");
      }
      return showDevice();
    }
    case "simulate-adbd-loss":
      if (state.host !== "online") return;
      if (path() === "wireless") state.wireless = false;
      else state.usbThisBoot = false;
      state.adbdWarning = true;
      announce.textContent = "Android’s local debugger is unreachable.";
      return showDevice();
    case "simulate-reconnect":
      if (state.host !== "online") return;
      clearSessions();
      state.host = "reconnecting";
      announce.textContent = "Setu SDK is restarting the agent.";
      return showDevice();
    case "simulate-online":
      if (state.host !== "reconnecting" || gate()) return;
      state.host = "online";
      state.adbdWarning = !readyForHost();
      announce.textContent = "Setu host is online.";
      return showDevice();
    case "simulate-path-down": case "simulate-path-up": case "simulate-path-lost": {
      const session = state.sessions[0];
      if (!session || state.host !== "online") return;
      const type = action.slice("simulate-".length).replace("-", "_");
      const transport = type === "path_up" && !state.managed ? "lan" : session.transport;
      applySessionEvent(type, { id: session.id, transport });
      if (type === "path_lost") applySessionEvent("session_close", { id: session.id, reason: "path_lost" });
      announce.textContent = pathLabels[state.pathStatus.state];
      return showDevice();
    }
    case "simulate-lock":
      if (!state.fgsBackground) return;
      state.locked = true;
      state.sheet = "";
      return render({ headingFocus: true });
    case "simulate-emm":
      stopAgent();
      state.managed = state.token = true;
      state.policy = state.ack = false;
      return showDevice();
    case "simulate-policy":
      state.queuedPolicy = "ready";
      flash("IT has sent an update in the preview. Recheck IT policy to read it.", "success");
      return showDevice();
    case "simulate-block":
      stopAgent();
      state.blocked = true;
      return showDevice();
    case "simulate-reboot":
      stopAgent();
      state.usbThisBoot = false;
      flash("Phone rebooted. Repeat the local USB bootstrap before hosting.", "warning");
      return showDevice();
    default: return;
  }
  render();
}

document.addEventListener("click", (event) => {
  const control = event.target.closest("button[data-action]");
  if (control) runAction(control.dataset.action, control);
});

document.addEventListener("change", (event) => {
  if (event.target === scenarios || event.target.matches("[data-scenario]")) {
    applyScenario(event.target.value, event.target !== scenarios);
  }
});

window.addEventListener("resize", () => {
  if (state.sheet) measureSheet();
});

const scenarioFromUrl = new URLSearchParams(location.search).get("scenario");
applyScenario(scenarioOptions.some(([key]) => key === scenarioFromUrl) ? scenarioFromUrl : "setup");
