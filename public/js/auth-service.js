// auth-service.js
import { 
    auth, 
    db, 
    provider as googleProvider
  } from './firebase.js';
  
  import { 
    signInWithPopup, 
    signInWithPhoneNumber, 
    onAuthStateChanged,
    RecaptchaVerifier
  } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
  
  import {
    doc,
    getDoc,
    setDoc,
    collection,
    query,
    where,
    getDocs
  } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
  
  // 1. 현재 사용자 정보 가져오기
  export async function getCurrentUser() {
    // 로컬 스토리지 체크
    const loginSuccessFlag = localStorage.getItem("loginSuccess");
    const localUser = JSON.parse(localStorage.getItem("user"));
  
    // Firebase 캐시된 사용자 체크
    const cachedUser = auth.currentUser;
  
    if (loginSuccessFlag === "true" && localUser?.uid) {
      // 로컬 스토리지에 사용자 정보가 있는 경우
      return localUser;
    } else if (cachedUser) {
      // Firebase에 캐시된 사용자 정보가 있는 경우
      const userInfo = {
        uid: cachedUser.uid,
        name: cachedUser.displayName || "",
        email: cachedUser.email || "",
        photo: cachedUser.photoURL || "default.jpg",
        provider: cachedUser.providerId || "firebase"
      };
      localStorage.setItem("user", JSON.stringify(userInfo));
      localStorage.setItem("loginSuccess", "true");
      return userInfo;
    }
  
    // 로그인된 사용자 없음
    return null;
  }
  
  // 2. uid로 Firestore에서 사용자 찾기
  export async function findUserByUID(uid) {
    try {
      if (!uid) return null;
      
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uids", "array-contains", uid));
      const querySnapshot = await getDocs(q);
  
      if (querySnapshot.empty) {
        return null;
      }
  
      const userDoc = querySnapshot.docs[0];
      return {
        id: userDoc.id, // 전화번호
        ...userDoc.data()
      };
    } catch (error) {
      console.error("사용자 조회 실패:", error);
      return null;
    }
  }
  
  // 3. 구글 로그인
  export async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // 사용자 정보를 로컬 스토리지에 저장
      const userInfo = {
        uid: user.uid,
        name: user.displayName || "",
        email: user.email || "",
        photo: user.photoURL || "default.jpg",
        provider: "google"
      };
      localStorage.setItem("user", JSON.stringify(userInfo));
      localStorage.setItem("loginSuccess", "true");
      
      return userInfo;
    } catch (error) {
      console.error("구글 로그인 실패:", error);
      localStorage.removeItem("loginSuccess");
      throw error;
    }
  }
  
  // 4. 네이버 로그인 사용자 정보 저장
  export function saveNaverUserInfo(naverUser) {
    if (!naverUser || !naverUser.id) {
      throw new Error("네이버 사용자 정보가 유효하지 않습니다.");
    }
    
    const userInfo = {
      uid: naverUser.id,
      name: naverUser.name || "이름없음",
      email: naverUser.email || "",
      photo: "default.jpg",
      provider: "naver"
    };
  
    localStorage.setItem("user", JSON.stringify(userInfo));
    localStorage.setItem("loginSuccess", "true");
    
    return userInfo;
  }
  
  // 5. 전화번호 인증 초기화
  export function initPhoneAuth(elementId) {
    try {
      // 기존 reCAPTCHA 인스턴스가 있으면 제거
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      
      // 새로운 reCAPTCHA 인스턴스 생성
      window.recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
        'size': 'invisible',
        'callback': (response) => {
          console.log("✅ reCAPTCHA 확인 완료");
        },
        'expired-callback': () => {
          console.log("⚠️ reCAPTCHA 만료됨");
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        }
      });
      
      return window.recaptchaVerifier;
    } catch (error) {
      console.error("reCAPTCHA 초기화 실패:", error);
      throw error;
    }
  }
  
  // 6. 전화번호로 인증코드 요청
  export async function requestPhoneVerification(phoneNumber) {
    try {
      if (!window.recaptchaVerifier) {
        throw new Error("reCAPTCHA가 초기화되지 않았습니다.");
      }
      
      // reCAPTCHA 렌더링 시도
      try {
        await window.recaptchaVerifier.render();
      } catch (renderError) {
        console.log("reCAPTCHA 이미 렌더링됨 또는 렌더링 오류:", renderError);
        // 렌더링 오류는 무시하고 계속 진행
      }
      
      // 전화번호 인증 요청
      const appVerifier = window.recaptchaVerifier;
      
      // 세션 문제 해결을 위한 지연 추가
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      return confirmationResult;
    } catch (error) {
      console.error("인증 요청 실패:", error);
      // reCAPTCHA 재초기화
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
      throw error;
    }
  }
  
  // 7. 사용자 정보 저장 (통합 버전)
  export async function saveUserToFirestore(phone, userInfo) {
    if (!phone || !userInfo || !userInfo.uid) {
      throw new Error("유효하지 않은 사용자 정보입니다.");
    }
  
    const userRef = doc(db, "users", phone);
    
    try {
      const docSnap = await getDoc(userRef);
      let userData = {
        name: userInfo.name || "",
        email: userInfo.email || "",
        photo: userInfo.photo || "default.jpg",
        phone,
        uids: [userInfo.uid],
        providers: [userInfo.provider || "unknown"],
        currentProvider: userInfo.provider || "unknown",
        createdAt: new Date()
      };
  
      if (docSnap.exists()) {
        // 기존 사용자 정보가 있는 경우
        const existingData = docSnap.data();
        
        // uids 배열 업데이트 (중복 없이)
        const uids = existingData.uids || [];
        if (!uids.includes(userInfo.uid)) {
          uids.push(userInfo.uid);
        }
        
        // providers 배열 업데이트 (중복 없이)
        const providers = existingData.providers || [];
        const provider = userInfo.provider || "unknown";
        if (!providers.includes(provider)) {
          providers.push(provider);
        }
        
        // 기존 데이터 유지 + 새 데이터 병합
        userData = {
          ...existingData,
          uids,
          providers,
          currentProvider: provider,
          updatedAt: new Date()
        };
      }
  
      // Firestore에 저장
      await setDoc(userRef, userData, { merge: true });
      
      // 로컬 스토리지 업데이트
      const localUser = JSON.parse(localStorage.getItem("user")) || {};
      localStorage.setItem("user", JSON.stringify({
        ...localUser,
        phone
      }));
      
      return userData;
    } catch (error) {
      console.error("사용자 정보 저장 실패:", error);
      throw error;
    }
  }
  
  // 8. 인증 상태 확인 (통합 버전)
  export function authUser(onSuccess, onFailure) {
    // 즉시 현재 사용자 확인
    getCurrentUser()
      .then(async (user) => {
        if (!user) {
          onFailure && onFailure();
          return;
        }
        
        // Firestore에서 사용자 정보 조회
        const firestoreUser = await findUserByUID(user.uid);
        
        if (!firestoreUser) {
          // 사용자가 존재하지 않음 (전화번호 등록 필요)
          onFailure && onFailure();
          return;
        }
        
        // 성공 콜백 호출
        onSuccess(firestoreUser.id, firestoreUser);
      })
      .catch(() => {
        onFailure && onFailure();
      });
      
    // Auth 상태 변경 리스너 설정
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firebase 인증 사용자가 있는 경우
        const userInfo = {
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          photo: user.photoURL || "default.jpg",
          provider: user.providerId || "firebase"
        };
        
        localStorage.setItem("user", JSON.stringify(userInfo));
        localStorage.setItem("loginSuccess", "true");
        
        // Firestore에서 사용자 정보 조회
        const firestoreUser = await findUserByUID(user.uid);
        
        if (firestoreUser) {
          onSuccess(firestoreUser.id, firestoreUser);
        } else {
          onFailure && onFailure();
        }
      } else {
        // 네이버 로그인 사용자 확인
        const localUser = JSON.parse(localStorage.getItem("user"));
        
        if (localUser && localUser.provider === "naver" && localUser.uid) {
          const firestoreUser = await findUserByUID(localUser.uid);
          
          if (firestoreUser) {
            localStorage.setItem("loginSuccess", "true");
            onSuccess(firestoreUser.id, firestoreUser);
            return;
          }
        }
        
        // 로그인되지 않은 경우
        localStorage.removeItem("loginSuccess");
        onFailure && onFailure();
      }
    });
    
    // 클린업 함수 반환 (필요시 사용)
    return unsubscribe;
  }
  
  // 9. 로그아웃
  export async function signOut() {
    try {
      await auth.signOut();
      localStorage.removeItem("loginSuccess");
      localStorage.removeItem("user");
      return true;
    } catch (error) {
      console.error("로그아웃 실패:", error);
      return false;
    }
  }