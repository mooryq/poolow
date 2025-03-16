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

        // // ✅ 지도 이동 후 마커 & 리스트 자동 업데이트
        // naver.maps.Event.addListener(map, "idle", () => {
        //     if (!clickedMarker) updateMarkersAndList();
        // });
    
    // ✅ 지도 이동 후 마커&리스트 자동 업데이트
    naver.maps.Event.addListener(map, "idle", updateMarkersAndList);
    
        
    // ✅ 1️⃣ 엔터(Enter) 입력 시 키보드 닫기
    searchInput.addEventListener("keypress", (event) => {
        console.log(`⌨️ keydown 이벤트 발생: ${event.key}`);

        // ✅ 엔터키가 아닌 경우 검색 실행 금지
        if (event.key !== "Enter") return;

        // ✅ 엔터 입력 시 검색 실행
        event.preventDefault();
        // const keyword = searchInput.value.trim(); // ✅ 현재 입력값 저장
        console.log("🚀 [keydown] Enter 감지됨 - 검색 실행 예정");

        executeSearch(event); // ✅ 검색 실행
        searchInput.blur(); // ✅ 키보드 내리기
        console.log("✅ [keydown] 엔터 입력 - 검색 실행 & 키보드 내림");
        // searchInput.value = keyword; 
        });

    // ✅ 2️⃣ 지도 클릭 또는 이동 시 키보드 닫기
    ["idle", "click"].forEach(eventType => {
        naver.maps.Event.addListener(map, eventType, function () {
            searchInput.blur();
            console.log(`✅ ${eventType} 이벤트 발생 - 키보드 내림`);
        });
    });
}



// ✅ 데이터 로드 (수영장 JSON 불러오기)
async function loadPools() {
    console.log("📥 수영장 데이터 로딩 시작");

    const response = await fetch("data/pools.json");
    pools = await response.json();
    updateMarkersAndList();
    updateMarkers(pools);
    displayPools(pools);
}


// ✅ 지도에 마커&리스트 업데이트
function updateMarkersAndList() {
    console.log("🔄 updateMarkersAndList() 실행됨");

    const bounds = map.getBounds();
    poolsInView = pools.filter(pool => bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng)));

    updateMarkers(poolsInView);
    displayPools(poolsInView);

    // if (typeof displayPools === "function") {
    //     if (resultContainer.style.display === "block") {
    //         updateSearchResults(poolsInView);
    //     } else {
    //         displayPools(poolsInView);
    //     }
    // } 
}



// ✅ 지도에 마커 업데이트 (마커 크기 조절 기능 추가)
function updateMarkers(poolsToShow) {
    
    // 기존 마커 제거
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

        // ✅ 마커 클릭 또는 터치 시 키보드 닫기 & 리스트 업데이트
        ["click", "touchstart"].forEach(eventType => {
            naver.maps.Event.addListener(marker, eventType, function () {
                console.log(`✅ 마커 ${eventType} 이벤트 감지됨 - ${pool.name}`);

                // ✅ 키보드 닫기
                searchInput.blur();
                console.log("✅ 키보드 내리기 실행됨");

                // ✅ 마커 포커스 및 카드 UI 갱신
                focusMarker(pool.name);
                showCardUI(poolsToShow, pool.name); // ✅ 선택된 수영장을 리스트 맨 앞으로 이동
            });
        });

        markers.push(marker);
    });
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

        // ✅ short-address: "동"까지 표시
        const addressParts = pool.address.split(" ");
        const shortAddress = addressParts.slice(0, 4).join(" "); // "동"까지 포함
        
        // ✅ 주말 기준 session 가져오기
        const weekendSessions = pool.sessions?.weekend || "시간표 정보 없음";

        poolItem.innerHTML = `  
        <div class="short-address">${shortAddress}</div>
            <div class="poolTitle">
                <div class="pool-name">${pool.name}</div>
                ${pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('')}
                <div class="fav-icon"><i class="fa-regular fa-heart"></i></div>
            </div>
            <div class="noti">${pool.off_day || ""}</div>
        `;
        poolList.appendChild(poolItem);
    });
}





// ✅ 바텀시트 숨기고 카드 UI 표시 (선택된 수영장을 리스트 맨 앞에 정렬)
function showCardUI(filteredPools, selectedPoolName = null) {
    console.log("✅ showCardUI 실행됨");
    console.log("📌 전달된 filteredPools:", filteredPools);

    bottomSheet.style.display = "none"; // 바텀시트 숨김
    resultContainer.style.display = "block"; // 카드 UI 표시
    console.log("✅ resultContainer 표시됨");


    if (selectedPoolName) {
        const selectedIndex = filteredPools.findIndex(pool => pool.name === selectedPoolName);
        if (selectedIndex > -1) {
            const [selectedPool] = filteredPools.splice(selectedIndex, 1); // 기존 배열에서 제거
            filteredPools.unshift(selectedPool); // 맨 앞에 추가
        }
    }
    console.log("📌 최종 filteredPools:", filteredPools);
    updateSearchResults(filteredPools);
    console.log(`📌 카드 리스트 업데이트 완료, 선택된 수영장 맨 앞으로 이동: ${filteredPools[0]?.name || "없음"}`);
    console.log("✅ showCardUI 실행됨22");
}
    




// ✅ 검색 실행 함수
function executeSearch(event = null) {
    const keyword = searchInput.value.trim().toLowerCase(); 
    if (keyword.length === 0) return;
    console.log(`🚀 executeSearch 실행됨 (검색어: ${keyword})`);

    const filteredPools = pools.filter(pool =>
        pool.name.toLowerCase().includes(keyword) ||
        pool.address.toLowerCase().includes(keyword)
    );
    console.log("📌 검색 결과:", filteredPools);


    showCardUI(filteredPools);
     {console.log("✅ showCardUI 실행됨");}

    // ✅ moveToSearchArea가 검색 입력 중 자동 실행되지 않도록 보장
    if (event && event.key === "Enter" && typeof moveToSearchArea === "function") {
        moveToSearchArea(filteredPools, keyword);
    } else if (!event) {
        console.warn("⚠️ moveToSearchArea 실행 조건 불충분 (event 없음 또는 Enter 입력 없음)");
    }
}


    


// ✅ 검색 결과 UI 업데이트 (카드 형태)
function updateSearchResults(filteredPools) {
    if (filteredPools.length === 0) {
        console.warn("⚠️ updateSearchResults: 검색 결과 없음!");
        resultContainer.style.display = "none";
        return;
    }

    resultContainer.style.display = "block";
    resultCount.textContent = `검색 결과: ${filteredPools.length}개`;
    cardWrapper.innerHTML = "";
    console.log(`📌 카드 업데이트 시작 - 총 ${filteredPools.length}개`);


    filteredPools.forEach(pool => {
        console.log(`🆕 카드 추가됨: ${pool.name}`);
        const card = document.createElement("div");
        card.classList.add("pool-card");
        card.setAttribute("data-name", pool.name);
        card.innerHTML = `
            <h3>${pool.name}</h3>
            <p>${pool.address}</p>
        `;

        // ✅ 카드 클릭 또는 터치 시 지도 중심 이동
        ["click", "touchstart"].forEach(eventType => {
            card.addEventListener(eventType, () => {
                moveToPool(pool.lat, pool.lng);
            });
        });

        cardWrapper.appendChild(card);
    });

    console.log(`📌 카드 리스트 업데이트 완료, 선택된 수영장 맨 앞으로 이동: ${filteredPools[0]?.name || "없음"}`);

    // // ✅ 검색 후 다시 초기 상태로 설정
    // clickedMarker = false;
    // console.log("🔄 clickedMarker 초기화됨");

}




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
    map.setZoom(14);

    // ✅ 마커 강조 (클릭된 마커 확대)
    focusMarker(poolName);

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