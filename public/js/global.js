// global.js (간소화된 버전)
import { authUser } from './auth-service.js';

// 토스트 메시지 표시
export function showToast(message) {
  // 기존 코드 유지
}

// 모달 관련 함수 (기존 코드 유지)
export function openModal(modalId) { /* ... */ }
export function closeModal(modalId) { /* ... */ }
export function setupModalListeners(modalId) { /* ... */ }

// 마이페이지 링크 설정 함수
export function setupReturnUrlForMypage() {
  const mypageLink = document.getElementById('mypage');
  
  if (mypageLink) {
    mypageLink.addEventListener('click', function(e) {
      e.preventDefault();
      
      // 현재 URL을 세션 스토리지에 저장
      sessionStorage.setItem('returnUrl', window.location.href);
      
      // 로그인 상태 확인 및 리다이렉션
      authUser(
        () => window.location.href = 'mypage.html', // 로그인됨 -> 마이페이지로
        () => window.location.href = 'login.html'   // 로그인 안됨 -> 로그인 페이지로
      );
    });
  }
}

// 헤더 UI 초기화
function initHeaderUI() {
  const wrapper = document.querySelector('.mypage-wrapper');
  if (!wrapper) return;

  authUser(
    () => {
      wrapper.classList.remove('logged-out');
      wrapper.classList.add('logged-in');
    },
    () => {
      wrapper.classList.remove('logged-in');
      wrapper.classList.add('logged-out');
    }
  );
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
  setupReturnUrlForMypage();
  initHeaderUI();
  updateHeaderHeight();
});

// 헤더 높이 업데이트
export function updateHeaderHeight() {
  const header = document.querySelector('header');
  if (header) {
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
}