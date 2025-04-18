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
    
    // reCAPTCHA 초기화
    initRecaptcha();
    
    // 전화번호 제출 버튼 클릭 이벤트
    submitPhoneBtn.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        
        // 유효성 검사
        if (!phone) {
            showToast("전화번호를 입력해주세요.");
            return;
        }
        
        // 전화번호 기본 형식 검사 (한국 전화번호)
        const phoneRegex = /^01([0|1|6|7|8|9])-?([0-9]{3,4})-?([0-9]{4})$/;
        if (!phoneRegex.test(phone)) {
            showToast("유효한 전화번호 형식이 아닙니다.");
            return;
        }
        
        // 전화번호 국제 형식으로 변환
        formattedPhoneNumber = formatToE164(phone);
        submitPhoneBtn.textContent = "처리 중...";
        submitPhoneBtn.disabled = true;
        
        try {
            // SMS 인증 요청
            const appVerifier = window.recaptchaVerifier;
            confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, appVerifier);
            
            // 인증 코드 입력 UI로 전환
            // phoneSection.style.display = 'none';
            verifySection.style.display = 'block';
            codeInput.focus();
            
            // 타이머 시작
            startTimer();
            
            showToast("인증 코드가 문자로 발송되었습니다.");
            
        } catch (error) {
            console.error("SMS 인증 요청 실패:", error);
            submitPhoneBtn.textContent = "제출";
            submitPhoneBtn.disabled = false;
            
            let errorMessage = "SMS 인증 요청에 실패했습니다.";
            
            if (error.code === 'auth/invalid-phone-number') {
                errorMessage = "유효하지 않은 전화번호입니다.";
            } else if (error.code === 'auth/quota-exceeded') {
                errorMessage = "너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.";
            }
            
            showToast(errorMessage);
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
            
            let errorMessage = "인증에 실패했습니다.";
            if (error.code === 'auth/invalid-verification-code') {
                errorMessage = "잘못된 인증 코드입니다.";
            } else if (error.code === 'auth/code-expired') {
                errorMessage = "인증 코드가 만료되었습니다.";
            }
            
            showToast(errorMessage);
            submitCodeBtn.textContent = "인증하기";
            submitCodeBtn.disabled = false;
        }
    });
    
    // 재전송 버튼 클릭 이벤트
    resendCodeBtn.addEventListener('click', async () => {
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
});



// reCAPTCHA 초기화
function initRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'submitPhone', {
            'size': 'invisible',
            'callback': (response) => {
                // reCAPTCHA 완료 시 콜백
            }
        });
    }
}

// reCAPTCHA 재설정
function resetRecaptcha() {
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
    }
    initRecaptcha();
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
    
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        timerElement.style.color = "#45206C"; // 기본 색상으로 재설정
        
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
    
    // 입력 필드 초기화
    phoneInput.disabled = false;
    phoneInput.value = '';
    codeInput.value = '';
    
    // 버튼 초기화
    submitPhoneBtn.textContent = "제출";
    submitPhoneBtn.disabled = false;
    
    // // UI 전환
    // phoneSection.style.display = 'block';
    // verifySection.style.display = 'none';
    
    // 타이머 정지
    clearInterval(timerInterval);
    
    // reCAPTCHA 재설정
    resetRecaptcha();
    
    // 전역 변수 초기화
    confirmationResult = null;
    formattedPhoneNumber = null;
}