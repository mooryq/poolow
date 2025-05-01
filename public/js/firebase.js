// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider,
    signInWithCustomToken
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCOrWIMMzj31-aM2pLI0BuzDlWlxrDxgJc",
  authDomain: "poolow-f324e.firebaseapp.com",
  projectId: "poolow-f324e",
  storageBucket: "poolow-f324e.firebasestorage.app",
  messagingSenderId: "685171400304",
  appId: "1:685171400304:web:d2aa44b62b599dc8bcdeb5",
  measurementId: "G-2LZPG6VNV3"
};

// Initialize Firebase

export const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Firestore DB 연결
export const db = getFirestore();

// Firebase 인증 객체 생성
export const auth = getAuth(app);

//로그아웃
export { signOut };

// Google 로그인 제공자
export const provider = new GoogleAuthProvider();

// Doc export
export { setDoc, doc, getDoc, getDocs, addDoc, deleteDoc, updateDoc };

export { collection, serverTimestamp };

//이미지 업로드용
export const storage = getStorage(app);

//user access token 로컬에 저장
onAuthStateChanged(auth, (user) => {
  if (user) {
    const localUser = JSON.parse(localStorage.getItem("user")) || {};
    const provider = localUser.provider || "unknown";

    if (provider === "google") {
      localStorage.setItem("user", JSON.stringify({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        provider: "google"
      }));
    } else {
      localStorage.setItem("user", JSON.stringify({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        provider
      }));
    }
    
    // 네이버 관련 토큰 제거
    localStorage.removeItem("com.naver.nid.access_token");
    localStorage.removeItem("com.naver.nid.oauth.state_token");
  } else {
    // 로그아웃 또는 세션 만료 시
    // 네이버 로그인 사용자인 경우 로컬 스토리지 유지
    const localUser = JSON.parse(localStorage.getItem("user"));
    if (!localUser || localUser.provider !== "naver") {
      localStorage.removeItem("user");
      localStorage.removeItem("loginSuccess");
      localStorage.removeItem("com.naver.nid.access_token");
      localStorage.removeItem("com.naver.nid.oauth.state_token");
    }
  }
});





// ✅ Firestore에 유저 정보 저장 함수 (통합 UID 배열 기반)
export async function saveUserToFirestore(phone, userInfo) {
  console.log("💾 저장하려는 userInfo:", userInfo);
  console.log("🔥 현재 인증된 UID:", auth.currentUser?.uid);

  const userRef = doc(db, "users", phone);
  let uids = new Set(); // 중복 방지용
  let providers = new Set();
  let name = userInfo.name || "";
  let email = userInfo.email || "";
  let photo = userInfo.photo || "default.jpg";
  let provider = userInfo.provider || "unknown";
  let createdAt = serverTimestamp(); // serverTimestamp로 통일

  try {
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const existing = docSnap.data();

      name = existing.name || name;
      email = existing.email || email;
      photo = existing.photo || photo;
      createdAt = existing.createdAt || createdAt;

      // 기존 UID, Provider 배열 불러와서 Set에 추가
      for (const id of existing.uids || []) uids.add(id);
      for (const p of existing.providers || []) providers.add(p);
    }

    // 🔐 인증된 Firebase UID는 반드시 포함되어야 함
    if (auth.currentUser?.uid) uids.add(auth.currentUser.uid);

    // 로컬에 저장된 소셜 UID
    if (userInfo.uid) uids.add(userInfo.uid);

    // 전화번호 인증 UID
    if (userInfo.phoneAuthUID) uids.add(userInfo.phoneAuthUID);
    if (userInfo.phoneAuthUID) providers.add("phone");

    // 현재 로그인 provider
    if (provider) providers.add(provider);

    // 최종 저장
    const dataToSave = {
      name,
      email,
      photo,
      phone,
      providers: Array.from(providers),
      uids: Array.from(uids),
      currentProvider: provider,
      createdAt,
    };

    console.log("📤 저장할 데이터:", dataToSave);

    await setDoc(userRef, dataToSave, { merge: true });

    console.log("✅ 사용자 정보 저장 완료");

  } catch (e) {
    console.error("❌ Firestore 저장 실패", {
      code: e.code,
      message: e.message,
      raw: e
    });  
  }
}



// // ✅ Firestore에 유저 정보 저장 함수 (통합 UID 배열 기반)
// export async function saveUserToFirestore(phone, userInfo) {
//   console.log("💾 저장하려는 userInfo:", userInfo);
//   alert("🔥 현재 인증된 UID:", auth.currentUser?.uid);


  
//     const userRef = doc(db, "users", phone);
//     let uids = [];
//     let providers = [];
//     let name = userInfo.name || "";
//     let email = userInfo.email || "";
//     let photo = userInfo.photo || "default.jpg";
//     let provider = userInfo.provider || "unknown";
//     let createdAt = serverTimestamp();

//     try {
//       const docSnap = await getDoc(userRef);
  
//       if (docSnap.exists()) {
//         const existingData = docSnap.data();
  
//         // 문서 있으면 기존 값 우선 사용
//         name = existingData.name || name;
//         email = existingData.email || email;
//         photo = existingData.photo || photo;
//         createdAt = existingData.createdAt || createdAt;
  
//       // 🔁 기존 uid 배열에서 중복 없이 추가
//       uids = existingData.uids || [];

//         // 소셜 로그인 UID 추가
//         if (!uids.includes(userInfo.uid)) {
//           console.log("✅ 소셜 로그인 UID 추가됨:", userInfo.uid);
//           uids.push(userInfo.uid);
//         } else {
//           console.log("✅ 소셜 로그인 UID 이미 존재:", userInfo.uid);
//         }
        
//       // 전화번호 인증으로 받은 UID도 함께 저장하기 위해 uids 배열에 추가 
//       if (userInfo.phoneAuthUID) {
//         if (!uids.includes(userInfo.phoneAuthUID)) {
//           console.log("✅ UID 추가됨:", userInfo.phoneAuthUID);
//           uids.push(userInfo.phoneAuthUID);
//         } else {
//           console.log("✅ UID 이미 존재:", userInfo.phoneAuthUID);
//         }
//       }

//       // 🔁 기존 providers 배열에서 중복 없이 추가
//       providers = existingData.providers || [];
//       if (!providers.includes(provider)) {
//         console.log("✅ Provider 추가됨:", provider);
//         providers.push(provider);
//       } else {
//         console.log("✅ Provider 이미 존재:", provider);
//       }

//       // 전화번호 provider 추가 (전화번호 인증이 있는 경우)
//       if (userInfo.phoneAuthUID && !providers.includes("phone")) {
//         console.log("✅ 전화번호 Provider 추가됨");
//         providers.push("phone");
//       }
      
    
//     } else {
//       // 문서가 없다면 uid와 provider로 새로 생성
//       uids = [userInfo.uid];
//       providers = [provider];

//       // 전화번호 인증이 포함된 경우 추가
//       if (userInfo.phoneAuthUID) {
//         uids.push(userInfo.phoneAuthUID);
//         providers.push("phone");
//       }
//     }
      


//     console.log("📤 Firestore에 저장할 uids 배열:", uids);
//     console.log("📤 Firestore에 저장할 providers 배열:", providers);


//       await setDoc(userRef, {
//         name,
//         email,
//         photo,
//         providers,
//         currentProvider: provider, // 현재 로그인한 provider (선택적)
//         phone,
//         uids,
//         createdAt
//       }, { merge: true });

        
//       console.log("✅ 사용자 정보 저장 완료");

//   } catch (e) {
//     console.error("❌ Firestore 저장 실패", e);
//   }
// }

