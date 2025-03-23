
window.moveToSearchArea = moveToSearchArea;

// ✅ 구별 중심 좌표 데이터 불러오기
let districtCenters = {};  // JSON 데이터를 저장할 변수

// ✅ JSON 파일 로드 함수
async function loadDistrictCenters() {
    try {
        const response = await fetch("data/districts.json");
        districtCenters = await response.json();
        console.log("✅ 구별 중심 좌표 데이터 로드 완료:", districtCenters);
    } catch (error) {
        console.error("❌ 구별 중심 좌표 데이터를 불러오는 중 오류 발생:", error);
    }
}

// ✅ 페이지 로드 시 JSON 데이터 불러오기
document.addEventListener("DOMContentLoaded", () => {
    loadDistrictCenters();
});


function moveToSearchArea(filteredPools, keyword) {

    if (!event || event.key !== "Enter") {
        console.warn("⚠️ moveToSearchArea 실행 조건 불충분 (Enter 입력 없음)");
        return;
    }

    if (filteredPools.length === 0) {
        console.log(`❌ 검색 결과 없음: ${keyword}`);
        
        // ✅ 지역 데이터에서 검색어가 포함된 지역 찾기
        let targetLocation = null;


        Object.keys(districtCenters["서울특별시"]).forEach(district => {
            console.log(`🔍 검색어: ${keyword}, 비교 대상: ${district}, 변환 후: ${district.replace("구", "")}`);
            
            if (keyword.trim() === district || keyword.trim() === district.replace("구", "")) {
                targetLocation = districtCenters["서울특별시"][district];
            }
        });

        Object.keys(districtCenters["경기도"]).forEach(city => {
            console.log(`🔍 검색어: ${keyword}, 비교 대상: ${city}, 변환 후: ${city.replace("시", "")}`);

            if (keyword.trim() === city || keyword.trim() === city.replace("시", "")) {
                targetLocation = districtCenters["경기도"][city];
            }
        });


        if (targetLocation) {
            // ✅ 해당 구나 시 중심으로 지도 이동
            map.setCenter(new naver.maps.LatLng(targetLocation.lat, targetLocation.lng));
            map.setZoom(14);
            console.log(`📍 ${keyword} 지역으로 이동 (수영장 없음):`, targetLocation);


            // ✅ 카드 UI에 "검색된 지역에 수영장이 없습니다." 표시
            updateSearchResultsWithNoPools(keyword);
        } 

        return;
    }

    if (filteredPools.length === 1) {
        const firstPool = filteredPools[0];
        map.setCenter(new naver.maps.LatLng(firstPool.lat, firstPool.lng));
        map.setZoom(14);
        console.log(`📍 단일 검색 결과 이동: ${firstPool.name}`);
        return;
    }

    let bounds = new naver.maps.LatLngBounds();
    filteredPools.forEach(pool => bounds.extend(new naver.maps.LatLng(pool.lat, pool.lng)));

    map.fitBounds(bounds, { padding: 30 });
    console.log("📍 검색 결과에 맞춰 fitBounds 적용");
}

// ✅ 카드 UI에 "검색된 지역에 수영장이 없습니다." 함수

function updateSearchResultsWithNoPools(keyword) {
    resultContainer.style.display = "block";
    resultCount.textContent = `검색 결과: 0개`;
    cardWrapper.innerHTML = "";  // 기존 카드 삭제

    // ✅ "검색된 지역에 수영장이 없습니다." 카드 추가
    const emptyCard = document.createElement("div");
    emptyCard.classList.add("pool-card", "no-pools");
    emptyCard.innerHTML = `
        <h3>📍 ${keyword}</h3>
        <p>검색된 지역에 수영장이 없습니다.</p>
    `;

    cardWrapper.appendChild(emptyCard);
}
