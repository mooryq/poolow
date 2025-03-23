
// ✅ 핸드폰에서 확대 방지
document.addEventListener("gesturestart", function (event) {
    event.preventDefault();
});

// ✅ 1. --vh 정확히 계산
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    console.log("📐 set --vh:", vh);
}

// ✅ 2. DOM 로딩되자마자 1차 계산
document.addEventListener("DOMContentLoaded", () => {
    setViewportHeight();  // 1차 계산 먼저
    initMap().then(() => {
        loadPools().then(() => {
            initSwiper();
        });
    });
});

// ✅ 3. 전체 자원 로딩 완료 후 (주소창 애니메이션도 끝난 후)
window.addEventListener("load", () => {
    setTimeout(setViewportHeight, 300);  // 0.3초 후 재계산
});

// ✅ 4. 화면 회전/리사이즈 시에도
window.addEventListener("resize", setViewportHeight);


// 토스트 ~.~
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
  
    document.body.appendChild(toast);
  
    // 잠깐 있다가 사라짐
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
  
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 900);
  }
