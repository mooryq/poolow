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

// ✅ BottomSheet 크기 조절
function toggleBottomSheet(expand) {
    if (expand === isExpanded) return;

    bottomSheet.style.height = expand ? "95dvh" : "25dvh";
    poolList.style.maxHeight = expand ? "calc(95dvh - 40px)" : "calc(25dvh - 40px)";
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

// ✅ 이벤트 리스너 추가
handle.addEventListener("mousedown", startDrag);
handle.addEventListener("touchstart", startDrag);

// ✅ 초기 실행
initializeBottomSheet();
