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
    serverTimestamp
    } from './firebase.js';

import { authUser, authCache, initAuth } from "./global.js"; 
import { fetchPoolData, getRawPool } from './pool-service.js';
import { showToast} from './ui.js';
import { initFavoriteButton, initReviewModal } from './addFavRev.js';

import { resizeImage, uploadReviewImages } from "./resizeImage.js";
import { query, orderBy } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";


document.addEventListener('DOMContentLoaded', async () => {
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
    
    // URL 쿼리 스트링에서 poolId 가져오기
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get('poolId');
    
    if (!poolId) {
        console.error("Pool ID가 제공되지 않았습니다.");
        return;
    }
    // 인증 초기화를 먼저 완료한 후 나머지 작업 진행
    if (!(authCache.isAuthenticated && authCache.timestamp && 
        (Date.now() - authCache.timestamp < authCache.ttl))) {
      await initAuth();  // 필요한 경우에만 인증 초기화
    }

    // 풀 데이터 불러오기
    fetch('data/pools.json')
        .then(response => response.json())
        .then(pools => {
            // poolId에 맞는 수영장 정보 찾기
            const pool = Array.isArray(pools) 
                ? pools.find(pool => String(pool.id) === poolId)
                : pools; // 단일 객체인 경우
            
            if (!pool) {
                console.error("해당 Pool ID에 맞는 수영장 정보를 찾지 못했습니다.");
                return;
            }
            
            // 풀 정보 표시
            displayPoolInfo(pool);
            
            // 현재 요일에 해당하는 탭 활성화 및 시간표 표시
            initDayTabs(pool);
            
            // 지도 표시
            if (pool.lat && pool.lng) {
                displayMap(pool.lat, pool.lng);
            } else {
                // 좌표 정보가 없는 경우 주소로 검색 (geocoding)
                geocodeAddress(pool.address);
            }

            // 즐겨찾기 버튼 초기화
            initFavoriteButton(pool);
            
            // 리뷰 모달 초기화
            initReviewModal();
        })
        .catch(error => {
            console.error("데이터 로딩 중 오류 발생:", error);
        });
    });
  
  // 헤더 높이 업데이트
  function updateHeaderHeight() {
    const header = document.querySelector('header');
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
  }
  
  // 수영장 기본 정보 표시
  function displayPoolInfo(pool) {
    // 이름 및 주소 정보
    const poolNameElements = document.querySelectorAll('.pool-name');
    poolNameElements.forEach(element => {
        element.textContent = pool.name;
    });

    //페이지 타이틀
    document.title = `${pool.name} | 자유수영 정보 - 풀로우(Poolow)`;  
    document.querySelector('.address').textContent = `🌊 ${pool.address}`;
  
    // meta description 동적 추가
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = 'description';
        document.head.appendChild(metaDescription);
    }
    
    // 수영장 설명 생성 - 태그와 주소 정보 포함
    const tags = pool.tags ? pool.tags.join(', ') : '';
    metaDescription.content = `${pool.name}의 자유수영 시간표, 요금, 주차 정보와 이용자들의 생생한 후기를 지금 확인해보세요! | ${pool.address}`;
    
    
    // 후기 개수 가져오기
    const reviewsElement = document.getElementById('reviews');
    const reviewsRef = collection(db, "pools", String(pool.id), "reviews");
    getDocs(reviewsRef).then((snapshot) => {
        const reviewCount = snapshot.size;
        reviewsElement.textContent = `후기 ${reviewCount}개 ＞`;
    }).catch((error) => {
        console.error("후기 개수 가져오기 실패:", error);
        reviewsElement.textContent = "후기 0개 ＞";
    });
    
    // 후기 클릭 시 리뷰 섹션으로 스크롤
    reviewsElement.addEventListener('click', () => {
        const reviewSection = document.querySelector('.review-section');
        if (reviewSection) {
            reviewSection.scrollIntoView({ behavior: 'smooth' });
        }
    });
    
    // 주소 복사 버튼 기능
    const copyBtn = document.querySelector('.copy');
    copyBtn.addEventListener('click', () => {
        const addressText = pool.address.trim();
        navigator.clipboard.writeText(addressText).then(() => {
            showToast("주소가 복사되었습니다!");
        });
    });
    
    // 짧은 주소 표시 (shortAddress가 있으면 사용, 없으면 주소에서 추출)
    if (pool.shortAddress) {
      document.querySelector('.short-address').textContent = pool.shortAddress;
    } else {
      const match = pool.address.match(/^(.+?[시도])\s(.+?[구군])\s(.+?[동면읍])/);
      const shortAddress = match ? match.slice(1).join(" ") : pool.address;
      document.querySelector('.short-address').textContent = shortAddress;
    }
    
    // 태그 표시
    const tagContainer = document.querySelector('.tag-container');
    if (pool.tags && pool.tags.length > 0) {
        tagContainer.innerHTML = pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('');
    }
    
    // 휴관일 정보 표시
    if (pool.off_day) {
        const offDayElement = document.querySelector('.off-day');
        if (offDayElement) {
            offDayElement.textContent = pool.off_day;
        }
    }
    
    // 웹사이트 정보 표시
    const websiteLink = document.getElementById("websiteLink");
    if (pool.website) {
        websiteLink.innerHTML = `${pool.website}`;
        websiteLink.onclick = () => window.open(pool.website, "_blank");
    } else {
        websiteLink.textContent = "웹사이트 정보가 없습니다.";
        websiteLink.style.cursor = "default";
    }
    
    // 전화번호 정보 표시
    const phoneNumber = document.getElementById('phoneNumber');
    if (pool.phone) {
        phoneNumber.innerHTML = `${pool.phone}`;
        phoneNumber.onclick = () => window.open(`tel:${pool.phone}`, "_blank");
    } else {
        // 전화번호 정보가 없는 경우 항목 숨김
        document.querySelector('.phone-info').style.display = 'none';
    }
    
    // 주차 정보 표시
    if (pool.parking && pool.parking.length > 0) {
        const parkingInfo = document.querySelector('.parking-info');
        parkingInfo.innerHTML = pool.parking.map(parking => `<div class="parking-item">${parking}</div>`).join('');
    } else {
        // 주차 정보가 없는 경우 섹션 숨김
        document.querySelector('.parking-info').innerHTML = '<div>주차 정보가 없습니다.</div>';
    }
    
    // 대중교통 정보 표시
    if (pool.transportation) {
        const transportationInfo = document.querySelector('.transportation-info');
        // transportation이 배열인지 확인하고, 배열이 아니면 배열로 변환
        const transportationArray = Array.isArray(pool.transportation) 
            ? pool.transportation 
            : [pool.transportation];
        
        if (transportationArray.length > 0) {
            transportationInfo.innerHTML = transportationArray.map(transportation => 
                `<div class="transportation-item">🚌 ${transportation}</div>`
            ).join('');
        }
    }
    
    
    // 안내사항 정보 표시
    if (pool.information && pool.information.length > 0) {
        const informationContainer = document.querySelector('.information');
        informationContainer.innerHTML = pool.information.map(info => `<div class="info-item">${info}</div>`).join('');
    } else {
        // 안내사항이 없는 경우 섹션 숨김
        document.querySelector('#information').style.display = 'none';
    }
    
    // 로드뷰 버튼 이벤트
    document.getElementById('roadViewBtn').addEventListener('click', () => {
        if (pool.lat && pool.lng) {
            const roadViewUrl = `https://map.naver.com/v5/entry/street/${pool.lng},${pool.lat}/`;
            window.open(roadViewUrl, '_blank');
        } else {
            showToast("지도 좌표 정보가 없습니다.");
        }
    });
    
    // 길찾기 버튼 이벤트
    document.getElementById('directionBtn').addEventListener('click', () => {
        const searchQuery = encodeURIComponent(pool.name + ' ' + pool.address);
        const directionUrl = `https://map.naver.com/v5/search/${searchQuery}`;
        window.open(directionUrl, '_blank');
    });

     // 공유 버튼 
    const shareBtn = document.getElementById('sharePool');
    shareBtn.addEventListener('click', async () => {
        const shareUrl = `${window.location.origin}/detail.html?poolId=${pool.id}`;
        const shareTitle = `🌊 ${pool.name}`;

        if (navigator.share) {
        try {
            await navigator.share({
            title: shareTitle,
            text: `${pool.name} 에서 같이 수영해요! 
💙Poolow💙 `,
            url: shareUrl
            });
            console.log("✅ 공유 성공");
        } catch (err) {
            console.error("❌ 공유 실패", err);
        }
        } else {
        navigator.clipboard.writeText(shareUrl).then(() => {
            showToast("링크가 복사되었습니다!");
        });
        }
    });
  }
  
  
  
  // 요일에 따른 요금 정보 업데이트
  function updateChargeInfo(dayKey, charges, container) {
    // 컨테이너 초기화
    container.innerHTML = '';
    
    if (!charges) return;
    
    // 요일에 따른 요금 선택 (weekday/weekend)
    const isWeekend = (dayKey === 'saturday' || dayKey === 'sunday');
    const chargeType = isWeekend ? 'weekend' : 'weekday';
    const memberChargeType = isWeekend ? 'member-weekend' : 'member-weekday';
    
    // 요금 목록이 배열인 경우와 객체인 경우 처리
    let chargeList = [];
    let memberChargeList = [];
    
    if (Array.isArray(charges)) {
        // charges가 배열인 경우 (구버전)
        chargeList = charges;
    } else {
        // charges가 객체인 경우 (신버전)
        if (charges[chargeType]) {
            chargeList = charges[chargeType];
        }
        if (charges[memberChargeType]) {
            memberChargeList = charges[memberChargeType];
        }
    }
    
    // 요금 정보 표시
    if (Array.isArray(chargeList) && chargeList.length > 0) {
        const formatCharge = (charge) => {
            // 숫자만 추출
            const numbers = charge.match(/\d+/g);
            if (numbers) {
                // 숫자를 천 단위로 콤마 추가
                const formattedNumbers = numbers.map(num => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','));
                // 원래 문자열에서 숫자를 포맷된 숫자로 교체
                let formattedCharge = charge;
                numbers.forEach((num, index) => {
                    formattedCharge = formattedCharge.replace(num, formattedNumbers[index]);
                });
                return formattedCharge;
            }
            return charge;
        };

        const chargesHTML = `<div class="charge-row">${chargeList.map(charge => `<div class="charge">${formatCharge(charge)}</div>`).join('')}</div>`;
        container.innerHTML = chargesHTML;
    } else {
        container.innerHTML = '<div class="charge-info"><div class="charge-row"><div class="charge">요금 정보가 없습니다.</div></div></div>';
    }
    
    // 회원 요금 정보 표시 (있는 경우)
    if (Array.isArray(memberChargeList) && memberChargeList.length > 0) {
        const memberChargesHTML = `<div class="charge-info">멤버십(강습/자유수영) 회원 1일 요금<div class="charge-row">${memberChargeList.map(charge => `<div class="charge">${charge}</div>`).join('')}</div></div>`;
        container.innerHTML += memberChargesHTML;
    }
  }
  
  // 요일별 탭 초기화 및 표시
  function initDayTabs(pool) {
    const dayTabs = document.querySelectorAll('.day-tab');
    const timeTable = document.querySelector('.time-table');
    const chargeInfo = document.querySelector('.chargeInfo');
    
    // 요일에 해당하는 영어 키 매핑
    const dayMapping = {
        0: 'sunday',    // 일요일
        1: 'monday',    // 월요일
        2: 'tuesday',   // 화요일
        3: 'wednesday', // 수요일
        4: 'thursday',  // 목요일
        5: 'friday',    // 금요일
        6: 'saturday'   // 토요일
    };
    
    // 현재 요일 가져오기 (0: 일요일, 1: 월요일, ...)
    const today = new Date().getDay();
    const todayKey = dayMapping[today];
    
    // 요일 탭에 이벤트 및 스타일 적용
    dayTabs.forEach(tab => {
        const dayKey = tab.dataset.day;
        
        // 휴관일인 경우 스타일 적용
        if (!pool.sessions[dayKey] || pool.sessions[dayKey].length === 0) {
            tab.classList.add('closed');
        }
        
        // 오늘 요일인 경우 표시
        if (dayKey === todayKey) {
            tab.classList.add('today');
            tab.classList.add('active');
            displaySessions(pool.sessions[dayKey], timeTable);
            updateChargeInfo(dayKey, pool.charge, chargeInfo);
        }
        
        // 탭 클릭 이벤트
        tab.addEventListener('click', () => {
            // 기존 활성 탭 제거
            dayTabs.forEach(t => t.classList.remove('active'));
            
            // 현재 탭 활성화
            tab.classList.add('active');
            
            // 해당 요일 세션 표시
            displaySessions(pool.sessions[dayKey], timeTable);
            
            // 요일에 따른 요금 정보 업데이트
            updateChargeInfo(dayKey, pool.charge, chargeInfo);
        });
    });
  }
  
  // 세션 정보 표시
  function displaySessions(sessions, container) {
    // 컨테이너 초기화
    container.innerHTML = '';
    
    // 세션이 없거나 빈 배열인 경우 휴무일 표시
    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<div class="flex no-sessions">미운영요일</div>';
        return;
    }
    
    // 세션 목록 표시
    sessions.forEach((session, index) => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'flex-bottom';
        
        // 기본 세션 정보 표시
        let sessionHTML = `
                <span class="session-num">${index + 1}부:</span>
                <span class="session-time">${session.time}</span>
        `;
        
        // 입장 시간 정보가 있는 경우 추가
        if (session.admission) {
            sessionHTML += `<span class="session-admission">입장 ${session.admission}</span>`;
        }
        
        sessionDiv.innerHTML = sessionHTML;
        container.appendChild(sessionDiv);
    });
  }
  
  // 주소로 지도 좌표 검색 (geocoding)
  function geocodeAddress(address) {
    // Naver Maps API의 geocoding 서비스 사용
    // 참고: 네이버 지도 API 키가 필요할 수 있습니다
    console.log("주소로 좌표 검색:", address);
    
    // 예시: 임의의 좌표 사용 (실제로는 geocoding 서비스 사용 필요)
    const defaultLat = 37.5665;
    const defaultLng = 126.9780;
    displayMap(defaultLat, defaultLng);
  }
  
  // 지도 표시
  function displayMap(lat, lng) {
    const mapDiv = document.querySelector('.detailMap');
    const mapOptions = {
        center: new naver.maps.LatLng(lat, lng),
        zoom: 15,
    };
  
    const map = new naver.maps.Map(mapDiv, mapOptions);
  
    // 마커 추가
    new naver.maps.Marker({
        position: new naver.maps.LatLng(lat, lng),
        map: map,
    });

    
}

