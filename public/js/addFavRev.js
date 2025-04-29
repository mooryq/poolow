import { 
    auth, 
    db, 
    doc,
    setDoc, 
    getDoc, 
    getDocs,
    addDoc,
    deleteDoc, 
    collection,
    serverTimestamp,
    updateDoc
} from './firebase.js';

import { authUser } from "./global.js";
import { openModal, closeModal, setupModalListeners, showToast} from './global.js';
import { resizeImage, uploadReviewImages } from "./resizeImage.js";
import { query, orderBy, where } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
    
// 전역 변수로 poolData 선언
let poolData = null;

// poolData 설정 함수
export function setPoolData(data) {
    poolData = data;
}

// 즐겨찾기 버튼 초기화
export function initFavoriteButton(data) {
    // poolData 설정
    poolData = data;
    
    const heartBtn = document.getElementById("heartBtn");
    
    // poolData.id가 숫자인 경우 문자열로 변환
    const poolId = String(poolData.id);
    
    // 이미 즐겨찾기인지에 따라 하트색깔 표시
    authUser(
        async (userId) => {
            const favRef = doc(db, "users", userId, "favorites", poolId);
            const favSnap = await getDoc(favRef);
        
            if (favSnap.exists()) {
                heartBtn.textContent = "❤️";
            } else {
                heartBtn.textContent = "🩶";
            }
        
            heartBtn.style.visibility = "visible";
        },
        () => {
            heartBtn.textContent = "🩶";
            heartBtn.style.visibility = "visible";
        }
    );

    // 즐겨찾기 추가/삭제 이벤트
    heartBtn.addEventListener("click", () => {
        authUser(
            async (userId) => {
                const favRef = doc(db, "users", userId, "favorites", poolId);
        
                try {
                    const favSnap = await getDoc(favRef);
        
                    if (favSnap.exists()) {
                        // 이미 즐겨찾기 된 상태 → 삭제
                        await deleteDoc(favRef);
                        heartBtn.textContent = "🩶";
                        showToast("즐겨찾기가 해제되었습니다.");
                    } else {
                        // 아직 없으면 → 추가
                        await setDoc(favRef, poolData);
                        heartBtn.textContent = "❤️";
                        showToast("즐겨찾기에 추가되었습니다.");
                    }
                } catch (error) {
                    console.error("즐겨찾기 토글 중 에러:", error);
                    showToast("오류가 발생했습니다. 다시 시도해주세요.");
                }
            },
            () => {
                showToast("로그인이 필요합니다.");
                window.location.href = "/public/login.html";
            }
        );
    });
}

// 리뷰 모달 초기화
export function initReviewModal() {
    setupModalListeners("reviewModal");
    
    const imageInput = document.getElementById("reviewImages");
    const previewContainer = document.getElementById("imagePreview");
    const reviewList = document.getElementById("reviewList");
    
    // 모달 열어 후기 작성하기 
    const openReviewModalBtn = document.getElementById("openReviewModal");
    if (!openReviewModalBtn) {
        console.warn("리뷰 모달 버튼을 찾을 수 없습니다");
        return;
    } 

    // 이벤트 리스너가 중복 등록되지 않도록 기존 리스너 제거
    const newOpenReviewModalBtn = openReviewModalBtn.cloneNode(true);
    openReviewModalBtn.parentNode.replaceChild(newOpenReviewModalBtn, openReviewModalBtn);
    
    newOpenReviewModalBtn.addEventListener("click", () => {
        console.log("1. 리뷰 작성 버튼 클릭");
        console.log("2. 현재 URL:", window.location.href);
        console.log("3. 로그인 상태:", localStorage.getItem("loginSuccess"));
        
        // 현재 URL을 세션 스토리지에 저장
        sessionStorage.setItem('returnUrl', window.location.href);
            
        // 모달 열기 전에 로그인 체크
        authUser(
            (userId) => {
                // 로그인 되어 있으면 모달 열기
                console.log("✅ 사용자 인증 확인됨:", userId);
                openModal("reviewModal");
            },
            () => {
                // 비로그인 상태면 알림 표시 후 로그인 페이지로 이동
                console.log("⛔️ 사용자 인증 실패");
                alert("로그인 후 이용해 주세요.");
                window.location.href = "/public/login.html";
            }
        );
    });
    
    // 중복 제출 방지를 위한 플래그 변수 
    let isSubmittingReview = false;
    
    document.getElementById("submitReview").addEventListener("click", () => {
        if (isSubmittingReview) {
            alert('이미 제출 중입니다');
            return;
        }
        
        if (!poolData) {
            alert("수영장 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
            return;
        }
        
        const content = document.getElementById("reviewText").value.trim();
        const files = document.getElementById("reviewImages").files;        
        if (!content) return;
        
        // 제출 시작 - 플래그 설정 및 버튼 비활성화
        isSubmittingReview = true;
        const submitBtn = document.getElementById("submitReview");
        submitBtn.disabled = true;
        
        //수정 모드인지 확인
        const isEditMode = submitBtn.dataset.mode === "edit";
        const reviewId = submitBtn.dataset.reviewId;
        // poolData.id를 문자열로 변환
        const poolId = String(poolData.id);
        
        if (isEditMode&& reviewId){

            //수정모드
            updateReview(reviewId, content).finally(() => {
                //작업완료 후 상태 초기화
                isSubmittingReview = false;
                submitBtn.disabled = false;
                submitBtn.textContent = "등록";
                submitBtn.dataset.mode = "create";
                delete submitBtn.dataset.reviewId;

            //입력필드 초기화
            document.getElementById("reviewText").value = "";
            document.getElementById("reviewImages").value = "";
            previewContainer.innerHTML = "";

            //모달 닫기
            closeModal("reviewModal");
            });

            
        } else {
            //새로운 리뷰

            authUser(async (userId, userData) => {
                // 미리보기에 표시된 모든 이미지 컨테이너 가져오기
                const imageContainers = document.querySelectorAll('.preview-img-container');
                let imageUrls = [];
                
                // 미리보기 이미지 데이터 수집
                const previewImages = Array.from(imageContainers).map(container => {
                    const img = container.querySelector('img');
                    return {
                        src: img.src,
                        name: container.dataset.file
                    };
                });
                
                // 미리보기 이미지 업로드
                if (previewImages.length > 0) {
                    const uploadPromises = previewImages.map(async (img) => {
                        // Base64 데이터를 Blob으로 변환
                        const response = await fetch(img.src);
                        const blob = await response.blob();
                        const file = new File([blob], img.name, { type: 'image/jpeg' });
                        
                        // 이미지 업로드
                        const urls = await uploadReviewImages([file], poolId, userId);
                        return urls[0];
                    });
                    
                    imageUrls = await Promise.all(uploadPromises);
                }

                // 커스텀 이름이 있으면 우선 사용, 없으면 기본 이름 사용
                const displayName = userData.customName || userData.name;
                
                const reviewData = {
                    review: content,
                    userName: displayName,
                    userId: userId,
                    reviewImage: imageUrls,
                    createdAt: serverTimestamp(),
                    poolId: poolId
                };
                
                try {

                    //먼저 풀의 리뷰에 저장하고 ID 가져오기
                    const reviewRef = await addDoc(collection(db, "pools", poolId, "reviews"), reviewData);
                    const reviewId = reviewRef.id;

                    //사용자 리뷰 컬렉션에 저장
                    
                    await addDoc(collection(db, "users", userId, "reviews"), {
                        ...reviewData,
                        poolName: poolData.name,
                        poolId: poolId,
                        reviewId: reviewId,
                        poolAddress: poolData.address,
                        poolTags: poolData.tags
                    });
                    
                    // 초기화 + 닫기 + 리뷰 다시 불러오기
                    document.getElementById("reviewText").value = "";
                    document.getElementById("reviewImages").value = "";
                    previewContainer.innerHTML = "";
                    
                    closeModal("reviewModal");
                    loadReviews();
                    
                    // 성공 메시지
                    showToast("후기가 등록되었습니다!");
                    
                } catch (e) {
                    console.error("🔥 리뷰 저장 실패:", e);
                    alert("리뷰 저장 중 오류가 발생했습니다.");
                } finally {
                    // 작업 완료 후 상태 초기화 (성공/실패 모두)
                    isSubmittingReview = false;
                    submitBtn.disabled = false;
                }
            },
            () => {
                // 비로그인 상태일 때도 플래그 초기화
                isSubmittingReview = false;
                submitBtn.disabled = false;        
            });
        }
    });
    
    // ✅ 이미지 등록시 미리보기
    if (imageInput) {
        imageInput.addEventListener("change", async () => {
            const files = imageInput.files;
            if (files.length > 10) {
                showToast("이미지는 최대 10개까지 업로드 가능합니다.");
                imageInput.value = ""; // 입력 초기화
                return;
            }
            
            for (const file of files) {
                // 이미지 파일인지 확인
                if (!file.type.startsWith('image/')) {
                    showToast("이미지 파일만 업로드 가능합니다.");
                    imageInput.value = ""; // 입력 초기화
                    return;
                }
                
                try {
                    // 이미지 리사이징
                    const resizedFile = await resizeImage(file);
                    
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const imgContainer = document.createElement("div");
                        imgContainer.className = "preview-img-container";
                        imgContainer.dataset.file = resizedFile.name; // 리사이징된 파일 이름 저장
                        
                        const img = document.createElement("img");
                        img.src = e.target.result;
                        img.classList.add("preview-img");
                        
                        const deleteBtn = document.createElement("button");
                        deleteBtn.className = "delete-preview-img";
                        
                        // SVG 파일을 이미지로 참조
                        const imgElement = document.createElement("img");
                        imgElement.src = "icons/dismiss.svg"; // SVG 파일 경로
                        imgElement.alt = "삭제";
                        imgElement.width = 20;
                        imgElement.height = 20;

                        // 이미지를 버튼에 추가
                        deleteBtn.appendChild(imgElement);

                        deleteBtn.onclick = function() {
                            imgContainer.remove();
                        };

                        
                        imgContainer.appendChild(img);
                        imgContainer.appendChild(deleteBtn);
                        previewContainer.appendChild(imgContainer);
                    };
                    
                    reader.readAsDataURL(resizedFile);
                } catch (error) {
                    console.error("이미지 리사이징 중 오류:", error);
                    showToast("이미지 처리 중 오류가 발생했습니다.");
                }
            }
        });
    }
    

    // 모달 취소 버튼 이벤트 리스너 추가
    document.querySelector(".modal-close")?.addEventListener("click", () => {
        const submitBtn = document.getElementById("submitReview");
        if (submitBtn) {
            submitBtn.textContent = "등록";
            submitBtn.dataset.mode = "create";
            delete submitBtn.dataset.reviewId;
        }
        
        const reviewText = document.getElementById("reviewText");
        const reviewImages = document.getElementById("reviewImages");
        const imagePreview = document.getElementById("imagePreview");
        
        if (reviewText) reviewText.value = "";
        if (reviewImages) reviewImages.value = "";
        if (imagePreview) imagePreview.innerHTML = "";
    });
    

    
            
       //리뷰 수정 함수
       async function updateReview(reviewId, reviewContent) {
        if (!poolData) {
            showToast("수영장 정보가 없습니다.");
            return;
        }
    
        // poolData.id를 문자열로 변환
        const poolId = String(poolData.id);
     
        return new Promise((resolve, reject) => {
            authUser(async (userId) => {
                try {
                    // 미리보기에 표시된 모든 이미지 컨테이너 가져오기
                    const imageContainers = document.querySelectorAll('.preview-img-container');
                    let imageUrls = [];
                    
                    console.log("미리보기 이미지 컨테이너 수:", imageContainers.length);
                    
                    if (imageContainers.length > 0) {
                        // 미리보기에 있는 모든 이미지 처리
                        const previewImages = Array.from(imageContainers).map(container => {
                            const img = container.querySelector('img');
                            // index 속성이 있으면 기존 이미지, 없으면 새 이미지
                            const isExisting = container.dataset.index !== undefined;
                            
                            return {
                                src: img.src,
                                name: container.dataset.file || 'image.jpg',
                                isExisting: isExisting,
                                index: container.dataset.index
                            };
                        });
                        
                        // 기존 이미지 URL과 새 이미지 분리
                        const existingImages = previewImages.filter(img => img.isExisting);
                        const newImages = previewImages.filter(img => !img.isExisting);
                        
                        console.log("기존 이미지 수:", existingImages.length);
                        console.log("새 이미지 수:", newImages.length);
                        
                        // 기존 이미지의 URL 추출
                        const existingUrls = existingImages.map(img => img.src);
                        
                        // 새 이미지만 업로드 처리
                        if (newImages.length > 0) {
                            const uploadPromises = newImages.map(async (img) => {
                                try {
                                    // Base64 데이터를 Blob으로 변환
                                    const response = await fetch(img.src);
                                    const blob = await response.blob();
                                    const file = new File([blob], img.name, { type: 'image/jpeg' });
                                    
                                    // 이미지 업로드
                                    const urls = await uploadReviewImages([file], poolId, userId);
                                    return urls[0];
                                } catch (error) {
                                    console.error("이미지 업로드 중 오류:", error);
                                    return null;
                                }
                            });
                            
                            const newUrls = (await Promise.all(uploadPromises)).filter(url => url !== null);
                            
                            // 기존 이미지 URL과 새 이미지 URL 합치기
                            imageUrls = [...existingUrls, ...newUrls];
                        } else {
                            // 새 이미지가 없으면 기존 이미지 URL만 사용
                            imageUrls = existingUrls;
                        }
                    } else {
                        // 미리보기에 이미지가 하나도 없는 경우 (모든 이미지 삭제)
                        imageUrls = [];
                    }
    
                    console.log("최종 이미지 URL 수:", imageUrls.length);
                    console.log("최종 이미지 URL:", imageUrls);
    
                    // 업데이트할 데이터 준비
                    const updateData = {
                        review: reviewContent,
                        updatedAt: serverTimestamp()
                    };
    
                    // 이미지 URL 업데이트 (빈 배열이어도 명시적으로 설정)
                    updateData.reviewImage = imageUrls;
    
                    // 리뷰 업데이트
                    await updateDoc(doc(db, "pools", poolId, "reviews", reviewId), updateData); 
                    
                    // 사용자 리뷰 컬렉션에서도 업데이트
                    const userReviewsRef = collection(db, "users", userId, "reviews");
                    const q = query(userReviewsRef, where("reviewId", "==", reviewId));
                    const snap = await getDocs(q);
                    if (!snap.empty) {
                        await updateDoc(snap.docs[0].ref, updateData);
                    }
    
                    // 리뷰목록 새로고침
                    loadReviews();
                    // 성공메시지
                    showToast("리뷰가 수정되었습니다.");
                    // 전역변수 정리
                    delete window.existingImageUrls;
                    
                    resolve(); // Promise 완료
                } catch (error) {
                    console.error("리뷰 수정 중 오류:", error);
                    showToast("리뷰 수정 중 오류가 발생했습니다.");
                    reject(error); // Promise 실패
                }
            }, () => {
                showToast("로그인이 필요합니다.");
                reject(new Error("로그인 필요")); // Promise 실패
            });
        });
    }

   
    const reviewInput = document.getElementById("reviewText");
    reviewInput.addEventListener("input", checkInputs);
    
    // 초기 리뷰 로드
    loadReviews();
}
    // 인증 상태 캐싱을 위한 객체
    let authCache = {
        isAuthenticated: false,
        userId: null,
        userData: null,
        timestamp: null,
        ttl: 5 * 60 * 1000 // 5분 캐시 유지 시간
    };
   
    // 리뷰 로드 함수
    export async function loadReviews() {
    if (!poolData) return;
    
    // reviewList 요소 가져오기
    const reviewList = document.getElementById("reviewList");
    if (!reviewList) return;
    
    // poolData.id를 문자열로 변환
    const poolId = String(poolData.id);

    // 현재 로그인한 사용자 ID 가져오기
    let currentUserId = null;

    try {
        // 리뷰 목록 먼저 불러오기 
        const reviewsRef = collection(db, "pools", poolId, "reviews");
        const q = query(reviewsRef, orderBy("createdAt", "desc"));
        const snap = await getDocs(q);

        if (snap.empty) {
            reviewList.innerHTML = "<p class='gray-text'>아직 리뷰가 없습니다.</p>";
            return;
        }
        
        // 캐시된 인증 정보가 있는지 먼저 확인
        const now = Date.now();
        if (authCache.isAuthenticated && authCache.timestamp && 
            (now - authCache.timestamp < authCache.ttl)) {
            console.log("✅ 캐시된 인증 정보 사용:", authCache.userId);
            currentUserId = authCache.userId;
        } else {
            // 로컬 스토리지에서 사용자 정보 확인
            const loginSuccess = localStorage.getItem("loginSuccess");
            const localUser = JSON.parse(localStorage.getItem("user"));
            
            if (loginSuccess === "true" && localUser && localUser.phone) {
                // 로컬 스토리지에 전화번호가 있으면 사용
                currentUserId = localUser.phone;
                console.log("📱 로컬 스토리지에서 사용자 ID 가져옴:", currentUserId);
            } else {
                // 없으면 authUser로 가져오기 (최후의 수단)
                try {
                    currentUserId = await new Promise((resolve, reject) => {
                        // 2초 타임아웃 설정 (5초에서 2초로 줄임)
                        const timeout = setTimeout(() => {
                            console.log("로그인 상태 확인 타임아웃");
                            resolve(null);
                        }, 2000);

                        authUser(
                            (userId, userData) => {
                                clearTimeout(timeout);
                                // 캐시 업데이트
                                authCache.isAuthenticated = true;
                                authCache.userId = userId;
                                authCache.userData = userData;
                                authCache.timestamp = Date.now();
                                
                                console.log("현재 로그인 사용자 ID", userId);
                                resolve(userId);
                            },
                            () => {
                                clearTimeout(timeout);
                                console.log("로그인 된 사용자 없음");
                                resolve(null);
                            }
                        );
                    });
                } catch (authError) {
                    console.error("사용자 인증 확인 중 오류:", authError);
                    currentUserId = null;
                }
            }
        }
            
            let html = "";

            snap.forEach(doc => {
                const r = doc.data();
                const reviewId = doc.id;

                //날짜포맷팅
                let dateText="날짜 정보 없음"
                if(r.createdAt){
                    const date = r.createdAt.toDate();
                    dateText = date.toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        
                    });                
                }

                // 현재 사용자가 작성한 리뷰인지 확인
                const isMyReview = currentUserId && currentUserId === r.userId;
                console.log("리뷰 ID:", reviewId, "사용자 일치 여부:", isMyReview, 
                    "현재 사용자:", currentUserId, "리뷰 작성자:", r.userId);

                html += `
                    <div class="reviewCard myCard" data-review-id="${reviewId}">
                        <div class="review-header">
                            <div class="review-user-info">
                                <span class="review-name">${r.userName}</span>
                                <span class="review-date">${dateText}</span>
                            </div>
                            ${isMyReview ? `
                                <div class="review-actions">
                                <button class="more-action-btn">⋮</button>
                                <div class="actions-dropdown">
                                    <button class="edit-review">수정하기</button>    
                                    <button class="delete-review">삭제하기</button>
                                </div>
                            </div>
                            ` : ""}
                        </div>
                        ${(Array.isArray(r.reviewImage) && r.reviewImage.length > 0) || (!Array.isArray(r.reviewImage) && r.reviewImage) 
                            ? `<div class="review-images-container">
                                ${Array.isArray(r.reviewImage)
                                    ? r.reviewImage.map(url => `<img src="${url}" class="review-img" />`).join('')
                                    : `<img src="${r.reviewImage}" class="review-img" />`}
                            </div>`
                            : ""}
                        <div class="review-content">${r.review}</div>
                    </div>
                `;
            });
            
            reviewList.innerHTML = html;
        
            // 리뷰 수정, 삭제 버튼 이벤트 리스너 등록
            ReviewEditListeners();

        } catch (error) {
            console.error("리뷰 로딩 중 오류:", error);
            reviewList.innerHTML = "<p class='gray-text'>리뷰를 불러오는 중 오류가 발생했습니다.</p>";
        }
    }

    //리뷰 수정 모달 열기
    export async function openEditReviewModal(reviewId, reviewContent) {
        // 리뷰 모달 요소 가져오기
        const reviewText = document.getElementById("reviewText");
        const submitBtn = document.getElementById("submitReview");
        const imagePreview = document.getElementById("imagePreview");
        
        // poolData가 이미 있는지 확인하고 poolId가져오기
        if(!poolData){
            console.error("poolData가 없습니다.");
            return;
        }
        const poolId = String(poolData.id);
    
        // 리뷰 데이터 가져오기 (이미지 url 포함)
        try {
            const reviewRef = doc(db, "pools", poolId, "reviews", reviewId);
            const reviewSnap = await getDoc(reviewRef);
            if(!reviewSnap.exists()){
                console.error("리뷰를 찾을 수 없습니다.");
                return;
            }
            
            const reviewData = reviewSnap.data();
            
            // 텍스트 내용 채우기
            reviewText.value = reviewContent;
        
            // 이미지 미리보기 초기화
            imagePreview.innerHTML = "";
            
            // 기존 이미지 미리보기에 추가
            if(reviewData.reviewImage && 
               (Array.isArray(reviewData.reviewImage) && reviewData.reviewImage.length > 0 || 
                !Array.isArray(reviewData.reviewImage))) {
                
                const imgUrls = Array.isArray(reviewData.reviewImage) 
                    ? reviewData.reviewImage
                    : [reviewData.reviewImage];
                
                // 이미지 URL을 전역 변수에 저장 (수정 시 사용)
                window.existingImageUrls = [...imgUrls]; // 배열 복사로 참조 문제 방지
    
                // 각 이미지를 미리보기에 추가
                imgUrls.forEach((url, index) => {
                    const imgContainer = document.createElement("div");
                    imgContainer.className = "preview-img-container";
                    imgContainer.dataset.index = index; // 기존 이미지 식별자
                    
                    const imgElement = document.createElement("img");
                    imgElement.src = url;
                    imgElement.classList.add("preview-img");
                    
                    const deleteBtn = document.createElement("button");
                    deleteBtn.className = "delete-preview-img";
                    deleteBtn.innerHTML = "×";
                    deleteBtn.onclick = function() {
                        imgContainer.remove();
                        // existingImageUrls 배열 수정 없이 DOM에서만 제거
                        // 실제 이미지 업데이트는 수정 제출 시 DOM 기반으로 처리
                    };
                    
                    imgContainer.appendChild(imgElement);
                    imgContainer.appendChild(deleteBtn);
                    imagePreview.appendChild(imgContainer);
                });
            }
        } catch (error) {
            console.error("리뷰 데이터 가져오기 오류:", error);
        }
    
        // 제출 버튼 텍스트 변경
        submitBtn.textContent = "수정완료";
        submitBtn.dataset.reviewId = reviewId;
        submitBtn.dataset.mode = "edit";
        
        // 모달 열기
        openModal("reviewModal");
        checkInputs(); // 입력상태 확인하여 버튼 활성화
    }

    // 리뷰 수정, 삭제 버튼 이벤트 리스너 설정
    export function ReviewEditListeners(){
        //더보기 버튼 토글
        const moreActionBtn = document.querySelectorAll(".more-action-btn");
        moreActionBtn.forEach(btn => {
            btn.addEventListener("click", function(e) {
                e.stopPropagation();
                //현재 버튼의 드롭다운 메뉴 토글
                const dropdown = this.nextElementSibling;
                dropdown.classList.toggle("show");

                //다른 열린 드롭다운 메뉴 닫기
                document.querySelectorAll(".actions-dropdown.show").forEach(openDropdown => {
                    if(openDropdown !== dropdown){
                        openDropdown.classList.remove("show");
                    }
                });              
            });
        });

        // 드롭다운 외부 클릭 시 닫기
        document.addEventListener("click", function(){
            document.querySelectorAll(".actions-dropdown.show").forEach(openDropdown => {
                openDropdown.classList.remove("show");
            });
        });

        // 수정 버튼 클릭 시 수정 모달 열기
        const editButtons = document.querySelectorAll(".edit-review");
        editButtons.forEach(btn => {
            btn.addEventListener("click", function(){
                const reviewCard = this.closest(".reviewCard");
                const reviewId = reviewCard.dataset.reviewId;
                const reviewContent = reviewCard.querySelector(".review-content").textContent;
                // const reviewImages = reviewCard.querySelectorAll(".review-img");

                // 모달에 현재 리뷰 정보 설정
                openEditReviewModal(reviewId, reviewContent);
            });
        });

        // 삭제 버튼 클릭 시 확인 후 삭제
        const deleteButtons = document.querySelectorAll(".delete-review");
        deleteButtons.forEach(btn => {
            btn.addEventListener("click", function() {
                const reviewCard = this.closest(".reviewCard");
                if (!reviewCard) {
                    console.error("리뷰 카드를 찾을 수 없습니다");
                    return;
                }
        
                const reviewId = reviewCard.dataset.reviewId;
                const poolId = reviewCard.dataset.poolId; // poolId도 가져옵니다
        
                if (!reviewId) {
                    console.error("리뷰 ID를 찾을 수 없습니다");
                    return;
                }
                
                if (confirm("정말 삭제하시겠습니까?")) {
                    deleteReview(reviewId, poolId); // poolId도 함께 전달
                }
            });
        });
    }


     // 등록 버튼 활성화 
     const reviewInput = document.getElementById("reviewText");
     const submitBtn = document.getElementById("submitReview");
     
     export function checkInputs() {
         const hasReview = reviewInput.value.trim() !== "";
         
         if (hasReview) {
             submitBtn.classList.add("active");
             submitBtn.disabled = false;
         } else {
             submitBtn.classList.remove("active");
             submitBtn.disabled = true;
         }
     }

    //리뷰 삭제 함수
    async function deleteReview(reviewId, customPoolId = null) {
        // HTML 요소에서 정보 찾기
        const reviewCard = document.querySelector(`.reviewCard[data-review-id="${reviewId}"]`);
        
        // poolId 결정
        let poolId;
        
        if (customPoolId) {
            // 1. 매개변수로 전달된 경우
            poolId = customPoolId;
        } else if (poolData) {
            // 2. 전역 변수에서 가져오는 경우
            poolId = String(poolData.id);
        } else if (reviewCard && reviewCard.dataset.poolId) {
            // 3. HTML 요소에서 가져오는 경우
            poolId = reviewCard.dataset.poolId;
        } else {
            // 4. 모든 방법이 실패한 경우
            console.error("풀 ID를 찾을 수 없습니다.");
            showToast("리뷰 삭제 중 오류가 발생했습니다.");
            return;
        }

        authUser(async (userId) => {
            try {
                // 두 문서 삭제를 병렬로 실행
                const poolReviewRef = doc(db, "pools", poolId, "reviews", reviewId);
                
                // 사용자 리뷰 찾기
                const userReviewsRef = collection(db, "users", userId, "reviews");
                const q = query(userReviewsRef, where("reviewId", "==", reviewId));
                const snap = await getDocs(q);
                
                const deletePromises = [
                    deleteDoc(poolReviewRef) // 풀 리뷰 삭제
                ];
                
                // 사용자 리뷰가 있으면 삭제 Promise 추가
                if (!snap.empty) {
                    const userReviewRef = snap.docs[0].ref;
                    deletePromises.push(deleteDoc(userReviewRef));
                }
                
                // 모든 삭제 작업 병렬 실행
                await Promise.all(deletePromises);
                
                // UI 업데이트 및 완료 메시지
                if (reviewCard) reviewCard.remove();
                showToast("리뷰가 삭제되었습니다.");
                
                // 필요한 경우 리뷰 목록 새로고침
                if (poolData && document.getElementById("reviewList")) {
                    loadReviews();
                }
            } catch (error) {
                console.error("리뷰 삭제 중 오류:", error);
                showToast("리뷰 삭제 중 오류가 발생했습니다.");
            }
        }, () => {
            showToast("로그인이 필요합니다.");
        });
    }