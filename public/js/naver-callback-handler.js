//네이버로그인
import { naverConfig } from "./config.js";


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
    const name = naverLogin.user.getName();
    const email = naverLogin.user.getEmail();

    if (!id) {
      alert("네이버 사용자 식별자를 불러오지 못했습니다.");
      console.warn("⚠️ 유저 정보:", naverLogin.user);
      return;
    }
    
    console.log("💡 getId:", naverLogin.user.getId());
    console.log("💡 전체 유저 정보", naverLogin.user);

    const userInfo = {
      uid: id,
      name: name || "이름없음",
      email: email || "",
      photo: "default.jpg",
      provider: "naver"
    };

    console.log("✅ 네이버 로그인 성공:", userInfo);
    localStorage.setItem("user", JSON.stringify(userInfo));
    
    // 로그인 성공 플래그 설정 (이 줄 추가)
    localStorage.setItem("loginSuccess", "true");

    // 세션 스토리지에서 returnUrl 확인
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (returnUrl) {
        sessionStorage.removeItem('returnUrl'); // 사용 후 삭제
        window.location.href = returnUrl;
    } else {
        window.location.href = "index.html";
    }
  });
});
