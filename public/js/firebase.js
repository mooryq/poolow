// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-analytics.js";
import { 
    getAuth, 
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    GoogleAuthProvider
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
const app = initializeApp(firebaseConfig);
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
    // 로그인 성공 시
    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL,
      provider: user.providerId
    }));
  } else {
    // 로그아웃 또는 세션 만료 시
    localStorage.removeItem("user");
  }
});


// ✅ Firestore에 유저 정보 저장 함수 (통합 UID 배열 기반)
export async function saveUserToFirestore(phone, userInfo) {
  console.log("💾 저장하려는 userInfo:", userInfo);  // 🔥 이 줄을 가장 먼저!

  
    const userRef = doc(db, "users", phone);
    let uids = [];

    try {
      const docSnap = await getDoc(userRef);
  
      // 기본 값 준비
      let name = userInfo.name || "";
      let email = userInfo.email || "";
      let photo = userInfo.photo || "default.jpg";
      let provider = userInfo.provider || "unknown";
      let createdAt = new Date();
  
      if (docSnap.exists()) {
        const existingData = docSnap.data();
  
        // 기존 값 우선 사용
        name = existingData.name || name;
        email = existingData.email || email;
        photo = existingData.photo || photo;
        // provider = existingData.provider || provider;
        createdAt = existingData.createdAt || createdAt;
  
      // 🔁 기존 uid 배열에서 중복 없이 추가
      uids = existingData.uids || [];
      if (!uids.includes(userInfo.uid)) {
        console.log("➕ UID 추가됨:", userInfo.uid);
        uids.push(userInfo.uid);
      } else {
        console.log("✅ UID 이미 존재:", userInfo.uid);
      }
    } else {
      // 문서가 없다면 uid로 새로 생성
      uids = [userInfo.uid];
    }

    console.log("📤 Firestore에 저장할 uids 배열:", uids);


      await setDoc(userRef, {
        name,
        email,
        photo,
        provider,
        phone,
        uids,
        createdAt
      }, { merge: true });
      

      // await setDoc(userRef, {
      //   name: docSnap.exists() ? existingData.name : (userInfo.name || ""),
      //   email: docSnap.exists() ? existingData.email : (userInfo.email || ""),
      //   photo: docSnap.exists() ? existingData.photo : (userInfo.photo || "default.jpg"),
      //   provider: docSnap.exists() ? existingData.provider : (userInfo.provider || "unknown"),
      //   phone,
      //   uids,
      //   createdAt: docSnap.exists() ? existingData.createdAt : new Date()
      // }, { merge: true });
      
        
      console.log("✅ 사용자 정보 저장 완료");

  } catch (e) {
    console.error("❌ Firestore 저장 실패", e);
  }
}


// // ✅ Firestore에서 유저 정보 불러오는 함수
// export async function getUserFromFirestore(phone) {
//   try {
//     const docRef = doc(db, "users", phone);
//     const docSnap = await getDoc(docRef);

//     if (docSnap.exists()) {
//       console.log("👤 기존 유저 정보:", docSnap.data());
//       return docSnap.data();
//     } else {
//       console.log("🆕 사용자 정보 없음 (새로 생성 필요)");
//       return null;
//     }
//   } catch (e) {
//     console.error("❌ Firestore 읽기 실패", e);
//     return null;
//   }
// }
