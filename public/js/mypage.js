import {
  auth,
  db,
  saveUserToFirestore,
} from "./firebase.js";

import { 
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js"; 

import { 
  doc, 
  getDoc, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

import { authUser, updateHeaderHeight, showToast } from './global.js';
import { ReviewEditListeners } from './addFavRev.js';

const localUser = JSON.parse(localStorage.getItem("user")); // 네이버 또는 구글 공통
let unifiedUser = null;

const phoneForm = document.getElementById("phoneForm");
const userInfo = document.getElementById("userInfo");
const savePhoneBtn = document.getElementById("savePhoneBtn");
const phoneInput = document.getElementById("phoneInput");

// 불러온 데이터를 저장할 전역 객체 생성
const userData = {
  favorites: [],
  reviews: []
};


onAuthStateChanged(auth, async (firebaseUser) => {
  let currentUID = null;

  // ✅ 구글 로그인 사용자
  if (firebaseUser) {
    unifiedUser = {
      uid: firebaseUser.uid  || null,
      name: firebaseUser.displayName || "",
      email: firebaseUser.email || "",
      photo: firebaseUser.photoURL || "default.jpg",
      provider: firebaseUser.providerId || "google"
    };  

  // ✅ 네이버 로그인 사용자
  } else if (localUser) {
    unifiedUser = {
      uid: localUser.uid || null,
      name: localUser.name || "",
      email: localUser.email || "",
      photo: localUser.photo || "default.jpg",
      provider: "naver"
    };
  } else {
    // ❌ 둘 다 로그인 안 된 경우
    window.location.href = "login.html";
    return;
  }

  localStorage.setItem("user", JSON.stringify(unifiedUser));
  console.log("💾 unifiedUser 저장됨:", unifiedUser);
  currentUID = unifiedUser.uid;

  // Firestore에서 유저 데이터 찾기
  const foundUser = await findUserByUID(currentUID);
  
  if (!foundUser) {
    // 사용자 정보가 없으면 phoneForm.html로 리다이렉션
    console.log("🆕 Firestore에서 유저를 찾을 수 없어 phoneForm.html로 이동합니다");
    window.location.href = "phoneForm.html";
    return;
  }
  
  // 사용자 정보가 있으면 UI 업데이트
  console.log("✅ Firestore에서 유저 찾음:", foundUser);
  updateUserUI(foundUser.data);
  });
  
  // Firestore에서 UID에 해당하는 사용자 찾기 (기존 함수 유지)
  async function findUserByUID(uid) {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uids", "array-contains", uid));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        return userData.providers && userData.providers.includes('phone');
      }
      return false;
    } catch (error) {
      console.error("Firestore 조회 오류:", error);
      return false;
    }
  }
  
  // 사용자 정보로 UI 업데이트 (기존 함수 유지)
  function updateUserUI(user) {
    const displayName = user.customName || user.name;
    document.getElementById("userName").innerHTML = `${displayName} 님`;
  }


//탭 액티브 동작
const tabs = document.querySelectorAll(".tab");
const contents = document.querySelectorAll(".tabContent");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    // 탭 초기화
    tabs.forEach((t) => t.classList.remove("active"));
    contents.forEach((c) => c.classList.remove("active"));

    // 현재 탭만 활성화
    tab.classList.add("active");
    const targetId = tab.getAttribute("data-target");
    document.getElementById(targetId).classList.add("active");
  });
});

//즐겨찾기와 후기 모아보기 - 데이터 한 번에 불러오기
document.addEventListener("DOMContentLoaded", () => {
  const listContainer = document.getElementById("myPool");
  const reviewContainer = document.getElementById("myReview");

  console.log("📄 mypage.js에서 authUser 호출");

  authUser(
    async (userId) => {
      // 한 번에 데이터 로드
      await loadUserData(userId);
      
      // 로드된 데이터로 화면 렌더링
      renderFavorites();
      renderReviews();
    },
    () => {
      // 로그인 안 된 경우 처리
      listContainer.innerHTML = "<p>로그인이 필요합니다.</p>";
      reviewContainer.innerHTML = "<p>로그인이 필요합니다.</p>";
    }
  );

  // 사용자 데이터 한 번에 불러오기
  async function loadUserData(userId) {
    try {
      const favRef = collection(db, "users", userId, "favorites");
      const reviewRef = collection(db, "users", userId, "reviews");
      const reviewQuery = query(reviewRef, orderBy("createdAt", "desc"));
  
      const [favSnap, reviewSnap] = await Promise.all([
        getDocs(favRef),
        getDocs(reviewQuery)
      ]);

      // 데이터를 전역 객체에 저장
      userData.favorites = favSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      userData.reviews = reviewSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 디버깅용 로그
      console.log(`즐겨찾기 ${userData.favorites.length}개, 리뷰 ${userData.reviews.length}개 로드됨`);
      
    } catch (error) {
      console.error("데이터 로드 중 오류:", error);
    }
  }

  // 즐겨찾기 렌더링 함수
  function renderFavorites() {
    if (userData.favorites.length === 0) {
      listContainer.innerHTML = "<p style='text-align:center;'>저장된 수영장이 없습니다.</p>";
      return;
    }
  
    let html = "";
    userData.favorites.forEach(pool => {
      const tags = Array.isArray(pool.tags) ? pool.tags : [];
      
      html += `
        <div class="myCard flex-between" data-pool-id="${pool.id}">
          <div class="flex-column">
            <div class="flex">${tags.map(tag => `<div class="tag">${tag}</div>`).join('')}</div>
            <div class="poolTitle flex-column" style="align-self:flex-start; align-items:flex-start;">
              <div class="pool-name">${pool.name || '이름 없음'}</div>
              <div class="address">${pool.address || ''}</div>
            </div>
          </div>
          <div class="heartBtn">❤️</div>
        </div>
      `;
    });
    
    listContainer.innerHTML = html;

    // 하트 클릭 이벤트 추가
    const likeButtons = document.querySelectorAll('.heartBtn');

    likeButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const poolCard = button.closest('.myCard');
        const poolId = poolCard.dataset.poolId;
        const poolName = poolCard.querySelector('.pool-name').textContent;

      if (confirm(`"${poolName}"을 즐겨찾기에서 삭제할까요?`)) {
          try {
            // Firestore에서 즐겨찾기 제거 (authUser 사용)
            authUser(
              async (userId) => {  // 여기서 userId는 전화번호
                // 올바른 경로로 문서 삭제
                await deleteDoc(doc(db, "users", userId, "favorites", poolId));
                
                // 전역 데이터에서도 제거
                userData.favorites = userData.favorites.filter(pool => pool.id !== poolId);
                
                // UI에서 카드 제거
                poolCard.remove();
                
                // 즐겨찾기가 모두 제거되었는지 확인
                if (listContainer.children.length === 0) {
                  listContainer.innerHTML = "<p>저장된 수영장이 없습니다.</p>";
                }
      
                showToast("즐겨찾기가 해제되었습니다.");
              },
              () => {
                showToast("로그인이 필요합니다.");
              }
            );
          } catch (error) {
            console.error("즐겨찾기 삭제 중 오류 발생:", error);
            showToast("즐겨찾기 해제 중 오류가 발생했습니다.");
          }
        }
      });
    });
  }
  
  // 리뷰 렌더링 함수 
  function renderReviews() {
    if (userData.reviews.length === 0) {
      reviewContainer.innerHTML = "<p style='text-align:center;' style='text-align:center;'>작성한 리뷰가 없습니다.</p>";
      return;
    }
  
    let html = "";
    userData.reviews.forEach(r => {
      // 날짜 포맷팅
      const date = r.createdAt?.toDate().toLocaleDateString("ko-KR", {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }) || "";
      
      // 주소 처리 - poolAddress가 있을 때만 처리
      let shortAddress = "";
      if (r.poolAddress) {
        const addressParts = r.poolAddress.split(' ');
        const dongIndex = addressParts.findIndex(part => part.includes('동'));
        shortAddress = dongIndex !== -1 
          ? addressParts.slice(0, dongIndex + 1).join(' ')
          : r.poolAddress;
      }
      
      // 이미지 HTML 생성
      let imagesHtml = '';
      if (r.reviewImage) {
        const images = Array.isArray(r.reviewImage) ? r.reviewImage : [r.reviewImage];
        if (images.length > 0) {
          imagesHtml = images.map(img => `<img src="${img}" alt="review image">`).join('');
        }
      }
      
      html += `
        <div class="reviewCard myCard flex-column" data-pool-id="${r.poolId}" data-review-id="${r.reviewId || r.id}">           
              <div class="flex-between" style="width:100%;">
                <span class="write-date">${date}</span>         
                <div class="review-actions">
                  <button class="more-action-btn">⋮</button>
                  <div class="actions-dropdown">
                    <button class="delete-review">삭제하기</button>
                  </div>
                </div>
              </div>  
              <div class="pool-name">${r.poolName || '이름 없음'}</div>
              <div class="short-address">${shortAddress}</div>
          <div class="review-content">
            ${imagesHtml ? `<div class="review-image">${imagesHtml}</div>` : ''}
            <div class="review-text">
              <p>${r.review || ''}</p>
            </div>
          </div>
        </div>
      `;
    });
  
    reviewContainer.innerHTML = html;
    
    // addFavRev.js에서 가져온 ReviewEditListeners 함수 호출
    ReviewEditListeners();
  }

    // 수영장 카드와 리뷰 아이템 클릭 시 상세 페이지로 이동하는 통합 함수
    document.addEventListener('click', (e) => {
      // 하트 버튼 클릭은 무시 (이미 별도 이벤트 핸들러가 있음)
      if (e.target.closest('.heartBtn') || e.target.closest('.review-actions')) {
        return;
      }
      
      // 내 수영장 탭의 경우 - 카드 전체 클릭 가능
      const myCardElement = e.target.closest('.myCard:not(.reviewCard)');
      if (myCardElement) {
        const poolId = myCardElement.dataset.poolId;
        if (poolId) {
          window.location.href = `detail.html?poolId=${poolId}`;
          return;
        }
      }
      
      // 리뷰의 경우 - pool-name 클릭만 이동 (기존 동작 유지)
      const poolNameElement = e.target.closest('.pool-name');
      if (poolNameElement) {
        const card = e.target.closest('.reviewCard, .review-item');
        if (card) {
          const poolId = card.dataset.poolId;
          if (poolId) {
            window.location.href = `detail.html?poolId=${poolId}`;
          }
        }
      }
    });
});