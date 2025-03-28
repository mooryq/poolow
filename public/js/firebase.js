

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

  // Firebase 인증 객체 생성
  export const auth = getAuth(app);

  //로그아웃
  export { signOut };
  
  // Google 로그인 제공자
  export const provider = new GoogleAuthProvider();
  
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
  
// //다른페이지에서 유저 정보 꺼내는 코드 (다른데서 사용할 것)
//   const user = JSON.parse(localStorage.getItem("user"));
// if (user) {
//   console.log("🎉 유저 정보 있음:", user.name);
// }
