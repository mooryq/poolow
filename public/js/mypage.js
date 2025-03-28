
  import { auth } from "./firebase.js";
  import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js"; // ✅ 이건 필요해!

  const user = JSON.parse(localStorage.getItem("user"));


//   onAuthStateChanged(auth, (user) => {
//     if (user) {
//         document.getElementById("userName").innerHTML =  `<strong>Name:</strong> ${user.displayName || "사용자 이름 없음"}`;
//         document.getElementById("userEmail").innerHTML = `<strong>Email:</strong> ${user.email || "이메일 없음"}`;
//         document.getElementById("userPhoto").style.backgroundImage = `url(${user.photoURL || 'default.jpg'})`;
//     } else {
//       // 로그인 안 된 경우 로그인 페이지로 리디렉션
//       window.location.href = "login.html";
//     }
//   });

const localUser = JSON.parse(localStorage.getItem("user"));

onAuthStateChanged(auth, (firebaseUser) => {
  if (firebaseUser) {
    // ✅ 구글 로그인 사용자
    updateUserUI(firebaseUser.displayName, firebaseUser.email, firebaseUser.photoURL);
  } else if (localUser) {
    // ✅ 네이버 로그인 사용자
    updateUserUI(localUser.name, localUser.email, "default.jpg");
  } else {
    // ❌ 둘 다 로그인 안 된 경우
    window.location.href = "login.html";
  }
});

function updateUserUI(name, email, photoURL) {
    document.getElementById("userName").innerHTML = `<strong>Name:</strong> ${name}`;
    document.getElementById("userEmail").innerHTML = `<strong>Email:</strong> ${email}`;
    document.getElementById("userPhoto").style.backgroundImage = `url(${photoURL || 'default.jpg'})`;
  }

  
  //로그아웃

  const logoutBtn = document.getElementById("logoutBtn");

  logoutBtn.addEventListener("click", async () => {
try{
    await signOut(auth);
    console.log("👋 로그아웃 성공");
    localStorage.removeItem("user");
    window.location.href = "login.html";
} catch(error) {
    console.error("❌ 로그아웃 실패:", error);
}
  });
