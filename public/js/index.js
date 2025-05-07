// 전체 코드 리팩토링: 지도 뷰에 따라 마커와 카드 동기화
import { executeSearch, moveToSearchArea } from './search.js';

let map;
let markers = [];
let pools = [];
let poolsInView = [];
let swiper;
let selectedPoolName = null;
let myLocationBtn;
let loadingIndicator;
let isMapMoving = false;
let isMarkerClicked = false;
let activeFilter = null;
let suppressSlideChangeEvent = false;

const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const swiperContainer = document.querySelector('.cardUI');

function initApp() {
  setViewportHeight();
  initSwiper();
  initMap()
    .then(() => loadPools())
    .then(() => {
      initMyLocationButton();
      setupSearchEvents();
      setupFilterEvents();
    })
    .catch(console.error);
}

function initMap() {
  return new Promise((resolve, reject) => {
    try {
      const defaultLatLng = new naver.maps.LatLng(37.5665, 126.9780);
      map = new naver.maps.Map("map", { center: defaultLatLng, zoom: 13 });
      setupMapEvents();
      if (navigator.geolocation) {
        loadingIndicator = document.getElementById("loadingIndicator");
        showLoading();
        navigator.geolocation.getCurrentPosition(pos => {
          const userLatLng = new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          map.panTo(userLatLng);
          map.setZoom(13);
          hideLoading();
          resolve();
        }, err => {
          console.warn("위치 실패:", err.message);
          hideLoading();
          resolve();
        });
      } else {
        resolve();
      }
    } catch (err) {
      reject(err);
    }
  });
}

function initSwiper() {
  if (!window.Swiper) return;
  if (swiper?.destroy) swiper.destroy(true, true);
  swiper = new Swiper(".swiper-container", {
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 20,
    grabCursor: true,
    preventClicks: false,
    preventClicksPropagation: false,
    on: {
      slideChange: function () {
        if (suppressSlideChangeEvent) {
          suppressSlideChangeEvent = false;
          return;
        }
        const slide = this.slides[this.activeIndex];
        if (!slide) return;
        const name = slide.dataset.name;
        const lat = parseFloat(slide.dataset.lat);
        const lng = parseFloat(slide.dataset.lng);
        if (lat && lng && name && selectedPoolName !== name) {
          isMarkerClicked = true;
          selectedPoolName = name;
          focusMarkerByName(name, lat, lng);
        }
      },
      tap: (_, e) => {
        const slide = e.target.closest('.swiper-slide');
        if (slide?.dataset.link) window.location.href = slide.dataset.link;
      }
    }
  });
}

function initMyLocationButton() {
  myLocationBtn = document.getElementById("myLocation");
  myLocationBtn?.addEventListener("click", moveToMyLocation);
}

async function loadPools() {
  showLoading();
  try {
    const res = await fetch("data/pools.json");
    if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
    pools = await res.json();
    poolsInView = filterPools(pools);
    updateMarkersAndCards();
  } catch (err) {
    console.error("로드 실패:", err);
  } finally {
    hideLoading();
  }
}

function filterPools(poolList) {
  if (!map || typeof map.getBounds !== 'function') return [];
  const bounds = map.getBounds();
  const today = new Date().getDay();
  const dayMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const key = dayMap[today];

  return poolList.filter(pool => {
    const inBounds = bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng));
    if (!inBounds) return false;
    if (!activeFilter) return true;

    const cond = {
      today: () => pool.sessions?.[key]?.length > 0,
      '50m': () => pool.tags?.includes('50m'),
      weekday: () => ['monday','tuesday','wednesday','thursday','friday'].some(d => pool.sessions?.[d]?.length),
      weekend: () => ['saturday','sunday'].some(d => pool.sessions?.[d]?.length),
    };
    return cond[activeFilter]?.() ?? true;
  });
}

function updateMarkersAndCards() {
  updateMarkers();
  updateCardUI();
}

function updateMarkers() {
  markers.forEach(m => m.setMap(null));
  markers = [];

  poolsInView.forEach(pool => {
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(pool.lat, pool.lng),
      map,
      title: pool.name,
      icon: {
        url: "images/marker.png",
        size: new naver.maps.Size(22.5, 14.8), // 5:3.3 비율에 곱하기 4.5
        anchor: new naver.maps.Point(10, 10),
        scaledSize: new naver.maps.Size(22.5, 14.8)
      }
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      isMarkerClicked = true;
      selectedPoolName = pool.name;
      focusMarkerByName(pool.name, pool.lat, pool.lng);
      const idx = poolsInView.findIndex(p => p.name === pool.name);
      if (swiper?.slideTo && idx !== -1) {
        suppressSlideChangeEvent = true;
        swiper.slideTo(idx, 300);
      }
    });

    markers.push(marker);
  });

  if (selectedPoolName) {
    const marker = markers.find(m => m.getTitle() === selectedPoolName);
    if (marker) highlightMarker(marker);
  }
}


function focusMarkerByName(name, lat, lng) {
  resetMarkerStyles();
  const marker = markers.find(m => m.getTitle() === name);
  if (marker) {
    highlightMarker(marker);
    if (isMarkerClicked) map.panTo(new naver.maps.LatLng(lat, lng));
  }
}

function resetMarkerStyles() {
  markers.forEach(marker => marker.setIcon({
    url: "images/marker.png",
    size: new naver.maps.Size(22.5, 14.8),
    anchor: new naver.maps.Point(10, 10),
    scaledSize: new naver.maps.Size(22.5, 14.8)
  }));
}

function highlightMarker(marker) {
  marker.setIcon({
    url: "images/marker2.png",
    size: new naver.maps.Size(27.5, 18.15), // 5:3.3 비율에 곱하기 5.5
    anchor: new naver.maps.Point(10, 10),
    scaledSize: new naver.maps.Size(27.5, 18.15)
  });
}


function updateCardUI() {
  if (!poolsInView.length) {
    swiperContainer.classList.add('hidden');
    return;
  }

  swiperContainer.classList.remove('hidden');
  updateSwiperSlides(poolsInView);

  if (selectedPoolName && poolsInView.some(p => p.name === selectedPoolName)) {
    const idx = poolsInView.findIndex(p => p.name === selectedPoolName);
    suppressSlideChangeEvent = true;
    swiper.slideTo(idx, 0);
  } else {
    suppressSlideChangeEvent = true;
    swiper.slideTo(0, 0);
  }
}

function updateSwiperSlides(poolList) {
  const wrapper = swiperContainer.querySelector('.swiper-wrapper');
  if (!wrapper) return;
  wrapper.innerHTML = '';
  poolList.forEach(pool => {
    const slide = document.createElement("div");
    slide.classList.add("swiper-slide");
    slide.dataset.name = pool.name;
    slide.dataset.lat = pool.lat;
    slide.dataset.lng = pool.lng;
    slide.dataset.link = `detail.html?poolId=${pool.id}`;
    const shortAddr = pool.address.split(" ").slice(0, 4).join(" ");
    slide.innerHTML = `
      <div class="flex-between"><div class="short-address">${shortAddr}</div><div id="Fav"></div></div>
      <div class="poolTitle">
        <div class="pool-name">${pool.name}</div>
        ${(pool.tags || []).map(t => `<div class="tag">${t}</div>`).join('')}
      </div>
      <div class="noti">${pool.off_day || ""}</div>
    `;
    wrapper.appendChild(slide);
  });
  swiper.update();
}

function setupMapEvents() {
  if (!map) return;
  naver.maps.Event.addListener(map, 'idle', () => {
    if (isMarkerClicked) {
      isMarkerClicked = false;
      return;
    }
    const prevSelected = selectedPoolName;
    poolsInView = filterPools(pools);
    updateMarkersAndCards();
    const currentInView = poolsInView.map(p => p.name);
    if (!currentInView.includes(prevSelected)) {
      selectedPoolName = null;
    }
    searchInput.blur();
  });
}

function setupSearchEvents() {
  searchInput.addEventListener("keypress", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      const keyword = searchInput.value.trim();
      const results = executeSearch(keyword, pools);
      if (!results.length) {
        moveToSearchArea(results, keyword, map);
        swiperContainer.classList.add('hidden');
        return;
      }
      adjustMapToSearchResults(results);
      swiperContainer.classList.remove('hidden');
      updateSwiperSlides(results);
      if (swiper?.slideTo) {
        suppressSlideChangeEvent = true;
        swiper.slideTo(0, 0);
        selectedPoolName = results[0].name;
        focusMarkerByName(results[0].name, results[0].lat, results[0].lng);
      }
      searchInput.blur();
    }
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    poolsInView = filterPools(pools);
    updateMarkersAndCards();
  });
}

function setupFilterEvents() {
  const filterButtons = document.querySelectorAll('.filter-btn');
  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.filter;
      if (activeFilter === filter) {
        activeFilter = null;
        button.classList.remove('active');
      } else {
        activeFilter = filter;
        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
      }
      poolsInView = filterPools(pools);
      updateMarkersAndCards();
    });
  });
}

function adjustMapToSearchResults(results) {
  if (!results.length) return;
  if (results.length === 1) {
    map.panTo(new naver.maps.LatLng(results[0].lat, results[0].lng));
    map.setZoom(12);
  } else {
    const bounds = new naver.maps.LatLngBounds();
    results.forEach(p => bounds.extend(new naver.maps.LatLng(p.lat, p.lng)));
    map.fitBounds(bounds);
  }
}

function moveToMyLocation() {
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 서비스를 지원하지 않습니다.");
    return;
  }
  showLoading();
  navigator.geolocation.getCurrentPosition(pos => {
    hideLoading();
    const latlng = new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
    map.panTo(latlng);
    map.setZoom(13);
    myLocationBtn?.classList.add('active');
  }, err => {
    hideLoading();
    alert("현재 위치를 확인할 수 없습니다.");
  });
}

function showLoading() {
  loadingIndicator?.classList.remove("hidden");
}

function hideLoading() {
  loadingIndicator?.classList.add("hidden");
}

function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}

document.addEventListener("DOMContentLoaded", initApp);
window.addEventListener("resize", setViewportHeight);
window.addEventListener("load", () => setTimeout(setViewportHeight, 300));
