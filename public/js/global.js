// 마이페이지 링크 세션 저장 설정 함수
export function setupReturnUrlForMypage() {
  const mypageLink = document.getElementById('mypage');
  
  if (mypageLink) {
    mypageLink.addEventListener('click', function(e) {
      e.preventDefault(); // 기본 동작 방지
      
      // 현재 URL을 세션 스토리지에 저장
      sessionStorage.setItem('returnUrl', window.location.href);
      
      // 로그인 상태 확인
      const loginSuccess = localStorage.getItem('loginSuccess');
      if (loginSuccess === 'true') {
        window.location.href = 'mypage.html'; // 로그인됨 -> 마이페이지로
      } else {
        window.location.href = 'login.html'; // 로그인 안됨 -> 로그인 페이지로
      }
    });
  }
}

//로그인 인증 함수 
// auth-util.js
import { auth, db, doc, getDoc } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

/**
* 로그인 상태 확인 후, uid를 기준으로 phone 문서 ID를 찾아 callback에 넘김
* @param {Function} onSuccess - 로그인 + 전화번호 확인된 후 실행할 콜백 (userId, userData)
* @param {Function} onFailure - 로그인 안 되어있거나 유저 정보 못 찾았을 때 실행할 콜백 (선택)
*/

// 인증 상태 캐싱을 위한 객체
export let authCache = {
  isAuthenticated: false,
  userId: null,
  userData: null,
  timestamp: null,
  ttl: 15 * 60 * 1000 // 5분 캐시 유지 시간
};


export function authUser(onSuccess, onFailure) {
  console.log("🛰 authUser() called global");
  console.log("📍 현재 페이지 URL:", window.location.href);

  const now = Date.now();
  if (authCache.isAuthenticated && authCache.timestamp && authCache.userData && 
    (now - authCache.timestamp < authCache.ttl)) {
    console.log("✅ 캐시된 인증 정보 사용:", authCache.userId);
    return onSuccess(authCache.userId, authCache.userData);
  }

  
  // 이미 로그인 성공 표시가 있는지 확인 (세션 간에도 유지)
  const loginSuccessFlag = localStorage.getItem("loginSuccess");
  const localUser = JSON.parse(localStorage.getItem("user"));
  const cachedUser = auth.currentUser;

  // 디버깅 정보 출력
  console.log("⚡️ 로그인 성공 플래그:", loginSuccessFlag);
  console.log("⚡️ 로컬 스토리지 유저:", localUser);
  console.log("⚡️ Firebase 현재 유저:", cachedUser?.uid);


  // 1.성공 플래그가 있고 로컬 스토리지에 유저 정보가 있는 경우
  if (loginSuccessFlag === "true" && localUser && localUser.uid) {
    console.log("⚡️ 로컬 스토리지에서 로그인 상태 확인됨");
    
    // 네이버 로그인은 별도 처리
    if (localUser.provider === "naver"&& localUser.uid) {
      return fetchUserByUID(localUser.uid, onSuccess, onFailure);
    }else if(localUser.uid){
      return fetchUserByUID(localUser.uid, onSuccess, onFailure);
    }
  }


  // 2. Firebase 캐시된 사용자 확인
  if (cachedUser) {
    console.log("⚡️ Firebase currentUser 확인됨:", cachedUser.uid);
    
    // 사용자 정보를 로컬 스토리지에 저장
    const userInfo = {
      uid: cachedUser.uid,
      name: cachedUser.displayName || "",
      email: cachedUser.email || "",
      photo: cachedUser.photoURL || "default.jpg",
      provider: cachedUser.providerId || "firebase"
    };
    
    // 로컬 스토리지 업데이트 전에 기존 정보 확인
    const existingUser = JSON.parse(localStorage.getItem("user")) || {};
    const updatedUser = { ...existingUser, ...userInfo };
    
    localStorage.setItem("user", JSON.stringify(updatedUser));
    localStorage.setItem("loginSuccess", "true");
    
    return fetchUserByUID(cachedUser.uid, onSuccess, onFailure);
  }


  // 3. Auth 상태 변경 이벤트 리스너
  onAuthStateChanged(auth, async (user) => {
    console.log("🔁 onAuthStateChanged 이벤트 발생:", user?.uid);
    
    // Firebase 사용자가 있는 경우
    if (user) {
      console.log("✅ Firebase 사용자 로그인 확인:", user.uid);
      
      // 사용자 정보를 로컬 스토리지에 저장
      const userInfo = {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        photo: user.photoURL || "default.jpg",
        provider: user.providerId || "firebase"
      };
      localStorage.setItem("user", JSON.stringify(userInfo));
      localStorage.setItem("loginSuccess", "true");
      
      return fetchUserByUID(user.uid, onSuccess, onFailure);
    } 

    // 네이버 로그인 확인 (Firebase에 없지만 로컬 스토리지에 있는 경우)
    else if (localUser && localUser.provider === "naver") {
      console.log("✅ 네이버 로그인 사용자 확인:", localUser.uid);
      localStorage.setItem("loginSuccess", "true");
      return fetchUserByUID(localUser.uid, onSuccess, onFailure);
    }
    // 모든 경우에 로그인되지 않음
    else {
      console.warn("⛔️ 로그인 안 되어 있음");
      localStorage.removeItem("loginSuccess");
      onFailure && onFailure();
    }
  });
}

// 전역 단일 인증 진행 상태
let authInitialized = false;
let authInitPromise = null;



export async function initAuth() {
    // 이미 초기화되었으면 즉시 반환
    if (authInitialized) {
      console.log("✅ 인증 이미 초기화됨, 건너뜀");
      return authCache.isAuthenticated;
    }
    
    // 초기화 진행 중이면 기존 Promise 반환
    if (authInitPromise) {
      console.log("⏳ 인증 초기화 진행 중, 완료 대기...");
      return authInitPromise;
    }

    console.log("🔄 인증 상태 초기화 시작");
    

    authInitPromise = new Promise((resolve) => {
      //로컬에서 사용자 정보 확인
      const loginSuccess = localStorage.getItem("loginSuccess");
      const localUser = JSON.parse(localStorage.getItem("user"));

      if (loginSuccess === "true" && localUser && localUser.phone) {
        console.log("✅ 로컬 스토리지에서 사용자 정보 확인됨:", localUser.phone);

        authCache.isAuthenticated = true;
        authCache.userId = localUser.phone;
        authCache.timestamp = Date.now();

        //userData는 당장 필요하지 않으므로 비동기로 로드
        fetchUserData(localUser.uid).then(userData => {
          if(userData) {
            authCache.userData = userData;
          }
        });

        authInitialized = true;
        resolve(true);
        return;
      }
        
      //로컬 스토리지에 정보가 없으면 전체 인증과정 수행
      authUser(
        (userId, userData) => {
          console.log("✅ 초기 인증 성공:", userId);
          authInitialized = true;
          resolve(true);
        },
        () => {
          console.log("⛔️ 초기 인증 실패");
          resolve(false);
        }
      );
    });
    return authInitPromise;
  }

//사용자 데이터만 가져오는 경량함수
async function fetchUserData(uid) {
  if (!uid) return null;

  try {
    console.log("🔍 사용자 데이터 조회:", uid);
    const userRef = collection(db, "users");
    const q = query(userRef, where("uids", "array-contains", uid));  // uid -> uids, == -> array-contains
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return null;

    return querySnapshot.docs[0].data();  // snapshot -> querySnapshot
  } catch (error) {
    console.error("🔥 사용자 데이터 조회 중 에러:", error);
    return null;
  }
}



// async function fetchUserByUID(uid, onSuccess, onFailure) {
//   try {
//     //먼저 UID 기반으로 사용자 검색
//     const userRef = collection(db, "users");
//     const q = query(userRef, where("uids", "array-contains", uid));
//     const querySnapshot = await getDocs(q);

//     if (querySnapshot.empty) {
//       console.warn("📭 사용자 문서 없음:", uid);
//       onFailure && onFailure();
//       return;
//     }

//     // 사용자 문서가 있으면 전화번호 추출
//     const userInfo=JSON.parse(localStorage.getItem("user")) || {};
//     const phone = userInfo?.phone;
//     localStorage.setItem("user", JSON.stringify(userInfo));
    
//     //캐시 업데이트
//     authCache.isAuthenticated = true;
//     authCache.userId = phone;
//     authCache.userData = data;
//     authCache.timestamp = Date.now();

//     onSuccess(phone, data);

//   } catch (e) {
//     console.error("🔥 getDoc 사용자 정보 조회 실패:", e);
//     onFailure && onFailure();
//   }
//   }





// UID로 Firestore에서 사용자 정보 가져오기
async function fetchUserByUID(uid, onSuccess, onFailure) {
  try {
    console.log("🔍 UID로 사용자 조회:", uid);
    
    // Firebase 인증 상태 확인 로그
    console.log("🔑 현재 Firebase 인증 상태:", auth.currentUser?.uid);
    
    const usersRef = collection(db, "users");
    console.log("📚 사용자 컬렉션 참조 생성");
    
    // 쿼리 로그
    console.log("🔍 쿼리 생성: where('uids', 'array-contains', '" + uid + "')");
    
    const q = query(usersRef, where("uids", "array-contains", uid));
    console.log("🔍 쿼리 실행 중...");
    
    try {
      const querySnapshot = await getDocs(q);
      console.log("✅ 쿼리 결과:", querySnapshot.size, "개 문서");
      
      if (querySnapshot.empty) {
        console.warn("📭 사용자 정보 없음 (Firestore)");
        onFailure && onFailure();
        return;
      }
      
      const userDoc = querySnapshot.docs[0];
      const phone = userDoc.id;
      const data = userDoc.data();
      
      console.log("✅ 사용자 정보 찾음:", phone, data);
      
      // 로그인 성공 플래그 설정
      localStorage.setItem("loginSuccess", "true");
      
      // 사용자 정보 업데이트 (phone 추가)
      const userInfo = JSON.parse(localStorage.getItem("user")) || {};
      userInfo.phone = phone;
      
      if(!userInfo.uid) {
        userInfo.uid = uid;
      }
      // 성공 시 캐시 업데이트
      authCache.isAuthenticated = true;
      authCache.userId = phone;
      authCache.userData = data;
      authCache.timestamp = Date.now();

      localStorage.setItem("user", JSON.stringify(userInfo));
      onSuccess(phone, data);
      
    } catch (queryError) {
      console.error("🔥 쿼리 실행 중 에러:", queryError);
      throw queryError;
    }
    
  } catch (e) {
    console.error("🔥 사용자 정보 조회 중 에러:", e);
    console.error("🔍 에러 상세:", e.code, e.message);
    onFailure && onFailure();
  }
}


// 페이지 로드 시 세션 정보 담고, my버튼 UI 조정
document.addEventListener('DOMContentLoaded', async () => {
  console.log("📄 페이지로드: 인증초기화 시작 😒")
  await initAuth();
  setupReturnUrlForMypage(); // ✅ my 버튼 누를 때 현재 세션 url 정보 저장
  initHeaderUI(); // ✅ my버튼 UI 동기화
  console.log("📄 페이지 로드: 인증 초기화 완료 😉");

});


//index와 detail 페이지 header에서 my버튼에 로그인 여부에 따라 다르게 스타일 적용

function initHeaderUI() {
  const wrapper = document.querySelector('.mypage-wrapper');
  if (!wrapper) return; // 안전성 체크

  // authCache가 이미 인증된 상태면 바로 스타일 적용
  if (authCache.isAuthenticated) {
    wrapper.classList.remove('logged-out');
    wrapper.classList.add('logged-in');
    return;
  }

  // 로컬 스토리지에서 로그인 상태 확인
  const loginSuccess = localStorage.getItem("loginSuccess");
  if (loginSuccess === "true") {
    wrapper.classList.remove('logged-out');
    wrapper.classList.add('logged-in');
    return;
  }

  // 위 방법으로 확인할 수 없는 경우만 authUser 호출
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
