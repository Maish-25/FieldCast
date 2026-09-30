const defaultCenter = { latitude: 28.6139, longitude: 77.2090, name: "Delhi, India" };
const map = L.map("map", { zoomControl: false }).setView([defaultCenter.latitude, defaultCenter.longitude], 12);
L.control.zoom({ position: "bottomleft" }).addTo(map);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

const gridLayer = L.layerGroup().addTo(map);
let activeLayer = "rain";
let currentWeather = null;
let requestController = null;
let selectedCenter = defaultCenter;
let selectedRadiusKm = 5;
let selectedHour = new Date().getHours();

function utcDateAtOffset(days) {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const dateInput = document.querySelector("#forecast-date");
dateInput.min = utcDateAtOffset(0);
dateInput.max = utcDateAtOffset(6);
dateInput.value = dateInput.min;

const elements = {
  regionName: document.querySelector("#region-name"),
  coordinates: document.querySelector("#coordinates"),
  temperature: document.querySelector("#temperature-value"),
  probability: document.querySelector("#probability-value"),
  probabilityUnit: document.querySelector("#probability-unit"),
  rain: document.querySelector("#rain-value"),
  humidity: document.querySelector("#humidity-value"),
  wind: document.querySelector("#wind-value"),
  windDirection: document.querySelector("#wind-direction"),
  clouds: document.querySelector("#cloud-value"),
  nearby: document.querySelector("#nearby-summary"),
  condition: document.querySelector("#condition-label"),
  status: document.querySelector("#update-status"),
  error: document.querySelector("#map-error"),
  legendTitle: document.querySelector("#legend-title"),
  legendScale: document.querySelector("#legend-scale"),
  gridCount: document.querySelector("#region-grid-count"),
  hour: document.querySelector("#forecast-hour"),
  hourLabel: document.querySelector("#forecast-hour-label")
};

function coordinateText(latitude, longitude) {
  const latDirection = latitude >= 0 ? "N" : "S";
  const lonDirection = longitude >= 0 ? "E" : "W";
  return `${Math.abs(latitude).toFixed(4)}° ${latDirection} · ${Math.abs(longitude).toFixed(4)}° ${lonDirection}`;
}

function forecastFor(cell) {
  return cell.hourlyForecast.find(forecast => forecast.hour === selectedHour);
}

const layerStyles = {
  rain: { title: "RAIN CHANCE · SELECTED HOUR", labels: ["Low", "Watch", "High"], colors: ["#4c9672", "#dfad48", "#cf6547"] },
  temperature: { title: "AIR TEMPERATURE · °C", labels: ["Cool", "Mild", "Warm"], colors: ["#4d91a1", "#dfad48", "#cf6547"] },
  clouds: { title: "CLOUD COVER · %", labels: ["Clear", "Cloudy", "Overcast"], colors: ["#e4c969", "#8ca4a0", "#657b84"] },
  wind: { title: "WIND FLOW · KM/H", labels: ["Calm", "Breezy", "Windy"], colors: ["#71a98c", "#4d91a1", "#496b85"] }
};

function colorFor(forecast) {
  const styles = layerStyles[activeLayer];
  if (!forecast) return "#87928b";
  if (activeLayer === "temperature") {
    if (forecast.temperatureCelsius == null) return "#87928b";
    if (forecast.temperatureCelsius < 18) return styles.colors[0];
    if (forecast.temperatureCelsius < 30) return styles.colors[1];
    return styles.colors[2];
  }
  if (activeLayer === "clouds") {
    if (forecast.cloudCoverPercent == null) return "#87928b";
    if (forecast.cloudCoverPercent < 34) return styles.colors[0];
    if (forecast.cloudCoverPercent < 67) return styles.colors[1];
    return styles.colors[2];
  }
  if (activeLayer === "wind") {
    if (forecast.windSpeedKmh == null) return "#87928b";
    if (forecast.windSpeedKmh < 10) return styles.colors[0];
    if (forecast.windSpeedKmh < 25) return styles.colors[1];
    return styles.colors[2];
  }
  if (forecast.rainProbabilityPercent == null) return "#87928b";
  if (forecast.rainProbabilityPercent < 20) return styles.colors[0];
  if (forecast.rainProbabilityPercent < 50) return styles.colors[1];
  return styles.colors[2];
}

function windDirectionName(degrees) {
  if (degrees == null) return "--";
  return ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(degrees / 45) % 8];
}

function renderGrid() {
  if (!currentWeather) return;
  gridLayer.clearLayers();
  for (const cell of currentWeather.cells) {
    const forecast = forecastFor(cell);
    if (!forecast) continue;
    const color = colorFor(forecast);
    const circle = L.circleMarker([cell.latitude, cell.longitude], {
      radius: selectedRadiusKm === 5 ? 11 : 13,
      color,
      fillColor: color,
      fillOpacity: 0.42,
      weight: 1,
      opacity: 0.8
    });
    const popup = `<strong>${forecast.temperatureCelsius ?? "--"}°C</strong><br>Rain chance: ${forecast.rainProbabilityPercent ?? "--"}%<br>Precipitation: ${forecast.rainfallMillimeters ?? "--"} mm<br>Cloud cover: ${forecast.cloudCoverPercent ?? "--"}%<br>Wind: ${forecast.windSpeedKmh ?? "--"} km/h from ${windDirectionName(forecast.windDirectionDegrees)}`;
    circle.bindPopup(popup).addTo(gridLayer);
  }
  if (activeLayer === "wind") {
    for (const cell of currentWeather.cells) {
      const forecast = forecastFor(cell);
      if (forecast?.windDirectionDegrees == null) continue;
      const direction = (forecast.windDirectionDegrees + 90) % 360;
      const icon = L.divIcon({
        className: "wind-marker-shell",
        html: `<span class="wind-icon" style="--direction:${direction}deg"><i></i></span>`,
        iconSize: [22, 22],
        iconAnchor: [11, 11]
      });
      L.marker([cell.latitude, cell.longitude], { icon, interactive: false, keyboard: false }).addTo(gridLayer);
    }
  }
  L.circle([selectedCenter.latitude, selectedCenter.longitude], {
    radius: selectedRadiusKm * 1000,
    color: "#2b654c",
    weight: 1,
    dashArray: "5 6",
    fill: false,
    opacity: 0.65
  }).addTo(gridLayer);
  L.circleMarker([selectedCenter.latitude, selectedCenter.longitude], { radius: 5, color: "#fff", weight: 2, fillColor: "#245640", fillOpacity: 1 }).bindTooltip("Region center").addTo(gridLayer);
  const style = layerStyles[activeLayer];
  elements.legendTitle.textContent = style.title;
  elements.legendScale.innerHTML = style.labels.map((label, index) => `<span><i class="legend-swatch" style="background:${style.colors[index]}"></i>${label}</span>`).join("");
}

function updateCenterWeather() {
  if (!currentWeather) return;
  const centerCell = currentWeather.cells.reduce((nearest, cell) => {
    const distance = (cell.latitude - selectedCenter.latitude) ** 2 + (cell.longitude - selectedCenter.longitude) ** 2;
    return !nearest || distance < nearest.distance ? { cell, distance } : nearest;
  }, null)?.cell;
  const center = centerCell && forecastFor(centerCell);
  if (!center) return;
  elements.temperature.textContent = center.temperatureCelsius?.toFixed(1) ?? "--";
  elements.probability.textContent = center.rainProbabilityPercent == null ? "--" : `${center.rainProbabilityPercent}%`;
  elements.probabilityUnit.textContent = `at ${String(selectedHour).padStart(2, "0")}:00`;
  elements.rain.textContent = center.rainfallMillimeters?.toFixed(1) ?? "--";
  elements.humidity.textContent = center.relativeHumidityPercent == null ? "--" : `${center.relativeHumidityPercent}%`;
  elements.wind.textContent = center.windSpeedKmh?.toFixed(0) ?? "--";
  elements.windDirection.textContent = `from ${windDirectionName(center.windDirectionDegrees)}`;
  elements.clouds.textContent = center.cloudCoverPercent == null ? "--" : `${center.cloudCoverPercent}%`;
  const chance = center.rainProbabilityPercent;
  elements.condition.textContent = chance == null ? "FORECAST" : chance >= 50 ? "RAIN LIKELY" : chance >= 20 ? "RAIN WATCH" : "LOW CHANCE";

  const neighboringForecasts = currentWeather.cells.map(forecastFor).filter(Boolean);
  const rainfallReadings = neighboringForecasts.map(item => item.rainProbabilityPercent).filter(Number.isFinite);
  const cloudReadings = neighboringForecasts.map(item => item.cloudCoverPercent).filter(Number.isFinite);
  const averageRain = rainfallReadings.length ? Math.round(rainfallReadings.reduce((sum, value) => sum + value, 0) / rainfallReadings.length) : "--";
  const averageClouds = cloudReadings.length ? Math.round(cloudReadings.reduce((sum, value) => sum + value, 0) / cloudReadings.length) : "--";
  elements.nearby.innerHTML = `Rain ${averageRain}% <span>·</span> Clouds ${averageClouds}%`;
}

async function loadWeather(latitude, longitude) {
  requestController?.abort();
  requestController = new AbortController();
  elements.status.textContent = "Loading regional forecast…";
  elements.error.hidden = true;
  try {
    const query = new URLSearchParams({ latitude, longitude, radiusKm: selectedRadiusKm, date: dateInput.value });
    const response = await fetch(`/api/weather?${query}`, { signal: requestController.signal });
    if (!response.ok) throw new Error(response.status === 502 ? "Weather provider is unavailable. Try again shortly." : "Could not load this region or forecast date.");
    currentWeather = await response.json();
    elements.gridCount.textContent = `${currentWeather.cells.length} GRID SAMPLES`;
    renderGrid();
    updateCenterWeather();
    const updatedAt = new Date(currentWeather.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    elements.status.textContent = `Updated ${updatedAt} · ${currentWeather.forecastDate}`;
  } catch (error) {
    if (error.name === "AbortError") return;
    elements.status.textContent = "Forecast unavailable";
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  }
}

function updateRegionLabels() {
  document.querySelector("#region-radius").innerHTML = `${selectedRadiusKm}<br>KM`;
  document.querySelector("#map-radius-label").textContent = `${selectedRadiusKm} km radius`;
}

function fitSelectedRegion() {
  const latitudeRadius = selectedRadiusKm / 111.32;
  const longitudeRadius = latitudeRadius / Math.cos(selectedCenter.latitude * Math.PI / 180);
  map.fitBounds([
    [selectedCenter.latitude - latitudeRadius, selectedCenter.longitude - longitudeRadius],
    [selectedCenter.latitude + latitudeRadius, selectedCenter.longitude + longitudeRadius]
  ]);
}

function selectRegion(latitude, longitude, name) {
  selectedCenter = { latitude, longitude, name };
  elements.regionName.textContent = name;
  elements.coordinates.textContent = coordinateText(latitude, longitude);
  map.flyTo([latitude, longitude], selectedRadiusKm === 5 ? 12 : 11, { duration: 0.7 });
  loadWeather(latitude, longitude);
}

document.querySelector("#search-form").addEventListener("submit", async event => {
  event.preventDefault();
  const place = document.querySelector("#place-search").value.trim();
  if (!place) return;
  elements.status.textContent = "Finding location…";
  try {
    const query = new URLSearchParams({ name: place, count: "1", language: "en", format: "json" });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${query}`);
    if (!response.ok) throw new Error("Location search is unavailable.");
    const result = (await response.json()).results?.[0];
    if (!result) throw new Error("No matching place found.");
    const name = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    selectRegion(result.latitude, result.longitude, name);
  } catch (error) {
    elements.status.textContent = "Search unavailable";
    elements.error.textContent = error.message;
    elements.error.hidden = false;
  }
});

document.querySelector("#locate-button").addEventListener("click", () => {
  if (!navigator.geolocation) {
    elements.error.textContent = "Location services are not available in this browser.";
    elements.error.hidden = false;
    return;
  }
  elements.status.textContent = "Finding your location…";
  navigator.geolocation.getCurrentPosition(
    position => selectRegion(position.coords.latitude, position.coords.longitude, "My location"),
    () => {
      elements.status.textContent = "Location not shared";
      elements.error.textContent = "Allow location access or search for a town or district.";
      elements.error.hidden = false;
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
});

dateInput.addEventListener("change", () => loadWeather(selectedCenter.latitude, selectedCenter.longitude));
elements.hour.addEventListener("input", () => {
  selectedHour = Number(elements.hour.value);
  elements.hourLabel.value = `${String(selectedHour).padStart(2, "0")}:00`;
  renderGrid();
  updateCenterWeather();
});

document.querySelectorAll(".radius-button").forEach(button => {
  button.addEventListener("click", () => {
    selectedRadiusKm = Number(button.dataset.radius);
    document.querySelectorAll(".radius-button").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    updateRegionLabels();
    fitSelectedRegion();
    loadWeather(selectedCenter.latitude, selectedCenter.longitude);
  });
});

document.querySelectorAll(".layer-button").forEach(button => {
  button.addEventListener("click", () => {
    activeLayer = button.dataset.layer;
    document.querySelectorAll(".layer-button").forEach(item => {
      const active = item === button;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    renderGrid();
  });
});

document.querySelector("#refresh-button").addEventListener("click", () => loadWeather(selectedCenter.latitude, selectedCenter.longitude));
map.on("click", event => selectRegion(event.latlng.lat, event.latlng.lng, "Selected map area"));
updateRegionLabels();
elements.hour.value = selectedHour;
elements.hourLabel.value = `${String(selectedHour).padStart(2, "0")}:00`;
fitSelectedRegion();
loadWeather(defaultCenter.latitude, defaultCenter.longitude);
