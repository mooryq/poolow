// ✅ 전역 변수 선언
let map;
let markers = [];
let pools = [];
let poolsInView = [];

let clickedMarker = false; // 🔹 마커 클릭 여부를 저장하는 변수
let swiper;


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
    initializeSwiper(); // Swiper 초기화
});


// ✅ Swiper 초기화 함수

function initSwiper() {
    if (swiper) {
        swiper.destroy(true, true); // 기존 Swiper 제거
    }

    swiper = new Swiper('.cardUI', {
        slidesPerView: 1,
        centeredSlides: true,
        spaceBetween: 30,
        grabCursor: true,
        loop: false, // 무한 루프 방지
        on: {
            slideChange: function () {
                updateFocusFromActiveSlide();  // 🔥 활성 슬라이드 변경될 때 자동 실행
            }
        }
    });
}


  

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


    // 이 코드에 지도이동 뿐 아니라, 마커클릭시에도 리스트 업데이트 하도록 수정해야함
        // // ✅ 지도 이동 후 마커 & 리스트 자동 업데이트
        // naver.maps.Event.addListener(map, "idle", () => {
        //     if (!clickedMarker) updateMarkersAndList();
        // });
    
    // ✅ 1️⃣ 지도 이동 후 마커&리스트 자동 업데이트
    naver.maps.Event.addListener(map, "idle", updateMarkersAndList);
    

    // ✅ 2️⃣ 지도 클릭 또는 이동 시 키보드 닫기
    ["idle", "click"].forEach(eventType => {
        naver.maps.Event.addListener(map, eventType, function () {
            searchInput.blur();
            console.log(`✅ ${eventType} 이벤트 발생 - 키보드 내림`);
        });
    });

    // // ✅ 3️⃣ 마커 클릭 시 리스트 업데이트
    // markers.forEach(marker => {
    //     naver.maps.Event.addListener(marker, "click", () => {
    //         updateMarkersAndList();
    //     });
    // });


    // ✅ 키보드 관련 이벤트 리스너 별도 함수로 등록 - 코드 뒤쪽
    registerKeyboardEvents();
}


// ✅ 키보드 이벤트 리스너 등록 함수
function registerKeyboardEvents() {
    searchInput.addEventListener("keypress", (event) => {
        console.log(`⌨️ keypress 이벤트 발생: ${event.key}`);
        
        // ✅ 엔터키가 아닌 경우 검색 실행 금지
        if (event.key !== "Enter") return;

        // ✅ 엔터 입력 시 검색 실행
        event.preventDefault();
        console.log("🚀 [keypress] Enter 감지됨 - 검색 실행 예정");

        executeSearch(event);
        searchInput.blur();
        console.log("✅ [keypress] 엔터 입력 - 검색 실행 & 키보드 내림");
    });
}


// ✅ 데이터 로드 (수영장 JSON 불러오기)
async function loadPools() {
    console.log("📥 수영장 데이터 로딩 시작");

    const response = await fetch("data/pools.json");
    pools = await response.json();
    updateMarkersAndList();
    updateSwiperSlides(pools);
    updateMarkers(pools);
    displayPools(pools);
}


// // ✅ 지도에 마커&리스트 업데이트
// function updateMarkersAndList() {
//     console.log("🔄 updateMarkersAndList() 실행됨");

//     const bounds = map.getBounds();
//     poolsInView = pools.filter(pool => bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng)));


//     // 기존 마커 제거
//     markers.forEach(marker => marker.setMap(null));
//     markers = [];

//     poolsInView.forEach(pool => {
//         const marker = new naver.maps.Marker({
//             position: new naver.maps.LatLng(pool.lat, pool.lng),
//             map: map,
//             title: pool.name,
//             icon: {
//                 url: "images/marker.png",
//                 size: new naver.maps.Size(23, 23),
//                 origin: new naver.maps.Point(0, 0),
//                 anchor: new naver.maps.Point(11, 20),
//                 scaledSize: new naver.maps.Size(23, 23)
//             }
//         });
//         console.log(`📍 생성된 마커: ${pool.name}`);

//         // ✅ 마커 클릭 또는 터치 시 이벤트 추가
//         ["click", "touchstart"].forEach(eventType => {
//             naver.maps.Event.addListener(marker, eventType, function () {
//                 console.log(`✅ 마커 ${eventType} 이벤트 감지됨 - ${pool.name}`);

//                 // ✅ 키보드 닫기
//                 searchInput.blur();
//                 console.log("✅ 키보드 내리기 실행됨");

//                 // ✅ 마커 포커스 및 카드 UI 갱신
//                 moveToPool(pool.lat, pool.lng, pool.name);
//                 showCardUI(poolsInView, pool.name); // ✅ 선택된 수영장을 리스트 맨 앞으로 이동
//             });
//         });

//         markers.push(marker);
//     });
        
// //  updateMarkers(poolsInView);
//     displayPools(poolsInView);
// }

function updateMarkersAndList() {
    console.log("🔄 updateMarkersAndList() 실행됨");

    const bounds = map.getBounds();
    poolsInView = pools.filter(pool => bounds.hasLatLng(new naver.maps.LatLng(pool.lat, pool.lng)));

    // 기존 마커 제거
    markers.forEach(marker => marker.setMap(null));
    markers = [];

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
        // ✅ 마커 클릭 시 이벤트 추가
        ["click", "touchstart"].forEach(eventType => {
            naver.maps.Event.addListener(marker, eventType, function () {
                console.log(`✅ 마커 ${eventType} 이벤트 감지됨 - ${pool.name}`);


        console.log(`📍 생성된 마커: ${pool.name}`);
    
        // ✅ 지도 중심 이동 및 마커 강조
        moveToPool(pool.lat, pool.lng, pool.name);    
        // ✅ 카드 UI 갱신 및 Swiper 첫 번째 슬라이드로 이동        
        handleMarkerClick(pool.name);
            });
        });
        
        markers.push(marker);
    });

    displayPools(poolsInView);
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

//📌 현재 보이는 Swiper 슬라이드 정보를 가져와 지도 & 마커 업데이트
function updateFocusFromActiveSlide() {
    const activeSlide = swiper.slides[swiper.activeIndex]; // 현재 활성화된 슬라이드 가져오기
    if (!activeSlide) return;

    const poolName = activeSlide.getAttribute("data-name");
    const lat = parseFloat(activeSlide.getAttribute("data-lat"));
    const lng = parseFloat(activeSlide.getAttribute("data-lng"));

    if (poolName && lat && lng) {
        console.log(`🎯 [Swiper] 활성 슬라이드 변경: ${poolName}`);
        moveToPool(lat, lng, poolName);  // 🔥 자동으로 지도 & 마커 업데이트
    }
}

//📌 마커 클릭 시 Swiper 첫 번째 카드로 이동

function handleMarkerClick(poolName) {
    const selectedPool = pools.find(pool => pool.name === poolName);
    if (!selectedPool) return;

    console.log(`📍 마커 클릭 - ${poolName}`);

    // ✅ 해당 수영장을 첫 번째 카드로 설정한 뒤 Swiper 초기화
    showCardUI([selectedPool, ...poolsInView.filter(pool => pool.name !== poolName)], poolName);

    // ✅ Swiper를 첫 번째 슬라이드로 이동
    setTimeout(() => {
        console.log("🔄 [Swiper] 첫 번째 슬라이드로 이동");
        swiper.slideTo(0); // Swiper 첫 번째 카드로 이동
    }, 300);
}



// ✅ Swiper 컨테이너를 한 번만 선택하여 재사용
const swiperContainer = document.querySelector('.cardUI');


function showCardUI(filteredPools, selectedPoolName = null) {
    console.log("✅ showCardUI 실행됨");
    console.log("📌 전달된 filteredPools:", filteredPools);

    bottomSheet.style.display = "none"; // 바텀시트 숨김
    swiperContainer.style.display = "block"; // Swiper 표시
    swiperContainer.innerHTML = ''; // 기존 슬라이드 초기화

    console.log("✅ [Swiper] 카드 UI 표시됨");

    // ✅ Swiper 슬라이드 생성
    filteredPools.forEach(pool => {
        console.log(`🆕 카드 추가됨: ${pool.name}`);
        const slide = document.createElement("swiper-slide");

        slide.setAttribute("data-name", pool.name);
        slide.setAttribute("data-lat", pool.lat);
        slide.setAttribute("data-lng", pool.lng);

        slide.innerHTML = `
            <div class="short-address">${pool.address.split(" ").slice(0, 4).join(" ")}</div>
            <div class="poolTitle">
                <div class="pool-name">${pool.name}</div>
                ${pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('')}
            </div>
            <div class="noti">${pool.off_day || ""}</div>
        `;

        swiperContainer.appendChild(slide);
    });

    // ✅ Swiper 다시 초기화
    initSwiper();
    console.log(`📌 [Swiper] 카드 리스트 업데이트 완료, 첫 번째 수영장: ${filteredPools[0]?.name || "없음"}`);
}


// // ✅ 바텀시트 숨기고 카드 UI 표시 (지도 위 마커에서 선택한 수영장을 리스트 맨 앞에 정렬)
// function showCardUI(filteredPools, selectedPoolName = null) {
// console.log("✅ showCardUI 실행됨");
// console.log("📌 전달된 filteredPools:", filteredPools);

//     bottomSheet.style.display = "none"; // 바텀시트 숨김
//     swiperContainer.style.display = "block"; // Swiper 표시
//     swiperContainer.innerHTML = ''; // 기존 슬라이드 초기화

// console.log("✅ cardUI 표시됨");

// // ✅ 선택된 수영장을 리스트 맨 앞으로 정렬
//     if (selectedPoolName) {
//         const selectedIndex = filteredPools.findIndex(pool => pool.name === selectedPoolName);
//         if (selectedIndex > -1) {
//             const [selectedPool] = filteredPools.splice(selectedIndex, 1); // 기존 배열에서 제거
//             filteredPools.unshift(selectedPool); // 맨 앞에 추가
//         }
//     }
//     console.log("📌 최종 filteredPools:", filteredPools);
    
//     updateSearchResults(filteredPools);

//     console.log(`📌 Swiper 카드 리스트 업데이트 완료, 선택된 수영장 맨 앞으로 이동: ${filteredPools[0]?.name || "없음"}`);
//     console.log("✅ showCardUI 실행종료");
// }
    
    
 // ✅ 마커 선택시 or 검색결과 Swiper를 사용하여 UI 업데이트 (카드 형태)
 function updateSearchResults(filteredPools) {
     swiperContainer.innerHTML = ''; // 기존 슬라이드 초기화
 
     if (filteredPools.length === 0) {
         console.warn("⚠️ updateSearchResults: 검색 결과 없음!");
         swiperContainer.style.display = "none";
         return;
     }
 
     swiperContainer.style.display = "block";
     console.log(`📌 카드 업데이트 시작 - 총 ${filteredPools.length}개`);
 
    filteredPools.forEach(pool => {
        console.log(`🆕 카드 추가됨: ${pool.name}`);
         const slide = document.createElement("swiper-slide");
 
         slide.innerHTML = `
             <div class="short-address">${pool.address.split(" ").slice(0, 4).join(" ")}</div>
             <div class="poolTitle">
                 <div class="pool-name">${pool.name}</div>
                 ${pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('')}
             </div>
             <div class="noti">${pool.off_day || ""}</div>
         `;
 
         // ✅ 카드 클릭 또는 터치 시 지도 중심 이동 & 마커 강조
         ["click", "touchstart"].forEach(eventType => {
             slide.addEventListener(eventType, () => {
                 moveToPool(pool.lat, pool.lng, pool.name);
             });
         });
 
         swiperContainer.appendChild(slide);
     });
 
     // Swiper 다시 초기화
     initSwiper();
     console.log(`📌 Swiper 카드 리스트 업데이트 완료, 첫 번째 수영장: ${filteredPools[0]?.name || "없음"}`);
 }




// ✅ 검색 초기화 (X 버튼 클릭 시)
clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    resultContainer.style.display = "none"; // 카드 UI 삭제
    bottomSheet.style.display = "block"; // 바텀시트 다시 표시
    updateMarkersAndList();
});


// ✅ 특정 수영장 위치로 지도 이동
function moveToPool(lat, lng, poolName) {
    map.setCenter(new naver.maps.LatLng(lat, lng));
    map.setZoom(14);


    // ✅ 기존 마커 스타일 초기화
    markers.forEach(marker => {
        marker.setIcon({
            url: "images/marker.png",
            size: new naver.maps.Size(23, 23),
            origin: new naver.maps.Point(0, 0),
            anchor: new naver.maps.Point(11, 20),
            scaledSize: new naver.maps.Size(23, 23)
        });
    });

    // ✅ 클릭한 마커 강조 (확대)
    const targetMarker = markers.find(marker => marker.getTitle() === String(poolName));
    if (targetMarker) {
        console.log(`🔥 포커스 적용 - ${targetMarker.getTitle()}`);
        targetMarker.setIcon({
            url: "images/marker.png",
            size: new naver.maps.Size(35, 35),
            origin: new naver.maps.Point(0, 0),
            anchor: new naver.maps.Point(17, 30),
            scaledSize: new naver.maps.Size(35, 35)
        });
    } else {
        console.warn(`⚠️ 해당하는 마커를 찾을 수 없음: ${poolName}`);
    }
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


