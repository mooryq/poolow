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


//bottomSheet 확장 클릭 이벤트const bottomSheet = document.getElementById("bottomSheet");
const handle = document.getElementById("handle");

let startY = 0; // 터치/마우스 시작 위치
let currentY = 0; // 현재 위치
let isDragging = false; // 드래그 중인지 여부
let isExpanded = false; // 현재 bottomSheet 상태

// ✅ 공통 이벤트 핸들러 (터치 & 마우스 이벤트를 처리)
function startDrag(event) {
    startY = event.touches ? event.touches[0].clientY : event.clientY; // 터치 or 마우스 Y 좌표 저장
    isDragging = true;
}

function moveDrag(event) {
    if (!isDragging) return;

    currentY = event.touches ? event.touches[0].clientY : event.clientY; // 현재 터치 or 마우스 위치
    let diff = currentY - startY; // 이동 거리 계산

    if (isExpanded && diff > 0) {
        bottomSheet.style.transform = `translateY(${diff}px)`;
    } else if (!isExpanded && diff < 0) {
        bottomSheet.style.transform = `translateY(${50 + diff}%)`;
    }
}

function endDrag() {
    isDragging = false;

    // ✅ 위로 드래그 → 전체 확장
    if (isExpanded || startY - currentY > 50) {
        bottomSheet.style.transform = "translateY(5%)";
        isExpanded = true;
    } 
    // ✅ 아래로 드래그 → 축소
    else if (!isExpanded || currentY - startY > 50) {
        bottomSheet.style.transform = "translateY(50%)";
        isExpanded = false;
    }
}

// ✅ 터치 이벤트 추가 (모바일)
handle.addEventListener("touchstart", startDrag);
handle.addEventListener("touchmove", moveDrag);
handle.addEventListener("touchend", endDrag);

// ✅ 마우스 이벤트 추가 (데스크톱)
handle.addEventListener("mousedown", startDrag);
document.addEventListener("mousemove", moveDrag);
document.addEventListener("mouseup", endDrag);
