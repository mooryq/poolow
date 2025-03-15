// 네이버 지도 기본 js
var map;

function initMap() {
    map = new naver.maps.Map("map", {
        center: new naver.maps.LatLng(37.5665, 126.9780), // 기본 위치 (서울)
        zoom: 15
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            function(position) {
                var userLat = position.coords.latitude;
                var userLng = position.coords.longitude;

                var userLocation = new naver.maps.LatLng(userLat, userLng);
                map.setCenter(userLocation); // 지도 중심 변경
                
                // 사용자 위치 마커 추가
                var marker = new naver.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "현재 위치"
                });
            },
            function(error) {
                console.error("위치를 가져올 수 없습니다.", error);
            }
        );
    } else {
        alert("이 브라우저에서는 위치 정보를 지원하지 않습니다.");
    }
}

window.onload = initMap;


// ✅ `DOMContentLoaded` 이벤트 추가
document.addEventListener("DOMContentLoaded", () => {
    loadPools();
});



// bottomSheet 확장 클릭 이벤트
const bottomSheet = document.getElementById("bottomSheet");
const handle = document.getElementById("handle");

let startY = 0;      // 드래그 시작 위치
let currentY = 0;    // 현재 위치
let isDragging = false;
let isExpanded = false;

function startDrag(event) {
    // 터치 이벤트와 마우스 이벤트를 모두 처리
    startY = event.touches ? event.touches[0].clientY : event.clientY;
    isDragging = true;
}

function moveDrag(event) {
    if (!isDragging) return;
    currentY = event.touches ? event.touches[0].clientY : event.clientY;
    let diff = currentY - startY;
    
    if (isExpanded && diff > 0) {
        bottomSheet.style.transform = `translateY(${diff}px)`;
    } else if (!isExpanded && diff < 0) {
        bottomSheet.style.transform = `translateY(${50 + diff}%)`;
    }
}

function endDrag() {
    isDragging = false;
    const dragDistance = currentY - startY;
    // 위로 드래그 시 (올리기)
    if (dragDistance < -50 || !isExpanded) {
        bottomSheet.style.transform = "translateY(35px)";  // 최상단에서 약간 띄우기
        isExpanded = true;
    }
    // 아래로 드래그 시 (내리기)
    else if (dragDistance > 50 || isExpanded) {
        bottomSheet.style.transform = "translateY(50%)";  // 원래 위치로
        isExpanded = false;
    }
}

// 터치 이벤트 (모바일)
handle.addEventListener("touchstart", startDrag);
handle.addEventListener("touchmove", moveDrag);
handle.addEventListener("touchend", endDrag);

// 마우스 이벤트 (PC)
handle.addEventListener("mousedown", startDrag);
document.addEventListener("mousemove", moveDrag);
document.addEventListener("mouseup", endDrag);


// const bottomSheet = document.getElementById("bottomSheet");
// const handle = document.getElementById("handle");

// let startY = 0; // 터치 시작 위치
// let currentY = 0; // 현재 터치 위치
// let isDragging = false; // 드래그 중인지 여부
// let isExpanded = false; // 현재 bottomSheet 상태

// // ✅ 터치 시작 시 (손가락을 화면에 댐)
// handle.addEventListener("touchstart", (event) => {
//     startY = event.touches[0].clientY; // 터치 시작 위치 저장
//     isDragging = true;
// });

// // ✅ 터치 중 (손가락을 움직임)
// handle.addEventListener("touchmove", (event) => {
//     if (!isDragging) return;

//     currentY = event.touches[0].clientY; // 현재 터치 위치
//     let diff = currentY - startY; // 이동 거리 계산

//     if (isExpanded && diff > 0) {
//         bottomSheet.style.transform = `translateY(${diff}px)`;
//     } else if (!isExpanded && diff < 0) {
//         bottomSheet.style.transform = `translateY(${50 + diff}%)`;
//     }
// });

// // ✅ 터치 끝났을 때 (손가락을 뗌)
// handle.addEventListener("touchend", () => {
//     isDragging = false;
    
//     const dragDistance = currentY - startY; // 드래그 거리 계산

//     // ✅ 위로 드래그한 경우 (올리기)
//     if (dragDistance < -50 || !isExpanded) {
//         bottomSheet.style.transform = "translateY(35px)"; // 최상단으로 이동
//         isExpanded = true;
//     }
//     // ✅ 아래로 드래그한 경우 (내리기)
//     else if (dragDistance > 50 || isExpanded) {
//         bottomSheet.style.transform = "translateY(50%)"; // 원래 위치로 이동
//         isExpanded = false;
//     }
// });

async function loadPools() {
    try {
        console.log("🔍 loadPools() 함수 실행됨!");  // 🚀 실행 여부 확인

        const response = await fetch("data/pools.json");
        const pools = await response.json();

        // console.log("✅ JSON 데이터 불러오기 성공:", pools); // 🚀 JSON 데이터 확인

        displayPools(pools);
        displayMarkers(pools);
    } catch (error) {
        console.error("❌ 데이터 불러오기 오류:", error);
    }
}



function displayPools(pools) {
    const poolList = document.getElementById("poolList");
    poolList.innerHTML = ""; // 기존 리스트 초기화

    // console.log("✅ 리스트에 추가할 데이터:", pools); // 🚀 리스트 데이터 확인

    pools.forEach(pool => {
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



function displayMarkers(pools) {
    pools.forEach(pool => {
        // console.log("✅ 마커 추가됨:", pool.name, pool.lat, pool.lng); // 🚀 마커 추가 확인
        console.log("마커 이미지 경로:", "images/marker.png");

        const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(pool.lat, pool.lng),
            map: map,
            title: pool.name,
            icon: {
                url: "images/marker.png", // 마커 이미지 파일 경로
                size: new naver.maps.Size(23, 23), // 마커 크기 (픽셀 단위)
                origin: new naver.maps.Point(0, 0), // 이미지 원본의 시작 위치
                anchor: new naver.maps.Point(11, 20), // 마커 기준점 (하단 중앙)
                scaledSize: new naver.maps.Size(23, 23) // 이미지를 축소된 크기로 표시
            }

        });

        // ✅ 마커 클릭 이벤트 추가
        naver.maps.Event.addListener(marker, "click", function () {
            map.setCenter(marker.getPosition());
            map.setZoom(16);
        });

    });
}

function moveToPool(lat, lng) {
    map.setCenter(new naver.maps.LatLng(lat, lng));
    map.setZoom(16);
}
