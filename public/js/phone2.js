import { auth, db, saveUserToFirestore } from './firebase.js';
import { RecaptchaVerifier, signInWithPhoneNumber, getAuth } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { showToast } from './global.js';

// 전역 변수
let verificationId = null;
let phoneNumber = null;

document.addEventListener('DOMContentLoaded', () => {
    // UI 요소
    const phoneInput = document.getElementById('phoneInput');
    const savePhoneBtn = document.getElementById('savePhoneBtn');
    const phoneForm = document.getElementById('phoneForm');
    
    // UI 상태 초기화
    initUI();
    
    // reCAPTCHA 초기화
    initRecaptcha();
    
    // 전화번호 제출 버튼 이벤트
    savePhoneBtn.addEventListener('click', async () => {
        if (!phoneInput.value.trim()) {
            showToast("전화번호를 입력해주세요");
            return;
        }
        
        // 이미 인증 단계인 경우 코드 확인
        if (savePhoneBtn.dataset.state === 'verify') {
            verifyCode();
            return;
        }
        
        // 전화번호 포맷 확인
        phoneNumber = formatPhoneNumber(phoneInput.value);
        if (!phoneNumber) {
            showToast("올바른 전화번호 형식이 아닙니다");
            return;
        }
        
        try {
            // 인증 SMS 발송
            const appVerifier = window.recaptchaVerifier;
            savePhoneBtn.textContent = "인증 요청 중...";
            savePhoneBtn.disabled = true;
            
            const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            verificationId = confirmationResult;
            
            // UI 전환 - 인증 코드 입력 화면
            showVerificationUI();
        } catch (error) {
            console.error("SMS 인증 요청 실패:", error);
            showToast("SMS 인증 요청에 실패했습니다. 다시 시도해주세요.");
            resetRecaptcha();
            savePhoneBtn.textContent = "제출";
            savePhoneBtn.disabled = false;
        }
    });
});

// UI 초기화
function initUI() {
    const phoneForm = document.querySelector('#phoneForm');
    if (!phoneForm) return;
    
    // 인증 코드 입력 필드 추가
    const verificationDiv = document.createElement('div');
    verificationDiv.className = 'verification-section';
    verificationDiv.innerHTML = `
        <div class="title">인증코드</div>
        <div class="input-wrapper">
            <input type="text" id="verificationCode" placeholder="인증코드 6자리" maxlength="6" />
            <div class="timer">3:00</div>
        </div>
        <div class="verification-help">인증코드가 오지 않았나요? <button id="resendCode">다시 요청</button></div>
    `;
    
    // 숨겨둠
    verificationDiv.style.display = 'none';
    phoneForm.appendChild(verificationDiv);
    
    // 재전송 버튼 이벤트
    document.getElementById('resendCode')?.addEventListener('click', resendVerificationCode);
}

// reCAPTCHA 초기화
function initRecaptcha() {
    if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'savePhoneBtn', {
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

// 전화번호 포맷 확인 및 변환
function formatPhoneNumber(phoneNumber) {
    // 숫자만 추출
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // 한국 전화번호 포맷 확인 (10자리 또는 11자리)
    if (cleaned.length !== 10 && cleaned.length !== 11) {
        return null;
    }
    
    // 국제 포맷으로 변환 (+82)
    return `+82${cleaned.startsWith('0') ? cleaned.substring(1) : cleaned}`;
}

// 인증 코드 입력 UI 표시
function showVerificationUI() {
    const phoneInput = document.getElementById('phoneInput');
    const savePhoneBtn = document.getElementById('savePhoneBtn');
    const verificationSection = document.querySelector('.verification-section');
    
    phoneInput.disabled = true;
    savePhoneBtn.textContent = "인증하기";
    savePhoneBtn.disabled = false;
    savePhoneBtn.dataset.state = 'verify';
    
    if (verificationSection) {
        verificationSection.style.display = 'block';
    }
    
    // 타이머 시작
    startTimer();
    
    // 인증 코드 필드에 포커스
    document.getElementById('verificationCode')?.focus();
}

// 타이머 시작 (3분)
let timerInterval;
function startTimer() {
    let timeLeft = 180; // 3분
    const timerElement = document.querySelector('.timer');
    if (!timerElement) return;
    
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            timerElement.textContent = "시간 초과";
            timerElement.style.color = "red";
            verificationId = null;
        }
        timeLeft--;
    }, 1000);
}

// 인증 코드 재전송
async function resendVerificationCode() {
    try {
        resetRecaptcha();
        
        if (!phoneNumber) {
            showToast("전화번호를 먼저 입력해주세요");
            return;
        }
        
        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
        verificationId = confirmationResult;
        
        // 타이머 재시작
        startTimer();
        
        showToast("인증 코드가 다시 발송되었습니다");
    } catch (error) {
        console.error("인증 코드 재발송 실패:", error);
        showToast("인증 코드 재발송에 실패했습니다. 다시 시도해주세요.");
    }
}

// 인증 코드 확인
async function verifyCode() {
    const verificationCode = document.getElementById('verificationCode').value.trim();
    
    if (!verificationCode || verificationCode.length !== 6) {
        showToast("유효한 인증 코드를 입력해주세요");
        return;
    }
    
    if (!verificationId) {
        showToast("인증 세션이 만료되었습니다. 다시 시도해주세요.");
        resetUI();
        return;
    }
    
    const savePhoneBtn = document.getElementById('savePhoneBtn');
    savePhoneBtn.textContent = "인증 중...";
    savePhoneBtn.disabled = true;
    
    try {
        // 인증 코드 확인
        const result = await verificationId.confirm(verificationCode);
        const user = result.user;
        
        // 인증 성공, 현재 로그인된 소셜 계정 정보 가져오기
        const localUser = JSON.parse(localStorage.getItem("user"));
        
        if (!localUser || !localUser.uid) {
            showToast("사용자 정보를 찾을 수 없습니다");
            return;
        }
        
        // Firestore에 사용자 정보 저장 (전화번호가 문서 ID)
        const formattedPhoneNumber = formatPhoneNumberForDB(phoneNumber);
        await saveUserToFirestore(formattedPhoneNumber, localUser);
        
        showToast("전화번호 인증이 완료되었습니다!");
        
        // 세션 스토리지에서 returnUrl 확인
        const returnUrl = sessionStorage.getItem('returnUrl');
        setTimeout(() => {
            if (returnUrl) {
                sessionStorage.removeItem('returnUrl');
                window.location.href = returnUrl;
            } else {
                window.location.href = "index.html";
            }
        }, 1000);
        
    } catch (error) {
        console.error("인증 코드 확인 실패:", error);
        
        let errorMessage = "인증에 실패했습니다. ";
        if (error.code === 'auth/invalid-verification-code') {
            errorMessage += "잘못된 인증 코드입니다.";
        } else if (error.code === 'auth/code-expired') {
            errorMessage += "인증 코드가 만료되었습니다.";
        }
        
        showToast(errorMessage);
        savePhoneBtn.textContent = "인증하기";
        savePhoneBtn.disabled = false;
    }
}

// UI 초기화
function resetUI() {
    const phoneInput = document.getElementById('phoneInput');
    const savePhoneBtn = document.getElementById('savePhoneBtn');
    const verificationSection = document.querySelector('.verification-section');
    
    phoneInput.disabled = false;
    phoneInput.value = '';
    savePhoneBtn.textContent = "제출";
    savePhoneBtn.disabled = false;
    delete savePhoneBtn.dataset.state;
    
    if (verificationSection) {
        verificationSection.style.display = 'none';
    }
    
    // 타이머 정지
    clearInterval(timerInterval);
    
    // reCAPTCHA 재설정
    resetRecaptcha();
}

// 전화번호 DB 저장 형식으로 변환 (하이픈 제거, +82 제거)
function formatPhoneNumberForDB(phoneNumber) {
    // +82 10-1234-5678 -> 01012345678
    let formatted = phoneNumber.replace(/\D/g, '');
    if (formatted.startsWith('82')) {
        formatted = '0' + formatted.substring(2);
    }
    return formatted;
}