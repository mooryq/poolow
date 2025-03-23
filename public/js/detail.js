
function updateHeaderHeight() {
    const header = document.querySelector('header');
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
}
window.addEventListener('resize', updateHeaderHeight);
updateHeaderHeight();


document.querySelector('.Back').addEventListener('click', () => {
    if (document.referrer) {
        window.history.back();
      } else {
        window.location.href = '/';
      }      
  });
  

document.addEventListener('DOMContentLoaded', () => {
    // 1. URL 쿼리 스트링에서 poolId 가져오기
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get('poolId');
    
    if (!poolId) {
      console.error("Pool ID가 제공되지 않았습니다.");
      return;
    }
    
    // 2. JSON 파일 불러오기
    fetch('data/pools.json')
      .then(response => response.json())
      .then(pools => {
        
        // 3. poolId에 맞는 수영장 정보 찾기 (숫자 비교를 위해 형변환 고려)
        const pool = pools.find(pool => String(pool.id) === poolId);
        
        if (!pool) {
          console.error("해당 Pool ID에 맞는 수영장 정보를 찾지 못했습니다.");
          return;
        }
        
        // 4. DOM 요소에 pool 정보 업데이트 (HTML 구조에 맞게 선택자 수정)
        
        // 이름 (pool.name)
        document.querySelector('.pool-name').textContent = pool.name;
        
        // 주소 (pool.address)
        document.querySelector('.address').textContent = pool.address;
        
        //주소복사 
        const copyBtn = document.querySelector('.copy');
        const addressDiv = document.querySelector('.address');

        copyBtn.addEventListener('click', () => {
        const addressText = addressDiv.textContent.trim();

        if (!addressText) {
            alert('주소가 없습니다.');
            return;
        }

        navigator.clipboard.writeText(addressText).then(() => {
            showToast("주소가 복사되었습니다!");
        });
        });

            
          
        // // 숏 주소 (pool.address 잘라서 사용)
        const match = pool.address.match(/^(.+?[시도])\s(.+?[구군])\s(.+?[동면읍])/);
        const shortAddress = match ? match.slice(1).join(" ") : pool.address;
        document.querySelector('.short-address').textContent = shortAddress;
        
        // 태그 (pool.tags 배열을 사용)
        const tagContainer = document.querySelector('.tag-container');
            if (tagContainer && pool.tags && pool.tags.length > 0) {
                tagContainer.innerHTML = pool.tags.map(tag => `<div class="tag">${tag}</div>`).join('');
            }

        // 요일에 따른 디폴트 세션 타입
        const today = new Date().getDay(); // 0: 일, 6: 토
        const defaultType = (today === 0 || today === 6) ? 'weekend' : 'weekday';
        
         // 탭 active 표시
        document.querySelectorAll('.timeTab').forEach(tab => {
        const isDefault = (tab.textContent.includes('평일') && defaultType === 'weekday') ||
                            (tab.textContent.includes('주말') && defaultType === 'weekend');
        tab.classList.toggle('active', isDefault);
        });

         // 시간표 렌더 함수
        function Sessions(type) {
            const list = pool.sessions?.[type];
            const container = document.querySelector('.time-table');
            container.innerHTML = '';

            if (!list || list.length === 0) {
            container.innerHTML = '<div class="gray-text">시간표 정보 없음</div>';
            return;
            }

            list.forEach(session => {
            const row = document.createElement('div');
            row.className = 'flex';
            row.innerHTML = `
                <span class="session-num">${session.num}</span>
                <span class="session-time">${session.time}</span>
            `;
            container.appendChild(row);
            });
        }


        // 시간표 평일or주말 구분하여 디폴트 렌더링
        Sessions(defaultType);

         // 탭 클릭 이벤트
        document.querySelectorAll('.timeTab').forEach(tab => {
            tab.addEventListener('click', () => {
            document.querySelectorAll('.timeTab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const type = tab.textContent.includes('평일') ? 'weekday' : 'weekend';
            Sessions(type);
            });
        });


        const chargeInfo = document.querySelector('.chargeInfo');

        if (pool.charge && Array.isArray(pool.charge)) {
            chargeInfo.innerHTML = ''; // 혹시 기존에 있던 내용 제거
        
          pool.charge.forEach(chargeText => {
            const chargeDiv = document.createElement('div');
            chargeDiv.className = 'charge';
            chargeDiv.textContent = chargeText;
            chargeInfo.appendChild(chargeDiv);
          });
        }

        // 지도 띄우기
        function detailMap(lat, lng) {
            const mapDiv = document.querySelector('.detailMap');
            const mapOptions = {
            center: new naver.maps.LatLng(lat, lng),
            zoom: 15,
            };
        
            const map = new naver.maps.Map(mapDiv, mapOptions);
        
            // 마커도 같이 찍기
            new naver.maps.Marker({
            position: new naver.maps.LatLng(lat, lng),
            map: map,
            });
        }

        detailMap(pool.lat, pool.lng);

        // // 기타 필요한 정보들도 비슷하게 업데이트하면 됩니다.
        // console.log("수영장 정보 업데이트 완료!", pool);

        })

    });