const bottomSheet = document.getElementById("bottomSheet");
const handle = document.getElementById("handle");
const poolList = document.getElementById("poolList");

let startY = 0; // 터치/마우스 시작 위치
let isDragging = false; // 드래그 여부
let isExpanded = false; // 바텀시트 확장 여부
let isAtTopOnce = false; // 리스트 최상단에서 한 번 스크롤 여부

// ✅ BottomSheet 초기 높이 설정
function initializeBottomSheet() {
    bottomSheet.style.height = "25dvh";
    poolList.style.maxHeight = "calc(25dvh - 40px)";
    poolList.style.overflowY = "auto";
    updateBottomSheetStyle();
}

// ✅ 바텀시트 크기 및 스타일 업데이트
function toggleBottomSheet(expand) {
    if (expand === isExpanded) return; // ✅ 상태가 이미 동일하면 실행 안 함

    bottomSheet.style.height = expand ? "95dvh" : "25dvh";
    poolList.style.maxHeight = expand ? "calc(95dvh - 40px)" : "calc(25dvh - 40px)";
    isExpanded = expand;
    updateBottomSheetStyle();
}

// ✅ border-radius 변경 (바텀시트가 맨 위로 확장되었을 때)
function updateBottomSheetStyle() {
    bottomSheet.style.borderRadius = isExpanded ? "0" : "20px 20px 0 0";
}

// ✅ 드래그 이벤트 핸들러 (PC & 모바일)
function startDrag(event) {
    startY = event.touches?.[0]?.clientY || event.clientY;
    document.addEventListener(event.touches ? "touchmove" : "mousemove", onMove);
    document.addEventListener(event.touches ? "touchend" : "mouseup", stopDrag);
}

function onMove(event) {
    const currentY = event.touches?.[0]?.clientY || event.clientY;
    const diff = startY - currentY;

    if (diff > 20) toggleBottomSheet(true); // 위로 드래그 → 확장
    else if (diff < -20 && isExpanded) toggleBottomSheet(false); // 아래로 드래그 → 축소
}

function stopDrag(event) {
    document.removeEventListener(event.touches ? "touchmove" : "mousemove", onMove);
    document.removeEventListener(event.touches ? "touchend" : "mouseup", stopDrag);
}

// ✅ 핸들 드래그 이벤트 (PC & 모바일)
handle.addEventListener("mousedown", startDrag);
handle.addEventListener("touchstart", startDrag);

// ✅ 리스트 추가 후 내부 스크롤 활성화
function displayPools(pools) {
    poolList.innerHTML = pools.map(pool => `
        <div class="pool-item">
            <h3>${pool.name}</h3>
            <p>${pool.address}</p>
            <button onclick="moveToPool(${pool.lat}, ${pool.lng})">위치 보기</button>
        </div>
    `).join("");

    poolList.style.overflowY = "auto";
}

// ✅ 모바일: 리스트 최상단에서 추가 터치 시 바텀시트 접기
let touchStartY = 0;
poolList.addEventListener("touchstart", (event) => {
    touchStartY = event.touches[0].clientY;
});

poolList.addEventListener("touchmove", (event) => {
    const touchMoveY = event.touches[0].clientY;

    if (poolList.scrollTop === 0) {
        if (!isAtTopOnce) {
            isAtTopOnce = true; // ✅ 첫 번째 스크롤 (멈춤)
        } else if (touchMoveY > touchStartY + 20) {
            toggleBottomSheet(false); // ✅ 두 번째 터치 스크롤 시 바텀시트 접기
        }
    } else {
        isAtTopOnce = false; // ✅ 다시 스크롤하면 상태 초기화
    }
});

// ✅ 핸들 영역에서 마우스 휠로 바텀시트 확장/축소 가능 (PC)
handle.addEventListener("wheel", (event) => {
    if (event.deltaY > 0 && !isExpanded) {
        toggleBottomSheet(true); // 위로 스크롤 → 확장
    } else if (event.deltaY < 0 && isExpanded) {
        toggleBottomSheet(false); // 아래로 스크롤 → 축소
    }
});

// ✅ 초기 설정 실행
initializeBottomSheet();


// const bottomSheet = document.getElementById("bottomSheet");
// const handle = document.getElementById("handle");
// const poolList = document.getElementById("poolList");

// let startY = 0; // 터치/마우스 시작 위치
// let isExpanded = false; // 바텀시트 확장 여부

// // ✅ BottomSheet 초기 높이 설정 (고정)
// function initializeBottomSheet() {
//     bottomSheet.style.height = "25dvh"; // 기본 높이 설정
//     poolList.style.maxHeight = "calc(25dvh - 40px)"; // 리스트 스크롤 가능 설정 (40px = 핸들 높이)
//     poolList.style.overflowY = "auto"; // 리스트 내부 스크롤 활성화
// }

// // ✅ 바텀시트 크기 조절 함수
// function toggleBottomSheet(expand) {
//     if (expand === isExpanded) return; // ✅ 상태가 이미 동일하면 실행하지 않음

//     bottomSheet.style.height = expand ? "95dvh" : "25dvh"; // 높이 조정
//     poolList.style.maxHeight = expand ? "calc(95dvh - 40px)" : "calc(25dvh - 40px)";
//     isExpanded = expand;
// }

// // ✅ 공통 드래그 이벤트 핸들러 (PC & 모바일)
// function startDrag(event) {
//     startY = event.touches ? event.touches[0].clientY : event.clientY; // 터치 or 마우스 시작 위치 저장
//     document.addEventListener(event.touches ? "touchmove" : "mousemove", onMove);
//     document.addEventListener(event.touches ? "touchend" : "mouseup", stopDrag);
// }

// function onMove(event) {
//     const currentY = event.touches ? event.touches[0].clientY : event.clientY;
//     const diff = startY - currentY;

//     if (diff > 20) toggleBottomSheet(true); // 위로 드래그 → 확장
//     else if (diff < -20 && isExpanded) toggleBottomSheet(false); // 아래로 드래그 → 축소
// }

// function stopDrag(event) {
//     document.removeEventListener(event.touches ? "touchmove" : "mousemove", onMove);
//     document.removeEventListener(event.touches ? "touchend" : "mouseup", stopDrag);
// }

// // ✅ 핸들 드래그 이벤트 (PC & 모바일)
// handle.addEventListener("mousedown", startDrag);
// handle.addEventListener("touchstart", startDrag);

// // ✅ 리스트 추가 후 내부 스크롤 활성화
// function displayPools(pools) {
//     poolList.innerHTML = pools.map(pool => `
//         <div class="pool-item">
//             <h3>${pool.name}</h3>
//             <p>${pool.address}</p>
//             <button onclick="moveToPool(${pool.lat}, ${pool.lng})">위치 보기</button>
//         </div>
//     `).join("");

//     poolList.style.overflowY = "auto"; // 리스트 내부 스크롤 활성화
// }


// // ✅ 모바일: 리스트 최상단에서 두 번의 터치 스크롤 감지 후 바텀시트 접기
// let touchStartY = 0;
// poolList.addEventListener("touchstart", (event) => {
//     touchStartY = event.touches[0].clientY;
// });

// poolList.addEventListener("touchmove", (event) => {
//     const touchMoveY = event.touches[0].clientY;
    
//     if (poolList.scrollTop === 0) {
//         if (!isAtTopOnce) {
//             isAtTopOnce = true; // ✅ 첫 번째 스크롤 (멈춤)
//         } else if (touchMoveY > touchStartY + 20) {
//             toggleBottomSheet(false); // ✅ 두 번째 터치 스크롤 시 바텀시트 접기
//         }
//     } else {
//         isAtTopOnce = false; // ✅ 다시 스크롤하면 상태 초기화
//     }
// });

// // ✅ 핸들 영역에서 마우스 휠로 바텀시트 확장/축소 가능 (PC)
// handle.addEventListener("wheel", (event) => {
//     if (event.deltaY > 0 && !isExpanded) {
//         toggleBottomSheet(true); // 위로 스크롤 → 확장
//     } else if (event.deltaY < 0 && isExpanded) {
//         toggleBottomSheet(false); // 아래로 스크롤 → 축소
//     }
// });

// // ✅ 초기 설정 실행
// initializeBottomSheet();
