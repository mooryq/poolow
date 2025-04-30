// 제스처 확대 방지
document.addEventListener("gesturestart", function (event) {
    event.preventDefault();
  });
  
  
  
   
//헤더사이즈 조정
export function updateHeaderHeight() {
    const header = document.querySelector('header');
    // header 요소가 없으면 함수 종료
    if (!header) {
      console.warn('⚠️ header 요소를 찾을 수 없습니다.');
      return;
    }
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
  
  // DOM이 완전히 로드된 후에만 실행
  document.addEventListener('DOMContentLoaded', () => {
    updateHeaderHeight();
  });
  
  // 리사이즈 이벤트는 header가 있을 때만 실행
  window.addEventListener('resize', () => {
    const header = document.querySelector('header');
    if (header) {
  updateHeaderHeight();
    }
  });
  
  // 페이지 로드 완료 후에도 한 번 더 실행
  window.addEventListener('load', () => {
    const header = document.querySelector('header');
    if (header) {
      updateHeaderHeight();
    }
  });


// 토스트 ~.~
export function showToast(message) {
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
  
  
  //모달 함수
  export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";
  }
  
  export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.style.display = "none";
    document.body.style.overflow = "auto";
  }
  
  export function setupModalListeners(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
  
    // // 바깥 클릭
    // modal.addEventListener("click", (e) => {
    //   if (e.target === modal) closeModal(modalId);
    // });
  
    // 닫기 버튼
    const closeBtn = modal.querySelector(".modal-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => closeModal(modalId));
    }
  }
  

