import { naverConfig } from "/public/js/config.js";
import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

// Firestore에서 UID로 사용자 찾기
async function findUserByUID(uid) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uids", "array-contains", uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return true; // 사용자가 존재함
    }
    return false; // 사용자가 존재하지 않음 (전화번호 등록 필요)
  } catch (error) {
    console.error("Firestore 조회 오류:", error);
    return false;
  }
}

// 로그인 후 리다이렉션 처리
async function handleRedirectAfterLogin(uid) {
  try {
    // Firestore에서 사용자 확인
    const userExists = await findUserByUID(uid);
    
    // 세션 스토리지에서 returnUrl 확인
    const returnUrl = sessionStorage.getItem('returnUrl');
    console.log("returnUrl:", returnUrl);
    
    if (userExists) {
      // 사용자가 존재하면 returnUrl로 리다이렉션
      localStorage.setItem("loginSuccess", "true");
      
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl'); // 사용 후 삭제
        window.location.href = returnUrl;
      } else {
        window.location.href = "index.html";
      }
    } else {
      // 사용자가 존재하지 않으면 전화번호 등록 페이지로 이동
      // returnUrl 유지
      window.location.href = "phoneForm.html";
    }
  } catch (error) {
    console.error("리다이렉션 처리 오류:", error);
    window.location.href = "index.html"; // 오류 시 홈으로
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
    
    // 로그인 후 리다이렉션 처리
    handleRedirectAfterLogin(id);
  });
});