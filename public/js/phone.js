import { 
    auth, 
    db, 
    saveUserToFirestore
} from "./firebase.js";

import { RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { showToast } from './global.js';

// 전역 변수
let confirmationResult = null; // SMS 인증 결과를 저장
let formattedPhoneNumber = null; // 국제 형식 전화번호
let timerInterval = null; // 타이머 인터벌

document.addEventListener('DOMContentLoaded', () => {
    // 사용자 정보 확인
    const localUser = JSON.parse(localStorage.getItem("user"));
    
    // 로그인 되어 있지 않으면 로그인 페이지로 리다이렉션
    if (!localUser || !localUser.uid) {
        console.error("로그인 정보가 없습니다.");
        window.location.href = "login.html";
        return;
    }
    
    console.log("👤 현재 유저 정보:", localUser);
    
    // UI 요소
    const phoneSection = document.querySelector('.phone-section');
    const verifySection = document.querySelector('.verify-section');
    const phoneInput = document.getElementById('phoneInput');
    const codeInput = document.getElementById('codeInput');
    const submitPhoneBtn = document.getElementById('submitPhone');
    const submitCodeBtn = document.getElementById('submitCode');
    const resendCodeBtn = document.getElementById('resendCode');
    
    // 버튼 초기 비활성화 (HTML에 disabled 추가했더라도 JS에서도 설정)
    submitPhoneBtn.disabled = true;
    submitCodeBtn.disabled = true;
    
    // 전화번호 입력 필드에 이벤트 리스너 추가
    phoneInput.addEventListener('input', handlePhoneInput);
    
    // 인증코드 입력 필드에 이벤트 리스너 추가
    codeInput.addEventListener('input', handleCodeInput);
    
    // reCAPTCHA 초기화 (페이지 로드 시 지연시켜 DOM이 완전히 로드된 후 실행)
    setTimeout(() => {
        try {
            initRecaptcha();
            console.log("✅ reCAPTCHA 초기화 완료");
        } catch (error) {
            console.error("❌ reCAPTCHA 초기화 실패:", error);
        }
    }, 1000);
    
    // 전화번호 제출 버튼 클릭 이벤트
    submitPhoneBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        
        // 유효성 검사
        if (!phone) {
            showToast("전화번호를 입력해주세요.");
            return;
        }
        
        // 전화번호 기본 형식 검사 (한국 전화번호)
        const phoneRegex = /^01([0|1|6|7|8|9])[-\s]?([0-9]{3,4})[-\s]?([0-9]{4})$/;
        if (!phoneRegex.test(phone)) {
            showToast("유효한 전화번호 형식이 아닙니다.");
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
                throw new Error("reCAPTCHA가 초기화되지 않았습니다.");
            }
            
            // SMS 인증 요청
            const appVerifier = window.recaptchaVerifier;
            confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
            
            // phone-section 숨기기
            phoneSection.style.display = 'none';
            
            // 인증 코드 입력 UI로 전환
            verifySection.style.display = 'block';
            codeInput.focus();
            
            // 타이머 시작
            startTimer();
            
            showToast("인증 코드가 문자로 발송되었습니다.");
            
        } catch (error) {
            console.error("SMS 인증 요청 실패:", error);
            
            // 버튼 상태 복원
            submitPhoneBtn.textContent = "인증번호 받기";
            submitPhoneBtn.disabled = false;
            validatePhoneInput(phone);  // 다시 유효성 체크해서 버튼 상태 설정
            
            // 에러 메시지 처리
            let errorMessage = "SMS 인증 요청에 실패했습니다.";
            
            if (error.code === 'auth/invalid-phone-number') {
                errorMessage = "유효하지 않은 전화번호입니다.";
            } else if (error.code === 'auth/quota-exceeded') {
                errorMessage = "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.";
            } else if (error.code === 'auth/captcha-check-failed') {
                errorMessage = "reCAPTCHA 인증에 실패했습니다. 페이지를 새로고침하고 다시 시도해주세요.";
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
            
            // 인증에 성공하면 전화번호 저장 (번호 포맷 정리)
            const phoneForDB = formattedPhoneNumber.replace('+82', '0');
            
            // Firestore에 사용자 정보 저장
            await saveUserToFirestore(phoneForDB, localUser);
            
            // 로컬 스토리지 사용자 정보 업데이트
            localStorage.setItem("user", JSON.stringify({ ...localUser, phone: phoneForDB }));
            localStorage.setItem("loginSuccess", "true");
            
            showToast("전화번호 인증이 완료되었습니다!");
            
            // 타이머 정지
            clearInterval(timerInterval);
            
            // 이전 페이지로 복귀
            setTimeout(() => {
                const returnUrl = sessionStorage.getItem('returnUrl') || "index.html";
                sessionStorage.removeItem('returnUrl');
                
                console.log("👉 복귀할 URL:", returnUrl);
                window.location.href = returnUrl;
            }, 1500);
            
        } catch (error) {
            console.error("인증 코드 확인 실패:", error);
            
            // 에러 메시지 처리
            let errorMessage = "인증에 실패했습니다.";
            if (error.code === 'auth/invalid-verification-code') {
                errorMessage = "잘못된 인증 코드입니다.";
            } else if (error.code === 'auth/code-expired') {
                errorMessage = "인증 코드가 만료되었습니다.";
            }
            
            showToast(errorMessage);
            
            // 버튼 상태 복원
            submitCodeBtn.textContent = "인증하기";
            submitCodeBtn.disabled = !validateCodeInput(code);
        }
    });
    
    // 재전송 버튼 클릭 이벤트
    resendCodeBtn.addEventListener('click', async () => {
        if (!formattedPhoneNumber) {
            showToast("전화번호 정보가 없습니다. 처음부터 다시 시도해주세요.");
            resetUI();
            return;
        }
        
        // reCAPTCHA 재설정
        resetRecaptcha();
        
        try {
            // SMS 인증 재요청
            const appVerifier = window.recaptchaVerifier;
            confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
            
            // 타이머 재시작
            startTimer();
            
            showToast("인증 코드가 다시 발송되었습니다.");
        } catch (error) {
            console.error("인증 코드 재발송 실패:", error);
            showToast("인증 코드 재발송에 실패했습니다. 다시 시도해주세요.");
        }
    });
    
    // 전화번호 입력 필드 핸들러 
    function handlePhoneInput(e) {
        const input = e.target;
        let value = input.value.replace(/\D/g, ''); // 숫자만 추출
        
        // 자동 포맷팅 (010-1234-5678 형식)
        if (value.length > 3 && value.length <= 7) {
            value = value.slice(0, 3) + '-' + value.slice(3);
        } else if (value.length > 7) {
            value = value.slice(0, 3) + '-' + value.slice(3, 7) + '-' + value.slice(7, 11);
        }
        
        input.value = value;
        
        // 유효성 검증 및 버튼 상태 업데이트
        validatePhoneInput(value);
    }
    
    // 전화번호 유효성 검증 및 버튼 상태 업데이트
    function validatePhoneInput(value) {
        const phoneRegex = /^01([0|1|6|7|8|9])[-\s]?([0-9]{3,4})[-\s]?([0-9]{4})$/;
        const isValid = phoneRegex.test(value);
        
        submitPhoneBtn.disabled = !isValid;
        
        // 버튼 스타일 업데이트 - 유효할 때는 배경색 변경 등 (CSS로 처리 가능)
        if (isValid) {
            submitPhoneBtn.style.backgroundColor = "#C8F575";
            submitPhoneBtn.style.fontWeight = "500";
        } else {
            submitPhoneBtn.style.backgroundColor = "#f5f5f5";
        }
        
        return isValid;
    }
    
    // 인증코드 입력 필드 핸들러
    function handleCodeInput(e) {
        const input = e.target;
        // 숫자만 입력되도록
        input.value = input.value.replace(/\D/g, '').substring(0, 6);
        
        // 유효성 검증 및 버튼 상태 업데이트
        validateCodeInput(input.value);
    }
    
    // 인증코드 유효성 검증 및 버튼 상태 업데이트
    function validateCodeInput(value) {
        const isValid = value.length === 6;
        
        submitCodeBtn.disabled = !isValid;
        
        // 버튼 스타일 업데이트
        if (isValid) {
            submitCodeBtn.style.backgroundColor = "#C8F575";
            submitCodeBtn.style.fontWeight = "500";
        } else {
            submitCodeBtn.style.backgroundColor = "#f5f5f5";
        }
        
        return isValid;
    }
});

// reCAPTCHA 초기화
function initRecaptcha() {
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'submitPhone', {
        'size': 'invisible',
        'callback': (response) => {
            console.log("✅ reCAPTCHA 확인 완료");
        },
        'expired-callback': () => {
            console.log("⚠️ reCAPTCHA 만료됨");
            resetRecaptcha();
        },
        'error-callback': (error) => {
            console.error("❌ reCAPTCHA 오류:", error);
        }
    });
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
    
    setTimeout(() => {
        try {
            initRecaptcha();
            console.log("✅ reCAPTCHA 재초기화 완료");
        } catch (error) {
            console.error("❌ reCAPTCHA 재초기화 실패:", error);
        }
    }, 500);
}

// 전화번호 국제 형식(E.164)으로 변환
function formatToE164(phoneNumber) {
    // 숫자만 추출
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // 한국 전화번호 포맷 변환 (01012345678 -> +821012345678)
    if (cleaned.startsWith('0')) {
        return `+82${cleaned.substring(1)}`;
    }
    return `+82${cleaned}`;
}

// 타이머 시작 (3분)
function startTimer() {
    let timeLeft = 180; // 3분
    const timerElement = document.querySelector('.timer');
    
    // 기존 타이머 정지
    clearInterval(timerInterval);
    
    // 타이머 초기화
    timerElement.textContent = '3:00';
    timerElement.style.color = "#45206C";
    
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        // 1분 이하면 색상 변경
        if (timeLeft <= 60) {
            timerElement.style.color = "#FF5722";
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = "시간 초과";
            timerElement.style.color = "red";
            confirmationResult = null; // 인증 정보 초기화
            showToast("인증 시간이 초과되었습니다. 다시 시도해주세요.");
        }
        timeLeft--;
    }, 1000);
}

// UI 초기화 (에러 발생 시)
function resetUI() {
    const phoneSection = document.querySelector('.phone-section');
    const verifySection = document.querySelector('.verify-section');
    const phoneInput = document.getElementById('phoneInput');
    const codeInput = document.getElementById('codeInput');
    const submitPhoneBtn = document.getElementById('submitPhone');
    const submitCodeBtn = document.getElementById('submitCode');
    
    // 입력 필드 초기화
    phoneInput.disabled = false;
    phoneInput.value = '';
    codeInput.value = '';
    
    // 버튼 초기화
    submitPhoneBtn.textContent = "인증번호 받기";
    submitPhoneBtn.disabled = true;
    submitPhoneBtn.style.backgroundColor = "#f5f5f5";
    
    submitCodeBtn.textContent = "인증하기";
    submitCodeBtn.disabled = true;
    submitCodeBtn.style.backgroundColor = "#f5f5f5";
    
    // 섹션 표시 설정
    phoneSection.style.display = 'flex';
    verifySection.style.display = 'none';
    
    // 타이머 정지
    clearInterval(timerInterval);
    const timerElement = document.querySelector('.timer');
    if (timerElement) {
        timerElement.textContent = "3:00";
        timerElement.style.color = "#45206C";
    }
    
    // reCAPTCHA 재설정
    resetRecaptcha();
    
    // 전역 변수 초기화
    confirmationResult = null;
    formattedPhoneNumber = null;
}