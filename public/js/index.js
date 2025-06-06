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
  console.log('앱 초기화 시작');
  setViewportHeight();
  initSwiper();
  initMap()
    .then(() => {
      console.log('지도 초기화 완료');
      return loadPools();
    })
    .then(() => {
      console.log('수영장 데이터 로드 완료:', pools);
      initMyLocationButton();
      setupSearchEvents();
      setupFilterEvents();
    })
    .catch(err => {
      console.error('앱 초기화 중 오류 발생:', err);
    });
}

function initMap() {
  console.log('지도 초기화 시작');
  return new Promise((resolve, reject) => {
    try {
      // 저장된 지도 상태 복원
      const savedMapState = localStorage.getItem('mapState');
      let defaultLatLng, defaultZoom;
      
      if (savedMapState) {
        const { lat, lng, zoom } = JSON.parse(savedMapState);
        defaultLatLng = new naver.maps.LatLng(lat, lng);
        defaultZoom = zoom;
      } else {
        defaultLatLng = new naver.maps.LatLng(37.5665, 126.9780);
        defaultZoom = 13;
      }

      map = new naver.maps.Map("map", { 
        center: defaultLatLng, 
        zoom: defaultZoom 
      });
      console.log('기본 지도 생성 완료');
      setupMapEvents();

      // 위치 정보를 즉시 요청하고 지도 초기화는 계속 진행
      const locationPromise = new Promise((resolveLocation) => {
        if (navigator.geolocation && !savedMapState) { // 저장된 상태가 없을 때만 현재 위치로 이동
          loadingIndicator = document.getElementById("loadingIndicator");
          showLoading();
          navigator.geolocation.getCurrentPosition(
            pos => {
              console.log('사용자 위치 획득 성공:', pos.coords);
              const userLatLng = new naver.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
              map.panTo(userLatLng);
              map.setZoom(13);
              hideLoading();
              resolveLocation();
            },
            err => {
              console.warn("위치 획득 실패:", err.message);
              hideLoading();
              resolveLocation();
            }
          );
        } else {
          console.log('지오로케이션 지원 안됨 또는 저장된 상태 있음');
          resolveLocation();
        }
      });

      // 지도 초기화는 즉시 완료
      resolve();
    } catch (err) {
      console.error('지도 초기화 중 오류:', err);
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
  console.log('수영장 데이터 로드 시작');
  showLoading();
  try {
    const res = await fetch("data/pools.json");
    if (!res.ok) throw new Error(`HTTP 오류: ${res.status}`);
    pools = await res.json();
    console.log('수영장 데이터 로드 성공:', pools.length, '개');
    poolsInView = filterPools(pools);
    console.log('현재 뷰에 표시될 수영장:', poolsInView.length, '개');
    updateMarkersAndCards();
  } catch (err) {
    console.error("수영장 데이터 로드 실패:", err);
  } finally {
    hideLoading();
  }
}

function filterPools(poolList) {
  console.log('수영장 필터링 시작');
  if (!map || typeof map.getBounds !== 'function') {
    console.warn('지도가 초기화되지 않았거나 getBounds 함수가 없음');
    return [];
  }
  const bounds = map.getBounds();
  const today = new Date().getDay();
  const dayMap = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const key = dayMap[today];
  console.log('현재 요일:', key, '활성 필터:', activeFilter);

  const filtered = poolList.filter(pool => {
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
  console.log('필터링 결과:', filtered.length, '개');
  return filtered;
}

function updateMarkersAndCards() {
  console.log('마커와 카드 업데이트 시작');
  updateMarkers();
  updateCardUI();
}

// 마커 크기 계산 함수 추가
function calculateMarkerSize(zoom) {
  const baseSize = 22.5;
  const baseZoom = 13;
  const scale = Math.pow(1.2, zoom - baseZoom);
  const newSize = baseSize * scale;
  const newHeight = (newSize * 14.8) / 22.5;
  return { newSize, newHeight };
}

function updateMarkerSizes() {
  const zoom = map.getZoom();
  const { newSize, newHeight } = calculateMarkerSize(zoom);

  markers.forEach(marker => {
    if (marker.getTitle() === selectedPoolName) {
      // 선택된 마커는 약간 더 크게
      marker.setIcon({
        url: "images/marker2.png",
        size: new naver.maps.Size(newSize * 1.2, newHeight * 1.2),
        anchor: new naver.maps.Point(newSize * 0.6, newHeight * 0.6),
        scaledSize: new naver.maps.Size(newSize * 1.2, newHeight * 1.2)
      });
    } else {
      marker.setIcon({
        url: "images/marker.png",
        size: new naver.maps.Size(newSize, newHeight),
        anchor: new naver.maps.Point(newSize * 0.5, newHeight * 0.5),
        scaledSize: new naver.maps.Size(newSize, newHeight)
      });
    }
  });
}

function updateMarkers() {
  console.log('마커 업데이트 시작');
  markers.forEach(m => m.setMap(null));
  markers = [];

  const zoom = map.getZoom();
  const { newSize, newHeight } = calculateMarkerSize(zoom);

  poolsInView.forEach(pool => {
    console.log('마커 생성:', pool.name);
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(pool.lat, pool.lng),
      map,
      title: pool.name,
      icon: {
        url: "images/marker.png",
        size: new naver.maps.Size(newSize, newHeight),
        anchor: new naver.maps.Point(newSize * 0.5, newHeight * 0.5),
        scaledSize: new naver.maps.Size(newSize, newHeight)
      }
    });

    naver.maps.Event.addListener(marker, 'click', () => {
      console.log('마커 클릭:', pool.name);
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
  console.log('생성된 마커 수:', markers.length);

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
  const zoom = map.getZoom();
  const { newSize, newHeight } = calculateMarkerSize(zoom);

  marker.setIcon({
    url: "images/marker2.png",
    size: new naver.maps.Size(newSize * 1.2, newHeight * 1.2),
    anchor: new naver.maps.Point(newSize * 0.6, newHeight * 0.6),
    scaledSize: new naver.maps.Size(newSize * 1.2, newHeight * 1.2)
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
  console.log('지도 이벤트 설정 시작');
  if (!map) {
    console.warn('지도가 초기화되지 않음');
    return;
  }

  // 지도 이동이 끝날 때마다 상태 저장
  naver.maps.Event.addListener(map, 'idle', () => {
    console.log('지도 이동 완료');
    // 현재 지도 상태 저장
    const center = map.getCenter();
    const zoom = map.getZoom();
    localStorage.setItem('mapState', JSON.stringify({
      lat: center.y,
      lng: center.x,
      zoom: zoom
    }));

    if (isMarkerClicked) {
      console.log('마커 클릭으로 인한 이동 무시');
      isMarkerClicked = false;
      return;
    }
    const prevSelected = selectedPoolName;
    poolsInView = filterPools(pools);
    updateMarkersAndCards();
    const currentInView = poolsInView.map(p => p.name);
    if (!currentInView.includes(prevSelected)) {
      console.log('이전 선택된 수영장이 현재 뷰에서 벗어남');
      selectedPoolName = null;
    }
    searchInput.blur();
  });

  // 줌 레벨 변경 이벤트 추가
  naver.maps.Event.addListener(map, 'zoom_changed', () => {
    updateMarkerSizes();
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
