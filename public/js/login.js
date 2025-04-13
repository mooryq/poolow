import { auth, provider } from "./firebase.js";
import { signInWithPopup } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { naverConfig } from "./config.js";

// 구글로그인
document.addEventListener("DOMContentLoaded", () => {
    const googleLoginBtn = document.getElementById("googleLogin");
    
    googleLoginBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const token = await result.user.getIdToken();
        const user = result.user;
        
        // 인증 토큰 저장
        sessionStorage.setItem("accessToken", token);
        console.log("AccessToken saved:", token);

        // 사용자 정보를 로컬 스토리지에 저장
        localStorage.setItem("user", JSON.stringify({
          uid: user.uid,
          name: user.displayName || "",
          email: user.email || "",
          photo: user.photoURL || "default.jpg",
          provider: "google"
        }));

        // 로그인 성공 플래그 설정
        localStorage.setItem("loginSuccess", "true");
        console.log("로그인 성공 플래그 설정됨");

        
        // 세션 스토리지에서 returnUrl 확인
        const returnUrl = sessionStorage.getItem('returnUrl');
      
        if (returnUrl) {
            console.log("리디렉션:", returnUrl);
            sessionStorage.removeItem('returnUrl'); // 사용 후 삭제
            window.location.href = returnUrl;
        } else {
            console.log("리디렉션 없음, 기본 페이지로 이동");
            window.location.href = "index.html";
        }
      } catch (error) {
        console.error("❌ 로그인 실패:", error);
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

// // 네이버 로그인 콜백 처리
// if (window.location.pathname.includes('naver_callback')) {
//   const naverLogin = new naver.LoginWithNaverId(naverConfig);
//   naverLogin.init();

//   naverLogin.getLoginStatus(function(status) {
//       if (!status || !naverLogin.user) {
//           console.error("❌ 네이버 로그인 실패 또는 사용자 정보 없음");
//           localStorage.removeItem("loginSuccess");
//           localStorage.removeItem("user");
//           return;    
//       }

//       const id = naverLogin.user.getId();
//       const name = naverLogin.user.getName();
//       const email = naverLogin.user.getEmail();

//       if (!id) {
//           alert("네이버 사용자 식별자를 불러오지 못했습니다.");
//           console.warn("⚠️ 유저 정보:", naverLogin.user);
//           return;
//       }
      
//       console.log("💡 getId:", naverLogin.user.getId());
//       console.log("💡 전체 유저 정보", naverLogin.user);

//       const userInfo = {
//           uid: id,
//           name: name || "이름없음",
//           email: email || "",
//           photo: "default.jpg",
//           provider: "naver"
//       };

//       console.log("✅ 네이버 로그인 성공:", userInfo);
//       localStorage.setItem("user", JSON.stringify(userInfo));
      
//       // 로그인 성공 플래그 설정
//       localStorage.setItem("loginSuccess", "true");
      
//       // 잠시 지연 후 리다이렉션
//       setTimeout(() => {
//           const returnUrl = sessionStorage.getItem('returnUrl');
//           if (returnUrl) {
//               console.log("리디렉션:", returnUrl);
//               sessionStorage.removeItem('returnUrl'); // 사용 후 삭제
//               window.location.href = returnUrl;
//           } else {
//               console.log("리디렉션 없음, 기본 페이지로 이동");
//               window.location.href = "index.html";
//           }
//       }, 200); // 200ms 지연
//   });
// }

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
