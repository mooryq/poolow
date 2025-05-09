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

// 전역 변수로 pool 선언
let pool;

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
            const poolData = Array.isArray(pools) 
                ? pools.find(pool => String(pool.id) === poolId)
                : pools; // 단일 객체인 경우
            
            if (!poolData) {
                console.error("해당 Pool ID에 맞는 수영장 정보를 찾지 못했습니다.");
                return;
            }
            
            // 전역 변수에 pool 할당
            pool = poolData;
            
            // 풀 정보 표시
            displayPoolInfo(poolData);
            
            // 현재 요일에 해당하는 탭 활성화 및 시간표 표시
            initDayTabs(poolData);
            
            // 지도 표시
            if (pool.lat && pool.lng) {
                displayMap(pool.lat, pool.lng);
            } else {
                // 좌표 정보가 없는 경우 주소로 검색 (geocoding)
                geocodeAddress(pool.address);
            }

            // 즐겨찾기 버튼 초기화
            initFavoriteButton(poolData);
            
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
  function displayPoolInfo(poolData) {
    // 전역 변수에 pool 할당
    pool = poolData;
    
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

    // 모든 요일의 세션 정보 체크
    const hasAnySessions = pool.sessions && Object.values(pool.sessions).some(sessions => sessions && sessions.length > 0);
    
    // timeTable 내용 초기화 함수
    const clearTimeTable = () => {
        while (timeTable.firstChild) {
            timeTable.removeChild(timeTable.firstChild);
        }
    };
    
    // 요일 탭에 이벤트 및 스타일 적용
    dayTabs.forEach(tab => {
        const dayKey = tab.dataset.day;
        
        // sessions 객체가 존재하고, 해당 요일의 세션이 정의되어 있는지 확인
        if (!pool.sessions || !pool.sessions[dayKey] || pool.sessions[dayKey].length === 0) {
            tab.classList.add('closed');
        }
        
        // 오늘 요일인 경우 표시
        if (dayKey === todayKey) {
            tab.classList.add('today');
            tab.classList.add('active');
            
            clearTimeTable();
            if (!hasAnySessions) {
                // 모든 요일에 세션이 없는 경우
                const noSessionsDiv = document.createElement('div');
                noSessionsDiv.className = 'flex no-sessions';
                noSessionsDiv.textContent = '아직 정보가 업데이트되지 않았습니다.';
                timeTable.appendChild(noSessionsDiv);
            } else if (pool.sessions && pool.sessions[dayKey]) {
                displaySessions(pool.sessions[dayKey], timeTable);
            } else {
                const noSessionsDiv = document.createElement('div');
                noSessionsDiv.className = 'flex no-sessions';
                noSessionsDiv.textContent = '미운영 요일';
                timeTable.appendChild(noSessionsDiv);
            }
            updateChargeInfo(dayKey, pool.charge, chargeInfo);
        }
        
        // 탭 클릭 이벤트
        tab.addEventListener('click', () => {
            // 기존 활성 탭 제거
            dayTabs.forEach(t => t.classList.remove('active'));
            
            // 현재 탭 활성화
            tab.classList.add('active');
            
            clearTimeTable();
            if (!hasAnySessions) {
                // 모든 요일에 세션이 없는 경우
                const noSessionsDiv = document.createElement('div');
                noSessionsDiv.className = 'flex no-sessions';
                noSessionsDiv.textContent = '아직 정보가 업데이트되지 않았습니다.';
                timeTable.appendChild(noSessionsDiv);
            } else if (pool.sessions && pool.sessions[dayKey]) {
                displaySessions(pool.sessions[dayKey], timeTable);
            } else {
                const noSessionsDiv = document.createElement('div');
                noSessionsDiv.className = 'flex no-sessions';
                noSessionsDiv.textContent = '미운영 요일';
                timeTable.appendChild(noSessionsDiv);
            }
            updateChargeInfo(dayKey, pool.charge, chargeInfo);
        });
    });
  }
  
  // 세션 정보 표시
  function displaySessions(sessions, container) {
    // 기존 세션 요소들 제거 (innerHTML 대신)
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // 세션이 없거나 빈 배열인 경우 휴무일 표시
    if (!sessions || sessions.length === 0) {
        const noSessionsDiv = document.createElement('div');
        noSessionsDiv.className = 'flex no-sessions';
        noSessionsDiv.textContent = '미운영요일';
        container.appendChild(noSessionsDiv);
        return;
    }

    // 세션 정보 표시
    sessions.forEach((session, index) => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'session-row';
        
        const sessionNumDiv = document.createElement('div');
        sessionNumDiv.className = 'session-num';
        sessionNumDiv.textContent = `${index + 1}부`;
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time';
        timeDiv.textContent = session.time;
        
        const typeDiv = document.createElement('div');
        typeDiv.className = 'type';
        typeDiv.textContent = session.type;
        
        sessionDiv.appendChild(sessionNumDiv);
        sessionDiv.appendChild(timeDiv);
        sessionDiv.appendChild(typeDiv);
        container.appendChild(sessionDiv);
    });
  }
  

  // 요일에 따른 요금 정보 업데이트
  function updateChargeInfo(dayKey, charges, container) {
    // 기존 요금 정보 요소들 제거
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
    
    // pool.sessions가 존재하는지 먼저 확인
    if (!pool || !pool.sessions) {
        const noChargeDiv = document.createElement('div');
        noChargeDiv.className = 'charge-info';
        noChargeDiv.innerHTML = '<div class="charge-row"><div class="charge">요금 정보가 없습니다.</div></div>';
        container.appendChild(noChargeDiv);
        return;
    }
    
    // 해당 요일의 시간표가 있는지 확인
    const sessions = pool.sessions[dayKey];
    if (!sessions || sessions.length === 0) {
        const noChargeDiv = document.createElement('div');
        noChargeDiv.className = 'charge-info';
        noChargeDiv.innerHTML = '<div class="charge-row"><div class="charge">요금 정보가 없습니다.</div></div>';
        container.appendChild(noChargeDiv);
        return;
    }
    
    if (!charges) {
        const noChargeDiv = document.createElement('div');
        noChargeDiv.className = 'charge-info';
        noChargeDiv.innerHTML = '<div class="charge-row"><div class="charge">요금 정보가 없습니다.</div></div>';
        container.appendChild(noChargeDiv);
        return;
    }
    
    // 요일에 따른 요금 선택 (weekday/weekend)
    const isWeekend = (dayKey === 'saturday' || dayKey === 'sunday');
    const chargeType = isWeekend ? 'weekend' : 'weekday';
    const memberChargeType = isWeekend ? 'member-weekend' : 'member-weekday';
    
    // 요금 목록 가져오기
    const chargeList = charges[chargeType] || [];
    const memberChargeList = charges[memberChargeType] || [];
    
    // 일반 요금 정보 표시
    if (chargeList.length > 0) {
        const chargeRow = document.createElement('div');
        chargeRow.className = 'charge-row';
        
        chargeList.forEach(charge => {
            const chargeDiv = document.createElement('div');
            chargeDiv.className = 'charge';
            chargeDiv.textContent = charge;
            chargeRow.appendChild(chargeDiv);
        });
        
        container.appendChild(chargeRow);
    } else {
        const noChargeDiv = document.createElement('div');
        noChargeDiv.className = 'charge-info';
        noChargeDiv.innerHTML = '<div class="charge-row"><div class="charge">요금 정보가 없습니다.</div></div>';
        container.appendChild(noChargeDiv);
    }
    
    // 회원 요금 정보 표시 (있는 경우)
    if (memberChargeList.length > 0) {
        const memberInfoDiv = document.createElement('div');
        memberInfoDiv.className = 'charge-info';
        
        const memberTitle = document.createElement('div');
        memberTitle.textContent = '멤버십(강습/자유수영) 회원 1일 요금';
        
        const memberRow = document.createElement('div');
        memberRow.className = 'charge-row';
        
        memberChargeList.forEach(charge => {
            const chargeDiv = document.createElement('div');
            chargeDiv.className = 'charge';
            chargeDiv.textContent = charge;
            memberRow.appendChild(chargeDiv);
        });
        
        memberInfoDiv.appendChild(memberTitle);
        memberInfoDiv.appendChild(memberRow);
        container.appendChild(memberInfoDiv);
    }
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

