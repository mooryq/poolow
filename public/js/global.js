// 제스처 확대 방지
document.addEventListener("gesturestart", function (event) {
  event.preventDefault();
});


//헤더사이즈 조정
export function updateHeaderHeight() {
  const header = document.querySelector('header');
  document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
}

window.addEventListener('resize', updateHeaderHeight);
updateHeaderHeight();

window.addEventListener('load', updateHeaderHeight);


 
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
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

/**
* 로그인 상태 확인 후, uid를 기준으로 phone 문서 ID를 찾아 callback에 넘김
* @param {Function} onSuccess - 로그인 + 전화번호 확인된 후 실행할 콜백 (userId, userData)
* @param {Function} onFailure - 로그인 안 되어있거나 유저 정보 못 찾았을 때 실행할 콜백 (선택)
*/


export function authUser(onSuccess, onFailure) {
  console.log("🛰 authUser() called global");
  console.log("📍 현재 페이지 URL:", window.location.href);


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
    localStorage.setItem("user", JSON.stringify(userInfo));
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


// UID로 Firestore에서 사용자 정보 가져오기
async function fetchUserByUID(uid, onSuccess, onFailure) {
  try {
    console.log("🔍 UID로 사용자 조회:", uid);
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("uids", "array-contains", uid));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.warn("📭 사용자 정보 없음 (Firestore)");
      // localStorage.removeItem("loginSuccess"); // 플래그 제거
      // localStorage.removeItem("user"); // 사용자 정보 제거
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

    if(!userInfo.uid){
      userInfo.uid = uid;
    }

    localStorage.setItem("user", JSON.stringify(userInfo));
    
    onSuccess(phone, data);

  } catch (e) {
    console.error("🔥 사용자 정보 조회 중 에러:", e);
    // localStorage.removeItem("loginSuccess");
    // localStorage.removeItem("user");
    onFailure && onFailure();
  }
}



// 페이지 로드 시 세션 정보 담고, my버튼 UI 조정
document.addEventListener('DOMContentLoaded', () => {
  setupReturnUrlForMypage(); // ✅ my 버튼 누를 때 현재 세션 url 정보 저장
  initHeaderUI(); // ✅ my버튼 UI 동기화
});


//index와 detail 페이지 header에서 my버튼에 로그인 여부에 따라 다르게 스타일 적용

function initHeaderUI() {
  const wrapper = document.querySelector('.mypage-wrapper');

  if (!wrapper) return; // 안전성 체크

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
