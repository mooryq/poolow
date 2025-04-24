import { auth, provider, db } from "./firebase.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { naverConfig } from "./config.js";


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

document.addEventListener("DOMContentLoaded", () => {
  const googleLoginBtn = document.getElementById("googleLogin");
  
  googleLoginBtn.addEventListener("click", async () => {
    try {
      // 기존 소셜 로그인 정보 삭제 (전환 처리)
      clearTemporaryUserInfo();
      
      const result = await signInWithPopup(auth, provider);
      const token = await result.user.getIdToken();
      const user = result.user;
      
      // 인증 토큰 저장
      sessionStorage.setItem("accessToken", token);
      console.log("AccessToken saved:", token);

      // 사용자 정보를 임시 저장소에 저장
      const userInfo = {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        photo: user.photoURL || "default.jpg",
        provider: "google"
      };
      
      saveTemporaryUserInfo(userInfo);
      
      // localStorage의 user 정보도 업데이트 (기존 코드와 호환성 유지)
      localStorage.setItem("user", JSON.stringify(userInfo));

      // 리다이렉션 처리
      await handleRedirectAfterLogin(user.uid);
      
    } catch (error) {
      console.error("❌ 로그인 실패:", error);
      showToast("로그인에 실패했습니다. 다시 시도해주세요.");
      //로그인 실패 플래그 제거
      localStorage.removeItem("loginSuccess");
    }
  });
});

//네이버로그인  
document.addEventListener("DOMContentLoaded", function () {
  const naverLogin = new naver.LoginWithNaverId(naverConfig);
  naverLogin.init();

  // 커스텀 버튼 클릭 시 로그인 요청
  document.getElementById("naverIdLogin").addEventListener("click", function () {
    // 기존 소셜 로그인 정보 삭제 (전환 처리)
    clearTemporaryUserInfo();
    
    // 세션 스토리지에 returnUrl이 있는지 확인
    const returnUrl = sessionStorage.getItem('returnUrl');
    if (!returnUrl) {
        console.log("returnUrl이 세션 스토리지에 없습니다.");
    } else {
        console.log("returnUrl:", returnUrl);
    }
    
    window.location.href = naverLogin.generateAuthorizeUrl();
  });
});
  // // 로그인 버튼 활성화 >전화번호 로그인 사용하려 할 때 다시 살려요 
  // const usernameInput = document.getElementById("userPhone");
  // const passwordInput = document.getElementById("password");
  // const loginBtn = document.getElementById("loginBtn");

  // function checkInputs() {
  //     const hasUsername = usernameInput.value.trim() !== "";
  //     const hasPassword = passwordInput.value.trim() !== "";

  //     if (hasUsername && hasPassword) {
  //         loginBtn.classList.add("active");
  //         loginBtn.disabled = false;
  //     } else {
  //         loginBtn.classList.remove("active");
  //         loginBtn.disabled = true;
  //     }
  // }

  // usernameInput.addEventListener("input", checkInputs);
  // passwordInput.addEventListener("input", checkInputs);
