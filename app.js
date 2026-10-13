/**
 * BD Maps - Dedicated Bangladesh Only Map & Distance Calculator
 * Features:
 * 1. Inverse Mask (Only Bangladesh territory is visible; outside regions masked)
 * 2. Complete 64 Districts and 460+ Thanas Directory with Deep Zoom (Village & Roads)
 * 3. Major Rivers of Bangladesh Layer (পদ্মা, মেঘনা, যমুনা, ইত্যাদি)
 * 4. High-Detail Tile Layers (OSM, HOT, Satellite, Topo)
 * 5. Road Distance & Route Calculation with OSRM (KM and Time)
 * 6. Interactive Measurement Tool (Ruler)
 */

// Global Application State
const state = {
  map: null,
  activeLayer: null,
  layers: {},
  maskPolygon: null,
  riverLayers: [],
  riversVisible: true,
  searchTimeout: null,
  routePoints: {
    start: null,
    end: null
  },
  travelMode: 'driving',
  routePolyline: null,
  routeMarkers: [],
  routeArrowMarkers: [],
  lang: localStorage.getItem('bd_map_lang') || 'bn',
  measureMode: false,
  measurePoints: [],
  measurePolyline: null,
  measureMarkers: [],
  totalMeasuredDist: 0,
  userLocationMarker: null,
  searchMarker: null,
  activeThanaMarker: null,
  navAnimation: {
    active: false,
    coordinates: [],
    steps: [],
    currentIndex: 0,
    marker: null,
    intervalId: null,
    totalDistanceKm: 0,
    totalMinutes: 0
  },
  navTracking: {
    active: false,
    watchId: null,
    currentLatLng: null,
    currentHeading: 0,
    currentStepIndex: 0,
    currentCoordIndex: 0,
    isMoving: false,
    speedKmh: 0,
    coordinates: [],
    steps: [],
    totalDistanceKm: 0,
    totalMinutes: 0
  }
};

// Strict Bangladesh Geographic Bounds
const BD_CENTER = [23.6850, 90.3563];
const BD_BOUNDS = [
  [20.2, 87.8], // South-West (includes St. Martin's & Bay of Bengal islands)
  [26.9, 93.0]  // North-East (includes Tetulia & Bandarban borders)
];

// Division Quick Jump Centers
const DIVISIONS = {
  all: { center: BD_CENTER, zoom: 7.5, name: 'সম্পূর্ণ বাংলাদেশ' },
  dhaka: { center: [23.8103, 90.4125], zoom: 10, name: 'ঢাকা বিভাগ' },
  chattogram: { center: [22.3569, 91.7832], zoom: 9.5, name: 'চট্টগ্রাম বিভাগ' },
  sylhet: { center: [24.8949, 91.8687], zoom: 9.5, name: 'সিলেট বিভাগ' },
  rajshahi: { center: [24.3745, 88.6042], zoom: 9.5, name: 'রাজশাহী বিভাগ' },
  khulna: { center: [22.8456, 89.5403], zoom: 9.5, name: 'খুলনা বিভাগ' },
  barishal: { center: [22.7010, 90.3535], zoom: 9.5, name: 'বরিশাল বিভাগ' },
  rangpur: { center: [25.7439, 89.2752], zoom: 9.5, name: 'রংপুর বিভাগ' },
  mymensingh: { center: [24.7471, 90.4203], zoom: 9.5, name: 'ময়মনসিংহ বিভাগ' }
};

// Popular Routes Preset
const POPULAR_LOCATIONS = {
  'ঢাকা': { lat: 23.8103, lng: 90.4125, name: 'ঢাকা (Dhaka)' },
  'চট্টগ্রাম': { lat: 22.3569, lng: 91.7832, name: 'চট্টগ্রাম (Chattogram)' },
  'সিলেট': { lat: 24.8949, lng: 91.8687, name: 'সিলেট (Sylhet)' },
  'কক্সবাজার': { lat: 21.4272, lng: 91.9858, name: 'কক্সবাজার (Cox\'s Bazar)' },
  'রাজশাহী': { lat: 24.3745, lng: 88.6042, name: 'রাজশাহী (Rajshahi)' },
  'খুলনা': { lat: 22.8456, lng: 89.5403, name: 'খুলনা (Khulna)' },
  'বরিশাল (পদ্মা সেতু)': { lat: 22.7010, lng: 90.3535, name: 'বরিশাল (Barishal)' }
};

// Bilingual Translation Dictionary (Bangla & English)
const I18N = {
  bn: {
    appTitle: 'বাংলাদেশ ম্যাপ',
    appSubtitle: '(Bangladesh Map)',
    tagline: 'শুধুমাত্র বাংলাদেশ • সকল থানা, গ্রাম, নদী ও সড়কপথ',
    searchPlaceholder: 'যেকোনো থানা, গ্রাম, নদী বা স্থান সার্চ করুন...',
    whereToGo: 'কোথায় যেতে চান?',
    mobileWhereToGo: 'কোথায় যাবেন?',
    thanaDistrict: 'থানা ও জেলা',
    rivers: 'নদ-নদী',
    routeDist: 'রুট ও দূরত্ব',
    ruler: 'পরিমাপক',
    myLocation: 'আমার অবস্থান',
    divisions: 'বিভাগসমূহ:',
    allBd: 'সম্পূর্ণ বাংলাদেশ (Focus)',
    mapLayers: 'ম্যাপ লেয়ার',
    thanaDirTitle: 'বাংলাদেশ থানা ও জেলা ডিরেক্টরি',
    routePanelTitle: 'কোথায় যেতে চান? (রুট প্ল্যানার)',
    car: 'গাড়ি (Car)',
    bike: 'বাইক (Bike)',
    train: 'ট্রেন (Train)',
    startPlaceholder: 'যাত্রা শুরুর স্থান লিখুন (Start Journey)...',
    endPlaceholder: 'গন্তব্যের স্থান লিখুন (Destination Journey)...',
    calcRouteBtn: 'সর্বনিম্ন রুট ও দিকনির্দেশনা দেখুন',
    clearRouteBtn: 'রুট মুছুন',
    mapClickTip: 'টিপ: ম্যাপের যেকোনো দুটি স্থানে সরাসরি ক্লিক করেও রুট বের করতে পারেন!',
    shortestDist: 'সর্বনিম্ন সড়ক দূরত্ব (Shortest)',
    estTime: 'আনুমানিক সময় (Est. Time)',
    liveNavBtn: '▶ লাইভ নেভিগেশন চালু করুন (চলুন)',
    startLabel: 'শুরু:',
    endLabel: 'গন্তব্য:',
    turnDirections: 'টার্ন-বাই-টার্ন সড়ক ডিরেকশন',
    popularRoutesTitle: 'জনপ্রিয় রুটসমূহের দূরত্ব:',
    remainingDist: 'বাকি দূরত্ব',
    remainingTime: 'বাকি সময়',
    speedBoost: 'স্পিড বুস্ট',
    straightRoad: 'সোজা প্রধান সড়ক অনুসরণ করুন',
    navLiveDriving: 'লাইভ কার ড্রাইভিং',
    navLiveBiking: 'লাইভ বাইকিং',
    navLiveTrain: 'লাইভ রেল যাত্রা',
    quickPlaces: 'জনপ্রিয় স্থান:',
    reroutingMsg: '⚠️ রুট পরিবর্তন শনাক্ত! নতুন শর্টেস্ট রুট হিসাব হচ্ছে...',
    stepForward: 'সামনে যান (+৫০ মি)',
    rerouteBtn: 'নতুন রুট',
    gpsStatusLabel: 'জিপিএস অবস্থান',
    stationaryStatus: 'দাঁড়িয়ে আছেন (০ কিমি/ঘণ্টা)',
    movingStatus: 'চলমান'
  },
  en: {
    appTitle: 'Bangladesh Map',
    appSubtitle: '(বাংলাদেশ ম্যাপ)',
    tagline: 'Bangladesh Territory Only • All Thanas, Villages, Rivers & Roads',
    searchPlaceholder: 'Search any thana, village, river or place...',
    whereToGo: 'Where to go?',
    mobileWhereToGo: 'Where to go?',
    thanaDistrict: 'Thana & District',
    rivers: 'Rivers',
    routeDist: 'Route & Directions',
    ruler: 'Measure',
    myLocation: 'My Location',
    divisions: 'Divisions:',
    allBd: 'All Bangladesh (Focus)',
    mapLayers: 'Map Layers',
    thanaDirTitle: 'Bangladesh Thana & District Directory',
    routePanelTitle: 'Where do you want to go? (Route Planner)',
    car: 'Car',
    bike: 'Bike',
    train: 'Train',
    startPlaceholder: 'Enter start point (Start Journey)...',
    endPlaceholder: 'Enter destination (Destination Journey)...',
    calcRouteBtn: 'Find Shortest Route & Directions',
    clearRouteBtn: 'Clear Route',
    mapClickTip: 'Tip: Click any two locations on the map to find route directly!',
    shortestDist: 'Shortest Distance',
    estTime: 'Estimated Time',
    liveNavBtn: '▶ Start Live Moving Navigation',
    startLabel: 'Start:',
    endLabel: 'Destination:',
    turnDirections: 'Turn-by-Turn Road Directions',
    popularRoutesTitle: 'Popular Routes Distance:',
    remainingDist: 'Remaining Dist',
    remainingTime: 'Remaining Time',
    speedBoost: 'Speed Boost',
    straightRoad: 'Follow the main road straight ahead',
    navLiveDriving: 'Live Car Driving',
    navLiveBiking: 'Live Biking',
    navLiveTrain: 'Live Train Travel',
    quickPlaces: 'Popular Places:',
    reroutingMsg: '⚠️ Off-route detected! Calculating new shortest route...',
    stepForward: 'Step Forward (+50m)',
    rerouteBtn: 'Reroute',
    gpsStatusLabel: 'GPS Status',
    stationaryStatus: 'Stationary (0 km/h)',
    movingStatus: 'Moving'
  }
};

// Format numerals according to current language
function formatNumber(num) {
  if (num === null || num === undefined) return '';
  if (state.lang === 'en') return num.toString();
  const bnDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, d => bnDigits[d]);
}
const toBanglaNum = formatNumber;

// Switch and Apply Language (Bangla <-> English)
function applyLanguage(lang) {
  state.lang = lang;
  const dict = I18N[lang] || I18N.bn;

  // Update text of elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) {
      el.innerText = dict[key];
    }
  });

  // Update placeholders with data-i18n-ph
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    const key = el.getAttribute('data-i18n-ph');
    if (dict[key]) {
      el.placeholder = dict[key];
    }
  });

  // Update current language label on toggle button
  const langLabel = document.getElementById('currentLangLabel');
  if (langLabel) {
    langLabel.innerText = lang === 'bn' ? 'English' : 'বাংলা';
  }

  // Update document title
  document.title = lang === 'bn' 
    ? 'বাংলাদেশ ম্যাপ (Bangladesh Map) | সম্পূর্ণ বাংলাদেশ মানচিত্র ও রুট ক্যালকুলেটর'
    : 'Bangladesh Map | Complete Territory Map & Shortest Route Navigation';

  // If a route is calculated, refresh metrics display in active language
  if (state.lastCalculatedDistanceKm) {
    updateAllModeTimes(state.lastCalculatedDistanceKm);
    const distEl = document.getElementById('resDistance');
    if (distEl) distEl.innerText = `${formatNumber(state.lastCalculatedDistanceKm)} ${lang === 'bn' ? 'কিমি' : 'km'}`;
  }
}

function setupLanguageSwitcher() {
  const btn = document.getElementById('langToggleBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      const nextLang = state.lang === 'bn' ? 'en' : 'bn';
      localStorage.setItem('bd_map_lang', nextLang);
      applyLanguage(nextLang);
      showToast(nextLang === 'bn' ? 'ভাষা পরিবর্তন: বাংলা' : 'Language switched to English');
    });
  }
  applyLanguage(state.lang);
}

// Initialize Leaflet Map
function initMap() {
  state.map = L.map('map', {
    center: BD_CENTER,
    zoom: 7.5,
    minZoom: 7,
    maxZoom: 20,
    maxBounds: BD_BOUNDS,
    maxBoundsViscosity: 0.35, // Relaxed from 1.0 to eliminate border bounce & tile tearing
    zoomControl: false
  });

  // Dedicated Leaflet Pane for Outside Mask (Above tile layers at 200, below overlay routes at 400)
  state.map.createPane('maskPane');
  state.map.getPane('maskPane').style.zIndex = 350;
  state.map.getPane('maskPane').style.pointerEvents = 'none';

  // Custom Zoom Control at Bottom Right
  L.control.zoom({ position: 'bottomright' }).addTo(state.map);

  // Setup Tile Layers with high resolution and smooth zoom caching (no 404s or white boxes)
  state.layers.osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    maxNativeZoom: 19,
    keepBuffer: 8,
    updateWhenZooming: false,
    updateWhenIdle: true,
    attribution: '&copy; OpenStreetMap contributors (Bangladesh)'
  });

  state.layers.hot = L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
    maxZoom: 20,
    maxNativeZoom: 19,
    keepBuffer: 8,
    updateWhenZooming: false,
    updateWhenIdle: true,
    attribution: '&copy; OpenStreetMap contributors, Tiles style by Humanitarian OSM'
  });

  // Google Hybrid Satellite: Photorealistic aerial photography with zero 'no data available' errors & clear labels
  state.layers.satellite = L.tileLayer('https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    maxNativeZoom: 19,
    keepBuffer: 8,
    updateWhenZooming: false,
    updateWhenIdle: true,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Satellite Imagery (High-Resolution)'
  });

  // Google Clean Roads (Modern Clean Vector): Crisp authentic Google Maps roads, village pathways, highways & landmarks
  state.layers.carto = L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    maxNativeZoom: 19,
    keepBuffer: 8,
    updateWhenZooming: false,
    updateWhenIdle: true,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps (Clean Road Network)'
  });
  state.layers.clean = state.layers.carto;

  // Google Terrain / Relief Map: High-res hillshading, contours, elevations, rivers & labels
  state.layers.topo = L.tileLayer('https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}', {
    maxZoom: 20,
    maxNativeZoom: 18,
    keepBuffer: 8,
    updateWhenZooming: false,
    updateWhenIdle: true,
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Terrain (Hillshading & Physical Geography)'
  });

  // Add Default Layer
  state.activeLayer = state.layers.osm;
  state.activeLayer.addTo(state.map);

  // Apply Bangladesh-Only Inverse Mask using Canvas renderer (eliminates SVG coordinate glitch)
  applyBangladeshMask();

  // Draw Major Rivers Layer (smooth curved waterways)
  setupRiversLayer();

  // Map Click Listener
  state.map.on('click', handleMapClick);
}

// Apply Inverse Mask (Hides Everything Outside Bangladesh Borders without SVG coordinate overflow)
function applyBangladeshMask() {
  if (typeof BD_BOUNDARY_GEOJSON === 'undefined' || !BD_BOUNDARY_GEOJSON.features) {
    console.warn('BD_BOUNDARY_GEOJSON not loaded.');
    return;
  }

  // Regional Outer Ring covering South Asia / Bay of Bengal bounding region
  // (Prevents SVG/Canvas integer overflow and black box glitch on deep zoom)
  const regionalOuterRing = [
    [15.0, 80.0],
    [15.0, 98.0],
    [30.0, 98.0],
    [30.0, 80.0],
    [15.0, 80.0]
  ];

  // Extract Holes: Bangladesh polygon boundaries converted to [lat, lng]
  const holes = [];
  BD_BOUNDARY_GEOJSON.features.forEach(feat => {
    if (feat.geometry.type === 'Polygon') {
      const ring = feat.geometry.coordinates[0].map(coord => [coord[1], coord[0]]);
      holes.push(ring);
    } else if (feat.geometry.type === 'MultiPolygon') {
      feat.geometry.coordinates.forEach(poly => {
        const ring = poly[0].map(coord => [coord[1], coord[0]]);
        holes.push(ring);
      });
    }
  });

  // Dedicated Canvas Renderer for mask: eliminates SVG coordinate overflow bugs!
  const maskRenderer = L.canvas({ pane: 'maskPane', padding: 0.5 });

  state.maskPolygon = L.polygon([regionalOuterRing, ...holes], {
    pane: 'maskPane',
    renderer: maskRenderer,
    color: '#10b981',       // Vibrant emerald border along Bangladesh border
    weight: 2.5,
    fillColor: '#0b1329',   // Masks outside regions (India, Myanmar, etc.)
    fillOpacity: 0.96,
    interactive: false      // Allow click events to pass
  }).addTo(state.map);
}

// Major Rivers Layer of Bangladesh - Natural Curved Flow & Iconic Confluences
function setupRiversLayer() {
  if (typeof BD_RIVERS === 'undefined') return;

  state.riverLayers = [];
  state.riversVisible = false; // OFF by default so user sees clean realistic map

  // Prominent Iconic River Ports & Confluences (মোহনা ও নদী বন্দর)
  const RIVER_LANDMARKS = [
    { name: "চাঁদপুর ইলিশের মোহনা (পদ্মা ও মেঘনা মিলনস্থল)", lat: 23.232, lng: 90.641, desc: "পদ্মা ও মেঘনা নদীর সুবিশাল মিলনস্থল, যা চাঁদপুরের বিখ্যাত ত্রিনদী মোহনা নামে পরিচিত।" },
    { name: "গোয়ালন্দ ঘাট (পদ্মা ও যমুনা মিলনস্থল)", lat: 23.825, lng: 89.752, desc: "ঐতিহাসিক দৌলতদিয়া-গোয়ালন্দ পয়েন্টে যমুনা নদী এসে পদ্মায় মিলিত হয়েছে।" },
    { name: "পদ্মা সেতু (মাওয়া-জাজিরা চ্যানেল)", lat: 23.4756, lng: 90.2608, desc: "পদ্মা নদীর ওপর নির্মিত ৬.১৫ কিমি দীর্ঘ ঐতিহাসিক পদ্মা সেতু।" },
    { name: "বঙ্গবন্ধু সেতু (যমুনা নদী চ্যানেল)", lat: 24.398, lng: 89.778, desc: "টাঙ্গাইল ও সিরাজগঞ্জের সংযোগকারী যমুনা নদী সেতু।" },
    { name: "ভৈরব মেঘনা সেতু (মেঘনা চ্যানেল)", lat: 24.045, lng: 91.012, desc: "মেঘনা নদীর ওপর নির্মিত ঐতিহাসিক ভৈরব-আশুগঞ্জ সেতু।" },
    { name: "পতেঙ্গা মোহনা (কর্ণফুলী ও বঙ্গোপসাগর)", lat: 22.235, lng: 91.802, desc: "কর্ণফুলী নদী এখানে এসে বঙ্গোপসাগরে পতিত হয়েছে এবং চট্টগ্রাম বন্দর সুরক্ষিত রেখেছে।" },
    { name: "সদরঘাট নদীবন্দর (বুড়িগঙ্গা নদী)", lat: 23.705, lng: 90.412, desc: "ঢাকা শহরের বুড়িগঙ্গার তীরে অবস্থিত দেশের অন্যতম প্রাচীন ও প্রধান নদীবন্দর।" }
  ];

  // Draw Natural Curved Waterways (Following actual river channels)
  BD_RIVERS.forEach(river => {
    const line = L.polyline(river.coords, {
      color: '#0ea5e9',
      weight: 5,
      opacity: 0.75,
      lineCap: 'round',
      lineJoin: 'round',
      smoothFactor: 2.0 // Spline curve smoothing
    }).bindPopup(`
      <div class="bd-popup">
        <h4><i class="fa-solid fa-water text-emerald"></i> ${river.name}</h4>
        <p>${river.desc}</p>
      </div>
    `);

    state.riverLayers.push(line);
  });

  // Landmark Water Droplet Markers
  RIVER_LANDMARKS.forEach(lm => {
    const dropIcon = L.divIcon({
      className: 'river-landmark-pin',
      html: `
        <div class="water-drop-marker" title="${lm.name}">
          <i class="fa-solid fa-water"></i>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([lm.lat, lm.lng], { icon: dropIcon }).bindPopup(`
      <div class="bd-popup">
        <h4><i class="fa-solid fa-anchor" style="color:#0284c7;"></i> ${lm.name}</h4>
        <p>${lm.desc}</p>
        <div class="popup-actions">
          <button class="popup-btn btn-a" onclick="setRoutePointFromMap('start', ${lm.lat}, ${lm.lng}, '${lm.name.replace(/'/g, "\\'")}')">শুরু (A)</button>
          <button class="popup-btn btn-b" onclick="setRoutePointFromMap('end', ${lm.lat}, ${lm.lng}, '${lm.name.replace(/'/g, "\\'")}')">গন্তব্য (B)</button>
        </div>
      </div>
    `);

    state.riverLayers.push(marker);
  });

  // Toggle button in header
  const toggleBtn = document.getElementById('riversToggleBtn');
  if (toggleBtn) {
    toggleBtn.classList.remove('active-tool');
    toggleBtn.addEventListener('click', () => {
      state.riversVisible = !state.riversVisible;
      state.riverLayers.forEach(layer => {
        if (state.riversVisible) {
          state.map.addLayer(layer);
        } else {
          state.map.removeLayer(layer);
        }
      });
      toggleBtn.classList.toggle('active-tool', state.riversVisible);
      showToast(state.riversVisible ? 'নদ-নদী ও মোহনা প্রদর্শিত হচ্ছে' : 'নদ-নদী লেয়ার বন্ধ করা হয়েছে');
    });
  }
}

// Map Layer Switcher
function setupLayerSwitcher() {
  const toggleBtn = document.getElementById('layersToggleBtn');
  const menu = document.getElementById('layersMenu');

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.classList.toggle('active');
  });

  document.addEventListener('click', () => {
    menu.classList.remove('active');
  });

  document.querySelectorAll('.layer-item').forEach(item => {
    item.addEventListener('click', () => {
      const layerKey = item.getAttribute('data-layer');
      if (state.layers[layerKey] && state.activeLayer !== state.layers[layerKey]) {
        state.map.removeLayer(state.activeLayer);
        state.activeLayer = state.layers[layerKey];
        state.activeLayer.addTo(state.map);

        // Ensure Mask stays on top of the tiles
        if (state.maskPolygon) {
          state.maskPolygon.bringToFront();
        }

        document.querySelectorAll('.layer-item').forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        showToast(`ম্যাপ ভিউ পরিবর্তন: ${item.querySelector('span').innerText}`);
      }
      menu.classList.remove('active');
    });
  });
}

// Thana & District Directory Sidebar
function setupThanaDirectory() {
  const toggleBtn = document.getElementById('thanaDirectoryToggleBtn');
  const panel = document.getElementById('thanaPanel');
  const closeBtn = document.getElementById('closeThanaPanelBtn');
  const divSelect = document.getElementById('divSelectDropdown');
  const searchInput = document.getElementById('thanaFilterInput');
  const container = document.getElementById('districtsAccordion');

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('active');
    // Close route panel if open
    document.getElementById('routePanel').classList.remove('active');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('active');
  });

  function renderDistricts(divFilter = 'all', searchQuery = '') {
    container.innerHTML = '';
    const query = searchQuery.trim().toLowerCase();

    const filtered = BD_DISTRICTS.filter(d => {
      const matchesDiv = divFilter === 'all' || d.div === divFilter;
      const matchesSearch = !query || 
        d.name.toLowerCase().includes(query) || 
        d.en.toLowerCase().includes(query) ||
        d.thanas.some(t => t.toLowerCase().includes(query));
      return matchesDiv && matchesSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="padding:16px; text-align:center; color:#64748b;">কোনো জেলা বা থানা পাওয়া যায়নি।</div>';
      return;
    }

    filtered.forEach(district => {
      const card = document.createElement('div');
      card.className = 'district-card';

      card.innerHTML = `
        <div class="district-header">
          <span class="dist-title">
            <i class="fa-solid fa-location-dot text-emerald"></i>
            ${district.name} জেলা (${district.en})
          </span>
          <span class="dist-count">${toBanglaNum(district.thanas.length)} টি থানা</span>
        </div>
        <div class="thanas-grid">
          ${district.thanas.map(thana => `
            <button class="thana-chip" data-district="${district.name}" data-thana="${thana}" data-lat="${district.lat}" data-lng="${district.lng}">
              ${thana}
            </button>
          `).join('')}
        </div>
      `;

      // Click on District Header flies to District Center
      card.querySelector('.district-header').addEventListener('click', () => {
        state.map.flyTo([district.lat, district.lng], 12, { duration: 1.5 });
        showThanaMarker(district.lat, district.lng, `${district.name} জেলা সদর`, `${district.name} জেলার সকল থানা ও ইউনিয়ন`);
      });

      // Click on Thana Chip
      card.querySelectorAll('.thana-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          e.stopPropagation();
          const thanaName = chip.getAttribute('data-thana');
          const distName = chip.getAttribute('data-district');
          
          // Search specific thana coordinates via Nominatim
          searchAndFlyToThana(`${thanaName}, ${distName}, Bangladesh`, thanaName, distName);
        });
      });

      container.appendChild(card);
    });
  }

  divSelect.addEventListener('change', () => {
    renderDistricts(divSelect.value, searchInput.value);
  });

  searchInput.addEventListener('input', () => {
    renderDistricts(divSelect.value, searchInput.value);
  });

  // Initial Render
  renderDistricts();
}

// Fly to specific Thana and show deep zoom
async function searchAndFlyToThana(fullQuery, thanaName, distName) {
  showToast(`${thanaName} থানায় যাওয়া হচ্ছে...`);
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&countrycodes=bd&format=json&limit=1`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      state.map.flyTo([lat, lng], 15, { duration: 1.5 });
      showThanaMarker(lat, lng, `${thanaName} থানা/উপজেলা`, `${distName} জেলা, বাংলাদেশ`);
    } else {
      // Fallback to district center
      const dist = BD_DISTRICTS.find(d => d.name === distName);
      if (dist) {
        state.map.flyTo([dist.lat, dist.lng], 13, { duration: 1.5 });
        showThanaMarker(dist.lat, dist.lng, `${thanaName} থানা`, `${distName} জেলা`);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

function showThanaMarker(lat, lng, title, details) {
  if (state.activeThanaMarker) state.map.removeLayer(state.activeThanaMarker);

  const icon = L.divIcon({
    className: 'custom-pin',
    html: `
      <div class="pin-pulse"></div>
      <div class="pin-core pin-thana">
        <i class="fa-solid fa-building-flag"></i>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42]
  });

  state.activeThanaMarker = L.marker([lat, lng], { icon }).addTo(state.map);
  state.activeThanaMarker.bindPopup(`
    <div class="bd-popup">
      <h4>${title}</h4>
      <p>${details}</p>
      <div class="popup-actions">
        <button class="popup-btn btn-a" onclick="setRoutePointFromMap('start', ${lat}, ${lng}, '${title.replace(/'/g, "\\'")}')">শুরু (A)</button>
        <button class="popup-btn btn-b" onclick="setRoutePointFromMap('end', ${lat}, ${lng}, '${title.replace(/'/g, "\\'")}')">গন্তব্য (B)</button>
      </div>
    </div>
  `).openPopup();
}

// Live Search for Any Place, Thana, Village, or River in Bangladesh
function setupSearch() {
  const input = document.getElementById('searchInput');
  const clearBtn = document.getElementById('clearSearchBtn');
  const resultsDiv = document.getElementById('searchResults');
  const searchBtn = document.getElementById('searchBtn');

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearBtn.style.display = query ? 'flex' : 'none';

    if (state.searchTimeout) clearTimeout(state.searchTimeout);

    if (query.length < 2) {
      resultsDiv.classList.remove('active');
      return;
    }

    state.searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 350);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    resultsDiv.classList.remove('active');
    if (state.searchMarker) {
      state.map.removeLayer(state.searchMarker);
      state.searchMarker = null;
    }
  });

  searchBtn.addEventListener('click', () => {
    if (input.value.trim()) performSearch(input.value.trim());
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && input.value.trim()) {
      performSearch(input.value.trim());
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container')) {
      resultsDiv.classList.remove('active');
    }
  });
}

async function performSearch(query) {
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<div class="search-loading"><i class="fa-solid fa-spinner fa-spin"></i> অনুসন্ধান করা হচ্ছে...</div>';
  resultsDiv.classList.add('active');

  const qLower = query.toLowerCase().trim();
  const localResults = [];

  // 1. Instant local search in 64 districts & 460+ thanas
  if (typeof BD_DISTRICTS !== 'undefined') {
    BD_DISTRICTS.forEach(d => {
      if (d.name.toLowerCase().includes(qLower) || d.en.toLowerCase().includes(qLower)) {
        localResults.push({
          display_name: `${d.name} (${d.en}), ${d.name} জেলা, বাংলাদেশ`,
          lat: d.lat,
          lon: d.lng,
          isLocal: true
        });
      }
      d.thanas.forEach(th => {
        if (th.toLowerCase().includes(qLower)) {
          localResults.push({
            display_name: `${th} থানা, ${d.name} জেলা, বাংলাদেশ`,
            lat: d.lat,
            lon: d.lng,
            isLocal: true,
            fullQuery: `${th}, ${d.name}, Bangladesh`
          });
        }
      });
    });
  }

  // 2. Fetch live Nominatim search with 6s timeout
  let onlineResults = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=bd&format=json&addressdetails=1&limit=6`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    onlineResults = await res.json();
  } catch (err) {
    console.warn('Search fetch error:', err);
  }

  const combined = [...localResults.slice(0, 4), ...(onlineResults || [])];
  const seen = new Set();
  const unique = combined.filter(item => {
    const name = item.display_name.split(',')[0].toLowerCase().trim();
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  });

  if (unique.length === 0) {
    resultsDiv.innerHTML = '<div class="search-empty">কোনো স্থান খুঁজে পাওয়া যায়নি। সঠিক নাম দিয়ে চেষ্টা করুন।</div>';
    return;
  }

  resultsDiv.innerHTML = '';
  unique.slice(0, 7).forEach(item => {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    
    const displayName = item.display_name.split(',')[0];
    const details = item.display_name.split(',').slice(1, 4).join(', ');

    div.innerHTML = `
      <i class="fa-solid fa-location-dot"></i>
      <div class="result-texts">
        <div class="result-main">${displayName}</div>
        <div class="result-sub">${details || 'বাংলাদেশ'}</div>
      </div>
    `;

    div.addEventListener('click', async () => {
      let lat = parseFloat(item.lat);
      let lon = parseFloat(item.lon);

      if (item.fullQuery) {
        try {
          const res2 = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(item.fullQuery)}&countrycodes=bd&format=json&limit=1`);
          const d2 = await res2.json();
          if (d2 && d2.length > 0) {
            lat = parseFloat(d2[0].lat);
            lon = parseFloat(d2[0].lon);
          }
        } catch (e) {}
      }

      selectSearchResult({
        lat: lat,
        lon: lon,
        display_name: item.display_name
      });
      resultsDiv.classList.remove('active');
    });

    resultsDiv.appendChild(div);
  });
}

function selectSearchResult(place) {
  const lat = parseFloat(place.lat);
  const lng = parseFloat(place.lon);
  const name = place.display_name.split(',')[0];

  document.getElementById('searchInput').value = name;
  state.map.flyTo([lat, lng], 15, { duration: 1.5 });

  if (state.searchMarker) state.map.removeLayer(state.searchMarker);

  const customIcon = L.divIcon({
    className: 'custom-pin',
    html: `
      <div class="pin-pulse"></div>
      <div class="pin-core pin-poi">
        <i class="fa-solid fa-star"></i>
      </div>
    `,
    iconSize: [32, 42],
    iconAnchor: [16, 42]
  });

  state.searchMarker = L.marker([lat, lng], { icon: customIcon }).addTo(state.map);
  
  const popupHtml = `
    <div class="bd-popup">
      <h4>${name}</h4>
      <p>${place.display_name}</p>
      <div class="popup-actions">
        <button class="popup-btn btn-a" onclick="setRoutePointFromMap('start', ${lat}, ${lng}, '${name.replace(/'/g, "\\'")}')">শুরু (A)</button>
        <button class="popup-btn btn-b" onclick="setRoutePointFromMap('end', ${lat}, ${lng}, '${name.replace(/'/g, "\\'")}')">গন্তব্য (B)</button>
      </div>
    </div>
  `;

  state.searchMarker.bindPopup(popupHtml).openPopup();
}

// Map Click Handler for Route & Measurement
function handleMapClick(e) {
  const { lat, lng } = e.latlng;

  // Measurement Tool Mode
  if (state.measureMode) {
    addMeasurePoint(lat, lng);
    return;
  }

  // If Live Navigation is Active:
  if (state.navTracking.active || state.navAnimation.active) {
    const coords = state.navTracking.coordinates || state.navAnimation.coordinates || [];
    let closestDistM = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < coords.length; i++) {
      const d = haversineDistance(lat, lng, coords[i][0], coords[i][1]) * 1000;
      if (d < closestDistM) {
        closestDistM = d;
        closestIdx = i;
      }
    }
    // If clicked along the route within 50 meters: move arrow there for testing and stand still!
    if (closestDistM <= 50 && coords.length > 0) {
      state.navTracking.currentCoordIndex = closestIdx;
      const targetPt = coords[closestIdx];
      const nextPt = coords[Math.min(coords.length - 1, closestIdx + 1)];
      const heading = getHeadingAngle(targetPt[0], targetPt[1], nextPt[0], nextPt[1]);
      state.navTracking.currentLatLng = [targetPt[0], targetPt[1]];
      state.navTracking.currentHeading = heading;
      updateLiveVehicleMarker(targetPt[0], targetPt[1], state.travelMode, heading);
      updateGpsMovementDisplay(false, 0);
      updateLiveTurnGuidance(targetPt[0], targetPt[1]);
      showToast(state.lang === 'bn' ? 'অ্যারো এই স্থানে অবস্থান নিয়েছে (দাঁড়িয়ে আছে)' : 'Arrow moved to this location (standing still)');
      return;
    }

    // Clicked off-route -> instant reroute to destination!
    handleOffRouteReroute(lat, lng);
    return;
  }

  // Route Selection Mode
  const routePanel = document.getElementById('routePanel');
  if (routePanel.classList.contains('active')) {
    if (!state.routePoints.start) {
      setRoutePointFromMap('start', lat, lng, `পয়েন্ট A (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      showToast(state.lang === 'bn' ? 'শুরুর স্থান নির্ধারিত হয়েছে। এবার গন্তব্য স্থানে ক্লিক করুন।' : 'Start point set. Now click destination point on map.');
    } else if (!state.routePoints.end) {
      setRoutePointFromMap('end', lat, lng, `পয়েন্ট B (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      calculateRoute();
    } else {
      setRoutePointFromMap('end', lat, lng, `পয়েন্ট B (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
      calculateRoute();
    }
  }
}

// Set Route Points from Coordinates
window.setRoutePointFromMap = function(pointType, lat, lng, name) {
  state.routePoints[pointType] = { lat, lng, name };
  const inputEl = document.getElementById(pointType === 'start' ? 'startInput' : 'endInput');
  inputEl.value = name;

  // Open Route Panel if not already open
  const routePanel = document.getElementById('routePanel');
  if (!routePanel.classList.contains('active')) {
    routePanel.classList.add('active');
  }

  updateRouteMarkers();
};

// Update Start and End Markers
function updateRouteMarkers() {
  state.routeMarkers.forEach(m => state.map.removeLayer(m));
  state.routeMarkers = [];

  if (state.routePoints.start) {
    const iconA = L.divIcon({
      className: 'custom-pin',
      html: `
        <div class="pin-pulse"></div>
        <div class="pin-core pin-start">
          <i class="fa-solid fa-play"></i>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42]
    });
    const markerA = L.marker([state.routePoints.start.lat, state.routePoints.start.lng], { icon: iconA })
      .bindPopup(`<b>শুরুর পয়েন্ট (A):</b> ${state.routePoints.start.name}`)
      .addTo(state.map);
    state.routeMarkers.push(markerA);
  }

  if (state.routePoints.end) {
    const iconB = L.divIcon({
      className: 'custom-pin',
      html: `
        <div class="pin-pulse"></div>
        <div class="pin-core pin-end">
          <i class="fa-solid fa-flag-checkered"></i>
        </div>
      `,
      iconSize: [32, 42],
      iconAnchor: [16, 42]
    });
    const markerB = L.marker([state.routePoints.end.lat, state.routePoints.end.lng], { icon: iconB })
      .bindPopup(`<b>গন্তব্য পয়েন্ট (B):</b> ${state.routePoints.end.name}`)
      .addTo(state.map);
    state.routeMarkers.push(markerB);
  }
}

// Resolve text to location coordinates if user typed without selecting
async function resolveLocationByName(query, pointType) {
  const cleanQ = query.trim().toLowerCase();
  
  // 1. Check local districts & thanas first
  for (const dist of BD_DISTRICTS) {
    if (dist.name.toLowerCase() === cleanQ || dist.en.toLowerCase() === cleanQ) {
      state.routePoints[pointType] = { lat: dist.lat, lng: dist.lng, name: `${dist.name} (${dist.en})` };
      updateRouteMarkers();
      return true;
    }
    for (const thana of dist.thanas) {
      if (thana.toLowerCase() === cleanQ || thana.toLowerCase().includes(cleanQ)) {
        state.routePoints[pointType] = { lat: dist.lat, lng: dist.lng, name: `${thana}, ${dist.name}` };
        updateRouteMarkers();
        return true;
      }
    }
  }

  // 2. Query Nominatim for accurate place coordinates
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=bd&format=json&limit=1`;
    const res = await fetch(url);
    const data = await res.json();
    if (data && data.length > 0) {
      const lat = parseFloat(data[0].lat);
      const lng = parseFloat(data[0].lon);
      const name = data[0].display_name.split(',')[0];
      state.routePoints[pointType] = { lat, lng, name };
      updateRouteMarkers();
      return true;
    }
  } catch (e) {
    console.error('Resolve error:', e);
  }
  return false;
}

// Calculate Route via OSRM API (Real Road Geometry & Distance)
async function calculateRoute() {
  const startInput = document.getElementById('startInput');
  const endInput = document.getElementById('endInput');

  // Auto-resolve typed text if user didn't click dropdown suggestion
  if (!state.routePoints.start && startInput.value.trim()) {
    showToast('শুরুর স্থান অনুসন্ধান করা হচ্ছে...');
    const ok = await resolveLocationByName(startInput.value.trim(), 'start');
    if (!ok) {
      showToast('শুরুর স্থান খুঁজে পাওয়া যায়নি। তালিকা থেকে সিলেক্ট করুন।');
      return;
    }
  }

  if (!state.routePoints.end && endInput.value.trim()) {
    showToast('গন্তব্য স্থান অনুসন্ধান করা হচ্ছে...');
    const ok = await resolveLocationByName(endInput.value.trim(), 'end');
    if (!ok) {
      showToast('গন্তব্য স্থান খুঁজে পাওয়া যায়নি। তালিকা থেকে সিলেক্ট করুন।');
      return;
    }
  }

  const { start, end } = state.routePoints;
  if (!start || !end) {
    showToast('দয়া করে শুরু ও গন্তব্য উভয় স্থান নির্বাচন করুন!');
    return;
  }

  const calcBtn = document.getElementById('calculateRouteBtn');
  calcBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> হিসেব করা হচ্ছে...';
  calcBtn.disabled = true;

  try {
    // We use driving profile on OSRM to get true Bangladesh road geometry and distance
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7500);
    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      renderHaversineFallback(start, end);
      return;
    }

    const route = data.routes[0];
    const distanceKm = (route.distance / 1000).toFixed(1);

    document.getElementById('resDistance').innerText = `${toBanglaNum(distanceKm)} কিমি`;
    document.getElementById('resStartName').innerText = start.name;
    document.getElementById('resEndName').innerText = end.name;
    document.getElementById('routeResultsCard').style.display = 'flex';

    // Update Realistic Times for all modes (Driving, Bike, Walking)
    updateAllModeTimes(distanceKm);

    if (state.routePolyline) state.map.removeLayer(state.routePolyline);

    const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
    
    // Save route coordinates & steps for live animation simulation
    state.navAnimation.coordinates = coordinates;
    state.navAnimation.steps = route.legs[0].steps || [];
    state.navAnimation.totalDistanceKm = parseFloat(distanceKm);

    if (state.routePolyline) state.map.removeLayer(state.routePolyline);

    // Dynamic style based on travel mode
    let routeColor = '#059669';
    let dashPattern = null;
    if (state.travelMode === 'bike') {
      routeColor = '#f59e0b';
    } else if (state.travelMode === 'train') {
      routeColor = '#0284c7';
      dashPattern = '12, 6'; // Rail tracks dash style
    }

    state.routePolyline = L.polyline(coordinates, {
      color: routeColor,
      weight: 6,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
      dashArray: dashPattern
    }).addTo(state.map);

    state.map.fitBounds(state.routePolyline.getBounds(), { padding: [60, 60] });
    renderStepsList(route.legs[0].steps);

    // Draw directional flow arrows along the shortest path
    renderRouteDirectionArrows(coordinates, state.travelMode);

    showToast(state.lang === 'bn' 
      ? `সর্বনিম্ন দূরত্বের সেরা রুট তৈরি হয়েছে! দূরত্ব: ${toBanglaNum(distanceKm)} কিমি` 
      : `Shortest route calculated! Distance: ${toBanglaNum(distanceKm)} km`);

  } catch (err) {
    console.error('Route error:', err);
    renderHaversineFallback(start, end);
  } finally {
    calcBtn.innerHTML = `<i class="fa-solid fa-diamond-turn-right"></i> <span>${state.lang === 'en' ? 'Find Shortest Route & Directions' : 'সর্বনিম্ন রুট ও দিকনির্দেশনা দেখুন'}</span>`;
    calcBtn.disabled = false;
  }
}

// Calculate Real-World Bangladesh Travel Time based on Distance & Mode (Car, Bike, Train)
function calculateRealisticTravelTime(distanceKm, mode) {
  const d = parseFloat(distanceKm);
  if (isNaN(d) || d <= 0) return { minutes: 0, text: state.lang === 'en' ? '0 mins' : '০ মিনিট' };

  let totalMinutes = 0;

  if (mode === 'train') {
    // Bangladesh Railway Express Train speed model:
    // Average cruising speed 65 km/h + station stops
    const railMinutes = (d / 65) * 60;
    const stops = Math.min(60, 15 + Math.floor(d / 45) * 6);
    totalMinutes = Math.round(railMinutes + stops);
  } else if (mode === 'bike') {
    // Motorcycle: can bypass city bottlenecks, cruises at 58 km/h on regional/highway
    if (d <= 10) {
      totalMinutes = Math.round((d / 30) * 60) + 3;
    } else {
      const cityTime = (10 / 30) * 60;
      const highwayTime = ((d - 10) / 58) * 60;
      totalMinutes = Math.round(cityTime + highwayTime) + 6;
    }
  } else {
    // Driving (Car / Bus / Microbus in Bangladesh road traffic conditions)
    if (d <= 12) {
      totalMinutes = Math.round((d / 20) * 60) + 5;
    } else {
      const cityTime = (12 / 20) * 60;
      const highwayTime = ((d - 12) / 45) * 60;
      const buffer = d > 50 ? 15 : 8; // Toll plaza & highway traffic factor
      totalMinutes = Math.round(cityTime + highwayTime + buffer);
    }
  }

  return {
    minutes: totalMinutes,
    text: formatMinutesToBangla(totalMinutes)
  };
}

// Format duration minutes to text (minutes, hours, or days) with bilingual support
function formatMinutesToBangla(totalMinutes) {
  const isEn = state.lang === 'en';
  if (totalMinutes < 60) {
    return isEn ? `${formatNumber(totalMinutes)} mins` : `${formatNumber(totalMinutes)} মিনিট`;
  } else if (totalMinutes < 1440) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (mins === 0) return isEn ? `${formatNumber(hours)} hrs` : `${formatNumber(hours)} ঘণ্টা`;
    return isEn ? `${formatNumber(hours)} hrs ${formatNumber(mins)} mins` : `${formatNumber(hours)} ঘণ্টা ${formatNumber(mins)} মিনিট`;
  } else {
    const days = Math.floor(totalMinutes / 1440);
    const remainingMins = totalMinutes % 1440;
    const hours = Math.floor(remainingMins / 60);
    if (hours === 0) return isEn ? `${formatNumber(days)} days` : `${formatNumber(days)} দিন`;
    return isEn ? `${formatNumber(days)} days ${formatNumber(hours)} hrs` : `${formatNumber(days)} দিন ${formatNumber(hours)} ঘণ্টা`;
  }
}

// Update all 3 Mode Times simultaneously in the UI (Car, Bike, Train)
function updateAllModeTimes(distanceKm) {
  state.lastCalculatedDistanceKm = distanceKm;

  const carData = calculateRealisticTravelTime(distanceKm, 'driving');
  const bikeData = calculateRealisticTravelTime(distanceKm, 'bike');
  const trainData = calculateRealisticTravelTime(distanceKm, 'train');

  const elCar = document.getElementById('timeCar');
  if (elCar) elCar.innerText = carData.text;

  const elBike = document.getElementById('timeBike');
  if (elBike) elBike.innerText = bikeData.text;

  const elTrain = document.getElementById('timeTrain');
  if (elTrain) elTrain.innerText = trainData.text;

  // Save for animation HUD
  if (state.travelMode === 'train') {
    state.navAnimation.totalMinutes = trainData.minutes;
  } else if (state.travelMode === 'bike') {
    state.navAnimation.totalMinutes = bikeData.minutes;
  } else {
    state.navAnimation.totalMinutes = carData.minutes;
  }

  // Update Main Display
  const resTime = document.getElementById('resTime');
  const resTimeLabel = document.getElementById('resTimeLabel');

  if (state.travelMode === 'train') {
    if (resTime) resTime.innerText = trainData.text;
    if (resTimeLabel) resTimeLabel.innerText = 'ট্রেনে সময় (Train Time)';
  } else if (state.travelMode === 'bike') {
    if (resTime) resTime.innerText = bikeData.text;
    if (resTimeLabel) resTimeLabel.innerText = 'বাইকে সময় (Bike Time)';
  } else {
    if (resTime) resTime.innerText = carData.text;
    if (resTimeLabel) resTimeLabel.innerText = 'গাড়িতে সময় (Car Time)';
  }

  // Sync Active Mode Chips & Buttons
  document.querySelectorAll('.mode-time-chip').forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-mode') === state.travelMode);
  });
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === state.travelMode);
  });
}

// Fallback straight-line distance if network fails
function renderHaversineFallback(start, end) {
  const dist = haversineDistance(start.lat, start.lng, end.lat, end.lng).toFixed(1);

  document.getElementById('resDistance').innerText = `~${toBanglaNum(dist)} কিমি (সরলরেখা)`;
  document.getElementById('resStartName').innerText = start.name;
  document.getElementById('resEndName').innerText = end.name;
  document.getElementById('routeResultsCard').style.display = 'flex';

  updateAllModeTimes(dist);

  if (state.routePolyline) state.map.removeLayer(state.routePolyline);
  state.routePolyline = L.polyline([[start.lat, start.lng], [end.lat, end.lng]], {
    color: '#0284c7',
    dashArray: '8, 8',
    weight: 4
  }).addTo(state.map);

  state.map.fitBounds(state.routePolyline.getBounds(), { padding: [50, 50] });
  renderStepsList([]);
  showToast('সড়ক নেটওয়ার্ক অনুপলব্ধ থাকায় সরাসরি সরলরেখা দূরত্ব দেখানো হচ্ছে।');
}

// Render Turn-by-Turn Steps
function renderStepsList(steps) {
  const listEl = document.getElementById('stepsList');
  listEl.innerHTML = '';

  if (!steps || steps.length === 0) {
    listEl.innerHTML = '<div class="step-item">নদী বা প্রাকৃতিক ভূগোলের কারণে সরাসরি মোটর সড়ক রুট অনুপলব্ধ। সরলরেখা অনুসরণ করুন।</div>';
    return;
  }

  steps.forEach((step, index) => {
    if (!step.maneuver) return;
    const item = document.createElement('div');
    item.className = 'step-item';
    const dist = (step.distance / 1000).toFixed(2);
    const instruction = step.maneuver.instruction || step.name || `ধাপ ${index + 1}`;
    
    item.innerHTML = `
      <span>${toBanglaNum(index + 1)}. ${instruction}</span>
      <span class="step-dist">${toBanglaNum(dist)} কিমি</span>
    `;
    listEl.appendChild(item);
  });
}

// Haversine Distance Formula
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Setup Route UI Handlers
function setupRouteUI() {
  const toggleBtn = document.getElementById('routeModeToggleBtn');
  const panel = document.getElementById('routePanel');
  const closeBtn = document.getElementById('closeRoutePanelBtn');
  const clearBtn = document.getElementById('clearRouteBtn');
  const calcBtn = document.getElementById('calculateRouteBtn');
  const swapBtn = document.getElementById('swapPointsBtn');
  const currentLocBtn = document.getElementById('useCurrentLocationStart');
  const toggleStepsBtn = document.getElementById('toggleStepsBtn');

  toggleBtn.addEventListener('click', () => {
    panel.classList.toggle('active');
    document.getElementById('thanaPanel').classList.remove('active');
  });

  closeBtn.addEventListener('click', () => {
    panel.classList.remove('active');
  });

  clearBtn.addEventListener('click', () => {
    stopLiveNavigation(true);
    state.routePoints.start = null;
    state.routePoints.end = null;
    state.lastCalculatedDistanceKm = null;
    document.getElementById('startInput').value = '';
    document.getElementById('endInput').value = '';
    document.getElementById('routeResultsCard').style.display = 'none';

    const startDrop = document.getElementById('startSuggestions');
    if (startDrop) { startDrop.classList.remove('active'); startDrop.innerHTML = ''; }
    const endDrop = document.getElementById('endSuggestions');
    if (endDrop) { endDrop.classList.remove('active'); endDrop.innerHTML = ''; }

    if (state.routePolyline) {
      state.map.removeLayer(state.routePolyline);
      state.routePolyline = null;
    }
    if (state.routeArrowMarkers) {
      state.routeArrowMarkers.forEach(m => state.map.removeLayer(m));
      state.routeArrowMarkers = [];
    }
    state.routeMarkers.forEach(m => state.map.removeLayer(m));
    state.routeMarkers = [];
    showToast(state.lang === 'bn' ? 'রুট ও দূরত্ব রিসেট করা হয়েছে।' : 'Route and distances reset.');
  });

  calcBtn.addEventListener('click', calculateRoute);

  swapBtn.addEventListener('click', () => {
    const temp = state.routePoints.start;
    state.routePoints.start = state.routePoints.end;
    state.routePoints.end = temp;

    const startVal = document.getElementById('startInput').value;
    document.getElementById('startInput').value = document.getElementById('endInput').value;
    document.getElementById('endInput').value = startVal;

    const startDrop = document.getElementById('startSuggestions');
    if (startDrop) startDrop.classList.remove('active');
    const endDrop = document.getElementById('endSuggestions');
    if (endDrop) endDrop.classList.remove('active');

    updateRouteMarkers();
    if (state.routePoints.start && state.routePoints.end) {
      calculateRoute();
    }
  });

  currentLocBtn.addEventListener('click', () => {
    getUserLocation((lat, lng) => {
      setRoutePointFromMap('start', lat, lng, state.lang === 'bn' ? 'আমার বর্তমান লোকেশন' : 'My Current Location');
      showToast(state.lang === 'bn' ? 'বর্তমান লোকেশন শুরুর পয়েন্ট হিসেবে সেট করা হয়েছে!' : 'Current location set as starting point!');
    });
  });

  function setTravelMode(mode) {
    state.travelMode = mode;
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
    document.querySelectorAll('.mode-time-chip').forEach(c => {
      c.classList.toggle('active', c.getAttribute('data-mode') === mode);
    });

    // If live navigation is active, update vehicle style and HUD immediately
    if (state.navAnimation.active) {
      updateNavModeHUD();
      if (state.navAnimation.coordinates.length > 0) {
        const currCoord = state.navAnimation.coordinates[state.navAnimation.currentIndex || 0];
        updateLiveVehicleMarker(currCoord[0], currCoord[1], state.travelMode);
      }
    }

    if (state.lastCalculatedDistanceKm) {
      updateAllModeTimes(state.lastCalculatedDistanceKm);
    } else if (state.routePoints.start && state.routePoints.end) {
      calculateRoute();
    }
  }

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setTravelMode(btn.getAttribute('data-mode'));
    });
  });

  document.querySelectorAll('.mode-time-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      setTravelMode(chip.getAttribute('data-mode'));
    });
  });

  toggleStepsBtn.addEventListener('click', () => {
    const stepsList = document.getElementById('stepsList');
    const icon = toggleStepsBtn.querySelector('.toggle-icon');
    if (stepsList.style.display === 'none') {
      stepsList.style.display = 'flex';
      icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
      stepsList.style.display = 'none';
      icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
  });

  document.querySelectorAll('.pop-route-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const fromName = chip.getAttribute('data-from');
      const toName = chip.getAttribute('data-to');

      const fromData = POPULAR_LOCATIONS[fromName];
      const toData = POPULAR_LOCATIONS[toName];

      if (fromData && toData) {
        setRoutePointFromMap('start', fromData.lat, fromData.lng, fromData.name);
        setRoutePointFromMap('end', toData.lat, toData.lng, toData.name);
        calculateRoute();
      }
    });
  });

  // Dedicated "কোথায় যেতে চান?" (Where to go?) Button Handlers (Header & Floating)
  const openWhereToGoPanel = () => {
    panel.classList.add('active');
    document.getElementById('thanaPanel')?.classList.remove('active');
    document.getElementById('mobileRouteBtn')?.classList.add('active');
    setTimeout(() => {
      const sInput = document.getElementById('startInput');
      if (sInput) {
        sInput.focus();
        sInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  };

  document.getElementById('whereToGoBtn')?.addEventListener('click', openWhereToGoPanel);
  document.getElementById('floatingWhereToGoBtn')?.addEventListener('click', openWhereToGoPanel);

  // Live Real-Time Navigation Control Event Listeners
  const startLiveNavBtn = document.getElementById('startLiveNavBtn');
  if (startLiveNavBtn) {
    startLiveNavBtn.addEventListener('click', startLiveNavigation);
  }

  const closeLiveNavBtn = document.getElementById('closeLiveNavBtn');
  if (closeLiveNavBtn) {
    closeLiveNavBtn.addEventListener('click', () => stopLiveNavigation(true));
  }

  // Manual Step Forward Button (+50m per click for testing)
  const navStepForwardBtn = document.getElementById('navStepForwardBtn');
  if (navStepForwardBtn) {
    navStepForwardBtn.addEventListener('click', stepForwardManually);
  }

  // Reroute Button in Live Navigation Dock
  const rerouteNavBtn = document.getElementById('rerouteNavBtn');
  if (rerouteNavBtn) {
    rerouteNavBtn.addEventListener('click', () => {
      if (state.navTracking.active && state.navTracking.currentLatLng) {
        handleOffRouteReroute(state.navTracking.currentLatLng[0], state.navTracking.currentLatLng[1]);
      } else if (state.routePoints.start && state.routePoints.end) {
        calculateRoute();
      } else {
        showToast(state.lang === 'bn' ? 'নেভিগেশন চলাকালে অন্য রাস্তায় গেলে রিরুট সক্রিয় হবে' : 'Reroute activates when deviating from route during navigation');
      }
    });
  }

  // Enable Live Autocomplete Dropdown for Point A and Point B
  setupWaypointAutocomplete('startInput', 'startSuggestions', 'start');
  setupWaypointAutocomplete('endInput', 'endSuggestions', 'end');
}

// ==========================================
// LIVE MOVING NAVIGATION SIMULATION ENGINE
// ==========================================

// Calculate Heading / Bearing angle (0-360 deg) between two geographic points
function getHeadingAngle(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// Render Directional Flow Arrows Along Route Polyline
function renderRouteDirectionArrows(coordinates, mode = 'driving') {
  if (state.routeArrowMarkers) {
    state.routeArrowMarkers.forEach(m => state.map.removeLayer(m));
  }
  state.routeArrowMarkers = [];

  if (!coordinates || coordinates.length < 4) return;

  let arrowClass = 'flow-arrow-car';
  if (mode === 'bike') arrowClass = 'flow-arrow-bike';
  else if (mode === 'train') arrowClass = 'flow-arrow-train';

  const totalPts = coordinates.length;
  // Distribute 8 to 22 arrows along the route based on length
  const numArrows = Math.min(22, Math.max(6, Math.floor(totalPts / 18)));
  const step = Math.max(4, Math.floor(totalPts / numArrows));

  for (let i = step; i < totalPts - 2; i += step) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const angle = getHeadingAngle(p1[0], p1[1], p2[0], p2[1]);

    const icon = L.divIcon({
      className: `route-flow-arrow ${arrowClass}`,
      html: `
        <div class="route-flow-arrow-inner" style="transform: rotate(${angle}deg);">
          <i class="fa-solid fa-chevron-up"></i>
        </div>
      `,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });

    const arrowMarker = L.marker([p1[0], p1[1]], { icon, interactive: false, zIndexOffset: 300 }).addTo(state.map);
    state.routeArrowMarkers.push(arrowMarker);
  }
}

// Dynamic Off-Route Automatic Recalculation (অন্য রাস্তায় গেলে রিরুট)
async function handleOffRouteReroute(newLat, newLng) {
  if (!state.routePoints.end) return;

  const rerouteBar = document.getElementById('navRerouteBar');
  if (rerouteBar) rerouteBar.style.display = 'flex';

  showToast(state.lang === 'bn' 
    ? '⚠️ রুট পরিবর্তন শনাক্ত! নতুন শর্টেস্ট রুট হিসাব হচ্ছে...' 
    : '⚠️ Off-route detected! Calculating new shortest route...');

  // Set new starting point to current position
  state.routePoints.start = {
    lat: newLat,
    lng: newLng,
    name: state.lang === 'bn' ? 'বর্তমান অবস্থান (রিরুট)' : 'Current Position (Reroute)'
  };
  const startInput = document.getElementById('startInput');
  if (startInput) startInput.value = state.routePoints.start.name;

  try {
    const end = state.routePoints.end;
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${newLng},${newLat};${end.lng},${end.lat}?overview=full&geometries=geojson&steps=true`;
    
    const res = await fetch(osrmUrl);
    const data = await res.json();

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const newCoords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);

      state.navAnimation.coordinates = newCoords;
      state.navAnimation.steps = route.legs[0].steps || [];
      state.navAnimation.totalDistanceKm = parseFloat(distanceKm);
      state.navAnimation.currentIndex = 0;

      state.navTracking.coordinates = newCoords;
      state.navTracking.steps = route.legs[0].steps || [];
      state.navTracking.totalDistanceKm = parseFloat(distanceKm);
      state.navTracking.currentCoordIndex = 0;
      state.navTracking.currentStepIndex = 0;
      state.navTracking.currentLatLng = [newLat, newLng];

      // Update Polyline
      if (state.routePolyline) state.map.removeLayer(state.routePolyline);

      let routeColor = '#059669';
      let dashPattern = null;
      if (state.travelMode === 'bike') routeColor = '#f59e0b';
      else if (state.travelMode === 'train') {
        routeColor = '#0284c7';
        dashPattern = '12, 6';
      }

      state.routePolyline = L.polyline(newCoords, {
        color: routeColor,
        weight: 6,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: dashPattern
      }).addTo(state.map);

      // Redraw directional flow arrows along new path
      renderRouteDirectionArrows(newCoords, state.travelMode);

      // Update travel times
      updateAllModeTimes(distanceKm);

      // Update vehicle marker position
      if (newCoords.length > 1) {
        const nextPt = newCoords[1];
        const heading = getHeadingAngle(newCoords[0][0], newCoords[0][1], nextPt[0], nextPt[1]);
        state.navTracking.currentHeading = heading;
        updateLiveVehicleMarker(newCoords[0][0], newCoords[0][1], state.travelMode, heading);
      }

      // Update Top Guidance Bar with new route and measured distance
      updateLiveTurnGuidance(newLat, newLng);
      updateRemainingTripMetrics(newLat, newLng);

      state.map.panTo([newLat, newLng], { animate: true, duration: 0.5 });

      showToast(state.lang === 'bn' 
        ? `✅ নতুন শর্টেস্ট রুট কার্যকর হয়েছে! দূরত্ব: ${toBanglaNum(distanceKm)} কিমি` 
        : `✅ New shortest route active! Distance: ${toBanglaNum(distanceKm)} km`);
    }
  } catch (err) {
    console.warn('Reroute error:', err);
  } finally {
    setTimeout(() => {
      if (rerouteBar) rerouteBar.style.display = 'none';
    }, 2200);
  }
}

// Create Custom Vehicle Marker on Map with Radar Halo & Directional Navigation Arrow
function createLiveVehicleMarker(lat, lng, mode, heading = 0) {
  let modeClass = 'vehicle-car';
  let iconHtml = '<i class="fa-solid fa-car"></i>';
  let arrowStroke = '#059669';
  if (mode === 'bike') {
    modeClass = 'vehicle-bike';
    iconHtml = '<i class="fa-solid fa-motorcycle"></i>';
    arrowStroke = '#f59e0b';
  } else if (mode === 'train') {
    modeClass = 'vehicle-train';
    iconHtml = '<i class="fa-solid fa-train-subway"></i>';
    arrowStroke = '#0284c7';
  }

  const divIcon = L.divIcon({
    className: `live-vehicle-marker ${modeClass}`,
    html: `
      <div class="live-vehicle-halo"></div>
      <div class="live-nav-arrow-pointer" style="transform: rotate(${heading}deg);">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <polygon points="12,2 22,22 12,17 2,22" fill="#ffffff" stroke="${arrowStroke}" stroke-width="1.8" />
        </svg>
      </div>
      <div class="live-vehicle-core" style="transform: rotate(${heading}deg);">
        ${iconHtml}
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });

  return L.marker([lat, lng], { icon: divIcon, zIndexOffset: 2500 });
}

// Update Existing Vehicle Marker's Position, Heading & Mode
function updateLiveVehicleMarker(lat, lng, mode, heading = 0) {
  if (!state.navAnimation.marker) {
    state.navAnimation.marker = createLiveVehicleMarker(lat, lng, mode, heading).addTo(state.map);
    return;
  }

  state.navAnimation.marker.setLatLng([lat, lng]);

  let modeClass = 'vehicle-car';
  let iconHtml = '<i class="fa-solid fa-car"></i>';
  let arrowStroke = '#059669';
  if (mode === 'bike') {
    modeClass = 'vehicle-bike';
    iconHtml = '<i class="fa-solid fa-motorcycle"></i>';
    arrowStroke = '#f59e0b';
  } else if (mode === 'train') {
    modeClass = 'vehicle-train';
    iconHtml = '<i class="fa-solid fa-train-subway"></i>';
    arrowStroke = '#0284c7';
  }

  const icon = L.divIcon({
    className: `live-vehicle-marker ${modeClass}`,
    html: `
      <div class="live-vehicle-halo"></div>
      <div class="live-nav-arrow-pointer" style="transform: rotate(${heading}deg);">
        <svg viewBox="0 0 24 24" width="18" height="18">
          <polygon points="12,2 22,22 12,17 2,22" fill="#ffffff" stroke="${arrowStroke}" stroke-width="1.8" />
        </svg>
      </div>
      <div class="live-vehicle-core" style="transform: rotate(${heading}deg);">
        ${iconHtml}
      </div>
    `,
    iconSize: [42, 42],
    iconAnchor: [21, 21]
  });
  state.navAnimation.marker.setIcon(icon);
}

// ==========================================
// REAL-TIME GPS NAVIGATION ENGINE
// The arrow strictly tracks real user location!
// When the user stands still, the arrow stands still.
// ==========================================

// Start Live Turn-by-Turn GPS Navigation
function startLiveNavigation() {
  const coords = state.navAnimation.coordinates;
  if (!coords || coords.length < 2) {
    showToast(state.lang === 'bn' 
      ? 'প্রথমে শুরু ও গন্তব্য স্থান সিলেক্ট করে রুট বের করুন!' 
      : 'Please select start & destination to find a route first!');
    return;
  }

  // Close Route panel on mobile/screen to leave map unobstructed
  const routePanel = document.getElementById('routePanel');
  if (routePanel) {
    routePanel.classList.remove('active');
    document.getElementById('mobileRouteBtn')?.classList.remove('active');
  }

  // Show Top Guidance Banner and Bottom Dock
  const topBanner = document.getElementById('turnGuidanceBanner');
  if (topBanner) topBanner.style.display = 'flex';
  const bottomDock = document.getElementById('navBottomDock');
  if (bottomDock) bottomDock.style.display = 'flex';

  // Initialize navigation tracking state
  state.navTracking.active = true;
  state.navAnimation.active = true;
  state.navTracking.coordinates = coords;
  state.navTracking.steps = state.navAnimation.steps || [];
  state.navTracking.totalDistanceKm = state.navAnimation.totalDistanceKm || 0;
  state.navTracking.totalMinutes = state.navAnimation.totalMinutes || 0;
  state.navTracking.currentCoordIndex = 0;
  state.navTracking.currentStepIndex = 0;
  state.navTracking.isMoving = false;
  state.navTracking.speedKmh = 0;

  // Clear any existing animation interval (Arrow NEVER auto-moves!)
  if (state.navAnimation.intervalId) {
    clearInterval(state.navAnimation.intervalId);
    state.navAnimation.intervalId = null;
  }

  // Initial user position at route start
  const startPt = coords[0];
  const nextPt = coords[1];
  const initialHeading = getHeadingAngle(startPt[0], startPt[1], nextPt[0], nextPt[1]);
  state.navTracking.currentLatLng = [startPt[0], startPt[1]];
  state.navTracking.currentHeading = initialHeading;

  // Create or update vehicle marker at start point
  if (state.navAnimation.marker) {
    state.map.removeLayer(state.navAnimation.marker);
    state.navAnimation.marker = null;
  }
  updateLiveVehicleMarker(startPt[0], startPt[1], state.travelMode, initialHeading);

  // Zoom into user position
  state.map.setView([startPt[0], startPt[1]], Math.max(state.map.getZoom(), 16), { animate: true });

  // Update status badge to "দাঁড়িয়ে আছেন (০ কিমি/ঘণ্টা)"
  updateGpsMovementDisplay(false, 0);

  // Update top turn guidance with initial step & live measured meters
  updateLiveTurnGuidance(startPt[0], startPt[1]);

  // Update remaining trip metrics in bottom dock
  updateRemainingTripMetrics(startPt[0], startPt[1]);

  // START REAL GPS TRACKING: Arrow only moves when user physically moves!
  if (navigator.geolocation) {
    if (state.navTracking.watchId !== null) {
      navigator.geolocation.clearWatch(state.navTracking.watchId);
    }
    state.navTracking.watchId = navigator.geolocation.watchPosition(
      onGpsPositionUpdate,
      onGpsPositionError,
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );
  }

  showToast(state.lang === 'bn' 
    ? 'লাইভ নেভিগেশন চালু হয়েছে! আপনি যেখানে যাবেন কেবল সেখানেই অ্যারো যাবে।' 
    : 'Live navigation active! The arrow follows only your real movement.');
}

// GPS Position Update Callback: Triggered ONLY when physical location changes
function onGpsPositionUpdate(pos) {
  if (!state.navTracking.active) return;

  const newLat = pos.coords.latitude;
  const newLng = pos.coords.longitude;
  const rawSpeed = pos.coords.speed;
  const rawHeading = pos.coords.heading;

  const prevCoord = state.navTracking.currentLatLng;
  let distMovedMeters = 0;
  if (prevCoord) {
    distMovedMeters = Math.round(haversineDistance(prevCoord[0], prevCoord[1], newLat, newLng) * 1000);
  }

  // If user has not moved at least 3 meters: STAND STILL!
  // "user daray thakle arrow o daray thakbe"
  if (distMovedMeters < 3) {
    state.navTracking.isMoving = false;
    state.navTracking.speedKmh = 0;
    updateGpsMovementDisplay(false, 0);
    return; // Stand completely still!
  }

  // User physically moved!
  state.navTracking.isMoving = true;
  let speedKmh = 0;
  if (rawSpeed && rawSpeed > 0) {
    speedKmh = Math.round(rawSpeed * 3.6);
  } else {
    speedKmh = Math.min(110, Math.max(5, Math.round(distMovedMeters * 2.2)));
  }
  state.navTracking.speedKmh = speedKmh;
  updateGpsMovementDisplay(true, speedKmh);

  // Calculate heading
  let heading = state.navTracking.currentHeading;
  if (rawHeading && !isNaN(rawHeading) && rawHeading >= 0) {
    heading = rawHeading;
  } else if (prevCoord) {
    heading = getHeadingAngle(prevCoord[0], prevCoord[1], newLat, newLng);
  }
  state.navTracking.currentHeading = heading;
  state.navTracking.currentLatLng = [newLat, newLng];

  // Update vehicle marker on map
  updateLiveVehicleMarker(newLat, newLng, state.travelMode, heading);
  state.map.panTo([newLat, newLng], { animate: true, duration: 0.4 });

  // Update Top Guidance Bar with live measured meters
  updateLiveTurnGuidance(newLat, newLng);

  // Check if off-route (> 60m from route polyline) -> auto reroute
  checkAndHandleOffRoute(newLat, newLng);
}

// GPS Error Callback
function onGpsPositionError(err) {
  console.warn('GPS location tracking error:', err);
  updateGpsMovementDisplay(false, 0);
}

// Update GPS Movement Status Indicator in Bottom Dock
function updateGpsMovementDisplay(isMoving, speedKmh = 0) {
  const dot = document.getElementById('gpsStatusDot');
  const txt = document.getElementById('navLiveGpsStatus');
  if (!dot || !txt) return;

  if (isMoving && speedKmh > 0) {
    dot.className = 'gps-dot moving';
    txt.innerText = state.lang === 'bn' 
      ? `চলমান (${formatNumber(speedKmh)} কিমি/ঘণ্টা)` 
      : `Moving (${formatNumber(speedKmh)} km/h)`;
  } else {
    dot.className = 'gps-dot stationary';
    txt.innerText = state.lang === 'bn' 
      ? 'দাঁড়িয়ে আছেন (০ কিমি/ঘণ্টা)' 
      : 'Stationary (0 km/h)';
  }
}

// Update Real-Time Top Guidance Banner with Measured Meters and Road Turn
function updateLiveTurnGuidance(userLat, userLng) {
  const steps = state.navTracking.steps;
  const turnBanner = document.getElementById('turnGuidanceBanner');
  if (!turnBanner || !steps || steps.length === 0) return;

  const distEl = document.getElementById('turnDistanceMeters');
  const actionEl = document.getElementById('turnInstructionText');
  const roadEl = document.getElementById('turnRoadName');
  const iconWrap = document.getElementById('turnIconWrap');
  const iconEl = document.getElementById('turnManeuverIcon');

  let currentIdx = state.navTracking.currentStepIndex || 0;
  if (currentIdx >= steps.length) {
    // Reached destination!
    if (distEl) distEl.innerText = state.lang === 'bn' ? 'গন্তব্যে পৌঁছেছেন!' : 'Arrived!';
    if (actionEl) actionEl.innerText = state.lang === 'bn' ? 'যাত্রা সমাপ্ত' : 'Trip Complete';
    if (roadEl) roadEl.innerText = state.routePoints.end ? state.routePoints.end.name : '';
    if (iconEl) iconEl.className = 'fa-solid fa-flag-checkered';
    if (iconWrap) iconWrap.style.background = '#10b981';
    return;
  }

  let step = steps[currentIdx];
  let maneuverLoc = step.maneuver && step.maneuver.location 
    ? [step.maneuver.location[1], step.maneuver.location[0]]
    : null;

  // Calculate live distance in meters from user coordinate to this step's maneuver point
  let metersToTurn = 500;
  if (maneuverLoc) {
    metersToTurn = Math.round(haversineDistance(userLat, userLng, maneuverLoc[0], maneuverLoc[1]) * 1000);
  } else {
    metersToTurn = Math.round(step.distance || 500);
  }

  // If user reached within 25 meters of this turn, advance to next turn!
  if (metersToTurn <= 25 && currentIdx < steps.length - 1) {
    state.navTracking.currentStepIndex++;
    currentIdx = state.navTracking.currentStepIndex;
    step = steps[currentIdx];
    if (step.maneuver && step.maneuver.location) {
      maneuverLoc = [step.maneuver.location[1], step.maneuver.location[0]];
      metersToTurn = Math.round(haversineDistance(userLat, userLng, maneuverLoc[0], maneuverLoc[1]) * 1000);
    }
  }

  // Format the distance in meters / kilometers
  if (metersToTurn <= 25) {
    if (distEl) distEl.innerText = state.lang === 'bn' ? 'এখনই মোড় নিন!' : 'Turn Now!';
  } else if (metersToTurn < 1000) {
    if (distEl) distEl.innerText = `${formatNumber(metersToTurn)} ${state.lang === 'bn' ? 'মিটার পর' : 'm'}`;
  } else {
    const km = (metersToTurn / 1000).toFixed(1);
    if (distEl) distEl.innerText = `${formatNumber(km)} ${state.lang === 'bn' ? 'কিমি পর' : 'km'}`;
  }

  // Extract turn direction instruction & icon
  const type = (step.maneuver && step.maneuver.type) || '';
  const modifier = (step.maneuver && step.maneuver.modifier) || '';
  let instructionText = state.lang === 'bn' ? 'সোজা চলুন' : 'Keep Straight';
  let iconClass = 'fa-solid fa-arrow-up';
  let iconBg = 'rgba(255, 255, 255, 0.2)';

  if (type === 'arrive' || currentIdx === steps.length - 1) {
    instructionText = state.lang === 'bn' ? 'গন্তব্যে পৌঁছাচ্ছেন' : 'Arriving at destination';
    iconClass = 'fa-solid fa-flag-checkered';
    iconBg = '#10b981';
  } else if (modifier.includes('right')) {
    if (modifier.includes('slight')) {
      instructionText = state.lang === 'bn' ? 'সামান্য ডানে চলুন' : 'Bear Right';
      iconClass = 'fa-solid fa-arrow-trend-up';
    } else if (modifier.includes('sharp')) {
      instructionText = state.lang === 'bn' ? 'তীক্ষ্ণ ডানে মোড় নিন' : 'Sharp Right';
      iconClass = 'fa-solid fa-turn-right';
    } else {
      instructionText = state.lang === 'bn' ? 'ডানে মোড় নিন' : 'Turn Right';
      iconClass = 'fa-solid fa-turn-right';
    }
    iconBg = '#3b82f6';
  } else if (modifier.includes('left')) {
    if (modifier.includes('slight')) {
      instructionText = state.lang === 'bn' ? 'সামান্য বামে চলুন' : 'Bear Left';
      iconClass = 'fa-solid fa-arrow-trend-up fa-flip-horizontal';
    } else if (modifier.includes('sharp')) {
      instructionText = state.lang === 'bn' ? 'তীক্ষ্ণ বামে মোড় নিন' : 'Sharp Left';
      iconClass = 'fa-solid fa-turn-left';
    } else {
      instructionText = state.lang === 'bn' ? 'বামে মোড় নিন' : 'Turn Left';
      iconClass = 'fa-solid fa-turn-left';
    }
    iconBg = '#f59e0b';
  } else if (modifier.includes('uturn') || type.includes('uturn')) {
    instructionText = state.lang === 'bn' ? 'ইউ-টার্ন নিন' : 'Make a U-Turn';
    iconClass = 'fa-solid fa-arrow-rotate-left';
    iconBg = '#ef4444';
  } else if (type === 'roundabout') {
    instructionText = state.lang === 'bn' ? 'গোলচত্বর অতিক্রম করুন' : 'Enter Roundabout';
    iconClass = 'fa-solid fa-arrows-spin';
    iconBg = '#8b5cf6';
  } else {
    instructionText = state.lang === 'bn' ? 'সোজা সড়ক অনুসরণ করুন' : 'Follow straight road';
    iconClass = 'fa-solid fa-arrow-up';
    iconBg = 'rgba(255, 255, 255, 0.2)';
  }

  if (actionEl) actionEl.innerText = instructionText;
  if (roadEl) roadEl.innerText = step.name ? step.name : (state.lang === 'bn' ? 'প্রধান সড়ক' : 'Main Road');
  if (iconEl) iconEl.className = iconClass;
  if (iconWrap) iconWrap.style.background = iconBg;

  // Update Remaining distance & time in Bottom Dock
  updateRemainingTripMetrics(userLat, userLng);
}

// Update Remaining Trip Distance & Time in Bottom Dock
function updateRemainingTripMetrics(userLat, userLng) {
  const coords = state.navTracking.coordinates;
  const distEl = document.getElementById('navRemainingDist');
  const timeEl = document.getElementById('navRemainingTime');
  if (!coords || coords.length === 0 || !distEl || !timeEl) return;

  const totalPoints = coords.length;
  const currIdx = state.navTracking.currentCoordIndex || 0;
  const fractionRemaining = Math.max(0, (totalPoints - 1 - currIdx) / Math.max(1, totalPoints - 1));

  const remainingKm = Math.max(0, (state.navTracking.totalDistanceKm * fractionRemaining)).toFixed(1);
  const remainingMins = Math.max(0, Math.round(state.navTracking.totalMinutes * fractionRemaining));

  distEl.innerText = `${formatNumber(remainingKm)} ${state.lang === 'bn' ? 'কিমি' : 'km'}`;
  timeEl.innerText = state.lang === 'bn' ? formatMinutesToBangla(remainingMins) : `${remainingMins} min`;
}

// Manual Test Step Forward Function (+50m per click for PC/indoor testing)
// Note: Only steps once per click; DOES NOT auto-move afterwards!
function stepForwardManually() {
  if (!state.navTracking.active) {
    showToast(state.lang === 'bn' ? 'প্রথমে লাইভ নেভিগেশন চালু করুন' : 'Start live navigation first');
    return;
  }
  const coords = state.navTracking.coordinates;
  if (!coords || coords.length === 0) return;

  const curr = state.navTracking.currentCoordIndex || 0;
  if (curr >= coords.length - 1) {
    showDestinationReached();
    return;
  }

  // Advance by a realistic step (~50-80 meters)
  const jump = Math.min(coords.length - 1 - curr, Math.max(2, Math.floor(coords.length / 60) || 3));
  state.navTracking.currentCoordIndex = curr + jump;
  const newPt = coords[state.navTracking.currentCoordIndex];
  const nextPt = coords[Math.min(coords.length - 1, state.navTracking.currentCoordIndex + 1)];
  const heading = getHeadingAngle(newPt[0], newPt[1], nextPt[0], nextPt[1]);

  state.navTracking.currentLatLng = [newPt[0], newPt[1]];
  state.navTracking.currentHeading = heading;
  state.navTracking.isMoving = true;
  state.navTracking.speedKmh = 35;

  // Move arrow to new point
  updateLiveVehicleMarker(newPt[0], newPt[1], state.travelMode, heading);
  state.map.panTo([newPt[0], newPt[1]], { animate: true, duration: 0.3 });

  // Update status: briefly show moving, then stationary!
  updateGpsMovementDisplay(true, 35);
  setTimeout(() => {
    if (state.navTracking.active) {
      updateGpsMovementDisplay(false, 0);
    }
  }, 1000);

  // Update Top Guidance Bar with live measured meters
  updateLiveTurnGuidance(newPt[0], newPt[1]);
}

// Check If User Moved Off-Route (> 60m away from route polyline)
function checkAndHandleOffRoute(userLat, userLng) {
  const coords = state.navTracking.coordinates;
  if (!coords || coords.length === 0) return;

  let minDistanceMeters = Infinity;
  for (let i = 0; i < coords.length; i++) {
    const d = haversineDistance(userLat, userLng, coords[i][0], coords[i][1]) * 1000;
    if (d < minDistanceMeters) {
      minDistanceMeters = d;
    }
  }

  // If user drifted more than 60 meters away from route, trigger auto reroute!
  if (minDistanceMeters > 60) {
    handleOffRouteReroute(userLat, userLng);
  }
}

// Destination Reached Action
function showDestinationReached() {
  const distEl = document.getElementById('turnDistanceMeters');
  const actionEl = document.getElementById('turnInstructionText');
  const distVal = document.getElementById('navRemainingDist');
  const timeVal = document.getElementById('navRemainingTime');
  const iconWrap = document.getElementById('turnIconWrap');
  const iconEl = document.getElementById('turnManeuverIcon');

  if (distEl) distEl.innerText = state.lang === 'bn' ? 'গন্তব্যে পৌঁছেছেন!' : 'Arrived!';
  if (actionEl) actionEl.innerText = state.lang === 'bn' ? '🎉 যাত্রা সফলভাবে সম্পন্ন হয়েছে' : '🎉 Trip successfully completed';
  if (distVal) distVal.innerText = state.lang === 'bn' ? '০ কিমি' : '0 km';
  if (timeVal) timeVal.innerText = state.lang === 'bn' ? '০ মিনিট' : '0 min';
  if (iconEl) iconEl.className = 'fa-solid fa-flag-checkered';
  if (iconWrap) iconWrap.style.background = '#10b981';

  showToast(state.lang === 'bn' 
    ? '🎉 অভিনন্দন! আপনি সফলভাবে গন্তব্যে পৌঁছেছেন।' 
    : '🎉 Congratulations! You have successfully reached your destination.');
}

// Stop or Exit Live Navigation
function stopLiveNavigation(hideHud = true) {
  state.navTracking.active = false;
  state.navTracking.isMoving = false;
  state.navAnimation.active = false;

  // Clear GPS watcher
  if (state.navTracking.watchId !== null) {
    if (navigator.geolocation) {
      navigator.geolocation.clearWatch(state.navTracking.watchId);
    }
    state.navTracking.watchId = null;
  }

  // Clear simulation interval if any
  if (state.navAnimation.intervalId) {
    clearInterval(state.navAnimation.intervalId);
    state.navAnimation.intervalId = null;
  }

  if (hideHud) {
    const topBanner = document.getElementById('turnGuidanceBanner');
    if (topBanner) topBanner.style.display = 'none';
    const bottomDock = document.getElementById('navBottomDock');
    if (bottomDock) bottomDock.style.display = 'none';

    if (state.navAnimation.marker) {
      state.map.removeLayer(state.navAnimation.marker);
      state.navAnimation.marker = null;
    }
    showToast(state.lang === 'bn' ? 'লাইভ নেভিগেশন বন্ধ করা হয়েছে।' : 'Live navigation closed.');
  }
}

// Live Autocomplete Implementation for Route Waypoints
function setupWaypointAutocomplete(inputId, dropdownId, pointType) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  let timer = null;

  input.addEventListener('input', () => {
    const query = input.value.trim();
    if (timer) clearTimeout(timer);

    if (query.length < 2) {
      dropdown.classList.remove('active');
      dropdown.innerHTML = '';
      return;
    }

    // Show initial loading / fast local results
    timer = setTimeout(async () => {
      dropdown.innerHTML = '<div class="route-sugg-loading"><i class="fa-solid fa-spinner fa-spin"></i> স্থান খোঁজা হচ্ছে...</div>';
      dropdown.classList.add('active');

      const qLower = query.toLowerCase();
      const localMatches = [];

      // Phonetic transliteration dictionary for popular Bangladeshi locations
      const phoneticAliases = {
        'sarishabari': 'সরিষাবাড়ী',
        'sarisha': 'সরিষাবাড়ী',
        'dhanmondi': 'ধানমন্ডি',
        'mirpur': 'মিরপুর',
        'gulshan': 'গুলশান',
        'uttara': 'উত্তরা',
        'motijheel': 'মতিঝিল',
        'mohammadpur': 'মোহাম্মদপুর',
        'savar': 'সাভার',
        'dhamrai': 'ধামরাই',
        'keraniganj': 'কেরানীগঞ্জ',
        'gazipur': 'গাজীপুর',
        'tongi': 'টঙ্গী',
        'kaliakair': 'কালিয়াকৈর',
        'sreepur': 'শ্রীপুর',
        'sonargaon': 'সোনারগাঁও',
        'patenga': 'পতেঙ্গা',
        'halishahar': 'হালিশহর',
        'sitakunda': 'সীতাকুণ্ড',
        'teknaf': 'টেকনাফ',
        'maheshkhali': 'মহেশখালী',
        'sreemangal': 'শ্রীমঙ্গল',
        'jaflong': 'জাফলং',
        'kuakata': 'কুয়াকাটা',
        'sundarbans': 'সুন্দরবন',
        'sajek': 'সাজেক',
        'rupsha': 'রূপসা',
        'mongla': 'মোংলা',
        'ishwardi': 'ঈশ্বরদী',
        'sherpur': 'শেরপুর',
        'melandaha': 'মেলান্দহ',
        'islampur': 'ইসলামপুর',
        'madarganj': 'মাদারগঞ্জ',
        'dewanganj': 'দেওয়ানগঞ্জ',
        'bakshiganj': 'বকশীগঞ্জ',
        'jamalpur': 'জামালপুর',
        'bhola': 'ভোলা',
        'chakaria': 'চকোরিয়া',
        'pekua': 'পেকুয়া',
        'ukhiya': 'উখিয়া',
        'ramu': 'রামু',
        'tetulia': 'তেঁতুলিয়া',
        'panchagarh': 'পঞ্চগড়',
        'dinajpur': 'দিনাজপুর',
        'bogura': 'বগুড়া',
        'bogra': 'বগুড়া',
        'naogaon': 'নওগাঁ',
        'natore': 'নাটোর',
        'sirajganj': 'সিরাজগঞ্জ',
        'tangail': 'টাঙ্গাইল',
        'kishoreganj': 'কিশোরগঞ্জ',
        'manikganj': 'মানিকগঞ্জ',
        'munshiganj': 'মুন্সীগঞ্জ',
        'narsingdi': 'নরসিংদী',
        'faridpur': 'ফরিদপুর',
        'gopalganj': 'গোপালগঞ্জ',
        'madaripur': 'মাদারীপুর',
        'rajbari': 'রাজবাড়ী',
        'shariatpur': 'শরীয়তপুর',
        'coxsbazar': 'কক্সবাজার',
        'coxs bazar': 'কক্সবাজার',
        'cumilla': 'কুমিল্লা',
        'comilla': 'কুমিল্লা',
        'brahmanbaria': 'ব্রাহ্মণবাড়িয়া',
        'chandpur': 'চাঁদপুর',
        'noakhali': 'নোয়াখালী',
        'feni': 'ফেনী',
        'lakshmipur': 'লক্ষ্মীপুর',
        'rangamati': 'রাঙ্গামাটি',
        'bandarban': 'বান্দরবান',
        'khagrachhari': 'খাগড়াছড়ি',
        'moulvibazar': 'মৌলভীবাজার',
        'habiganj': 'হবিগঞ্জ',
        'sunamganj': 'সুনামগঞ্জ',
        'jashore': 'যশোর',
        'jessore': 'যশোর',
        'kushtia': 'কুষ্টিয়া',
        'satkhira': 'সাতক্ষীরা',
        'jhenaidah': 'ঝিনাইদহ',
        'bagerhat': 'বাগেরহাট',
        'chuadanga': 'চুয়াডাঙ্গা',
        'meherpur': 'মেহেরপুর',
        'magura': 'মাগুরা',
        'narail': 'নড়াইল',
        'patuakhali': 'পটুয়াখালী',
        'pirojpur': 'পিরোজপুর',
        'barguna': 'বরগুনা',
        'jhalakathi': 'ঝালকাঠি',
        'kurigram': 'কুড়িগ্রাম',
        'gaibandha': 'গাইবান্ধা',
        'nilphamari': 'নীলফামারী',
        'lalmonirhat': 'লালমনিরহাট',
        'thakurgaon': 'ঠাকুরগাঁও',
        'netrokona': 'নেত্রকোণা'
      };

      // Check if typed English has a direct phonetic match
      let matchedBn = null;
      for (const [enKey, bnVal] of Object.entries(phoneticAliases)) {
        if (enKey.startsWith(qLower) || qLower.startsWith(enKey)) {
          matchedBn = bnVal;
          break;
        }
      }

      // 1. Search Local Bangladesh Districts & Thanas Dataset
      if (typeof BD_DISTRICTS !== 'undefined') {
        BD_DISTRICTS.forEach(d => {
          const matchDist = d.name.toLowerCase().includes(qLower) || 
                            d.en.toLowerCase().includes(qLower) ||
                            (matchedBn && d.name.includes(matchedBn));

          if (matchDist) {
            localMatches.push({
              name: `${d.name} (${d.en})`,
              sub: `${d.name} জেলা, বাংলাদেশ`,
              lat: d.lat,
              lng: d.lng,
              icon: 'fa-building-flag'
            });
          }

          d.thanas.forEach(thana => {
            const matchThana = thana.toLowerCase().includes(qLower) || 
                               (matchedBn && thana.includes(matchedBn));
            if (matchThana) {
              localMatches.push({
                name: thana,
                sub: `${d.name} জেলা, বাংলাদেশ`,
                lat: d.lat,
                lng: d.lng,
                icon: 'fa-location-dot',
                fullQuery: `${thana}, ${d.name}, Bangladesh`
              });
            }
          });
        });
      }

      // 2. Fetch Live Nominatim Bangladesh Geocoding (works with English and Bengali)
      let onlineMatches = [];
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=bd&format=json&addressdetails=1&limit=5`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.length > 0) {
          onlineMatches = data.map(item => ({
            name: item.display_name.split(',')[0],
            sub: item.display_name.split(',').slice(1, 3).join(', ') || 'বাংলাদেশ',
            lat: parseFloat(item.lat),
            lng: parseFloat(item.lon),
            icon: 'fa-location-dot'
          }));
        }
      } catch (err) {
        console.warn('Autocomplete fetch error:', err);
      }

      // Combine local & online results and remove duplicates
      const allResults = [...localMatches.slice(0, 4), ...onlineMatches];
      const seen = new Set();
      const uniqueResults = allResults.filter(item => {
        const key = item.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (uniqueResults.length === 0) {
        dropdown.innerHTML = '<div class="route-sugg-loading" style="color:#94a3b8;">কোনো স্থান খুঁজে পাওয়া যায়নি</div>';
        return;
      }

      dropdown.innerHTML = '';
      uniqueResults.slice(0, 6).forEach(item => {
        const div = document.createElement('div');
        div.className = 'route-suggestion-item';
        div.innerHTML = `
          <i class="fa-solid ${item.icon || 'fa-location-dot'}"></i>
          <div class="route-sugg-texts">
            <span class="route-sugg-main">${item.name}</span>
            <span class="route-sugg-sub">${item.sub}</span>
          </div>
        `;

        div.addEventListener('click', async (e) => {
          e.stopPropagation();
          let finalLat = item.lat;
          let finalLng = item.lng;

          // If local thana item has fullQuery, refine exact coordinates via Nominatim
          if (item.fullQuery) {
            try {
              const res2 = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(item.fullQuery)}&countrycodes=bd&format=json&limit=1`);
              const d2 = await res2.json();
              if (d2 && d2.length > 0) {
                finalLat = parseFloat(d2[0].lat);
                finalLng = parseFloat(d2[0].lon);
              }
            } catch (err) {}
          }

          input.value = item.name;
          state.routePoints[pointType] = { lat: finalLat, lng: finalLng, name: item.name };
          dropdown.classList.remove('active');
          dropdown.innerHTML = '';

          updateRouteMarkers();
          state.map.flyTo([finalLat, finalLng], 13, { duration: 1.2 });
          showToast(`${pointType === 'start' ? 'শুরুর স্থান (A)' : 'গন্তব্য (B)'} নির্বাচন: ${item.name}`);

          // If both A and B are set, auto-calculate route!
          if (state.routePoints.start && state.routePoints.end) {
            calculateRoute();
          }
        });

        dropdown.appendChild(div);
      });
    }, 250);
  });

  // Close dropdown on click outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest(`#${inputId}Wrapper`)) {
      dropdown.classList.remove('active');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      dropdown.classList.remove('active');
    }
  });
}

// Ruler / Measurement Tool
function setupMeasurementTool() {
  const toolBtn = document.getElementById('measureToolBtn');
  const hud = document.getElementById('measurementHud');
  const stopBtn = document.getElementById('stopMeasureBtn');

  toolBtn.addEventListener('click', () => {
    state.measureMode = !state.measureMode;
    if (state.measureMode) {
      toolBtn.classList.add('active-tool');
      hud.style.display = 'block';
      clearMeasurement();
      showToast('পরিমাপ মোড অন: ম্যাপে যেকোনো পয়েন্টে ক্লিক করুন।');
    } else {
      stopMeasurement();
    }
  });

  stopBtn.addEventListener('click', stopMeasurement);
}

function stopMeasurement() {
  state.measureMode = false;
  document.getElementById('measureToolBtn').classList.remove('active-tool');
  document.getElementById('measurementHud').style.display = 'none';
  clearMeasurement();
  showToast('পরিমাপ সম্পন্ন হয়েছে।');
}

function addMeasurePoint(lat, lng) {
  state.measurePoints.push([lat, lng]);

  const marker = L.circleMarker([lat, lng], {
    radius: 6,
    fillColor: '#f59e0b',
    color: '#ffffff',
    weight: 2,
    fillOpacity: 1
  }).addTo(state.map);
  state.measureMarkers.push(marker);

  if (state.measurePoints.length > 1) {
    if (state.measurePolyline) state.map.removeLayer(state.measurePolyline);

    state.measurePolyline = L.polyline(state.measurePoints, {
      color: '#f59e0b',
      weight: 4,
      dashArray: '6, 6'
    }).addTo(state.map);

    let total = 0;
    for (let i = 0; i < state.measurePoints.length - 1; i++) {
      const p1 = state.measurePoints[i];
      const p2 = state.measurePoints[i+1];
      total += haversineDistance(p1[0], p1[1], p2[0], p2[1]);
    }
    state.totalMeasuredDist = total;
    document.getElementById('hudMeasureVal').innerText = `${toBanglaNum(total.toFixed(2))} কিমি`;
  }
}

function clearMeasurement() {
  state.measurePoints = [];
  state.totalMeasuredDist = 0;
  if (state.measurePolyline) {
    state.map.removeLayer(state.measurePolyline);
    state.measurePolyline = null;
  }
  state.measureMarkers.forEach(m => state.map.removeLayer(m));
  state.measureMarkers = [];
  document.getElementById('hudMeasureVal').innerText = '০ কিমি';
}

// User Geolocation
function setupLocateMe() {
  const btn = document.getElementById('locateMeBtn');
  btn.addEventListener('click', () => {
    getUserLocation((lat, lng) => {
      state.map.flyTo([lat, lng], 15, { duration: 1.5 });

      if (state.userLocationMarker) state.map.removeLayer(state.userLocationMarker);

      const userIcon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div class="pin-pulse"></div>
          <div class="pin-core pin-start" style="background:#0284c7;">
            <i class="fa-solid fa-user"></i>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42]
      });

      state.userLocationMarker = L.marker([lat, lng], { icon: userIcon })
        .bindPopup('<b>আপনার বর্তমান অবস্থান (You are here)</b>')
        .addTo(state.map)
        .openPopup();

      showToast('আপনার অবস্থান শনাক্ত করা হয়েছে!');
    });
  });
}

function getUserLocation(callback) {
  if (!navigator.geolocation) {
    showToast('আপনার ব্রাউজার লোকেশন সার্ভিস সাপোর্ট করে না।');
    return;
  }
  showToast('লোকেশন খোঁজা হচ্ছে...');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      callback(pos.coords.latitude, pos.coords.longitude);
    },
    (err) => {
      showToast('লোকেশন পারমিশন পাওয়া যায়নি। ম্যানুয়ালি সিলেক্ট করুন।');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// Divisions Quick Filter
function setupDivisionsBar() {
  document.querySelectorAll('.div-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.div-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const divKey = chip.getAttribute('data-div');
      const divData = DIVISIONS[divKey];

      if (divData) {
        state.map.flyTo(divData.center, divData.zoom, { duration: 1.5 });
        showToast(`${divData.name}-এ জুম করা হয়েছে`);
      }
    });
  });
}

// Quick Landmarks Dock
function setupQuickPlaces() {
  document.querySelectorAll('.place-badge').forEach(badge => {
    badge.addEventListener('click', () => {
      const lat = parseFloat(badge.getAttribute('data-lat'));
      const lng = parseFloat(badge.getAttribute('data-lng'));
      const name = badge.getAttribute('data-name');

      state.map.flyTo([lat, lng], 14, { duration: 1.5 });

      const icon = L.divIcon({
        className: 'custom-pin',
        html: `
          <div class="pin-pulse"></div>
          <div class="pin-core pin-poi">
            <i class="fa-solid fa-camera"></i>
          </div>
        `,
        iconSize: [32, 42],
        iconAnchor: [16, 42]
      });

      if (state.searchMarker) state.map.removeLayer(state.searchMarker);

      state.searchMarker = L.marker([lat, lng], { icon })
        .bindPopup(`
          <div class="bd-popup">
            <h4>${name}</h4>
            <p>বাংলাদেশের জনপ্রিয় দর্শনীয় স্থান</p>
            <div class="popup-actions">
              <button class="popup-btn btn-a" onclick="setRoutePointFromMap('start', ${lat}, ${lng}, '${name}')">শুরু (A)</button>
              <button class="popup-btn btn-b" onclick="setRoutePointFromMap('end', ${lat}, ${lng}, '${name}')">গন্তব্য (B)</button>
            </div>
          </div>
        `)
        .addTo(state.map)
        .openPopup();
    });
  });
}

// Fullscreen
function setupFullscreen() {
  const btn = document.getElementById('fullscreenBtn');
  btn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      btn.innerHTML = '<i class="fa-solid fa-compress"></i>';
    } else {
      document.exitFullscreen().catch(() => {});
      btn.innerHTML = '<i class="fa-solid fa-expand"></i>';
    }
  });
}

// Toast
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.innerText = msg;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// Global Keyboard Shortcuts (Esc to dismiss, '/' to search)
function setupGlobalShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Esc closes all modals, panels, and dropdowns
    if (e.key === 'Escape') {
      const routePanel = document.getElementById('routePanel');
      if (routePanel) routePanel.classList.remove('active');
      const thanaPanel = document.getElementById('thanaPanel');
      if (thanaPanel) thanaPanel.classList.remove('active');
      const menu = document.getElementById('layersMenu');
      if (menu) menu.classList.remove('active');
      const sDrop = document.getElementById('searchResults');
      if (sDrop) sDrop.classList.remove('active');
      const startSugg = document.getElementById('startSuggestions');
      if (startSugg) startSugg.classList.remove('active');
      const endSugg = document.getElementById('endSuggestions');
      if (endSugg) endSugg.classList.remove('active');
    }

    // '/' or Ctrl+K to quick-focus search (if not already typing in an input)
    if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      e.preventDefault();
      const sInput = document.getElementById('searchInput');
      if (sInput) {
        sInput.focus();
        sInput.select();
      }
    }
  });
}

// Mobile Bottom Navigation Handlers
function setupMobileNav() {
  const mRouteBtn = document.getElementById('mobileRouteBtn');
  const mThanaBtn = document.getElementById('mobileThanaBtn');
  const mRiversBtn = document.getElementById('mobileRiversBtn');
  const mLayersBtn = document.getElementById('mobileLayersBtn');
  const mLocateBtn = document.getElementById('mobileLocateBtn');

  const routePanel = document.getElementById('routePanel');
  const thanaPanel = document.getElementById('thanaPanel');
  const layersMenu = document.getElementById('layersMenu');

  function clearNavActive() {
    document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  }

  if (mRouteBtn) {
    mRouteBtn.addEventListener('click', () => {
      const isOpen = routePanel.classList.contains('active');
      thanaPanel.classList.remove('active');
      layersMenu.classList.remove('active');
      clearNavActive();

      if (!isOpen) {
        routePanel.classList.add('active');
        mRouteBtn.classList.add('active');
      } else {
        routePanel.classList.remove('active');
      }
    });
  }

  if (mThanaBtn) {
    mThanaBtn.addEventListener('click', () => {
      const isOpen = thanaPanel.classList.contains('active');
      routePanel.classList.remove('active');
      layersMenu.classList.remove('active');
      clearNavActive();

      if (!isOpen) {
        thanaPanel.classList.add('active');
        mThanaBtn.classList.add('active');
      } else {
        thanaPanel.classList.remove('active');
      }
    });
  }

  if (mRiversBtn) {
    mRiversBtn.addEventListener('click', () => {
      const riversToggleBtn = document.getElementById('riversToggleBtn');
      if (riversToggleBtn) riversToggleBtn.click();
      mRiversBtn.classList.toggle('active', state.riversVisible);
    });
  }

  if (mLayersBtn) {
    mLayersBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      routePanel.classList.remove('active');
      thanaPanel.classList.remove('active');
      layersMenu.classList.toggle('active');
      mLayersBtn.classList.toggle('active', layersMenu.classList.contains('active'));
    });
  }

  if (mLocateBtn) {
    mLocateBtn.addEventListener('click', () => {
      const locateBtn = document.getElementById('locateMeBtn');
      if (locateBtn) locateBtn.click();
      mLocateBtn.classList.add('active');
      setTimeout(() => mLocateBtn.classList.remove('active'), 2000);
    });
  }

  // When panel close button is clicked, remove bottom nav active class
  document.getElementById('closeRoutePanelBtn')?.addEventListener('click', () => {
    mRouteBtn?.classList.remove('active');
  });
  document.getElementById('closeThanaPanelBtn')?.addEventListener('click', () => {
    mThanaBtn?.classList.remove('active');
  });
}

// Application Initialization
window.addEventListener('DOMContentLoaded', () => {
  setupLanguageSwitcher();
  initMap();
  setupLayerSwitcher();
  setupThanaDirectory();
  setupSearch();
  setupRouteUI();
  setupMeasurementTool();
  setupLocateMe();
  setupDivisionsBar();
  setupQuickPlaces();
  setupFullscreen();
  setupGlobalShortcuts();
  setupMobileNav();
});
