/* ============================================================
   AtmosLux — Premium Weather App — Main Script
   ============================================================ */

// ── API Config ──
const API_KEY = "0ebd95b93f8d164663852a60c4cc24ba";
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// ── State ──
let isCelsius = true;
let currentTempC = null;
let currentFeelsC = null;
let currentHighC = null;
let currentLowC = null;
let currentWindMs = null;
let currentData = null;
let forecastDataCache = null;
let weatherEffectsInterval = null;

// ── DOM Refs ──
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const geoBtn = document.getElementById("geo-btn");
const unitToggle = document.getElementById("unit-toggle");
const unitC = document.getElementById("unit-c");
const unitF = document.getElementById("unit-f");
const errorMsg = document.getElementById("error-msg");
const errorText = document.getElementById("error-text");
const loadingScreen = document.getElementById("loading-screen");
const welcomeState = document.getElementById("welcome-state");
const weatherMain = document.getElementById("weather-main");
const particlesCtn = document.getElementById("particles-container");
const bgCanvas = document.getElementById("bg-canvas");

// ── Weather Display Elements ──
const cityNameEl = document.getElementById("city-name");
const countryCodeEl = document.getElementById("country-code");
const dateDisplayEl = document.getElementById("date-display");
const tempMainEl = document.getElementById("temp-main");
const conditionLbl = document.getElementById("condition-label");
const feelsLikeEl = document.getElementById("feels-like");
const tempHighEl = document.getElementById("temp-high");
const tempLowEl = document.getElementById("temp-low");
const weatherIconEl = document.getElementById("weather-icon-main");
const humidityVal = document.getElementById("humidity-val");
const humidityBar = document.getElementById("humidity-bar");
const windVal = document.getElementById("wind-val");
const windDir = document.getElementById("wind-dir");
const visibilityVal = document.getElementById("visibility-val");
const visibilityLbl = document.getElementById("visibility-label");
const pressureVal = document.getElementById("pressure-val");
const pressureLbl = document.getElementById("pressure-label");
const sunriseVal = document.getElementById("sunrise-val");
const sunsetVal = document.getElementById("sunset-val");
const forecastList = document.getElementById("forecast-list");
const cloudCoverEl = document.getElementById("cloud-cover");
const dewPointEl = document.getElementById("dew-point");
const weatherIdEl = document.getElementById("weather-id");
const weatherDescEl = document.getElementById("weather-desc");
const pulseCanvas = document.getElementById("pulse-canvas");

// ── Particle System ──
function spawnParticles(count = 18) {
  particlesCtn.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 4 + 2;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 20 + 15}s;
      animation-delay: ${Math.random() * 10}s;
      opacity: ${Math.random() * 0.5 + 0.1};
    `;
    particlesCtn.appendChild(p);
  }
}

// ── Background Canvas (Subtle Aurora) ──
function animateCanvas() {
  const canvas = bgCanvas;
  const ctx = canvas.getContext("2d");
  let t = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width,
      h = canvas.height;

    // Draw 3 overlapping aurora blobs
    const blobs = [
      { x: w * 0.2 + Math.sin(t * 0.3) * 80, y: h * 0.4, r: w * 0.35 },
      {
        x: w * 0.7 + Math.cos(t * 0.2) * 60,
        y: h * 0.3 + Math.sin(t * 0.4) * 40,
        r: w * 0.3,
      },
      { x: w * 0.5 + Math.cos(t * 0.25) * 50, y: h * 0.7, r: w * 0.4 },
    ];

    blobs.forEach((b, i) => {
      const grad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      const alphas = ["0.06", "0.05", "0.04"];
      grad.addColorStop(0, `rgba(255,255,255,${alphas[i]})`);
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(b.x, b.y, b.r, b.r * 0.5, t * 0.1 + i, 0, Math.PI * 2);
      ctx.fill();
    });

    t += 0.008;
    requestAnimationFrame(draw);
  }
  draw();
}

// ── Weather Condition → Theme & Icon ──
const CONDITION_MAP = {
  Thunderstorm: {
    theme: "weather-thunderstorm",
    icon: "images/rain.png",
    label: "Thunderstorm",
  },
  Drizzle: {
    theme: "weather-drizzle",
    icon: "images/drizzle.png",
    label: "Light Drizzle",
  },
  Rain: { theme: "weather-rain", icon: "images/rain.png", label: "Rainy" },
  Snow: { theme: "weather-snow", icon: "images/snow.png", label: "Snowy" },
  Mist: { theme: "weather-mist", icon: "images/mist.png", label: "Misty" },
  Smoke: { theme: "weather-smoke", icon: "images/mist.png", label: "Smoky" },
  Haze: { theme: "weather-haze", icon: "images/mist.png", label: "Hazy" },
  Dust: { theme: "weather-dust", icon: "images/mist.png", label: "Dusty" },
  Fog: { theme: "weather-fog", icon: "images/mist.png", label: "Foggy" },
  Sand: { theme: "weather-sand", icon: "images/mist.png", label: "Sandy" },
  Ash: { theme: "weather-ash", icon: "images/mist.png", label: "Ash" },
  Squall: { theme: "weather-squall", icon: "images/wind.png", label: "Squall" },
  Tornado: {
    theme: "weather-tornado",
    icon: "images/wind.png",
    label: "Tornado",
  },
  Clear: {
    theme: "weather-clear",
    icon: "images/clear.png",
    label: "Clear Sky",
  },
  Clouds: {
    theme: "weather-clouds",
    icon: "images/clouds.png",
    label: "Cloudy",
  },
};

function applyWeatherTheme(main) {
  const allThemes = Object.values(CONDITION_MAP).map((c) => c.theme);
  document.body.classList.remove(...allThemes);
  const info = CONDITION_MAP[main] || CONDITION_MAP["Clear"];
  document.body.classList.add(info.theme);
  return info;
}

// ── Weather Effects (Rain / Snow / Lightning) ──
function clearWeatherEffects() {
  clearInterval(weatherEffectsInterval);
  document
    .querySelectorAll(".rain-drop, .snow-flake, .lightning-flash")
    .forEach((el) => el.remove());
}

function startRainEffect() {
  clearWeatherEffects();
  for (let i = 0; i < 60; i++) {
    const drop = document.createElement("div");
    drop.className = "rain-drop";
    const height = Math.random() * 15 + 8;
    drop.style.cssText = `
      left: ${Math.random() * 100}vw;
      height: ${height}px;
      top: ${Math.random() * -100}px;
      animation-duration: ${Math.random() * 0.5 + 0.6}s;
      animation-delay: ${Math.random() * 2}s;
      opacity: ${Math.random() * 0.4 + 0.2};
    `;
    document.body.appendChild(drop);
  }
}

function startSnowEffect() {
  clearWeatherEffects();
  const flakes = ["❄", "❅", "❆", "✦", "·"];
  for (let i = 0; i < 40; i++) {
    const flake = document.createElement("div");
    flake.className = "snow-flake";
    flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
    const size = Math.random() * 14 + 8;
    flake.style.cssText = `
      left: ${Math.random() * 100}vw;
      font-size: ${size}px;
      top: ${Math.random() * -100}px;
      animation-duration: ${Math.random() * 5 + 6}s;
      animation-delay: ${Math.random() * 8}s;
      opacity: ${Math.random() * 0.5 + 0.3};
    `;
    document.body.appendChild(flake);
  }
}

function startThunderstormEffect() {
  startRainEffect();
  const flash = document.createElement("div");
  flash.className = "lightning-flash";
  document.body.appendChild(flash);
}

function applyWeatherEffects(main) {
  clearWeatherEffects();
  if (main === "Rain" || main === "Drizzle") startRainEffect();
  else if (main === "Snow") startSnowEffect();
  else if (main === "Thunderstorm") startThunderstormEffect();
}

// ── Temperature Conversion ──
function toDisplay(c) {
  return isCelsius ? Math.round(c) : Math.round((c * 9) / 5 + 32);
}
function degSymbol() {
  return isCelsius ? "°C" : "°F";
}
function windDisplay(ms) {
  // OpenWeatherMap returns m/s, convert to km/h or mph
  if (isCelsius) return { val: Math.round(ms * 3.6), unit: " km/h" };
  else return { val: Math.round(ms * 2.237), unit: " mph" };
}

function updateWindDisplay() {
  if (currentWindMs === null) return;
  const w = windDisplay(currentWindMs);
  windVal.innerHTML = `${w.val}<span class="stat-unit" id="wind-unit">${w.unit}</span>`;
}

function updateTemperatureDisplay() {
  if (currentTempC === null) return;
  const sym = degSymbol();
  tempMainEl.textContent = toDisplay(currentTempC) + "°";
  feelsLikeEl.textContent = toDisplay(currentFeelsC) + sym;
  tempHighEl.textContent = toDisplay(currentHighC) + sym;
  tempLowEl.textContent = toDisplay(currentLowC) + sym;
  updateWindDisplay();

  // Re-render dew point
  if (currentData) {
    const dewC = currentData.main.temp - (100 - currentData.main.humidity) / 5;
    dewPointEl.textContent = toDisplay(dewC) + sym;
  }
}

// ── Wind Direction ──
function degreesToCompass(deg) {
  const dirs = ["N ↑", "NE ↗", "E →", "SE ↘", "S ↓", "SW ↙", "W ←", "NW ↖"];
  return dirs[Math.round(deg / 45) % 8];
}

// ── Timestamp to Time ──
function unixToTime(unix, tz) {
  const d = new Date((unix + tz) * 1000);
  return (
    d
      .toUTCString()
      .match(/(\d+:\d+)/)[0]
      .replace(/^0/, "") + (d.getUTCHours() >= 12 ? " PM" : " AM")
  );
}

// ── Visibility Label ──
function visLabel(m) {
  if (m >= 10000) return "Excellent";
  if (m >= 5000) return "Good";
  if (m >= 2000) return "Moderate";
  return "Poor";
}

// ── Pressure Label ──
function pressureLabel(hpa) {
  if (hpa > 1022) return "High";
  if (hpa < 1009) return "Low";
  return "Normal";
}

// ── Date Formatting ──
function formatDate(unixTs) {
  const d = new Date(unixTs * 1000);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// ── Pulse Canvas Draw ──
function drawPulse(temps) {
  const ctx = pulseCanvas.getContext("2d");
  const w = pulseCanvas.width;
  const h = pulseCanvas.height;
  ctx.clearRect(0, 0, w, h);

  if (!temps || temps.length < 2) return;

  const min = Math.min(...temps) - 2;
  const max = Math.max(...temps) + 2;
  const range = max - min || 1;

  const points = temps.map((t, i) => ({
    x: (i / (temps.length - 1)) * (w - 20) + 10,
    y: h - ((t - min) / range) * (h - 16) - 8,
  }));

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, w, 0);
  gradient.addColorStop(0, "rgba(247,201,72,0.6)");
  gradient.addColorStop(1, "rgba(79,195,247,0.6)");

  ctx.beginPath();
  ctx.moveTo(points[0].x, h);
  ctx.lineTo(points[0].x, points[0].y);

  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    ctx.bezierCurveTo(
      cpx,
      points[i - 1].y,
      cpx,
      points[i].y,
      points[i].x,
      points[i].y,
    );
  }

  ctx.lineTo(points[points.length - 1].x, h);
  ctx.closePath();

  const fillGrad = ctx.createLinearGradient(0, 0, 0, h);
  fillGrad.addColorStop(0, "rgba(247,201,72,0.25)");
  fillGrad.addColorStop(1, "rgba(247,201,72,0)");
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const cpx = (points[i - 1].x + points[i].x) / 2;
    ctx.bezierCurveTo(
      cpx,
      points[i - 1].y,
      cpx,
      points[i].y,
      points[i].x,
      points[i].y,
    );
  }
  ctx.strokeStyle = gradient;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dots
  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(247,201,72,0.9)";
    ctx.fill();
  });
}

// ── Forecast Render ──
function renderForecast(data) {
  forecastDataCache = data;
  const days = {};

  data.list.forEach((item) => {
    const date = new Date(item.dt * 1000);
    const dayKey = date.toLocaleDateString("en-US", { weekday: "short" });
    const today = new Date().toLocaleDateString("en-US", { weekday: "short" });
    if (dayKey === today) return; // skip today

    if (!days[dayKey]) {
      days[dayKey] = {
        temps: [],
        icons: [],
        main: [],
      };
    }
    days[dayKey].temps.push(item.main.temp);
    days[dayKey].icons.push(item.weather[0].main);
    days[dayKey].main.push(item.weather[0].main);
  });

  const dayEntries = Object.entries(days).slice(0, 5);
  forecastList.innerHTML = "";

  dayEntries.forEach(([day, info]) => {
    const avgHigh = Math.max(...info.temps);
    const avgLow = Math.min(...info.temps);
    const dominantMain = info.main
      .sort(
        (a, b) =>
          info.main.filter((v) => v === a).length -
          info.main.filter((v) => v === b).length,
      )
      .pop();

    const icon = (CONDITION_MAP[dominantMain] || CONDITION_MAP["Clear"]).icon;

    const item = document.createElement("div");
    item.className = "forecast-item";
    item.innerHTML = `
      <div class="forecast-day">${day}</div>
      <img class="forecast-icon" src="${icon}" alt="${dominantMain}" />
      <div class="forecast-high">${toDisplay(avgHigh)}°</div>
      <div class="forecast-low">${toDisplay(avgLow)}°</div>
    `;
    forecastList.appendChild(item);
  });

  // Pulse chart from today's forecast temps
  const todayTemps = data.list
    .filter((item) => {
      const d = new Date(item.dt * 1000);
      return d.toDateString() === new Date().toDateString();
    })
    .map((item) => item.main.temp);

  if (todayTemps.length > 1) {
    setTimeout(() => drawPulse(todayTemps), 300);
  } else {
    // Use first 8 items as fallback
    drawPulse(data.list.slice(0, 8).map((i) => i.main.temp));
  }
}

// ── Show / Hide States ──
function showLoading() {
  welcomeState.style.display = "none";
  weatherMain.classList.remove("visible");
  loadingScreen.classList.add("visible");
  errorMsg.classList.remove("visible");
}

function showWeather() {
  loadingScreen.classList.remove("visible");
  weatherMain.classList.add("visible");
}

function showWelcome() {
  loadingScreen.classList.remove("visible");
  weatherMain.classList.remove("visible");
  welcomeState.style.display = "flex";
}

function showError(msg) {
  loadingScreen.classList.remove("visible");
  welcomeState.style.display = "none";
  errorText.textContent = msg || "City not found. Please try again.";
  errorMsg.classList.add("visible");
  // Hide after 5s
  setTimeout(() => errorMsg.classList.remove("visible"), 5000);
}

// ── Main Fetch ──
async function fetchWeather(city) {
  showLoading();

  try {
    // Current weather
    const res = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`,
    );

    if (!res.ok) {
      if (res.status === 404)
        showError(`"${city}" not found. Try another city.`);
      else if (res.status === 401)
        showError("API key issue. Please check configuration.");
      else showError("Failed to fetch weather. Try again later.");
      showWelcome();
      return;
    }

    const data = await res.json();
    currentData = data;

    // Store temps
    currentTempC = data.main.temp;
    currentFeelsC = data.main.feels_like;
    currentHighC = data.main.temp_max;
    currentLowC = data.main.temp_min;
    currentWindMs = data.wind.speed;

    // Theme
    const condMain = data.weather[0].main;
    const condInfo = applyWeatherTheme(condMain);

    // Effects
    applyWeatherEffects(condMain);

    // Icon + condition
    weatherIconEl.src = condInfo.icon;
    weatherIconEl.alt = condInfo.label;
    conditionLbl.textContent = data.weather[0].description;

    // Location
    cityNameEl.textContent = data.name;
    countryCodeEl.textContent = data.sys.country;
    dateDisplayEl.textContent = formatDate(data.dt);

    // Temps
    updateTemperatureDisplay();

    // Humidity
    const hum = data.main.humidity;
    humidityVal.innerHTML = `${hum}<span class="stat-unit">%</span>`;
    humidityBar.style.width = `${hum}%`;

    // Wind
    updateWindDisplay();
    windDir.textContent = degreesToCompass(data.wind.deg || 0);

    // Visibility
    const vis = data.visibility || 10000;
    visibilityVal.innerHTML = `${(vis / 1000).toFixed(1)}<span class="stat-unit"> km</span>`;
    visibilityLbl.textContent = visLabel(vis);

    // Pressure
    const pres = data.main.pressure;
    pressureVal.innerHTML = `${pres}<span class="stat-unit"> hPa</span>`;
    pressureLbl.textContent = pressureLabel(pres);

    // Sunrise / Sunset
    const tz = data.timezone;
    sunriseVal.textContent = unixToTime(data.sys.sunrise, tz);
    sunsetVal.textContent = unixToTime(data.sys.sunset, tz);

    // Atmosphere
    cloudCoverEl.textContent = `${data.clouds.all}%`;
    const dewC = data.main.temp - (100 - data.main.humidity) / 5;
    dewPointEl.textContent = `${toDisplay(dewC)}${degSymbol()}`;
    weatherIdEl.textContent = data.weather[0].id;
    weatherDescEl.textContent = data.weather[0].description;

    // Fetch forecast
    const fRes = await fetch(
      `${BASE_URL}/forecast?q=${encodeURIComponent(data.name)}&units=metric&appid=${API_KEY}`,
    );
    if (fRes.ok) {
      const fData = await fRes.json();
      renderForecast(fData);
    }

    showWeather();

    // Animate stats in
    document
      .querySelectorAll(".stat-card, .hero-card, .forecast-section, .info-card")
      .forEach((el, i) => {
        el.style.opacity = "0";
        el.style.transform = "translateY(20px)";
        setTimeout(() => {
          el.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
          el.style.opacity = "1";
          el.style.transform = "translateY(0)";
        }, 50);
      });
  } catch (err) {
    console.error("Weather fetch error:", err);
    showError("Network error. Check your connection.");
    showWelcome();
  }
}

// ── Geolocation ──
async function fetchByCoords(lat, lon) {
  showLoading();
  try {
    const res = await fetch(
      `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`,
    );
    if (!res.ok) {
      showError("Location not supported.");
      showWelcome();
      return;
    }
    const data = await res.json();
    cityInput.value = data.name;
    await fetchWeather(data.name);
  } catch {
    showError("Could not fetch location weather.");
    showWelcome();
  }
}

function useMyLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(
    (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => {
      showError("Permission denied. Enable location access.");
      showWelcome();
    },
  );
}

// ── Unit Toggle ──
function toggleUnit() {
  isCelsius = !isCelsius;
  unitC.classList.toggle("active", isCelsius);
  unitF.classList.toggle("active", !isCelsius);
  updateTemperatureDisplay();

  // Re-render forecast with new unit
  if (forecastDataCache) {
    renderForecast(forecastDataCache);
  }
}

// ── Event Listeners ──
searchBtn.addEventListener("click", () => {
  const city = cityInput.value.trim();
  if (city) fetchWeather(city);
});

cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const city = cityInput.value.trim();
    if (city) fetchWeather(city);
  }
});

geoBtn.addEventListener("click", useMyLocation);
unitToggle.addEventListener("click", toggleUnit);

// ── Search Input Focus Effects ──
cityInput.addEventListener("focus", () => {
  document.getElementById("search-box").classList.add("focused");
});
cityInput.addEventListener("blur", () => {
  document.getElementById("search-box").classList.remove("focused");
});

// ── Init ──
function init() {
  spawnParticles(20);
  animateCanvas();
  showWelcome();

  // Auto-load a default city after a brief moment for visual polish
  setTimeout(() => {
    fetchWeather("London");
  }, 800);
}

init();
