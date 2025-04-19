// login.js (리팩토링 버전)
import { signInWithGoogle, findUserByUID } from './auth-service.js';
import { showToast } from './global.js';
import { naverConfig } from "./config.js";

// 로그인 후 리다이렉션 처리
async function handleRedirectAfterLogin(uid) {
  try {
    // Firestore에서 사용자 확인
    const userExists = await findUserByUID(uid);
    
    // 세션 스토리지에서 returnUrl 확인
    const returnUrl = sessionStorage.getItem('returnUrl');
    
    if (userExists) {
      // 사용자가 존재하면 returnUrl로 리다이렉션
      localStorage.setItem("loginSuccess", "true");
      
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
      } else {
        window.location.href = "index.html";
      }
    } else {
      // 사용자가 존재하지 않으면 전화번호 등록 페이지로 이동
      window.location.href = "phoneForm.html";
    }
  } catch (error) {
    console.error("리다이렉션 처리 오류:", error);
    showToast("로그인 처리 중 오류가 발생했습니다.");
    window.location.href = "index.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 구글 로그인 버튼 이벤트
  const googleLoginBtn = document.getElementById("googleLogin");
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", async () => {
      try {
        const userInfo = await signInWithGoogle();
        await handleRedirectAfterLogin(userInfo.uid);
      } catch (error) {
        showToast("구글 로그인에 실패했습니다.");
      }
    });
  }

  // 네이버 로그인 초기화
  const naverLogin = new naver.LoginWithNaverId(naverConfig);
  naverLogin.init();

  // 네이버 로그인 버튼 이벤트
  const naverLoginBtn = document.getElementById("naverIdLogin");
  if (naverLoginBtn) {
    naverLoginBtn.addEventListener("click", function () {
      // returnUrl 세션 스토리지 유지
      window.location.href = naverLogin.generateAuthorizeUrl();
    });
  }
});