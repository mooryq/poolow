// ✅ 전역 변수 선언
let map;
let markers = [];
let pools = [];
let poolsInView = [];
let swiper;

let clickedMarker = false; // 🔹 마커 클릭 여부를 저장하는 변수


const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearch");
const swiperContainer = document.querySelector('.cardUI');





// ✅ 네이버 지도 초기화
function initMap() {
    return new Promise ((resolve, reject) => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLatLng = new naver.maps.LatLng(position.coords.latitude, position.coords.longitude);

            map = new naver.maps.Map("map", {
                center: userLatLng,
                zoom: 13
            });
            registerMapEvents();
            resolve();
        }, error => {
            console.error("Geolocation error:",error);
            defaultCenter().then(resolve);
        });
    }else {
        defaultCenter().then(resolve);
    }
});
}

// 네이버지도: 사용자 위치 못찾으면 디폴트 센터 가져옴
function defaultCenter() {
    return new Promise((resolve, reject) => {
    const defaultLatLng = new naver.maps.LatLng(37.5665, 126.9780);
    map = new naver.maps.Map("map", {
        center: defaultLatLng,
        zoom: 13
    });
    registerMapEvents();
    resolve();
});
}


// 📍 지도 이동or지도 클릭 시 
//  1️⃣ 마커 & 리스트 업데이트
//  2️⃣ (모바일에서) 키보드 닫기, (PC) 검색창에서 커서 빼앗기
// To do ! 지도 클릭에 더불어 터치시도 포함 시켜야 할지 모바일에서 테스트 하기
//setTimeout: idle 이벤트가 없이 일정 시간이 지나면 fallback이 실행
// 사용자 의도한 idle 발생시 중복호출을 피하기 위해, 플래그를 사용해 idle 이벤트 후에는 호출을 방지 : idle event true/false
// 이 코드는 해당 함수 내에서 로컬변수로 설정

function registerMapEvents() {
    let idleCalled = false; // idle 이벤트가 발생했는지 여부를 판단하는 flag

    naver.maps.Event.addListener(map, "idle", () => {
        if (clickedMarker) {
            console.log("idle 이벤트: 마커 클릭으로 인해 updateMarkersAndList 호출 건너뜀");
            // flag 초기화
            clickedMarker = false;
        } else {
            idleCalled = true; //idle 이벤트 의도적 발생시
            updateMarkersAndList();
            searchInput.blur();
        }
   });

    naver.maps.Event.addListener(map, "click", () => {
         searchInput.blur();
    });
    registerKeyboardEvents();

        // fallback: 500ms 내에 idle 이벤트가 발생하지 않으면 updateMarkersAndList() 호출
        setTimeout(() => {
            if (!idleCalled && !clickedMarker) {
                updateMarkersAndList();
            }
        }, 500);
    
}



function initSwiper() {
    if (!window.Swiper) {
        return;
    }

    if (swiper) {
        swiper.destroy(true, true); // 기존 Swiper 제거
    }

    swiper = new Swiper(".swiper-container", {
        slidesPerView: 'auto',
        centeredSlides: true,
        spaceBetween: 20,
        grabCursor: true,
        preventClicks: true,
        preventClicksPropagation: true,      
        // loop: false, // 무한 루프 방지
        on: {
            slideChange: function () {
                const activeSlide = this.slides[this.activeIndex];
                if (activeSlide) {
                    const name = activeSlide.getAttribute("data-name");
                    const lat = activeSlide.getAttribute("data-lat");
                    const lng = activeSlide.getAttribute("data-lng");
                    if (lat && lng && name) {
                        moveToPool(parseFloat(lat), parseFloat(lng), name);
                    } else {
                        console.warn("활성 슬라이드의 데이터 속성이 부족합니다.");
                    }
                }
            },
            tap: (swiper, e) => {
                const slide = e.target.closest('.swiper-slide');
                if (!slide) return;
          
                const url = slide.dataset.link;
                if (url) {
                  console.log("📍 탭 → 이동!", url);
                  window.location.href = url;
                }
              }
        }
    });
    console.log("✅ Swiper 초기화 완료 - swiperContainer display:", swiperContainer.style.display);
}


// // ✅ Swiper 초기화 이후에 카드들 선택해서 이벤트 걸기
// document.querySelectorAll('.swiper-slide').forEach(card => {
//     let startX = 0;
//     let endX = 0;
  
//     card.addEventListener('touchstart', (e) => {
//       startX = e.touches[0].clientX;
//     });
  
//     card.addEventListener('touchend', (e) => {
//       endX = e.changedTouches[0].clientX;
//       const diff = Math.abs(endX - startX);
  
//       if (diff < 10) {
//         const url = card.dataset.link;
//         if (url) window.location.href = url;
//       }
//     });
//   });




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

    displayPools(pools);
}


// ✅ 지도에 마커&리스트 업데이트
function updateMarkersAndList() {

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
        console.log(`📍 생성된 마커: ${pool.name}`);

        // ✅ 마커 클릭 또는 터치 시 이벤트 추가
        ["click", "touchstart"].forEach(eventType => {
            naver.maps.Event.addListener(marker, eventType, function () {

                // 마커 클릭 시 flag 설정
                clickedMarker = true;

                // ✅ 키보드 닫기
                searchInput.blur();
                console.log("✅ 키보드 내리기 실행됨");

                // ✅ 마커 포커스 및 카드 UI 갱신
                moveToPool(pool.lat, pool.lng, pool.name);
                
                showCardUI(poolsInView, pool.name); 
                // // ✅ 검색 결과가 없거나 바텀시트가 닫힌 상태에서도 작동하도록 전체 풀에서 해당 풀만 찾아서 전달
                // const matchedPools = pools.filter(p => p.name === pool.name);
                // if (matchedPools.length > 0) {
                //     showCardUI(matchedPools, pool.name);
                // } else {
                //     console.warn("❗ 마커 클릭했지만 해당하는 수영장을 리스트에서 찾지 못함");
                // }
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


        poolItem.addEventListener('click', () => {
            // ✅ 마커 클릭처럼 동작
            moveToPool(pool.lat, pool.lng, pool.name);
            showCardUI(poolsInView, pool.name); // 현재 리스트를 기반으로 카드 UI 갱신
        });

        poolList.appendChild(poolItem);
    });
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


    // ✅ moveToSearchArea가 검색 입력 중 자동 실행되지 않도록 보장
    if (event && event.key === "Enter" && typeof moveToSearchArea === "function") {
        moveToSearchArea(filteredPools, keyword);
    } else if (!event) {
        console.warn("⚠️ moveToSearchArea 실행 조건 불충분 (event 없음 또는 Enter 입력 없음)");
    }
}





// ✅ 바텀시트 숨기고 카드 UI 표시
function showCardUI(filteredPools, selectedPoolName = null) {
    
    bottomSheet.style.display = "none"; // 바텀시트 숨김
    swiperContainer.classList.remove('hidden'); // 카드 UI 표시

    updateSearchResults(filteredPools); // 카드 렌더링

    // ✅ 선택된 수영장 카드로 Swiper 이동
    setTimeout(() => {
        if (selectedPoolName) {
            const index = filteredPools.findIndex(pool => pool.name === selectedPoolName);
            if (index > -1) {
                console.log("📌 swiper.slideTo 실행:", index);
                swiper.slideTo(index, 300); // 300ms 동안 슬라이드 이동
            }
        }
    }, 100); // swiper.update() 후 실행되도록 약간의 딜레이
}
    
    
 // ✅ 마커 선택시 or 검색결과 Swiper를 사용하여 UI 업데이트 (카드 형태)
 function updateSearchResults(filteredPools) {
    const swiperWrapper = swiperContainer.querySelector('.swiper-wrapper');
    if (!swiperWrapper) return;

    swiperWrapper.innerHTML = ''; // 기존 슬라이드 초기화
 
     if (filteredPools.length === 0) {
         swiperContainer.style.display = "none";
         return;
     }
 
    filteredPools.forEach(pool => {
        const slide = document.createElement("div");  // ✅ 'swiper-slide' 클래스를 가진 div 생성
        slide.classList.add("swiper-slide");

        // ✅ Swiper Slide에 pool 정보 저장, 슬라이드 이동 시 moveToPool 호출 할 때 비교할 데이터
        slide.setAttribute("data-name", pool.name);   
        slide.setAttribute("data-lat", pool.lat);
        slide.setAttribute("data-lng", pool.lng);
        slide.setAttribute('data-link', `detail.html?poolId=${pool.id}`); 

        

         slide.innerHTML = `
             <div class="short-address">${pool.address.split(" ").slice(0, 4).join(" ")}</div>
             <div class="poolTitle">
                 <div class="pool-name">${pool.name}</div>
                 ${pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('')}
             </div>
             <div class="noti">${pool.off_day || ""}</div>
         `;
         
         swiperWrapper.appendChild(slide);
     });

    swiper.update()
    swiper.slideTo(0, 0); // ✅ 첫 번째 슬라이드로 강제 이동 (애니메이션 없이)

 }



// ✅ 검색 초기화 (X 버튼 클릭 시)
clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    bottomSheet.style.display = "block"; // 바텀시트 다시 표시
    swiperContainer.classList.add("hidden"); // ✅ 카드 UI 숨기기
    updateMarkersAndList();
});


// ✅ 특정 수영장 위치로 지도 이동
function moveToPool(lat, lng, poolName) {

    console.log("poolName 전달값:", poolName);
    markers.forEach(marker => console.log("마커 title:", marker.getTitle()));

    map.setCenter(new naver.maps.LatLng(lat, lng));
    map.setZoom(12);


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
