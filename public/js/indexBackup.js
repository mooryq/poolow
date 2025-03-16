// ✅ 전역 변수 선언
let map; // 네이버 지도 객체
let markers = []; // 지도에 표시된 마커 배열
let pools = []; // 전체 수영장 데이터
let poolsInView = []; // 현재 지도에 표시된 수영장 리스트

const searchInput = document.getElementById("searchInput"); // 검색창 요소

// ==========================================
// ✅ 네이버 지도 초기화
// ==========================================
function initMap() {
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(37.5665, 126.9780), // 기본 위치 (서울)
        zoom: 13
    });
    


    // ✅ 현재 위치 가져오기
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLatLng = new naver.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(userLatLng); // 지도 중심 설정
            updateMarkersAndList(); // ✅ 현재 화면 내 마커 & 리스트 갱신
        });
    }

    // ✅ 지도 이동 후 리스트 업데이트
    naver.maps.Event.addListener(map, "idle", updateMarkersAndList);
}

// ==========================================
// ✅ 데이터 로드 (수영장 리스트 불러오기)
// ==========================================
async function loadPools() {
    try {
        console.log("🔍 loadPools() 실행됨!");

        const response = await fetch("data/pools.json");
        pools = await response.json();

        displayPools(pools); // 리스트 초기 표시
        updateMarkers(pools); // 지도 마커 초기 표시
    } catch (error) {
        console.error("❌ 데이터 불러오기 오류:", error);
    }
}

// ==========================================
// ✅ 지도 내 마커 & 리스트 업데이트 (화면 내 수영장만)
// ==========================================
function updateMarkersAndList() {
    const bounds = map.getBounds(); // 현재 지도 영역 가져오기

    poolsInView = pools.filter(pool => {
        const latLng = new naver.maps.LatLng(pool.lat, pool.lng);
        return bounds.hasLatLng(latLng); // ✅ 현재 지도에 포함된 마커만 반환
    });

    displayPools(poolsInView); // 리스트 갱신
    updateMarkers(poolsInView); // 지도 마커 갱신
}

// ==========================================
// ✅ 지도에 마커 업데이트 (기존 마커 제거 후 새로 추가)
// ==========================================
function updateMarkers(poolsToShow) {
    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // 새 마커 추가
    poolsToShow.forEach(pool => {
        const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(pool.lat, pool.lng),
            map: map,
            title: pool.name,
            icon: {
                url: "images/marker.png", // 마커 이미지 파일 경로
                size: new naver.maps.Size(23, 23), // 마커 크기
                origin: new naver.maps.Point(0, 0),
                anchor: new naver.maps.Point(11, 20),
                scaledSize: new naver.maps.Size(23, 23) // 이미지 크기 조정
            }
        });

        markers.push(marker);
    });
}

// ==========================================
// ✅ 리스트 표시 (DOM에 반영)
// ==========================================
function displayPools(poolsToShow) {
    const poolList = document.getElementById("poolList");
    poolList.innerHTML = "";

    poolsToShow.forEach(pool => {
        const poolItem = document.createElement("div");
        poolItem.classList.add("pool-item");
        poolItem.innerHTML = `
            <h3>${pool.name}</h3>
            <p>${pool.address}</p>
            <button onclick="moveToPool(${pool.lat}, ${pool.lng})">위치 보기</button>
        `;
        poolList.appendChild(poolItem);
    });
}

// ==========================================
// ✅ 특정 수영장 위치로 지도 이동
// ==========================================
function moveToPool(lat, lng) {
    map.setCenter(new naver.maps.LatLng(lat, lng));
    map.setZoom(16);
}

// ==========================================
// ✅ 검색 기능 (검색어 입력 후 Enter 시 실행)
// ==========================================
searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        executeSearch(); // 🔹 Enter(↵) 키를 눌렀을 때만 검색 실행
    }
});

// ✅ 검색 실행
function executeSearch() {
    const keyword = searchInput.value.trim().toLowerCase();
    if (keyword.length === 0) return; // 빈 검색어 방지

    const filteredPools = pools.filter(pool =>
        pool.name.toLowerCase().includes(keyword) ||
        pool.address.toLowerCase().includes(keyword)
    );

    displayPools(filteredPools); // 🔹 검색 결과 리스트 갱신
    moveToSearchArea(filteredPools); // 🔹 검색된 지역 중심으로 지도 이동
}

// ==========================================
// ✅ 검색된 지역 중심으로 지도 이동
// ==========================================
function moveToSearchArea(filteredPools) {
    if (filteredPools.length === 0) return;

    let avgLat = 0;
    let avgLng = 0;

    filteredPools.forEach(pool => {
        avgLat += pool.lat;
        avgLng += pool.lng;
    });

    avgLat /= filteredPools.length;
    avgLng /= filteredPools.length;

    map.setCenter(new naver.maps.LatLng(avgLat, avgLng));
    map.setZoom(14);
}

// ==========================================
// ✅ 초기화 실행
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadPools();
});

