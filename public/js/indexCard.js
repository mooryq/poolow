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
    console.log("📥 수영장 데이터 로딩 시작");

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

// ✅ 지도에 마커&리스트 업데이트
function updateMarkersAndList() {
    console.log("🔄 updateMarkersAndList() 실행됨");

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


// ✅ 지도에 마커 업데이트 (마커 크기 조절 기능 추가)
function updateMarkers(poolsToShow) {
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    poolsToShow.forEach(pool => {
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
        console.log(`📍 생성된 마커: ${pool.name}`);

        // ✅ 마커 클릭 시 선택된 수영장을 리스트 맨 앞에 배치
        ["click", "touchstart"].forEach(eventType => {
            naver.maps.Event.addListener(marker, eventType, (event) => {
                console.log(`✅ 마커 이벤트 감지됨: ${eventType} - ${pool.name}`);
                focusMarker(pool.name);
                showCardUI(poolsToShow, pool.name); // ✅ 선택된 수영장을 리스트 맨 앞으로 이동
            });
        });

        markers.push(marker);
    });
}



// ✅ 바텀시트 숨기고 카드 UI 표시 (선택된 수영장을 리스트 맨 앞에 정렬)
function showCardUI(filteredPools, selectedPoolName = null) {
    
    bottomSheet.style.display = "none"; // 바텀시트 숨김
    resultContainer.style.display = "block"; // 카드 UI 표시

    if (selectedPoolName) {
        const selectedIndex = filteredPools.findIndex(pool => pool.name === selectedPoolName);
        if (selectedIndex > -1) {
            const [selectedPool] = filteredPools.splice(selectedIndex, 1); // 기존 배열에서 제거
            filteredPools.unshift(selectedPool); // 맨 앞에 추가
        }
    }

    updateSearchResults(filteredPools);
    console.log(`📌 카드 리스트 업데이트 완료, 선택된 수영장 맨 앞으로 이동: ${filteredPools[0]?.name || "없음"}`);
}



// ✅ 마커 강조 (포커스된 마커 크기 키우기)
function focusMarker(poolName) {
    clickedMarker = true; // 🔹 마커가 클릭되었음을 저장

    markers.forEach(marker => {
        if (marker.getTitle() === String(poolName)) {
            marker.setIcon({
                url: "images/marker.png",
                size: new naver.maps.Size(35, 35),
                origin: new naver.maps.Point(0, 0),
                anchor: new naver.maps.Point(17, 30),
                scaledSize: new naver.maps.Size(35, 35)
            });
        } else {
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
     {console.log("✅ showCardUI 실행됨");}

    // moveToSearchArea(filteredPools, keyword);
        // ✅ moveToSearchArea 함수가 정상적으로 등록되었는지 확인
        if (typeof moveToSearchArea === "function") {
            moveToSearchArea(filteredPools, keyword); 
        } else {
            console.error("❌ moveToSearchArea 함수가 정의되지 않음!");
        }
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
        card.setAttribute("data-name", pool.name);
        card.innerHTML = `
            <h3>${pool.name}</h3>
            <p>${pool.address}</p>
            <button onclick="moveToPool(${pool.lat}, ${pool.lng})">위치 보기</button>
        `;
        cardWrapper.appendChild(card);
    });

    console.log(`📌 카드 리스트 업데이트 완료, 선택된 수영장 맨 앞으로 이동: ${filteredPools[0]?.name || "없음"}`);


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

function focusCard(poolName) {
    const targetCard = document.querySelector(`.pool-card[data-name="${poolName}"]`);
    if (targetCard) {
        const cardWrapper = document.getElementById("cardWrapper"); // 카드 리스트의 부모 컨테이너
        const cardRect = targetCard.getBoundingClientRect(); // 선택된 카드의 위치 정보
        const wrapperRect = cardWrapper.getBoundingClientRect(); // 카드 리스트 컨테이너 위치 정보

        // 카드 리스트의 스크롤 위치 조정 (가운데 정렬)
        cardWrapper.scrollTo({
            left: cardWrapper.scrollLeft + (cardRect.left - wrapperRect.left) - (wrapperRect.width / 2) + (cardRect.width / 2),
            behavior: "smooth"
        });

        console.log(`📌 선택된 카드 스크롤 조정됨: ${poolName}`);
    } else {
        console.warn(`❌ 해당하는 카드가 없음: ${poolName}`);
    }
}


