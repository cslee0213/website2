const SVG_NS = "http://www.w3.org/2000/svg";
const SEOUL = { lat: 37.5665, lon: 126.978 };
const FIRST_EXHIBITION_INDEX = 2;

const VENUES = {
  seoul: { name: "MMCA Seoul", lat: 37.5788, lon: 126.9802, hasGarden: false },
  gwacheon: { name: "MMCA Gwacheon", lat: 37.4361, lon: 127.0085, hasGarden: true },
};

const EXHIBITIONS = [
  {
    title: "Do Ho Suh",
    venue: "seoul",
    end: "2027-02-09",
    blurb: "The artist’s first full survey in Korea, from early pieces to new works never shown before.",
  },
  {
    title: "Korea Artist Prize 2026",
    venue: "seoul",
    end: "2026-12-06",
    blurb: "The finalists’ show. This year’s prize went to Hong Jin-hwon, a photojournalist turned artist.",
  },
  {
    title: "Christine Sun Kim: Have Many Dumb Fights Against Rock",
    venue: "seoul",
    end: "2026-11-29",
    blurb: "A new commission for Seoul Box that pairs large-scale digital animation with mural work. Free admission.",
  },
  {
    title: "Imaginations in Light",
    venue: "gwacheon",
    end: "2026-11-29",
    blurb: "Gwacheon’s 40th-anniversary show about light. One section, Afterimage, stays on view until October 2027.",
  },
  {
    title: "MMCA Collection: Korean Modern and Contemporary Art II",
    venue: "gwacheon",
    end: "2027-06-27",
    blurb: "More than 120 works from the museum’s collection, made in the second half of the 20th century.",
  },
];

const IMAGES = {
  "Do Ho Suh": {
    src: "https://d3e6228u5bjptc.cloudfront.net/media/do-ho-suh.webp",
    alt: "Do Ho Suh, Nest/s",
    caption: "Do Ho Suh, Nest/s. Photo: Jeon Taeg Su.",
  },
  "Korea Artist Prize 2026": {
    src: "https://wimg.heraldcorp.com/news/cms/2026/07/26/news-p.v1.20260726.7199ce5a303548ce85a416b3848b5fa6_P1.jpg",
    alt: "Installation view of Hong Jin-hwon’s new works for the Korea Artist Prize 2026 at MMCA Seoul",
    caption: "Hong Jin-hwon, installation view. Courtesy of MMCA.",
  },
  "Christine Sun Kim: Have Many Dumb Fights Against Rock": {
    src: "https://storage.ghost.io/c/98/98/98986ef2-474e-4f7c-82a5-62d592178e78/content/images/size/w1200/2026/09/sun_kim_christine_have_many_dumb_fights_against_rock_2026_001.jpg",
    alt: "Installation view of Christine Sun Kim’s Have Many Dumb Fights Against Rock in Seoul Box",
    caption: "Photo: CJY Art Studio. Courtesy of the artist.",
  },
  "Imaginations in Light": {
    src: "https://resources.heni.com/1b5ca645-3ccc-47a1-9c74-d409cfbd056a.png?width=1024",
    alt: "Philippe Parreno, Marquee, 2019, an artwork in the exhibition",
    caption: "Philippe Parreno, Marquee, 2019. Courtesy of MMCA.",
  },
  "MMCA Collection: Korean Modern and Contemporary Art II": {
    src: "https://static-assets.artlogic.net/w_2400,h_2400,c_limit,f_auto,fl_lossy,q_auto/ws-artlogicwebsite0164/usr/exhibitions/images/exhibitions/199/installation-view_left-wook-kyung-choi.jpg",
    alt: "Installation view of MMCA Collection: Korean Modern and Contemporary Art II at MMCA Gwacheon",
    caption: "Installation view. Courtesy of MMCA.",
  },
};

const state = { weather: null, origin: null, page: 0 };

const els = {
  pages: document.getElementById("pages"),
  colophon: document.getElementById("page-colophon"),
  status: document.getElementById("status"),
  announcer: document.getElementById("announcer"),
  locate: document.getElementById("locate-btn"),
  area: document.getElementById("area-select"),
  sound: document.getElementById("sound-btn"),
  prev: document.getElementById("prev-btn"),
  next: document.getElementById("next-btn"),
  scribble: document.getElementById("scribble"),
  weatherNote: document.getElementById("weather-note"),
};

let audioCtx = null;
let soundOn = false;

function getAudio() {
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function handleAudioFailure() {
  setSound(false);
  setStatus("Sound is not available in this browser, so the booklet will stay silent.", true);
}

function chime() {
  if (!soundOn) return;
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;
    [660, 990].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(index === 0 ? 0.07 : 0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 1.4);
    });
  } catch (error) {
    handleAudioFailure();
  }
}

function rustle() {
  if (!soundOn) return;
  try {
    const ctx = getAudio();
    const length = Math.floor(ctx.sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.frequency.value = 2400;
    filter.Q.value = 0.7;
    gain.gain.value = 0.12;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  } catch (error) {
    handleAudioFailure();
  }
}

function setSound(on) {
  soundOn = on;
  els.sound.setAttribute("aria-pressed", String(on));
  els.sound.textContent = on ? "Sound is on" : "Sound is off";
}

async function loadWeather() {
  const params = new URLSearchParams({
    latitude: SEOUL.lat,
    longitude: SEOUL.lon,
    current: "apparent_temperature,precipitation,weather_code,is_day",
    timezone: "Asia/Seoul",
  });
  setStatus("Reading the weather in Seoul…");
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) throw new Error(`Open-Meteo answered ${response.status}`);
    const data = await response.json();
    if (!data.current) throw new Error("Open-Meteo sent no current weather");
    state.weather = data.current;
    setStatus("");
  } catch (error) {
    state.weather = null;
    setStatusWithRetry("The weather could not be loaded, so rankings ignore it. Check your connection and ");
  }
  showWeather();
  render();
}

const CLOUD_LOW = "M28 66 C10 66 10 44 28 44 C30 26 56 20 66 36 C80 28 98 38 92 54 C108 56 104 68 88 66 L28 66";
const CLOUD_HIGH = "M28 54 C10 54 10 32 28 32 C30 14 56 8 66 24 C80 16 98 26 92 42 C108 44 104 56 88 54 L28 54";

function rays(cx, cy, inner, outer, count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count;
    const point = (radius) => `${(cx + Math.cos(angle) * radius).toFixed(1)} ${(cy + Math.sin(angle) * radius).toFixed(1)}`;
    return `M${point(inner)} L${point(outer)}`;
  });
}

function flake(x, y) {
  const r = 5;
  const d = 3.5;
  return [
    `M${x - r} ${y} L${x + r} ${y}`,
    `M${x} ${y - r} L${x} ${y + r}`,
    `M${x - d} ${y - d} L${x + d} ${y + d}`,
    `M${x - d} ${y + d} L${x + d} ${y - d}`,
  ];
}

const SCENES = {
  sun: {
    label: "Clear sky",
    paths: ["M62 24 C80 22 94 38 92 54 C90 72 72 80 56 76 C40 72 30 56 36 40 C41 28 54 22 70 26", ...rays(60, 50, 34, 44, 8)],
  },
  moon: {
    label: "Clear night",
    paths: ["M72 14 C48 14 30 34 36 58 C42 80 68 90 88 76 C66 76 52 60 56 42 C58 30 64 20 72 14", "M98 22 L98 32", "M93 27 L103 27", "M100 62 L100 68"],
  },
  cloud: {
    label: "Cloudy",
    paths: [CLOUD_LOW, "M40 54 L48 48", "M54 58 L64 50"],
  },
  fog: {
    label: "Fog",
    paths: [
      "M14 34 C30 26 42 42 58 34 S86 26 106 34",
      "M10 50 C28 42 44 58 62 50 S92 42 110 50",
      "M16 66 C32 58 44 74 60 66 S88 58 104 66",
    ],
  },
  rain: {
    label: "Rain",
    paths: [CLOUD_HIGH, "M34 64 L28 80", "M52 64 L46 80", "M70 64 L64 80", "M88 64 L82 80"],
  },
  snow: {
    label: "Snow",
    paths: [CLOUD_HIGH, ...flake(36, 74), ...flake(60, 84), ...flake(84, 74)],
  },
  thunder: {
    label: "Thunderstorm",
    paths: [CLOUD_HIGH, "M64 58 L50 76 L62 76 L52 94", "M34 64 L28 78", "M88 64 L82 78"],
  },
};

function sceneFor(code, isDay) {
  if (code >= 95) return "thunder";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if (code === 45 || code === 48) return "fog";
  if (code === 0 || code === 1) return isDay ? "sun" : "moon";
  return "cloud";
}

function buildPencil(paths) {
  const group = document.createElementNS(SVG_NS, "g");
  group.setAttribute("class", "pencil");
  group.setAttribute("filter", "url(#pencil-rough)");
  paths.forEach((d, n) => {
    ["stroke", "ghost"].forEach((kind) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      path.setAttribute("pathLength", "1");
      path.setAttribute("class", `pencil-${kind}`);
      path.style.setProperty("--n", n);
      group.append(path);
    });
  });
  return group;
}

function showWeather() {
  const old = els.scribble.querySelector(".pencil");
  if (old) old.remove();

  const w = state.weather;
  if (!w) {
    els.scribble.classList.add("is-empty");
    els.weatherNote.textContent = "The weather did not load, so there is no sketch today.";
    return;
  }

  const scene = SCENES[sceneFor(w.weather_code, w.is_day === 1)];
  els.scribble.classList.remove("is-empty");
  els.scribble.setAttribute("aria-label", `Pencil sketch of the weather: ${scene.label.toLowerCase()}`);
  els.scribble.append(buildPencil(scene.paths));
  els.weatherNote.textContent = `${scene.label} in Seoul, feels like ${Math.round(w.apparent_temperature)}°C.`;
}

function locateUser() {
  if (!("geolocation" in navigator)) {
    setStatus("This browser cannot share your location. Choose a place from the list instead.", true);
    return;
  }
  setStatus("Asking your browser for your location…");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.origin = { lat: position.coords.latitude, lon: position.coords.longitude };
      els.area.selectedIndex = 0;
      setStatus("");
      render({ turnToFirst: true });
    },
    (error) => {
      const reason = error.code === error.PERMISSION_DENIED
        ? "Location permission was declined."
        : "Your location could not be found.";
      setStatus(`${reason} Choose a place from the list and the booklet will use that instead.`, true);
    },
    { timeout: 10000, maximumAge: 60000 }
  );
}

function setStatus(message, isError = false) {
  els.status.textContent = message;
  els.status.classList.toggle("is-error", isError);
}

function setStatusWithRetry(message) {
  setStatus(message, true);
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "try again";
  retry.addEventListener("click", loadWeather);
  els.status.append(retry, ".");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

function seoulTime(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Seoul",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    weekday: parts.weekday,
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    text: `${parts.hour}:${parts.minute}`,
  };
}

function daysUntil(todayYmd, endYmd) {
  return Math.round((Date.parse(endYmd) - Date.parse(todayYmd)) / 86400000);
}

function formatDate(ymd) {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(ymd));
}

function rank(exhibition) {
  const venue = VENUES[exhibition.venue];
  const today = seoulTime(new Date());
  const daysLeft = daysUntil(today.ymd, exhibition.end);
  const reasons = [];
  let score = 0;

  if (daysLeft <= 40) {
    score += 40 - daysLeft;
    if (daysLeft === 0) reasons.push("Closes today.");
    else if (daysLeft === 1) reasons.push("Closes tomorrow.");
    else reasons.push(`Closes in ${daysLeft} days, on ${formatDate(exhibition.end)}.`);
  } else {
    reasons.push(`On until ${formatDate(exhibition.end)}, so there is no rush.`);
  }

  let arrival = today;
  if (state.origin) {
    const km = distanceKm(state.origin, venue);
    const minutes = Math.round(12 + km * 3);
    arrival = seoulTime(new Date(Date.now() + minutes * 60000));
    score -= Math.min(km * 0.8, 30);
    reasons.push(`${km.toFixed(0)} km from you, about ${minutes} minutes. Leave now and you arrive at ${arrival.text}.`);
  }

  const open = arrival.weekday !== "Mon" && arrival.minutes >= 600 && arrival.minutes <= 17 * 60;
  if (open) {
    reasons.push(state.origin ? "Open when you arrive." : "Open right now.");
  } else {
    score -= 100;
    if (arrival.weekday === "Mon") reasons.push("Closed on Mondays.");
    else reasons.push(`${state.origin ? "Closed at that hour." : "Closed right now."} Doors open 10:00–18:00.`);
  }

  const w = state.weather;
  if (w && venue.hasGarden) {
    const wet = w.precipitation > 0 || (w.weather_code >= 51 && w.weather_code <= 99);
    const temp = Math.round(w.apparent_temperature);
    if (wet || temp < 3) {
      score -= 10;
      reasons.push(`It feels like ${temp}°C and Gwacheon’s sculpture park is outdoors.`);
    } else if (temp >= 8 && temp <= 26) {
      score += 10;
      reasons.push(`Dry and ${temp}°C: good weather for Gwacheon’s sculpture park too.`);
    }
  }

  return { exhibition, venue, daysLeft, closingSoon: daysLeft <= 21, reasons, score };
}

/* ---------- Pages ---------- */

function createPage(extraClass) {
  const page = document.createElement("section");
  page.className = `page ${extraClass}`;
  page.setAttribute("role", "group");
  page.setAttribute("aria-roledescription", "page");
  const inner = el("div", "page-inner");
  page.append(inner);
  return { page, inner };
}

function buildPlate(title) {
  const image = IMAGES[title];
  if (!image) return null;

  const figure = el("figure", "plate");
  const frame = el("div", "plate-frame");
  const img = document.createElement("img");
  img.src = image.src;
  img.alt = image.alt;
  img.decoding = "async";
  img.referrerPolicy = "no-referrer";
  img.addEventListener("error", () => figure.remove());
  frame.append(img);
  figure.append(frame, el("figcaption", "", image.caption));
  return figure;
}

function buildExhibitionPage(entry, index) {
  const { page, inner } = createPage("page-exhibition");
  const reasons = el("ul", "reasons");
  entry.reasons.forEach((text, i) => {
    reasons.append(el("li", i === 0 && entry.closingSoon ? "is-closing" : "", text));
  });
  const parts = [
    el("p", "page-note", index === 0 ? "First to see" : `Number ${index + 1} on your list`),
    buildPlate(entry.exhibition.title),
    el("h2", "", entry.exhibition.title),
    el("p", "venue", entry.venue.name),
    el("p", "blurb", entry.exhibition.blurb),
    reasons,
  ];
  inner.append(...parts.filter(Boolean));
  return page;
}

function buildEmptyPage() {
  const { page, inner } = createPage("page-exhibition");
  inner.append(
    el("h2", "", "Every show has closed"),
    el("p", "", "All the exhibitions in this booklet have ended. See what is on now at mmca.go.kr.")
  );
  return page;
}

function ensureNumeral(page, index) {
  if (index === 0) return;
  let numeral = page.querySelector(".numeral");
  if (!numeral) {
    numeral = el("span", "numeral");
    numeral.setAttribute("aria-hidden", "true");
    page.append(numeral);
  }
  numeral.textContent = String(index + 1);
}

function showPage(index, { announce = true } = {}) {
  const pages = Array.from(els.pages.children);
  state.page = Math.max(0, Math.min(index, pages.length - 1));

  pages.forEach((page, i) => {
    const pageState = i < state.page ? "before" : i > state.page ? "after" : "current";
    page.dataset.state = pageState;
    page.inert = pageState !== "current";
    page.setAttribute("aria-label", `Page ${i + 1} of ${pages.length}`);
    ensureNumeral(page, i);
  });

  els.prev.disabled = state.page === 0;
  els.next.disabled = state.page === pages.length - 1;
  if (els.next.disabled && document.activeElement === els.next) els.prev.focus();
  if (els.prev.disabled && document.activeElement === els.prev) els.next.focus();

  if (announce) {
    const heading = pages[state.page].querySelector("h1, h2");
    els.announcer.textContent = `Page ${state.page + 1} of ${pages.length}: ${heading ? heading.textContent : ""}`;
  }
}

function turn(direction) {
  const before = state.page;
  showPage(state.page + direction);
  if (state.page !== before) rustle();
}

function render({ turnToFirst = false } = {}) {
  const ranked = EXHIBITIONS
    .map(rank)
    .filter((entry) => entry.daysLeft >= 0)
    .sort((a, b) => b.score - a.score);

  els.pages.querySelectorAll(".page-exhibition").forEach((page) => page.remove());
  const pages = ranked.length ? ranked.map(buildExhibitionPage) : [buildEmptyPage()];
  els.colophon.before(...pages);

  showPage(turnToFirst ? FIRST_EXHIBITION_INDEX : state.page, { announce: turnToFirst });
  if (turnToFirst) chime();
}

els.locate.addEventListener("click", locateUser);

els.area.addEventListener("change", () => {
  const [lat, lon] = els.area.value.split(",").map(Number);
  state.origin = { lat, lon };
  setStatus("");
  render({ turnToFirst: true });
});

els.sound.addEventListener("click", () => {
  setSound(!soundOn);
  chime();
});

els.prev.addEventListener("click", () => turn(-1));
els.next.addEventListener("click", () => turn(1));

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target instanceof Element && event.target.closest("select, input, textarea")) return;
  if (event.key === "ArrowRight") turn(1);
  if (event.key === "ArrowLeft") turn(-1);
});

showPage(0, { announce: false });
loadWeather();
