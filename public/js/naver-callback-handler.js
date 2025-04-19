// naver-callback-handler.js (리팩토링 버전)
import { naverConfig } from "/public/js/config.js";
import { saveNaverUserInfo, findUserByUID } from "./auth-service.js";

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
    window.location.href = "index.html";
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const naverLogin = new naver.LoginWithNaverId(naverConfig);
  naverLogin.init();

  naverLogin.getLoginStatus(function (status) {
    if (!status || !naverLogin.user) {
      console.error("❌ 네이버 로그인 실패 또는 사용자 정보 없음");
      localStorage.removeItem("loginSuccess");
      localStorage.removeItem("user");
      return;    
    }

    const id = naverLogin.user.getId();
    if (!id) {
      alert("네이버 사용자 식별자를 불러오지 못했습니다.");
      return;
    }
    
    // 네이버 사용자 정보 저장
    const userInfo = saveNaverUserInfo(naverLogin.user);
    
    // 로그인 후 리다이렉션
    handleRedirectAfterLogin(id);
  });
});