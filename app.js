

// ====== LIVE DEVICE CLOCK ======
function updateDeviceTime() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-IN", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const clockMain = document.getElementById("deviceTime");
  const clockSmall = document.getElementById("deviceTimeSmall");
  if (clockMain) clockMain.textContent = timeStr;
  if (clockSmall) clockSmall.textContent = timeStr;
}
setInterval(updateDeviceTime, 1000);
updateDeviceTime();

// ====== HELPERS ======
function setStatusPill(status) {
  const pill = document.getElementById("statusPill");
  const dot = document.getElementById("statusBadgeDot");
  if (!pill || !dot) return;

  pill.className = "status-pill";
  dot.className = "badge-dot";

  const s = String(status || "").toLowerCase();
  if (s.includes("run")) {
    pill.classList.add("status-running");
    dot.classList.remove("closed");
    dot.classList.add("running");
    pill.textContent = "Running today";
  } else if (s.includes("tide") || s.includes("pause")) {
    pill.classList.add("status-tide");
    dot.classList.remove("running");
    dot.classList.add("paused");
    pill.textContent = "Paused · High tide";
  } else if (s.includes("closed")) {
    pill.classList.add("status-closed");
    dot.classList.add("closed");
    pill.textContent = "Closed for today";
  } else {
    pill.classList.add("status-closed");
    dot.classList.add("closed");
    pill.textContent = "Status";
  }
}

function tagForStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("next")) return { label: "Next boat", css: "tag-next" };
  if (s.includes("past") || s.includes("depart")) return { label: "Past", css: "tag-past" };
  if (s.includes("upcom") || s.includes("scheduled")) return { label: "Upcoming", css: "tag-upcoming" };
  if (s.includes("tide") || s.includes("pause") || s.includes("blocked")) return { label: "High tide pause", css: "tag-blocked" };
  return { label: "", css: "" };
}

function animateResultsCardIn() {
  const card = document.getElementById("resultsCard");
  if (!card) return;
  card.style.pointerEvents = "auto";
  card.style.transition = "opacity 420ms ease, transform 420ms ease";
  card.style.opacity = "1";
  card.style.transform = "translateY(0)";
}

// ====== LOAD ROUTES ======
async function loadRoutes() {
  const select = document.getElementById("routeSelect");
  if (!select) return;

  try {
    const res = await fetch("routes.json"); 
    const routes = await res.json();

    select.innerHTML = '<option value="">Choose a route…</option>';

    (routes || []).forEach((r) => {
      const opt = document.createElement("option");
    opt.value = r.name;


      if (r.fromCity && r.toCity) {
        opt.textContent = `${r.fromCity} → ${r.toCity}`;
      } else if (r.name) {
        opt.textContent = r.name;
      } else {
        opt.textContent = opt.value;
      }

      select.appendChild(opt);
    });

  } catch (err) {
    console.error("loadRoutes error", err);
    select.innerHTML = '<option value="">Could not load routes</option>';
  }
}


// ====== TABLE RENDER ======
function renderScheduleTable(data) {
  const title = document.getElementById("routeTitle");
  const dirChip = document.getElementById("routeDirection");
  const subtitle = document.getElementById("resultSubtitle");
  const msg = document.getElementById("resultMessage");
  const tbody = document.getElementById("scheduleBody");

  if (!title || !subtitle || !msg || !tbody) return;

  title.textContent = data.routeName || "Route details";
  if (dirChip) dirChip.classList.remove("d-none");

  if (data.fromCity && data.toCity) dirChip.textContent = `${data.fromCity} → ${data.toCity}`;
  else if (data.routeName) dirChip.textContent = data.routeName;
  else dirChip.textContent = "";

  subtitle.textContent = `Today’s departures · Next boat at ${ (data.nextDeparture && (data.nextDeparture.timeLabel || data.nextDeparture.time)) || "—" }`;
  msg.textContent = data.message || "";

  setStatusPill(data.serviceStatus);

  tbody.innerHTML = "";
  const departures = Array.isArray(data.allDepartures) ? data.allDepartures : (Array.isArray(data.departures) ? data.departures : []);
  departures.forEach((dep) => {
    const tr = document.createElement("tr");
    tr.classList.add("border-top");

    const timeTd = document.createElement("td");
    timeTd.classList.add("time-cell");
    timeTd.textContent = dep.timeLabel || dep.time || dep.label || "—";

    const tagTd = document.createElement("td");
    tagTd.classList.add("text-end");

    const tagInfo = tagForStatus(dep.status || dep.tag || dep.labelStatus);
    const span = document.createElement("span");
    span.classList.add("tag-pill");
    if (tagInfo.css) span.classList.add(tagInfo.css);
    span.textContent = tagInfo.label || "—";
    tagTd.appendChild(span);

    if ((dep.status || "").toString().toLowerCase().includes("next")) tr.classList.add("row-highlight");

    tr.appendChild(timeTd);
    tr.appendChild(tagTd);
    tbody.appendChild(tr);
  });

  animateResultsCardIn();
}

// ====== SAFE VERTICAL LIST RENDER ======
function renderVerticalList(data) {
  const wrapper = document.getElementById("scheduleListWrapper");
  const list = document.getElementById("scheduleList");
  if (!wrapper || !list) return;

  list.innerHTML = "";

 
  let departures = [];
  if (Array.isArray(data && data.allDepartures)) departures = data.allDepartures;
  else if (Array.isArray(data && data.departures)) departures = data.departures;
  else if (Array.isArray(data && data.schedule)) departures = data.schedule;
  else if (Array.isArray(data && data.times)) departures = data.times;
  else if (Array.isArray(data)) departures = data;

  if (!departures || departures.length === 0) {
    wrapper.style.display = "block";
    return;
  }
  //////////////////////////////////////
const tableRow = document.querySelector(".schedule-table tbody tr.row-highlight");
if (tableRow) {
  tableRow.classList.add("next-highlight"); 
  setTimeout(()=> tableRow.classList.remove("next-highlight"), 3000);
}
  //  map
  const normalize = (d) => {
    if (!d) return { timeLabel: "—", status: "" };
    const timeLabel = String(d.timeLabel || d.time || d.label || d.display || d.timeText || "—");
    const statusRaw = String(d.status || d.tag || d.state || d.labelStatus || "").trim().toLowerCase();
    return { timeLabel, status: statusRaw };
  };

  const mapStatus = (status) => {
    if (!status) return { label: "—", cls: "" };
    if (status.includes("next")) return { label: "Next boat", cls: "next" };
    if (status.includes("past") || status.includes("depart")) return { label: "Past", cls: "past" };
    if (status.includes("upcom") || status.includes("scheduled")) return { label: "Upcoming", cls: "upcoming" };
    if (status.includes("tide") || status.includes("pause") || status.includes("blocked")) return { label: "High tide pause", cls: "blocked" };
   
    const label = status.charAt(0).toUpperCase() + status.slice(1);
    const cls = status.replace(/\s+/g, "-").replace(/[^a-z0-9-_]/gi, "").toLowerCase();
    return { label, cls };
  };

  departures.forEach((raw) => {
    const dep = normalize(raw);
    const s = mapStatus(dep.status);

    const item = document.createElement("div");
    item.className = "schedule-item d-flex align-items-center justify-content-between";

    const left = document.createElement("div");
    left.className = "d-flex flex-column";
    const timeDiv = document.createElement("div");
    timeDiv.className = "time";
    timeDiv.textContent = dep.timeLabel || "—";
    left.appendChild(timeDiv);

    const right = document.createElement("div");
    right.className = "d-flex align-items-center";

    const pill = document.createElement("div");
    pill.className = "pill";
    if (s.cls) pill.classList.add(s.cls);
    pill.textContent = s.label || "—";
    right.appendChild(pill);

    if (s.cls === "next") item.classList.add("row-highlight");

    item.appendChild(left);
    item.appendChild(right);
    list.appendChild(item);
  });

  wrapper.style.display = "block";
}

function focusNextAndHighlight() {
  const wrapper = document.getElementById("scheduleListWrapper");
  const list = document.getElementById("scheduleList");
  if (!wrapper || !list) return;

  const items = Array.from(list.querySelectorAll(".schedule-item"));
  if (!items.length) return;

  let targetIndex = -1;
  items.forEach((it, idx) => {
    const pill = it.querySelector(".pill, .tag-pill");
    const txt = (pill && pill.textContent || "").toLowerCase();
    if (txt.includes("next")) targetIndex = idx;
  });

  if (targetIndex === -1) {
    items.forEach((it, idx) => {
      const pill = it.querySelector(".pill, .tag-pill");
      const txt = (pill && pill.textContent || "").toLowerCase();
      if (txt.includes("upcom") && targetIndex === -1) targetIndex = idx;
    });
  }

  if (targetIndex === -1) return;

  items.forEach(it => it.classList.remove("focused-next", "pulse"));

  const target = items[targetIndex];
  target.classList.add("focused-next");

  const wrapperRect = wrapper.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const currentScroll = wrapper.scrollTop;

  const offsetFromWrapperTop = targetRect.top - wrapperRect.top;

  const desiredScrollTop = currentScroll + offsetFromWrapperTop - (wrapper.clientHeight / 2) + (target.clientHeight / 2);

  const maxScroll = list.scrollHeight - wrapper.clientHeight;
  const finalScroll = Math.max(0, Math.min(desiredScrollTop, maxScroll));

  try {
    wrapper.scrollTo({ top: finalScroll, behavior: "smooth" });
  } catch (e) {
    
    wrapper.scrollTop = finalScroll;
  }

  target.classList.add("pulse");
  setTimeout(() => target.classList.remove("pulse"), 1000);
}
////////////////////////////////////////////////////////////

let leafletMap;
let mapInitialized = false;

async function renderRouteMap(data) {
  const mapWrapper = document.getElementById("mapWrapper");
  if (!mapWrapper) return;

  mapWrapper.style.display = "block";

  if (!mapInitialized) {
    leafletMap = L.map("map").setView([22.5726, 88.3639], 11);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(leafletMap);

    mapInitialized = true;
  }

  leafletMap.eachLayer(layer => {
    if (layer instanceof L.Marker || layer instanceof L.Polyline) {
      leafletMap.removeLayer(layer);
    }
  });

  const start = await geocodePlace(data.fromCity);
  const end   = await geocodePlace(data.toCity);

  if (!start || !end) return;
  //  map focus near river line
const riverBias = [
  [start[0], start[1]],
  [end[0], end[1]]
];

leafletMap.fitBounds(riverBias, {
  padding: [60, 60],
  maxZoom: 15
});
L.marker(start)
  .addTo(leafletMap)
  .bindPopup(`${data.fromCity} Ferry Ghat`);

L.marker(end)
  .addTo(leafletMap)
  .bindPopup(`${data.toCity} Ferry Ghat`);


  L.marker(start).addTo(leafletMap).bindPopup(data.fromCity);
  L.marker(end).addTo(leafletMap).bindPopup(data.toCity);

  L.polyline([start, end], {
    color: "#3b82f6",
    weight: 4
  }).addTo(leafletMap);

  leafletMap.fitBounds([start, end], { padding: [40, 40] });

  setTimeout(() => {
  leafletMap.fitBounds([start, end], { padding: [40, 40] });
  leafletMap.invalidateSize();
}, 200);

}
// ====== SMART GEOCODING (FAST + FERRY-FOCUSED) ======
const geoCache = {};

async function geocodePlace(place) {
  if (!place) return null;

  if (geoCache[place]) return geoCache[place];

  const queries = [
    `${place} ferry ghat, Hooghly river, West Bengal, India`,
    `${place} ferry terminal, Hooghly river`,
    `${place} ghat, Hooghly river`,
    `${place}, West Bengal, India`
  ];

  for (const q of queries) {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "GangaBoatTracker/1.0"
        }
      });

      const data = await res.json();
      if (data && data.length) {
        const coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        geoCache[place] = coords; // ⚡ cache it
        return coords;
      }
    } catch (e) {
      console.warn("Geocoding failed for:", q);
    }
  }

  return null;
}





// ====== INIT: wire up after DOM is ready ======
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("routeForm");
  const button = document.getElementById("checkButton");

  if (!form) {
    console.warn("routeForm not found — aborting init");
    return;
  }

  loadRoutes().catch((e) => console.warn("loadRoutes failed", e));

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();

    const select = document.getElementById("routeSelect");
    if (!select || !select.value) {
      alert("Please choose a route.");
      return;
    }
    const routeId = select.value;

    if (button) {
      button.disabled = true;
      button.classList.add("boat-animating");
    }

    try {
      const res = await fetch("routes.json");
      const routes = await res.json();
      const data = routes.find(r => r.name === routeId);





      if (!res.ok || (data && data.error)) {
        console.warn("schedule API returned error or non-ok", data);
        const msg = document.getElementById("resultMessage");
        if (msg) msg.textContent = data?.error || "No schedule available for this route.";

        const demo = {
          routeName: "Demo Route",
          fromCity: "Demo A",
          toCity: "Demo B",
          nextDeparture: { timeLabel: "12:50 PM" },
          serviceStatus: "running",
          message: "Demo schedule (backend returned error)",
          allDepartures: [
            { timeLabel: "11:30 AM", status: "past" },
            { timeLabel: "12:20 PM", status: "past" },
            { timeLabel: "12:50 PM", status: "next" },
            { timeLabel: "01:10 PM", status: "upcoming" },
            { timeLabel: "01:30 PM", status: "upcoming" }
          ]
        };
        renderScheduleTable(demo);
        renderVerticalList(demo);
      } else {
        renderScheduleTable(data);
        renderVerticalList(data);
        renderRouteMap(data);

      }
    } catch (e) {
      console.error("fetch schedule error", e);
      alert("Could not fetch schedule. Check server.");
    } finally {
      if (button) {
        setTimeout(() => {
          button.disabled = false;
          button.classList.remove("boat-animating");
        }, 600);
      }
    }
  });
});
