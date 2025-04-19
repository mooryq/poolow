// mypage.js (리팩토링 버전)
import { authUser } from "./auth-service.js";
import { updateHeaderHeight, showToast } from './global.js';
import { ReviewEditListeners } from './addFavRev.js';
import { 
  collection,
  query,
  where,
  getDocs,
  orderBy,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { db } from "./firebase.js";

// 불러온 데이터를 저장할 전역 객체
const userData = {
  favorites: [],
  reviews: []
};

document.addEventListener("DOMContentLoaded", () => {
  updateHeaderHeight();
  setupTabs();
  
  const listContainer = document.getElementById("myPool");
  const reviewContainer = document.getElementById("myReview");

  // 사용자 인증 확인

  authUser(
    async (userId, userInfo) => {
      // 사용자 정보로 UI 업데이트
      document.getElementById("userName").innerHTML = `${userInfo.customName || userInfo.name || ''} 님`;
      
      // 데이터 로드 및 화면 렌더링
      await loadUserData(userId);
      renderFavorites();
      renderReviews();
    },
    () => {
      // 로그인 안 된 경우 처리
      window.location.href = "login.html";
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
    } catch (error) {
      console.error("데이터 로드 중 오류:", error);
      showToast("데이터를 불러오는 중 오류가 발생했습니다.");
    }
  }

  // 즐겨찾기 렌더링 함수
  function renderFavorites() {
    if (!listContainer) return;
    
    if (userData.favorites.length === 0) {
      listContainer.innerHTML = "<p>저장된 수영장이 없습니다.</p>";
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
    setupFavoriteEvents();
  }
  
  // 즐겨찾기 이벤트 설정
  function setupFavoriteEvents() {
    const likeButtons = document.querySelectorAll('.heartBtn');

    likeButtons.forEach(button => {
      button.addEventListener('click', async (e) => {
        e.stopPropagation();
        const poolCard = button.closest('.myCard');
        const poolId = poolCard.dataset.poolId;
        const poolName = poolCard.querySelector('.pool-name').textContent;

        if (confirm(`"${poolName}"을 즐겨찾기에서 삭제할까요?`)) {
          deleteFavorite(poolId, poolCard);
        }
      });
    });
  }
  
  // 즐겨찾기 삭제 함수
  async function deleteFavorite(poolId, poolCard) {
    try {
      // Firestore에서 즐겨찾기 제거
      authUser(
        async (userId) => {
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
  
  // 리뷰 렌더링 함수 
  function renderReviews() {
    if (!reviewContainer) return;
    
    if (userData.reviews.length === 0) {
      reviewContainer.innerHTML = "<p>작성한 리뷰가 없습니다.</p>";
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
      
      // 주소 처리
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
    ReviewEditListeners(); // 기존 함수 재사용
  }
  
  // 클릭 이벤트 설정
  setupCardClickEvents();
});

// 탭 기능 설정
function setupTabs() {
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tabContent");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // 모든 탭과 컨텐츠 초기화
      tabs.forEach((t) => t.classList.remove("active"));
      contents.forEach((c) => c.classList.remove("active"));

      // 선택한 탭 활성화
      tab.classList.add("active");
      const targetId = tab.getAttribute("data-target");
      document.getElementById(targetId).classList.add("active");
    });
  });
}

// 카드 클릭 이벤트 설정
function setupCardClickEvents() {
  document.addEventListener('click', (e) => {
    // 하트 버튼과 액션 버튼 클릭은 무시
    if (e.target.closest('.heartBtn') || e.target.closest('.review-actions')) {
      return;
    }
    
    // 수영장 카드 클릭
    const myCardElement = e.target.closest('.myCard:not(.reviewCard)');
    if (myCardElement) {
      const poolId = myCardElement.dataset.poolId;
      if (poolId) {
        window.location.href = `detail.html?poolId=${poolId}`;
        return;
      }
    }
    
    // 리뷰의 수영장 이름 클릭
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
}