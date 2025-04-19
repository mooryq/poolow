// phone.js (리팩토링 버전)
import { 
    initPhoneAuth, 
    requestPhoneVerification, 
    saveUserToFirestore
  } from "./auth-service.js";
  import { showToast } from './global.js';
  
  // 전역 변수
  let confirmationResult = null;
  let formattedPhoneNumber = null;
  let timerInterval = null;
  
  document.addEventListener('DOMContentLoaded', () => {
    // 사용자 정보 확인
    const localUser = JSON.parse(localStorage.getItem("user"));
    
    // 로그인 정보 검증
    if (!localUser || !localUser.uid) {
      console.error("로그인 정보가 없습니다.");
      window.location.href = "login.html";
      return;
    }
    
    // UI 요소
    const phoneSection = document.querySelector('.phone-section');
    const verifySection = document.querySelector('.verify-section');
    const phoneInput = document.getElementById('phoneInput');
    const codeInput = document.getElementById('codeInput');
    const submitPhoneBtn = document.getElementById('submitPhone');
    const submitCodeBtn = document.getElementById('submitCode');
    const resendCodeBtn = document.getElementById('resendCode');
    
    // 버튼 초기 비활성화
    submitPhoneBtn.disabled = true;
    submitCodeBtn.disabled = true;
    
    // 이벤트 리스너 설정
    phoneInput.addEventListener('input', handlePhoneInput);
    codeInput.addEventListener('input', handleCodeInput);
    
    // reCAPTCHA 초기화
    async function initializeRecaptcha() {
      try {
        // 기존 reCAPTCHA 인스턴스가 있으면 제거
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
        
        // reCAPTCHA 초기화
        initPhoneAuth('submitPhone');
        console.log("✅ reCAPTCHA 초기화 완료");
      } catch (error) {
        console.error("❌ reCAPTCHA 초기화 실패:", error);
        showToast("인증 초기화에 실패했습니다. 페이지를 새로고침해주세요.");
      }
    }
    
    // reCAPTCHA 재설정
    function resetRecaptcha() {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (error) {
          console.error("reCAPTCHA 초기화 해제 실패:", error);
        }
        window.recaptchaVerifier = null;
      }
      
      // 약간의 지연 후 재초기화
      setTimeout(() => {
        try {
          initPhoneAuth('submitPhone');
          console.log("✅ reCAPTCHA 재초기화 완료");
        } catch (error) {
          console.error("❌ reCAPTCHA 재초기화 실패:", error);
        }
      }, 1000);
    }
    
    // 페이지 로드 시 reCAPTCHA 초기화
    setTimeout(() => {
      initializeRecaptcha();
    }, 2000);
    
    // 전화번호 제출 버튼 클릭 이벤트
    submitPhoneBtn.addEventListener('click', async () => {
      const phone = phoneInput.value.trim();
      
      // 유효성 검사
      if (!validatePhoneInput(phone)) {
        showToast("유효한 전화번호를 입력해주세요.");
        return;
      }
      
      // 전화번호 국제 형식으로 변환
      formattedPhoneNumber = formatToE164(phone);
      
      // 버튼 상태 업데이트
      submitPhoneBtn.textContent = "처리 중...";
      submitPhoneBtn.disabled = true;
      
      try {
        // reCAPTCHA가 초기화되어 있는지 확인
        if (!window.recaptchaVerifier) {
          // reCAPTCHA가 없으면 초기화
          initPhoneAuth('submitPhone');
        }
        
        // 약간의 지연 추가
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // SMS 인증 요청
        confirmationResult = await requestPhoneVerification(formattedPhoneNumber);
        
        // UI 전환
        phoneSection.style.display = 'none';
        verifySection.style.display = 'block';
        codeInput.focus();
        
        // 타이머 시작
        startTimer();
        
        showToast("인증 코드가 문자로 발송되었습니다.");
      } catch (error) {
        // 에러 처리 및 UI 복구
        submitPhoneBtn.textContent = "인증번호 받기";
        submitPhoneBtn.disabled = false;
        
        let errorMessage = "인증 요청에 실패했습니다.";
        if (error.code === 'auth/invalid-phone-number') {
          errorMessage = "유효하지 않은 전화번호입니다.";
        }
        
        showToast(errorMessage);
        
        // reCAPTCHA 재설정
        resetRecaptcha();
      }
    });
    
    // 인증 코드 제출 버튼 클릭 이벤트
    submitCodeBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      
      // 코드 유효성 검사
      if (!code || code.length !== 6) {
        showToast("6자리 인증 코드를 입력해주세요.");
        return;
      }
      
      if (!confirmationResult) {
        showToast("인증 세션이 만료되었습니다. 다시 시도해주세요.");
        resetUI();
        return;
      }
      
      // 버튼 상태 업데이트
      submitCodeBtn.textContent = "확인 중...";
      submitCodeBtn.disabled = true;
      
      try {
        // 인증 코드 검증
        const result = await confirmationResult.confirm(code);
        
        // 전화번호 저장
        const phoneForDB = formattedPhoneNumber.replace('+82', '0');
        await saveUserToFirestore(phoneForDB, localUser);
        
        showToast("전화번호 인증이 완료되었습니다!");
        
        // 타이머 정지
        clearInterval(timerInterval);
        
        // 리다이렉션
        setTimeout(() => {
          const returnUrl = sessionStorage.getItem('returnUrl') || "index.html";
          sessionStorage.removeItem('returnUrl');
          window.location.href = returnUrl;
        }, 1500);
      } catch (error) {
        // 에러 처리
        let errorMessage = "인증에 실패했습니다.";
        if (error.code === 'auth/invalid-verification-code') {
          errorMessage = "잘못된 인증 코드입니다.";
        }
        
        showToast(errorMessage);
        
        // 버튼 상태 복구
        submitCodeBtn.textContent = "인증하기";
        submitCodeBtn.disabled = false;
      }
    });
    
    // 재전송 버튼 클릭 이벤트
    resendCodeBtn.addEventListener('click', async () => {
      // (기존 코드와 동일한 로직 유지)
    });
    
    // 전화번호 입력 핸들러 및 유효성 검사 함수
    function handlePhoneInput(e) {
      const phone = e.target.value.trim();
      const isValid = validatePhoneInput(phone);
      submitPhoneBtn.disabled = !isValid;
    }
    
    function validatePhoneInput(value) {
      // 전화번호 형식 검사 (010으로 시작하는 10-11자리 숫자)
      const phoneRegex = /^010[0-9]{7,8}$/;
      // 하이픈이나 공백 제거
      const cleanNumber = value.replace(/[-\s]/g, '');
      return phoneRegex.test(cleanNumber);
    }
    
    // 인증코드 입력 핸들러 및 유효성 검사 함수
    function handleCodeInput(e) {
      // (기존 코드와 동일한 로직 유지)
    }
    
    function validateCodeInput(value) {
      // (기존 코드와 동일한 로직 유지)
    }
  });
  
  // 헬퍼 함수들 (기존 코드와 동일하게 유지)
  function formatToE164(phoneNumber) {
    // (기존 코드와 동일한 로직 유지)
  }
  
  function startTimer() {
    // (기존 코드와 동일한 로직 유지)
  }
  
  function resetUI() {
    // (기존 코드와 동일한 로직 유지)
  }