import { executeSearch, moveToSearchArea } from './search.js';

// 전역 변수 선언 ! 🎤
let map; // 네이버 지도 객체
let markers = []; // 현재 지도에 표시된 마커 배열
let pools = []; // 전체 수영장 데이터 배열
let poolsInView = []; // 현재 지도 뷰에 보이는 수영장 배열
let swiper; // 슬라이더 객체
let selectedPoolName = null; // 현재 선택된 수영장 이름
let myLocationBtn; // 내 위치 버튼 요소
let loadingIndicator; // 로딩 인디케이터 요소
let isMapMoving = false; // 지도 이동 중인지 여부 (불필요한 업데이트 방지)
let isMarkerClicked = false; // 마커 클릭 시 지도 이동 이벤트 구분용

// DOM 요소 캐싱 🔍
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const swiperContainer = document.querySelector('.cardUI');


// 초기화 함수 🤍

// 애플리케이션 초기화 .◜ɞ◝♡
function initApp() {
  
  setViewportHeight();// 뷰포트 높이 설정
  initSwiper();// Swiper 먼저 초기화
  
  // 지도 초기화 후 데이터 로드
  initMap()
    .then(() => loadPools())
    .then(() => {
      initMyLocationButton();// 현재 위치 버튼 초기화
      setupSearchEvents();// 검색 이벤트 설정
    })
    .catch(error => {
      console.error("앱 초기화 중 오류 발생:", error);
      // 사용자에게 오류 표시 로직 추가 가능
    });
}

//네이버 지도 초기화 ꒰ •⸝⸝⸝⸝⸝⸝⸝• ꒱
function initMap() {
  return new Promise((resolve, reject) => {
    try {
      const defaultLatLng = new naver.maps.LatLng(37.5665, 126.9780); // 서울 시청
      
      // 지도 생성
      map = new naver.maps.Map("map", {
        center: defaultLatLng,
        zoom: 13
      });
      
      setupMapEvents(); // 지도 이벤트 등록
      
      // 사용자 위치 가져오기 시도
      if (navigator.geolocation) {
        loadingIndicator = document.getElementById("loadingIndicator");
        
        if (loadingIndicator) {
          showLoading();
        }
        
        navigator.geolocation.getCurrentPosition(
          // 성공 시 사용자 위치로 지도 이동
          position => {
            const userLatLng = new naver.maps.LatLng(
              position.coords.latitude, 
              position.coords.longitude
            );
            map.setCenter(userLatLng);
            map.setZoom(13);
            hideLoading();
            resolve();
          },
          // 오류 시 기본 위치 유지
          error => {
            console.log("위치 정보 획득 실패, 기본 위치 사용:", error.message);
            hideLoading();
            resolve();
          }
        );
      } else {
        // 위치 지원하지 않는 브라우저
        console.log("Geolocation이 지원되지 않습니다");
        resolve();
      }
    } catch (err) {
      console.error("지도 초기화 실패:", err);
      reject(err);
    }
  });
}


// Swiper 초기화 ૮ ̇ⱉ ̇ ა
 
function initSwiper() {
  if (!window.Swiper) {
    console.warn("Swiper 라이브러리가 로드되지 않았습니다");
    return;
  }

  // 기존 Swiper 제거 (필요한 경우)
  if (swiper && typeof swiper.destroy === 'function') {
    swiper.destroy(true, true);
  }

  // 새 Swiper 인스턴스 생성
  swiper = new Swiper(".swiper-container", {
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 20,
    grabCursor: true,
    preventClicks: false,
    preventClicksPropagation: false,
    on: {
      // 슬라이드 변경 시 해당 마커로 지도 이동
      slideChange: function() {
        const activeSlide = this.slides[this.activeIndex];
        if (!activeSlide) return;

        const name = activeSlide.getAttribute("data-name");
        const lat = parseFloat(activeSlide.getAttribute("data-lat"));
        const lng = parseFloat(activeSlide.getAttribute("data-lng"));
        
        if (lat && lng && name) {
          isMarkerClicked = true; // 슬라이드 변경 시 클릭 이벤트와 구분
          // 이전에 선택된 것과 다른 경우만 처리
          if (selectedPoolName !== name) {
            selectedPoolName = name;
            focusMarkerByName(name, lat, lng);
          }
        }
      },
      // 탭(클릭) 시 해당 수영장 상세 페이지로 이동
      tap: function(_, event) {
        const slide = event.target.closest('.swiper-slide');
        if (!slide) return;
        
        const url = slide.dataset.link;
        if (url) {
          window.location.href = url;
        }
      }
    }
  });
  
  console.log("✅ Swiper 초기화 완료");
}

// 내 위치 버튼 초기화 (՞•-•՞)

function initMyLocationButton() {
  myLocationBtn = document.getElementById("myLocation");
  if (!myLocationBtn) return; // 버튼이 없으면 무시  
  myLocationBtn.addEventListener("click", moveToMyLocation);
}


// 데이터 관련 함수 📊📑📃


// 수영장 데이터 로드

async function loadPools() {
  try {
    console.log("📥 수영장 데이터 로딩 시작");
    showLoading();

    const response = await fetch("data/pools.json");
    if (!response.ok) {
      throw new Error(`HTTP 오류: ${response.status}`);
    }
    
    pools = await response.json();
    console.log(`${pools.length}개 수영장 데이터 로드 완료`);
    
    updateMarkersAndCards(); // 초기 마커와 카드 생성
    
    hideLoading();
    return pools;
  } catch (error) {
    console.error("수영장 데이터 로드 실패:", error);
    hideLoading();
    // 오류 처리 UI 표시 가능
    throw error;
  }
}

// 특정 수영장을 이름으로 찾기

function findPoolByName(name) {
  return pools.find(pool => pool.name === name);
}

// UI 업데이트 함수  🐬
// 마커와 카드 UI 모두 업데이트

function updateMarkersAndCards() {
  updateMarkers();
  updateCardUI();
}

// 지도 마커 업데이트
 
function updateMarkers() {
  if (!map || !pools || pools.length === 0) return;
  
  // 지도 영역 가져오기
  const bounds = map.getBounds();
  if (!bounds) return;
  
  // 현재 보이는 범위 내 수영장 필터링
  poolsInView = pools.filter(pool => 
    bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng))
  );
  
  // 기존 마커 제거
  markers.forEach(marker => marker.setMap(null));
  markers = [];
  
  // 새 마커 생성
  poolsInView.forEach(pool => {
    const marker = new naver.maps.Marker({
      position: new naver.maps.LatLng(pool.lat, pool.lng),
      map: map,
      title: pool.name,
      icon: {
        url: "images/marker.png",
        size: new naver.maps.Size(23, 23),
        origin: new naver.maps.Point(0, 0),
        anchor: new naver.maps.Point(11, 20),
        scaledSize: new naver.maps.Size(23, 23)
      }
    });
    
    // 마커 클릭 이벤트
    naver.maps.Event.addListener(marker, 'click', () => {
      isMarkerClicked = true;
      
      // 선택된 수영장 변경
      selectedPoolName = pool.name;
      
      // 마커 포커스 및 지도 이동
      focusMarkerByName(pool.name, pool.lat, pool.lng);
      
      // 해당 수영장으로 슬라이더 이동
      const index = poolsInView.findIndex(p => p.name === pool.name);
      if (index !== -1 && swiper && typeof swiper.slideTo === 'function') {
        swiper.slideTo(index, 300);
      }
    });
    
    markers.push(marker);
  });
  
  // 이미 선택된 마커가 있으면 하이라이트
  if (selectedPoolName) {
    const selectedMarker = markers.find(m => m.getTitle() === selectedPoolName);
    if (selectedMarker) {
      highlightMarker(selectedMarker);
    }
  }
}

// 카드 UI 업데이트

function updateCardUI() {
  if (!poolsInView || poolsInView.length === 0) {
    swiperContainer.classList.add('hidden');
    return;
  }
  
  swiperContainer.classList.remove('hidden');
  updateSwiperSlides(poolsInView);
  
  // 선택된 수영장이 있으면 해당 슬라이드로 이동
  if (selectedPoolName) {
    const index = poolsInView.findIndex(pool => pool.name === selectedPoolName);
    if (index !== -1 && swiper && typeof swiper.slideTo === 'function') {
      swiper.slideTo(index, 300);
    }
  }
}

// Swiper 슬라이드 업데이트

function updateSwiperSlides(poolList) {
  if (!swiper || !poolList) return;
  
  const swiperWrapper = swiperContainer.querySelector('.swiper-wrapper');
  if (!swiperWrapper) return;
  
  // 기존 슬라이드 초기화
  swiperWrapper.innerHTML = '';
  
  // 새 슬라이드 생성
  poolList.forEach(pool => {
    const slide = document.createElement("div");
    slide.classList.add("swiper-slide");
    
    // 데이터 속성 설정
    slide.setAttribute("data-name", pool.name);
    slide.setAttribute("data-lat", pool.lat);
    slide.setAttribute("data-lng", pool.lng);
    slide.setAttribute("data-link", `detail.html?poolId=${pool.id}`);
    
    // 주소 처리
    const shortAddress = pool.address.split(" ").slice(0, 4).join(" ");
    
    // 슬라이드 내용 생성
    slide.innerHTML = `
      <div class="flex-between">
        <div class="short-address">${shortAddress}</div>
        <div id="Fav"></div>
      </div>
      <div class="poolTitle">
        <div class="pool-name">${pool.name}</div>
        ${pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('')}
      </div>
      <div class="noti">${pool.off_day || ""}</div>
    `;
    
    swiperWrapper.appendChild(slide);
  });
  
  // Swiper 업데이트 (새 슬라이드 반영)
  if (swiper && typeof swiper.update === 'function') {
    swiper.update();
  }
}

// 이름으로 마커 포커스 및 지도 이동

function focusMarkerByName(poolName, lat, lng) {
  // 모든 마커 기본 스타일로 초기화
  resetMarkerStyles();
  
  // 해당 이름의 마커 찾기
  const targetMarker = markers.find(marker => marker.getTitle() === poolName);
  
  // 마커가 있으면 하이라이트 및 지도 중심 이동
  if (targetMarker) {
    highlightMarker(targetMarker);
    
    // 지도 이동 (마커 클릭 시에만)
    if (isMarkerClicked) {
      map.setCenter(new naver.maps.LatLng(lat, lng));
      map.setZoom(12);
    }
  }
}

// 마커 스타일 초기화

function resetMarkerStyles() {
  markers.forEach(marker => {
    marker.setIcon({
      url: "images/marker.png",
      size: new naver.maps.Size(23, 23),
      origin: new naver.maps.Point(0, 0),
      anchor: new naver.maps.Point(11, 20),
      scaledSize: new naver.maps.Size(23, 23)
    });
  });
}

// 마커 하이라이트 처리
 
function highlightMarker(marker) {
  marker.setIcon({
    url: "images/marker.png",
    size: new naver.maps.Size(35, 35),
    origin: new naver.maps.Point(0, 0),
    anchor: new naver.maps.Point(17, 30),
    scaledSize: new naver.maps.Size(35, 35)
  });
}

// 이벤트 핸들러 🎉

// 지도 이벤트 설정

function setupMapEvents() {
  if (!map) return;
  
    // 지도 로딩 완료 시 (초기화 후)
  naver.maps.Event.addListener(map, 'init', () => {
    console.log("지도 초기화 완료");
  });

  // 지도 줌 변경 시
  naver.maps.Event.addListener(map, 'zoom_changed', () => {
    isMarkerClicked = false; // 마커 클릭 플래그 초기화
    });  
  
  // 지도 이동 시작
  naver.maps.Event.addListener(map, 'dragstart', () => {
    isMapMoving = true;
    isMarkerClicked = false; // 마커 클릭 플래그 초기화
    
    // 내 위치 버튼 활성 해제
    if (myLocationBtn) {
      myLocationBtn.classList.remove('active');
    }
  });
  
  // 지도 이동 종료 (드래그 끝)
  naver.maps.Event.addListener(map, 'dragend', () => {
    isMapMoving = false;
  });
  
  // 지도 유휴 상태 (이동/줌 완료 후)
  naver.maps.Event.addListener(map, 'idle', () => {
    // 마커 클릭으로 인한 지도 이동 직후의 idle 이벤트만 스킵
    if (isMarkerClicked) {
        isMarkerClicked = false; // 플래그 초기화
        return;
    }
    updateMarkersAndCards();
    // 키보드 닫기
    searchInput.blur();
  });
  
  // 지도 클릭 시 키보드 닫기
  naver.maps.Event.addListener(map, 'click', () => {
    searchInput.blur();
  });
}

// 검색 이벤트 설정
function setupSearchEvents() {
  // 키보드 엔터 검색
  searchInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      
      const keyword = searchInput.value.trim();
      const filteredPools = executeSearch(keyword, pools);
      
      if (filteredPools.length === 0) {
        // 검색 결과가 없을 때 지역 검색 시도
        // map 객체를 인자로 전달
        moveToSearchArea(filteredPools, keyword, map);
        swiperContainer.classList.add('hidden');
        return;
      }
      
      // 검색 결과가 있을 때 지도 및 UI 업데이트
      adjustMapToSearchResults(filteredPools, keyword);
      
      // 카드 UI 업데이트
      swiperContainer.classList.remove('hidden');
      updateSwiperSlides(filteredPools);
      
      // Swiper가 준비되었는지 확인 후 첫 번째 슬라이드로 이동
      if (swiper && typeof swiper.slideTo === 'function') {
        swiper.slideTo(0, 0);
        
        // 첫 번째 검색 결과의 마커를 하이라이트
        if (filteredPools.length > 0) {
          selectedPoolName = filteredPools[0].name;
          focusMarkerByName(selectedPoolName, filteredPools[0].lat, filteredPools[0].lng);
        }
      }
      
      searchInput.blur();
    }
  });
  
  // 검색 초기화 (X 버튼 클릭)
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    updateMarkersAndCards(); // 현재 지도 영역의 수영장으로 업데이트
  });
}

// 검색 결과에 맞게 지도 범위 조정
function adjustMapToSearchResults(results, keyword) {
  if (results.length === 0) return;
  
  if (results.length === 1) {
    // 결과가 하나면 바로 이동
    const pool = results[0];
    map.setCenter(new naver.maps.LatLng(pool.lat, pool.lng));
    map.setZoom(12);
  } else {
    // 여러 결과가 있으면 모두 포함하는 범위로 조정
    const bounds = new naver.maps.LatLngBounds();
    results.forEach(pool => {
      bounds.extend(new naver.maps.LatLng(pool.lat, pool.lng));
    });
    map.fitBounds(bounds);
  }
}


// 내 위치로 이동

function moveToMyLocation() {
  if (!navigator.geolocation) {
    alert("이 브라우저에서는 위치 서비스를 지원하지 않습니다.");
    return;
  }
  
  showLoading();
  
  navigator.geolocation.getCurrentPosition(
    position => {
      hideLoading();
      const userLatLng = new naver.maps.LatLng(
        position.coords.latitude,
        position.coords.longitude
      );
      
      map.setCenter(userLatLng);
      map.setZoom(13);
      
      // 내 위치 버튼 활성화
      if (myLocationBtn) {
        myLocationBtn.classList.add('active');
      }
    },
    error => {
      hideLoading();
      console.error("위치 정보를 가져오는 중 오류 발생:", error);
      alert("현재 위치를 확인할 수 없습니다.");
    }
  );
}

// 유틸리티 함수 🔍

// 로딩 표시

function showLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.remove("hidden");
  }
}

// 로딩 숨김
 
function hideLoading() {
  if (loadingIndicator) {
    loadingIndicator.classList.add("hidden");
  }
}

// 뷰포트 높이 계산 (모바일 브라우저 주소창 고려)
 
function setViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}


// 이벤트 리스너 🎉


// DOM 로딩 완료 시 초기화
document.addEventListener("DOMContentLoaded", initApp);

// 화면 리사이즈 시 뷰포트 높이 재계산
window.addEventListener("resize", setViewportHeight);

// 전체 리소스 로딩 완료 후 뷰포트 높이 재조정
window.addEventListener("load", () => {
  setTimeout(setViewportHeight, 300);
});