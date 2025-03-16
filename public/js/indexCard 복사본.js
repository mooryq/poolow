// ✅ 전역 변수 선언
let map;
let markers = [];
let pools = [];
let poolsInView = [];

let clickedMarker = false; // 🔹 마커 클릭 여부를 저장하는 변수


const searchInput = document.getElementById("searchInput");
const resultContainer = document.getElementById("resultContainer");
const resultCount = document.getElementById("resultCount");
const cardWrapper = document.getElementById("cardWrapper");
// const searchAgainBtn = document.getElementById("searchAgainBtn");
const clearSearchBtn = document.getElementById("clearSearch");


// ✅ 초기 실행
document.addEventListener("DOMContentLoaded", () => {
    initMap();
    loadPools().then(() => {
        updateMarkersAndList(); // ✅ 초기 리스트 표시
    });
});


// ✅ 네이버 지도 초기화
function initMap() {
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(37.5665, 126.9780),
        zoom: 13
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLatLng = new naver.maps.LatLng(position.coords.latitude, position.coords.longitude);
            map.setCenter(userLatLng);
            updateMarkersAndList();
        });
    }

    // ✅ 지도 이동 후 리스트 자동 업데이트
    naver.maps.Event.addListener(map, "idle", updateMarkersAndList);
}

// ✅ 데이터 로드 (수영장 JSON 불러오기)
async function loadPools() {
    const response = await fetch("data/pools.json");
    pools = await response.json();
    updateMarkers(pools);
    displayPools(pools);
}

// ✅ 바텀시트에 수영장 리스트 표시
function displayPools(poolsToShow) {
    const poolList = document.getElementById("poolList");
    poolList.innerHTML = "";

    if (poolsToShow.length === 0) {
        poolList.innerHTML = "<p>표시할 수영장이 없습니다.</p>";
        return;
    }

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

// ✅ 지도에 마커 업데이트
function updateMarkersAndList() {
    const bounds = map.getBounds();
    poolsInView = pools.filter(pool => bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng)));

    updateMarkers(poolsInView);

    if (typeof displayPools === "function") {
        if (resultContainer.style.display === "block") {
            updateSearchResults(poolsInView);
        } else {
            displayPools(poolsInView);
        }
    } else {
        console.error("❌ displayPools 함수가 정의되지 않음");
    }
}

// ✅ 지도에 마커 업데이트
function updateMarkers(poolsToShow) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    poolsToShow.forEach(pool => {
        const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(pool.lat, pool.lng),
            map: map,
            title: pool.id,
            icon: {
                url: "images/marker.png",
                size: new naver.maps.Size(23, 23),
                origin: new naver.maps.Point(0, 0),
                anchor: new naver.maps.Point(11, 20),
                scaledSize: new naver.maps.Size(23, 23)
            }
        });
        

        
    // ✅ 마커 클릭 시 바텀시트 → 카드 UI 전환
    ["click", "touchstart"].forEach(eventType => {
        naver.maps.Event.addListener(marker, eventType, (event) => {
            // console.log(`📌 마커 이벤트 감지됨: ${eventType}`, pool.name);
            // alert(`📌 마커 이벤트 감지됨: ${eventType} - ${pool.name}`);
            // console.log("✅ 마커 클릭 이벤트 감지됨: ", pool.id);  // 클릭 이벤트 감지 로그


            focusMarker(pool.id);
            focusCard(pool.id);
            showCardUI(poolsToShow);
        }, { passive: false });
    });
            markers.push(marker);
});
}

// // ✅ 지도 내 마커 & 리스트 업데이트
// function updateMarkersAndList() {
//     const bounds = map.getBounds();
//     poolsInView = pools.filter(pool => bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng)));

//     // 지도 위의 마커 리스트를 기준으로 UI 업데이트
//     updateMarkers(poolsInView);
//     if (resultContainer.style.display === "block") {
//         updateSearchResults(poolsInView); // 카드 UI 업데이트
//     } else {
//         displayPools(poolsInView); // 바텀시트 리스트 업데이트
//     }
    
// }


// ✅ 마커 강조 (포커스된 마커 크기 키우기)
function focusMarker(poolId) {

    clickedMarker = true; // 🔹 마커가 클릭되었음을 저장
    const targetCard = document.querySelector(`.pool-card[data-id='${poolId}']`);
    if (targetCard) {
        setTimeout(() => {
            targetCard.scrollIntoView({ behavior: "smooth", inline: "center" });
        }, 100);
    }

    markers.forEach(marker => {
        console.log("🎯 현재 마커 정보:", marker);
        console.log("🏷️  마커 Title 속성 (getTitle()):", marker.getTitle());
        console.log("🔍 마커 Title 속성 (getOptions()):", marker.getOptions("title"));
    
        if (marker.getTitle() === poolId) {

            console.log("✅ 마커 강조됨:", poolId); // 🔹 정상적으로 실행되는지 체크

            marker.setIcon({
                url: "images/selected-marker.png",
                size: new naver.maps.Size(35, 35),
                origin: new naver.maps.Point(0, 0),
                anchor: new naver.maps.Point(17, 30),
                scaledSize: new naver.maps.Size(35, 35)
            });
        } else {
            console.log("❌ 기본 마커 유지됨:", marker.getTitle()); // 🔹 디버깅

            marker.setIcon({
                url: "images/marker.png",
                size: new naver.maps.Size(23, 23),
                origin: new naver.maps.Point(0, 0),
                anchor: new naver.maps.Point(11, 20),
                scaledSize: new naver.maps.Size(23, 23)
            });
        }
    });
}



// ✅ 검색 실행 (엔터 키 입력 시)
searchInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") {
        executeSearch();
    }
});

// ✅ 검색 실행 함수
function executeSearch() {
    const keyword = searchInput.value.trim().toLowerCase();
    if (keyword.length === 0) return;

    const filteredPools = pools.filter(pool =>
        pool.name.toLowerCase().includes(keyword) ||
        pool.address.toLowerCase().includes(keyword)
    );

    showCardUI(filteredPools);
    moveToSearchArea(filteredPools);
}

// ✅ 바텀시트 숨기고 카드 UI 표시
function showCardUI(filteredPools) {
    bottomSheet.style.display = "none"; // 바텀시트 숨김
    resultContainer.style.display = "block"; // 카드 UI 표시
    updateSearchResults(filteredPools);
}

// ✅ 검색 결과 UI 업데이트 (카드 형태)

function updateSearchResults(filteredPools) {
    if (filteredPools.length === 0) {
        resultContainer.style.display = "none";
        return;
    }

    resultContainer.style.display = "block";
    resultCount.textContent = `검색 결과: ${filteredPools.length}개`;
    cardWrapper.innerHTML = "";

    filteredPools.forEach(pool => {
        const card = document.createElement("div");
        card.classList.add("pool-card");
        card.setAttribute("data-id", pool.id);
        card.innerHTML = `
            <h3>${pool.name}</h3>
            <p>${pool.address}</p>
            <button onclick="moveToPool(${pool.lat}, ${pool.lng})">위치 보기</button>
        `;
        cardWrapper.appendChild(card);
    });

    // ✅ 오직 검색 실행 시 첫 번째 카드로 이동 (마커 클릭 시는 실행 안 함)
    if (!clickedMarker) {  
        cardWrapper.scrollTo({ left: 0, behavior: "smooth" });
    }

    // ✅ 검색 후 다시 초기 상태로 설정
    clickedMarker = false;
}


// function updateSearchResults(filteredPools) {
//     if (filteredPools.length === 0) {
//         resultContainer.style.display = "none";
//         return;
//     }

//     resultContainer.style.display = "block";
//     resultCount.textContent = `검색 결과: ${filteredPools.length}개`;
//     cardWrapper.innerHTML = "";

//     filteredPools.forEach(pool => {
//         const card = document.createElement("div");
//         card.classList.add("pool-card");
//         card.setAttribute("data-id", pool.id);
//         card.innerHTML = `
//             <h3>${pool.name}</h3>
//             <p>${pool.address}</p>
//             <button onclick="moveToPool(${pool.lat}, ${pool.lng})">위치 보기</button>
//         `;
//         cardWrapper.appendChild(card);
//     });

//     // ✅ 오직 검색 실행 시 첫 번째 카드로 이동
//     if (!clickedMarker) {  
//         cardWrapper.scrollTo({ left: 0, behavior: "smooth" });
//     }
// }


// ✅ 검색 초기화 (X 버튼 클릭 시)
clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    resultContainer.style.display = "none"; // 카드 UI 삭제
    bottomSheet.style.display = "block"; // 바텀시트 다시 표시
    updateMarkersAndList();
});


// ✅ 특정 수영장 위치로 지도 이동
function moveToPool(lat, lng) {
    map.setCenter(new naver.maps.LatLng(lat, lng));
    map.setZoom(16);
}

// ✅ 마커 클릭 시 해당 카드로 이동
function focusCard(poolId) {
    const targetCard = document.querySelector(`.pool-card[data-id='${poolId}']`);
    if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", inline: "center" });
    }
}

// ✅ 검색된 지역 중심으로 지도 이동
function moveToSearchArea(filteredPools) {
    if (filteredPools.length === 0) return;

    let bounds = new naver.maps.LatLngBounds();
    filteredPools.forEach(pool => bounds.extend(new naver.maps.LatLng(pool.lat, pool.lng)));

    map.fitBounds(bounds, { padding: 30 });
}
