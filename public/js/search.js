import { showToast } from './ui.js';
export { executeSearch, moveToSearchArea };

// 구별 중심 좌표 데이터 저장 변수
let districtCenters = {};

/**
 * 수영장 데이터에서 키워드로 검색하는 함수
 * @param {string} keyword - 검색어
 * @param {Array} poolsData - 수영장 데이터 배열
 * @returns {Array} - 검색 결과 수영장 배열
 */
function executeSearch(keyword, poolsData) {
  if (!keyword || keyword.length === 0 || !poolsData) return [];
  
  keyword = keyword.toLowerCase().trim();
  console.log(`🔍 검색어: ${keyword}`);
  
  // 수영장 이름, 주소, 태그로 검색
  const filteredPools = poolsData.filter(pool =>
    pool.name.toLowerCase().includes(keyword) ||
    pool.address.toLowerCase().includes(keyword) ||
    (pool.addressRoad && pool.addressRoad.toLowerCase().includes(keyword)) ||
    (pool.tags && pool.tags.some(tag => tag.toLowerCase().includes(keyword))) ||
    (pool.transportation && pool.transportation.some(trans => 
      trans.toLowerCase().includes(keyword) ||
      trans.toLowerCase().includes(keyword.replace('역', ''))
    ))
  );
  
  // 지하철역이나 동 단위로 더 세밀한 검색 필요시 여기에 확장 가능
  
  return filteredPools;
}

// 구별 중심 좌표 데이터 로드
async function loadDistrictCenters() {
  try {
    const response = await fetch("data/districts.json");
    districtCenters = await response.json();
    console.log("✅ 구별 중심 좌표 데이터 로드 완료");
  } catch (error) {
    console.error("❌ 구별 중심 좌표 데이터를 불러오는 중 오류 발생:", error);
  }
}

/**
 * 검색 결과에 따라 지도를 이동시키는 함수
 * @param {Array} filteredPools - 검색된 수영장 목록
 * @param {string} keyword - 검색어
 * @param {Object} map - 네이버 지도 객체 (index.js에서 전달받음)
 */
function moveToSearchArea(filteredPools, keyword, map) {
  // 검색 결과가 없는 경우, 지역명으로 검색했는지 확인
  if (filteredPools.length === 0 && map) {
    let targetLocation = findDistrictByKeyword(keyword);
    
    // 지역명에 해당하는 좌표가 있으면 지도 이동
    if (targetLocation) {
      map.setCenter(new naver.maps.LatLng(targetLocation.lat, targetLocation.lng));
      map.setZoom(14);
      console.log(`📍 ${keyword} 지역으로 이동`);
      
      // 토스트 메시지 표시
      if (typeof showToast === 'function') {
        showToast(`${keyword} 지역에 수영장이 없습니다`);
      }
    }
    return;
  }
}

/**
 * 검색어와 일치하는 구/시를 찾아 좌표를 반환하는 함수
 * @param {string} keyword - 검색어
 * @returns {Object|null} - 좌표 정보 또는 null
 */
function findDistrictByKeyword(keyword) {
  const trimmedKeyword = keyword.trim();
  let targetLocation = null;

  // 서울 구 검색 - 정확한 일치 및 부분 일치(구 없이) 모두 확인
  if (districtCenters["서울특별시"]) {
    for (const district of Object.keys(districtCenters["서울특별시"])) {
      // 정확한 일치 (예: "강남구")
      if (trimmedKeyword === district) {
        targetLocation = districtCenters["서울특별시"][district];
        break;
      }
      
      // "구" 없이 일치 (예: "강남")
      const shortName = district.replace("구", "");
      if (trimmedKeyword === shortName) {
        targetLocation = districtCenters["서울특별시"][district];
        break;
      }
      
      // 부분 일치 (예: "강" -> "강남구", "강동구", "강서구" 등)
      if (district.startsWith(trimmedKeyword) || shortName.startsWith(trimmedKeyword)) {
        targetLocation = districtCenters["서울특별시"][district];
        break;
      }
    }
  }

  // 경기도 시 검색 - 위와 동일한 방식으로 검색
  if (!targetLocation && districtCenters["경기도"]) {
    Object.keys(districtCenters["경기도"]).forEach(city => {
      // 정확한 일치 (예: "성남시")
      if (trimmedKeyword === city) {
        targetLocation = districtCenters["경기도"][city];
        return;
      }
      
      // "시" 없이 일치 (예: "성남")
      const shortName = city.replace("시", "");
      if (trimmedKeyword === shortName) {
        targetLocation = districtCenters["경기도"][city];
        return;
      }
      
      // 부분 일치 (예: "성" -> "성남시" 등)
      if (city.startsWith(trimmedKeyword) || shortName.startsWith(trimmedKeyword)) {
        targetLocation = districtCenters["경기도"][city];
        return;
      }
    });
  }

  return targetLocation;
}

// 페이지 로드 시 구별 중심 좌표 데이터 로드
document.addEventListener("DOMContentLoaded", loadDistrictCenters);