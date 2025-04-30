// public/js/naver-callback-handler.js
import { naverConfig } from "./config.js";
import { app, auth }       from "./firebase.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-functions.js";
import { signInWithCustomToken }       from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { showToast }   from "./ui.js";
import axios from "https://cdn.skypack.dev/axios";
const functionsURL = "https://asia-northeast3-poolow-f324e.cloudfunctions.net/createNaverToken";

// 서버에 네이버 토큰을 보내고 Firebase 커스텀 토큰을 받아오는 함수
async function callCreateNaverToken(rawToken) {
  try {
    const response = await axios.post(functionsURL, { accessToken: rawToken });
    return response.data;
  } catch (error) {
    console.error("❌ 서버 호출 에러:", error);
    throw error;
  }
}

// Firestore에서 UID로 사용자 찾기
async function findUserByUID(uid) {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uids", "array-contains", uid));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      return { exists: true, docId: querySnapshot.docs[0].id };
    }
    return { exists: false };
  } catch (error) {
    console.error("Firestore 조회 오류:", error);
    return { exists: false, error };
  }
}

// 네이버 로그인 초기화 및 처리

async function initNaverLogin() {
  const naverLogin = new naver.LoginWithNaverId(naverConfig);
  naverLogin.init();
  console.log("✅ 네이버 로그인 초기화 완료");

  naverLogin.getLoginStatus(async (status) => {
    if (!status || !naverLogin.user) {
      console.error("❌ 네이버 로그인 실패 또는 사용자 정보 없음");
      return window.location.href = "login.html";
    }

    //네이버 사용자 정보 가져오기
    const user = naverLogin.user;    
    const userId = user.getId(); 
    const name = typeof user.getName === "function" ? user.getName() : (user.name || "");
    const email = typeof user.getEmail === "function" ? user.getEmail() : (user.email || "");
    const photo = typeof user.getProfileImage === "function" ? user.getProfileImage() : (user.profile_image || "");

    console.log("✅네이버 사용자 정보:", {userId, name, email, photo});
    // localStorage.setItem("user", JSON.stringify(userInfo));
    // localStorage.setItem("loginSuccess", "true");
    
    try{
      // 1) 네이버 SDK에서 token 가져오기
      let rawToken = naverLogin.accessToken?.accessToken
                  || naverLogin.oauthParams?.access_token
                  || localStorage.getItem('com.naver.nid.access_token');
      if (!rawToken) {
        console.error("토큰을 찾을 수 없습니다.");
        showToast("로그인 토큰 획득 실패");
        return;
      }
      if (rawToken.includes('.')) {
        rawToken = rawToken.split('.')[0];
      }

      console.log("✅ 서버에 보낼 rawToken:", rawToken);

      //2) 서버에 네이버 토큰 보내고 firebase 커스텀 토큰 받아오기  
      const result = await callCreateNaverToken(rawToken);
      console.log("✅ 서버 응답:", result);

      if (!result || !result.customToken) {
        throw new Error("토큰 발급 실패");
      }

      //3) firebase 인증
      const userCred = await signInWithCustomToken(auth, result.customToken);
      console.log("✅ Firebase Auth 로그인 성공:", userCred.user.uid);

      //4) 사용자 정보 저장
      const userInfo = {
        uid: userId,
        name: typeof user.getName === "function" ? user.getName() : (user.name || ""),
        email: typeof user.getEmail === "function" ? user.getEmail() : (user.email || ""),
        photo: typeof user.getProfileImage === "function" ? user.getProfileImage() : (user.profile_image || ""),
        provider: "naver"
      };

      localStorage.setItem("user", JSON.stringify(userInfo));
      localStorage.setItem("loginSuccess", "true");

      //5) 성공 메시지 및 리다이렉트
      showToast("로그인되었습니다. 반가워요👋🏻");
      window.location.href = sessionStorage.getItem('returnUrl') || "index.html";
    }catch(error){
      console.error("❌ 로그인 처리 중 오류:", error);
      alert("로그인 처리 중 오류가 발생했습니다.: " + error.message);
      setTimeout(() => window.location.href = "login.html", 2000);
    }
  });
}
 

  //페이지 로드 시 네이버 로그인 초기화
    document.addEventListener('DOMContentLoaded', function() {
      //네이버 SDK가 로드되었는지 확인
      if (typeof naver === 'undefined') {
        console.error("❌ 네이버 SDK 미로드");
        window.location.href = "login.html";
        return;
      }

      //네이버 로그인 초기화
      initNaverLogin();
    });
