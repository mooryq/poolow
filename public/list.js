// 관리자 권한 확인 함수
async function checkAdminAuth() {
    return true; // 임시로 true 반환
}

// 사용자 권한 확인 함수
async function checkUserPermission() {
    try {
        const isAdmin = await checkAdminAuth();
        if (!isAdmin) {
            alert('관리자 권한이 필요합니다.');
            return false;
        }
        return true;
    } catch (error) {
        console.error('권한 확인 중 오류 발생:', error);
        alert('권한 확인 중 오류가 발생했습니다.');
        return false;
    }
}

// 수영장 데이터 로드 함수
async function loadPoolData() {
    try {
        const response = await fetch('data/pools.json');
        if (!response.ok) {
            throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        return await response.json();
    } catch (error) {
        console.error('수영장 데이터 로드 중 오류:', error);
        alert('수영장 데이터를 불러오는데 실패했습니다.');
        return [];
    }
}

// 수영장 데이터 저장 함수
async function savePoolData(pools) {
    try {
        // 변경된 데이터만 저장하도록 수정
        const updatedPools = pools.map(pool => {
            if (pool.sessions) {
                const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
                weekdays.forEach(day => {
                    if (pool.sessions[day]) {
                        // 빈 시간표나 "-"로만 구성된 시간표는 제외
                        pool.sessions[day] = pool.sessions[day].filter(session => {
                            return session.time && session.time.trim() !== '-' && session.time.trim() !== '';
                        });
                    }
                });
            }
            return pool;
        });

        const response = await fetch('data/pools.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedPools, null, 2)
        });
        if (!response.ok) {
            throw new Error('데이터 저장에 실패했습니다.');
        }
        return true;
    } catch (error) {
        console.error('수영장 데이터 저장 중 오류:', error);
        alert('수영장 데이터 저장에 실패했습니다.');
        return false;
    }
}

// 수영장 목록 렌더링
function renderPoolList(pools) {
    const poolListBody = document.getElementById('poolListBody');
    poolListBody.innerHTML = '';

    pools.forEach(pool => {
        const row = createPoolRow(pool);
        poolListBody.appendChild(row);
    });
}

function createPoolRow(pool) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${pool.id}</td>
        <td>${pool.name}</td>
        <td>${pool.addressRoad || ''}</td>
        <td>${pool.address || ''}</td>
        <td>${pool.tags ? pool.tags.join(', ') : ''}</td>
        <td><button class="edit-button">수정</button></td>
    `;
    
    // 수정 버튼에 이벤트 리스너 추가
    const editButton = row.querySelector('.edit-button');
    editButton.addEventListener('click', () => {
        window.location.href = `admin.html?id=${pool.id}`;
    });
    
    return row;
}

// 시/구 데이터 추출 및 필터링 함수
function extractLocationData(pools) {
    const locationMap = new Map(); // 시/도별 구/군 데이터를 저장하는 Map
    
    pools.forEach(pool => {
        if (pool.addressRoad) {
            const addressParts = pool.addressRoad.split(' ');
            if (addressParts.length >= 2) {
                const city = addressParts[0];
                const district = addressParts[1];
                
                if (!locationMap.has(city)) {
                    locationMap.set(city, new Set());
                }
                locationMap.get(city).add(district);
            }
        }
    });
    
    // Map을 정렬된 배열로 변환
    const cities = Array.from(locationMap.keys()).sort();
    const districtsByCity = new Map();
    
    locationMap.forEach((districts, city) => {
        districtsByCity.set(city, Array.from(districts).sort());
    });
    
    return {
        cities,
        districtsByCity
    };
}

// 체크박스 생성 함수
function createCheckboxes(containerId, items, type) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    // 전체 선택 체크박스 생성
    const selectAllLabel = document.createElement('label');
    selectAllLabel.className = 'select-all';
    const selectAllCheckbox = document.createElement('input');
    selectAllCheckbox.type = 'checkbox';
    selectAllCheckbox.id = type === 'city' ? 'selectAllCities' : 'selectAllDistricts';
    selectAllCheckbox.checked = true;
    selectAllLabel.appendChild(selectAllCheckbox);
    selectAllLabel.appendChild(document.createTextNode('전체 선택'));
    container.appendChild(selectAllLabel);
    
    // 일반 체크박스 생성
    items.forEach(item => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = item;
        checkbox.checked = true;
        checkbox.dataset.type = type;
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(item));
        container.appendChild(label);
    });
}

// 결과 수 업데이트 함수
function updateResultCount(count) {
    document.getElementById('resultCount').textContent = count;
}

// 필터링 함수
function filterPools(pools, selectedCities, selectedDistricts) {
    const filteredPools = pools.filter(pool => {
        if (!pool.addressRoad) return false;
        
        const addressParts = pool.addressRoad.split(' ');
        if (addressParts.length < 2) return false;
        
        const city = addressParts[0];
        const district = addressParts[1];
        
        return selectedCities.includes(city) && selectedDistricts.includes(district);
    });
    
    // 결과 수 업데이트
    updateResultCount(filteredPools.length);
    
    return filteredPools;
}

// 구/군 체크박스 업데이트 함수
function updateDistrictCheckboxes(selectedCities, districtsByCity, pools) {
    const districtContainer = document.getElementById('districtCheckboxContainer');
    
    // 선택된 시/도의 구/군을 모두 합침
    const allDistricts = new Set();
    selectedCities.forEach(city => {
        if (districtsByCity.has(city)) {
            districtsByCity.get(city).forEach(district => {
                allDistricts.add(district);
            });
        }
    });
    
    // 구/군 체크박스 생성
    createCheckboxes('districtCheckboxContainer', Array.from(allDistricts).sort(), 'district');
    
    // 구/군 체크박스 이벤트 리스너 설정
    setupDistrictListeners(pools, selectedCities);
    
    // 결과 수 업데이트
    const selectedDistricts = Array.from(document.querySelectorAll('#districtCheckboxContainer input:not(#selectAllDistricts):checked')).map(cb => cb.value);
    const filteredPools = filterPools(pools, selectedCities, selectedDistricts);
    updateResultCount(filteredPools.length);
}

// 전체 선택 체크박스 이벤트 리스너 설정
function setupSelectAllListeners(pools, districtsByCity) {
    const selectAllCities = document.getElementById('selectAllCities');
    const selectAllDistricts = document.getElementById('selectAllDistricts');
    
    // 시/도 전체 선택
    selectAllCities.addEventListener('change', () => {
        const cityCheckboxes = document.querySelectorAll('#cityCheckboxContainer input:not(#selectAllCities)');
        cityCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllCities.checked;
        });
        
        const selectedCities = Array.from(cityCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        updateDistrictCheckboxes(selectedCities, districtsByCity, pools);
    });
    
    // 구/군 전체 선택
    selectAllDistricts.addEventListener('change', () => {
        const districtCheckboxes = document.querySelectorAll('#districtCheckboxContainer input:not(#selectAllDistricts)');
        districtCheckboxes.forEach(checkbox => {
            checkbox.checked = selectAllDistricts.checked;
        });
        
        const selectedCities = Array.from(document.querySelectorAll('#cityCheckboxContainer input:not(#selectAllCities):checked')).map(cb => cb.value);
        const selectedDistricts = Array.from(districtCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const filteredPools = filterPools(pools, selectedCities, selectedDistricts);
        renderPoolList(filteredPools);
    });
}

// 체크박스 이벤트 리스너 설정
function setupFilterListeners(pools, districtsByCity) {
    const cityContainer = document.getElementById('cityCheckboxContainer');
    
    // 시/도 체크박스 변경 이벤트
    cityContainer.addEventListener('change', (e) => {
        if (e.target.id === 'selectAllCities') return;
        
        const selectedCities = Array.from(cityContainer.querySelectorAll('input:not(#selectAllCities):checked')).map(cb => cb.value);
        const selectAllCities = document.getElementById('selectAllCities');
        selectAllCities.checked = selectedCities.length === document.querySelectorAll('#cityCheckboxContainer input:not(#selectAllCities)').length;
        
        updateDistrictCheckboxes(selectedCities, districtsByCity, pools);
    });
    
    // 구/군 체크박스 변경 이벤트
    const districtContainer = document.getElementById('districtCheckboxContainer');
    districtContainer.addEventListener('change', (e) => {
        if (e.target.id === 'selectAllDistricts') return;
        
        const selectedCities = Array.from(document.querySelectorAll('#cityCheckboxContainer input:not(#selectAllCities):checked')).map(cb => cb.value);
        const selectedDistricts = Array.from(districtContainer.querySelectorAll('input:not(#selectAllDistricts):checked')).map(cb => cb.value);
        const selectAllDistricts = document.getElementById('selectAllDistricts');
        selectAllDistricts.checked = selectedDistricts.length === document.querySelectorAll('#districtCheckboxContainer input:not(#selectAllDistricts)').length;
        
        const filteredPools = filterPools(pools, selectedCities, selectedDistricts);
        renderPoolList(filteredPools);
    });
    
    // 전체 선택 체크박스 이벤트 리스너 설정
    setupSelectAllListeners(pools, districtsByCity);
}

// 구/군 체크박스 이벤트 리스너 설정
function setupDistrictListeners(pools, selectedCities) {
    const districtContainer = document.getElementById('districtCheckboxContainer');
    
    districtContainer.addEventListener('change', (e) => {
        // 전체선택 체크박스 처리
        if (e.target.id === 'selectAllDistricts') {
            const districtCheckboxes = districtContainer.querySelectorAll('input:not(#selectAllDistricts)');
            districtCheckboxes.forEach(checkbox => {
                checkbox.checked = e.target.checked;
            });
        } else if (!e.target.id) {
            // 개별 체크박스 변경 시 전체선택 체크박스 상태 업데이트
            const selectAllDistricts = document.getElementById('selectAllDistricts');
            const allChecked = Array.from(districtContainer.querySelectorAll('input:not(#selectAllDistricts)'))
                .every(checkbox => checkbox.checked);
            selectAllDistricts.checked = allChecked;
        }
        
        const selectedDistricts = Array.from(districtContainer.querySelectorAll('input:not(#selectAllDistricts):checked')).map(cb => cb.value);
        const filteredPools = filterPools(pools, selectedCities, selectedDistricts);
        renderPoolList(filteredPools);
    });
}

// 페이지 로드 시 실행
document.addEventListener('DOMContentLoaded', async function() {
    // 권한 확인
    const hasPermission = await checkUserPermission();
    if (!hasPermission) {
        window.location.href = 'index.html';
        return;
    }

    // 수영장 데이터 로드 및 표시
    const pools = await loadPoolData();
    
    // 위치 데이터 추출 및 체크박스 생성
    const { cities, districtsByCity } = extractLocationData(pools);
    createCheckboxes('cityCheckboxContainer', cities, 'city');
    
    // 초기 구/군 체크박스 생성 및 이벤트 리스너 설정
    const initialSelectedCities = cities;
    updateDistrictCheckboxes(initialSelectedCities, districtsByCity, pools);
    
    // 필터 이벤트 리스너 설정
    setupFilterListeners(pools, districtsByCity);
    
    // 초기 목록 표시 및 결과 수 업데이트
    renderPoolList(pools);
    updateResultCount(pools.length);
}); 