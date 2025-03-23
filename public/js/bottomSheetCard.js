const bottomSheet = document.getElementById("bottomSheet");
const handle = document.getElementById("handle");
const poolList = document.getElementById("poolList");

let startY = 0;
let isDragging = false;
let isExpanded = false;
let isAtTopOnce = false;

// ✅ BottomSheet 초기화
function initializeBottomSheet() {
    bottomSheet.style.height = "25dvh";
    poolList.style.maxHeight = "calc(25dvh - 40px)";
    poolList.style.overflowY = "auto";
    updateBottomSheetStyle();
}

// ✅ BottomSheet 스타일 업데이트
function updateBottomSheetStyle() {
    bottomSheet.style.borderRadius = isExpanded ? "0" : "20px 20px 0 0";
}


// ✅ 바텀시트 크기 및 스타일 업데이트
function toggleBottomSheet(expand) {
    if (expand === isExpanded) return; // ✅ 상태가 이미 동일하면 실행 안 함

    const searchConsole = document.querySelector('.search-console');
    const searchHeight = searchConsole?.offsetHeight || 0;
    const expandedHeight = window.innerHeight - searchHeight; // 👉 검색창 아래까지만 확장

    if (expand) {
        // bottomSheet.style.top = `${searchHeight}px`; // 👈 이렇게 하면 search 바로 아래에 붙어!
        bottomSheet.style.height = `${expandedHeight}px`;
        poolList.style.maxHeight = `${expandedHeight - 40}px`;
    } else {
        bottomSheet.style.height = "25dvh";
        poolList.style.maxHeight = "calc(25dvh - 40px)";
    }

    isExpanded = expand;
    updateBottomSheetStyle();

}
// ✅ 드래그 이벤트 (PC & 모바일)
function startDrag(event) {
    startY = event.touches?.[0]?.clientY || event.clientY;
    document.addEventListener(event.touches ? "touchmove" : "mousemove", onMove);
    document.addEventListener(event.touches ? "touchend" : "mouseup", stopDrag);
}

function onMove(event) {
    const currentY = event.touches?.[0]?.clientY || event.clientY;
    const diff = startY - currentY;

    if (diff > 20) toggleBottomSheet(true);
    else if (diff < -20 && isExpanded) toggleBottomSheet(false);
}

function stopDrag(event) {
    document.removeEventListener(event.touches ? "touchmove" : "mousemove", onMove);
    document.removeEventListener(event.touches ? "touchend" : "mouseup", stopDrag);
}

// ✅ 마우스 휠(스크롤) 이벤트 추가 (핸들에서만 작동)
handle.addEventListener("wheel", (event) => {
    if (event.deltaY > 0) {
        // 🔼 휠 위로 → BottomSheet 확장
        toggleBottomSheet(true);
    } else if (event.deltaY < 0 && isExpanded) {
        // 🔽 휠 아래로 → BottomSheet 축소
        toggleBottomSheet(false);
    }
    event.preventDefault(); // 기본 스크롤 동작 방지
});

// ✅ 이벤트 리스너 추가
handle.addEventListener("mousedown", startDrag);
handle.addEventListener("touchstart", startDrag);

// ✅ 초기 실행
initializeBottomSheet();


// ✅ poolList 안에서 드래그로 바텀시트 축소
let touchStartY = 0;

poolList.addEventListener("touchstart", (event) => {
  touchStartY = event.touches[0].clientY;
});

poolList.addEventListener("touchmove", (event) => {
  const touchMoveY = event.touches[0].clientY;
  const scrollTop = poolList.scrollTop;
  const diff = touchMoveY - touchStartY;

  // 스크롤 맨 위 + 아래로 당겼을 때
  if (scrollTop === 0 && diff > 15) {
    toggleBottomSheet(false);
  }
});
