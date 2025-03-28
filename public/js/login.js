 // 구글로그인
    import { auth, provider } from "./firebase.js";
    import { signInWithPopup } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
    


    
document.addEventListener("DOMContentLoaded", () => {

    const googleLoginBtn = document.getElementById("googleLogin");
    
    googleLoginBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const token =await result.user.getIdToken();

        sessionStorage.setItem("accessToken", token);
        console.log("AccessToken saved:", token);
        window.location.href = "mypage.html"; // 로그인 성공 후 리디렉션
      } catch (error) {
        console.error("❌ 로그인 실패:", error);
      }
    });



    //네이버로그인  
    

    const naverLogin = new naver.LoginWithNaverId({
        clientId: "Fhq__Qo4pzeZka3tYTHt",
        callbackUrl: "https://127.0.0.1:5500/public/naver-callback.html",
        isPopup: false,
        loginButton: { color: "green", type: 3, height: 40 },
    });
    naverLogin.init();

});