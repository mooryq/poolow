import { updateHeaderHeight, showToast } from "./global.js";
import { authUser } from "./auth-service.js";
import { 
    auth,
    db, 
    doc,
    updateDoc,
    collection,
    getDocs
} from './firebase.js';

import {query, where
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";


import { 
    signOut
  } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js"; 
  
document.addEventListener('DOMContentLoaded', () => {
    // 헤더 높이 설정
    updateHeaderHeight();
    
    // 뒤로가기 버튼 이벤트
    document.getElementById('Back').addEventListener('click', () => {
        if (document.referrer) {
            window.history.back();
        } else {
            window.location.href = '/';
        }      
    });
    
    // 현재 페이지가 profile.html인지 edit-name.html인지 확인
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isEditNamePage = window.location.pathname.includes('edit-name.html');
    
    if (isProfilePage) {
        // 사용자 정보 로드 및 표시
        loadUserProfile();
    } else if (isEditNamePage) {
        // 현재 이름 로드하여 입력 필드에 표시
        loadCurrentName();
        
        // input clear 버튼 이벤트
        const clearBtn = document.getElementById('clearInput');
        const input = document.getElementById('userNameInput');
        
        if (clearBtn && input) {
            clearBtn.addEventListener('click', () => {
                input.value = '';
                document.getElementById('nameValidation').textContent = '';
                input.focus();
            });
        }
        
        // 이름 입력 시 유효성 검사
        if (input) {
            input.addEventListener('input', checkNameAvailability);
        }
        
        // 저장 버튼 이벤트
        const saveBtn = document.getElementById('saveBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveNewName);
        }
    }
});

// 사용자 정보 로드
async function loadUserProfile() {
    // authUser 함수를 사용하여 현재 로그인된 사용자 정보 가져오기
    authUser(
        async (userId, userData) => {
            // 사용자 정보 표시
            const userNameElement = document.querySelector('.userName .name-text');
            const userPhoneElement = document.querySelector('.userPhone');
            const userEmailElement = document.querySelector('.userEmail');
            const providerTextElement = document.getElementById('providerText');
            const providerLogoElement = document.getElementById('providerLogo');
            
            // 커스텀 이름이 있으면 그것을 우선 표시, 없으면 소셜 계정의 이름 표시
            userNameElement.textContent = userData.customName || userData.name || '이름 없음';

            
            // 전화번호 표시 (있는 경우)
            userPhoneElement.textContent = userId || '전화번호 없음';
            
            // 이메일 표시
            userEmailElement.textContent = userData.email || '이메일 없음';
            
            // 소셜 계정 정보 표시 - providers 배열 처리
            const sso = document.querySelector('.sso');

            // 기존 표시 요소 초기화
            sso.innerHTML = '';
            
            // providers 배열이 있는지 확인
            const providers = userData.providers || [];
            
            // 배열이 비어있으면 현재 provider를 사용 (이전 버전과의 호환성)
            const providersToShow = providers.length > 0 ? providers : [userData.provider || ''];
            
            // 각 provider에 대해 로고와 텍스트 생성
            providersToShow.forEach(provider => {
                
                const providerLogo = document.createElement('img');
                providerLogo.className = 'provider-logo';
                providerLogo.width = 20;
                providerLogo.height = 20;
                
                if (provider.includes('google') || provider.includes('firebase')) {
                    providerLogo.src = 'images/google.png';
                    providerLogo.alt = 'Google logo';
                } else if (provider.includes('naver')) {
                    providerLogo.src = 'images/naver.png';
                    providerLogo.alt = 'Naver logo';
                } else {
                    providerLogo.src = 'images/unknown.png';
                    providerLogo.alt = 'Unknown provider';
                }
                                
                sso.appendChild(providerLogo);

            });
        },
        () => {
            // 로그인 안된 경우 처리
            window.location.href = "login.html";
        }
    );
}
            

// 현재 이름 로드
function loadCurrentName() {
    authUser(
        async (userId, userData) => {
            const input = document.getElementById('userNameInput');
            // 커스텀 이름 또는 기존 이름 표시
            input.value = userData.customName || userData.name || '';
        },
        () => {
            // 로그인 안된 경우 처리
            window.location.href = "login.html";
        }
    );
}

// 이름 중복 체크
async function checkNameAvailability() {
    const newName = document.getElementById('userNameInput').value.trim();
    const validationElement = document.getElementById('nameValidation');
    
    // 이름이 비어있으면 검사하지 않음
    if (!newName) {
        validationElement.textContent = '';
        return;
    }
    
    authUser(
        async (userId, userData) => {
            try {
                // 사용자 컬렉션 참조
                const usersRef = collection(db, "users");
                
                // customName 또는 name 필드에서 동일한 이름 검색 (현재 사용자 제외)
                const nameQuery = query(usersRef, where("customName", "==", newName));
                const originalNameQuery = query(usersRef, where("name", "==", newName));
                
                const [nameResults, originalNameResults] = await Promise.all([
                    getDocs(nameQuery),
                    getDocs(originalNameQuery)
                ]);
                
                // 자신의 이름 제외하고 중복 검사
                let isDuplicate = false;
                
                nameResults.forEach(doc => {
                    if (doc.id !== userId) {
                        isDuplicate = true;
                    }
                });
                
                originalNameResults.forEach(doc => {
                    if (doc.id !== userId) {
                        isDuplicate = true;
                    }
                });
                
                if (isDuplicate) {
                    validationElement.textContent = "이미 사용 중인 이름입니다.";
                    validationElement.classList.add("error");
                } else {
                    validationElement.textContent = "";
                    validationElement.classList.remove("error");
                }
                
            } catch (error) {
                console.error("이름 검사 중 오류:", error);
            }
        },
        () => {
            // 로그인 안된 경우
            window.location.href = "login.html";
        }
    );
}

// 새 이름 저장
async function saveNewName() {
    const newName = document.getElementById('userNameInput').value.trim();
    const validationElement = document.getElementById('nameValidation');
    
    if (!newName) {
        showToast("이름을 입력해주세요.");
        return;
    }
    
    // 유효성 오류가 있으면 저장하지 않음
    if (validationElement.textContent) {
        showToast("유효하지 않은 이름입니다.");
        return;
    }
    
    authUser(
        async (userId, userData) => {
            try {
                // Firestore 문서 참조 가져오기
                const userRef = doc(db, "users", userId);
                
                // customName 필드 업데이트
                await updateDoc(userRef, {
                    customName: newName
                });

                // 로컬 스토리지의 사용자 정보도 업데이트 - 이 부분 추가
                const localUser = JSON.parse(localStorage.getItem("user"));
                if (localUser) {
                    localUser.name = newName; // 이름 업데이트
                    localStorage.setItem("user", JSON.stringify(localUser));
                }
                
                
                // 성공 메시지
                showToast("이름이 변경되었습니다.");
                
                // 이전 페이지로 돌아가기
                setTimeout(() => {
                    window.history.back();
                }, 1000);
                
            } catch (error) {
                console.error("이름 변경 중 오류:", error);
                showToast("이름 변경에 실패했습니다.");
            }
        },
        () => {
            showToast("로그인이 필요합니다.");
            window.location.href = "login.html";
        }
    );
}


//로그아웃
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await signOut(auth);
      console.log("👋 로그아웃 성공");
      localStorage.removeItem("user");
      window.location.href = "index.html";
      showToast("👋🏻 또 놀러와요")
    } catch(error) {
      console.error("❌ 로그아웃 실패:", error);
    }
  });
}