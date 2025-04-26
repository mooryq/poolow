import { naverConfig } from "./config.js";
import { db } from "./firebase.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { showToast } from "./global.js";



// 임시 소셜 로그인 정보 저장
function saveTemporaryUserInfo(userInfo) {
  localStorage.setItem("tempUser", JSON.stringify(userInfo));
  console.log("📝 임시 사용자 정보 저장:", userInfo);
}

// 임시 저장된 정보 삭제
function clearTemporaryUserInfo() {
  localStorage.removeItem("tempUser");
  console.log("🧹 임시 사용자 정보 삭제됨");
}


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

// 네이버 로그인 초기화 및 처리
function initNaverLogin() {
  try {
    // 네이버 로그인 객체 생성 및 초기화
  const naverLogin = new naver.LoginWithNaverId(naverConfig);
  naverLogin.init();
  
    console.log("✅ 네이버 로그인 초기화 완료");
    
    // 기존 로그인 정보 초기화
    localStorage.removeItem("user");
    localStorage.removeItem("loginSuccess");
    localStorage.removeItem("com.naver.nid.access_token");
    localStorage.removeItem("com.naver.nid.oauth.state_token");
    
    // 로그인 상태 확인
  naverLogin.getLoginStatus(function (status) {
    if (!status || !naverLogin.user) {
      console.error("❌ 네이버 로그인 실패 또는 사용자 정보 없음");
      localStorage.removeItem("loginSuccess");
      localStorage.removeItem("user");
        window.location.href = "login.html"; // 로그인 실패 시 로그인 페이지로
      return;    
    }

    const id = naverLogin.user.getId();
    const name = naverLogin.user.getName();
    const email = naverLogin.user.getEmail();

    if (!id) {
        console.error("⚠️ 네이버 사용자 식별자를 불러오지 못했습니다.");
      console.warn("⚠️ 유저 정보:", naverLogin.user);
        window.location.href = "login.html";
      return;
    }
    
      console.log("💡 네이버 사용자 ID:", id);
      console.log("💡 전체 유저 정보:", naverLogin.user);

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
  } catch (error) {
    console.error("❌ 네이버 로그인 초기화 실패:", error);
    window.location.href = "login.html";
  }
}

// DOM이 완전히 로드된 후 네이버 로그인 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 네이버 SDK가 로드되었는지 확인
  if (typeof naver === 'undefined') {
    console.error("❌ 네이버 SDK가 로드되지 않았습니다.");
    window.location.href = "login.html";
    return;
  }
  
  // 네이버 로그인 초기화
  initNaverLogin();
});