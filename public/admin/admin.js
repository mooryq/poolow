import { geocodeAddress } from './geocode.js';
import { handleFormSubmit, getSessionsData, getChargeData, getPoolIdFromUrl} from './form.js';

// 로그인 상태 설정
let isAuthenticated = true;

document.addEventListener('DOMContentLoaded', async function() {
  console.log('페이지 로드됨');
  const tablesContainer = document.getElementById('tablesContainer');
  const weekendTablesContainer = document.getElementById('weekendTablesContainer');
  const addTableButton = document.getElementById('addTable');
  const addWeekendTableButton = document.getElementById('addWeekendTable');
  const form = document.getElementById('poolForm');
  const saveButton = document.querySelector('.save-button');
  
  console.log('DOM 요소들:', {
    tablesContainer,
    weekendTablesContainer,
    addTableButton,
    addWeekendTableButton,
    form,
    saveButton
  });

  // 수영장 데이터 로드
  console.log('수영장 데이터 로드 시작');
  await loadPoolData();
  console.log('수영장 데이터 로드 완료');

  // 전체 선택/해제 기능
  document.querySelectorAll('.all-checkbox-input').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const target = this.dataset.target;
      const checkboxes = document.querySelectorAll(`input[name="${target}"]`);
      checkboxes.forEach(cb => cb.checked = this.checked);
    });
  });

  // 개별 체크박스 변경 시 전체 체크박스 상태 업데이트
  document.querySelectorAll('input[name="weekday"], input[name="weekend"]').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const target = this.name;
      const allCheckbox = document.querySelector(`.all-checkbox-input[data-target="${target}"]`);
      const checkboxes = document.querySelectorAll(`input[name="${target}"]`);
      allCheckbox.checked = Array.from(checkboxes).every(cb => cb.checked);
    });
  });
  
  // 삭제 버튼 이벤트 위임
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('delete-row')) {
      e.target.closest('tr').remove();
    }
  });
  
  // 테이블 추가 버튼 클릭 이벤트
  addTableButton.addEventListener('click', function() {
    addNewTable(tablesContainer, false);
  });
  
  addWeekendTableButton.addEventListener('click', function() {
    addNewTable(weekendTablesContainer, true);
  });
  
  // 행 추가 버튼 이벤트 위임
  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('add-row')) {
      addNewRow(e.target.closest('.time-table-wrapper'));
    }
  });
  
  // 각 테이블별 전체/요일 체크박스 연동 함수
  function bindTableDayCheckboxEvents(wrapper) {
    const allCheckbox = wrapper.querySelector('.table-day-checkbox-all');
    const dayCheckboxes = wrapper.querySelectorAll('.table-day-checkbox');
    if (!allCheckbox || dayCheckboxes.length === 0) return;

    // 전체 클릭 시 요일 전체 선택/해제
    allCheckbox.addEventListener('change', function() {
      dayCheckboxes.forEach(cb => {
        cb.checked = allCheckbox.checked;
      });
    });
    // 개별 요일 클릭 시 전체 체크박스 상태 갱신
    dayCheckboxes.forEach(cb => {
      cb.addEventListener('change', function() {
        allCheckbox.checked = Array.from(dayCheckboxes).every(c => c.checked);
      });
    });
  }

  // 테이블 추가 함수 수정: 각 테이블별 요일 체크박스 이벤트 바인딩
  function addNewTable(container, isWeekend = false) {
    const tableWrapper = document.createElement('div');
    tableWrapper.className = 'time-table-wrapper';

    // 요일 체크박스 (테이블별)
    const dayBox = document.createElement('div');
    dayBox.className = 'table-day-checkbox-container';
    const days = isWeekend ? ['토', '일'] : ['월', '화', '수', '목', '금'];
    dayBox.innerHTML = `<label><input type="checkbox" class="table-day-checkbox-all" style="width:22px;height:22px;">전체</label>` +
      days.map(day => `<label><input type="checkbox" class="table-day-checkbox" value="${day}" checked style="width:22px;height:22px;">${day}</label>`).join('');
    tableWrapper.appendChild(dayBox);

    const table = document.createElement('table');
    table.className = 'time-table';
    
    // 테이블 헤더
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>부</th>
        <th>시작시간</th>
        <th>종료시간</th>
        <th>삭제</th>
      </tr>
    `;
    
    // 테이블 바디
    const tbody = document.createElement('tbody');
    for (let i = 1; i <= 3; i++) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${i}부</td>
        <td><input type="time" class="start-time"></td>
        <td><input type="time" class="end-time"></td>
        <td><button type="button" class="delete-row">삭제</button></td>
      `;
      tbody.appendChild(row);
    }
    
    // 행 추가 버튼
    const addRowButton = document.createElement('button');
    addRowButton.type = 'button';
    addRowButton.className = 'add-row';
    addRowButton.textContent = '+ 행 추가';
    
    // 테이블 삭제 버튼
    const deleteTableButton = document.createElement('button');
    deleteTableButton.type = 'button';
    deleteTableButton.className = 'delete-table';
    deleteTableButton.textContent = '테이블 삭제';
    deleteTableButton.addEventListener('click', function() {
      tableWrapper.remove();
    });
    
    // 모든 요소 조립
    table.appendChild(thead);
    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    tableWrapper.appendChild(addRowButton);
    tableWrapper.appendChild(deleteTableButton);
    
    container.appendChild(tableWrapper);

    // 전체/요일 체크박스 이벤트 바인딩
    bindTableDayCheckboxEvents(tableWrapper);
  }
  
  function addNewRow(tableWrapper) {
    const tbody = tableWrapper.querySelector('tbody');
    const newRow = document.createElement('tr');
    
    // 부 셀
    const partCell = document.createElement('td');
    const partSelect = document.createElement('select');
    for (let i = 1; i <= 5; i++) {
      const option = document.createElement('option');
      option.value = `${i}부`;
      option.textContent = `${i}부`;
      partSelect.appendChild(option);
    }
    partCell.appendChild(partSelect);
    
    // 시작시간 셀
    const startTimeCell = document.createElement('td');
    const startTimeInput = document.createElement('input');
    startTimeInput.type = 'time';
    startTimeInput.className = 'start-time';
    startTimeCell.appendChild(startTimeInput);
    
    // 종료시간 셀
    const endTimeCell = document.createElement('td');
    const endTimeInput = document.createElement('input');
    endTimeInput.type = 'time';
    endTimeInput.className = 'end-time';
    endTimeCell.appendChild(endTimeInput);
    
    // 삭제 버튼 셀
    const deleteCell = document.createElement('td');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.textContent = '삭제';
    deleteButton.className = 'delete-row';
    deleteCell.appendChild(deleteButton);
    
    // 모든 셀을 행에 추가
    newRow.appendChild(partCell);
    newRow.appendChild(startTimeCell);
    newRow.appendChild(endTimeCell);
    newRow.appendChild(deleteCell);
    
    // 테이블에 행 추가
    tbody.appendChild(newRow);
  }
  
  // 평일 가격 입력 시 주말 가격 자동 설정
  const weekdayPriceInputs = {
    adult: document.getElementById('weekdayAdultPrice'),
    youth: document.getElementById('weekdayYouthPrice'),
    child: document.getElementById('weekdayChildPrice')
  };
  
  const weekendPriceInputs = {
    adult: document.getElementById('weekendAdultPrice'),
    youth: document.getElementById('weekendYouthPrice'),
    child: document.getElementById('weekendChildPrice')
  };
  
  // 평일 가격 입력 시 주말 가격 자동 설정
  Object.keys(weekdayPriceInputs).forEach(key => {
    weekdayPriceInputs[key].addEventListener('change', function() {
      if (!weekendPriceInputs[key].value) {
        weekendPriceInputs[key].value = this.value;
      }
    });
    
    // 붙여넣기 이벤트 처리
    weekdayPriceInputs[key].addEventListener('paste', function(e) {
      setTimeout(() => {
        if (!weekendPriceInputs[key].value) {
          weekendPriceInputs[key].value = this.value;
        }
      }, 0);
    });
  });
  
  // 폼 제출 시 체크된 요일과 시간표 데이터 수집
  document.getElementById('poolForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const checkedWeekdays = Array.from(document.querySelectorAll('input[name="weekday"]:checked'))
      .map(checkbox => checkbox.value);
    
    const checkedWeekends = Array.from(document.querySelectorAll('input[name="weekend"]:checked'))
      .map(checkbox => checkbox.value);
    
    const weekdayTimeTables = Array.from(tablesContainer.querySelectorAll('.time-table-wrapper')).map(wrapper => {
      const rows = Array.from(wrapper.querySelectorAll('tbody tr')).map(row => {
        const part = row.querySelector('td:first-child').textContent;
        const startTime = row.querySelector('.start-time').value;
        const endTime = row.querySelector('.end-time').value;
        return { part, startTime, endTime };
      });
      return rows;
    });
    
    const weekendTimeTables = Array.from(weekendTablesContainer.querySelectorAll('.time-table-wrapper')).map(wrapper => {
      const rows = Array.from(wrapper.querySelectorAll('tbody tr')).map(row => {
        const part = row.querySelector('td:first-child').textContent;
        const startTime = row.querySelector('.start-time').value;
        const endTime = row.querySelector('.end-time').value;
        return { part, startTime, endTime };
      });
      return rows;
    });
    
    // 가격 정보 수집
    const weekdayPrices = {
      adult: weekdayPriceInputs.adult.value,
      youth: weekdayPriceInputs.youth.value,
      child: weekdayPriceInputs.child.value
    };
    
    const weekendPrices = {
      adult: weekendPriceInputs.adult.value,
      youth: weekendPriceInputs.youth.value,
      child: weekendPriceInputs.child.value
    };
    
    // 여기서 데이터를 서버로 전송하거나 필요한 처리를 수행
    console.log({
      weekdays: checkedWeekdays,
      weekends: checkedWeekends,
      weekdayTimeTables: weekdayTimeTables,
      weekendTimeTables: weekendTimeTables,
      weekdayPrices: weekdayPrices,
      weekendPrices: weekendPrices
    });
  });


  // 저장 버튼 클릭 이벤트
  saveButton.addEventListener('click', async function(e) {
    e.preventDefault();
    
    try {
      // 인증 상태 확인
      if (!isAuthenticated) {
        alert('로그인이 필요합니다. 먼저 로그인해주세요.');
        return;
      }

      // 수영장 이름 필수값 체크
      const name = document.getElementById('name').value.trim();
      if (!name) {
        alert('수영장 이름은 필수 입력값입니다.');
        return;
      }

      // 주소를 위도, 경도로 변환
      const roadAddr = document.getElementById('roadAddr').value.trim();
      const jibunAddr = document.getElementById('jibunAddr').value.trim();
      let coordinates = null;

      // 도로명 주소를 우선적으로 사용하고, 없는 경우 지번 주소를 사용
      if (roadAddr) {
        coordinates = await geocodeAddress(roadAddr);
      } else if (jibunAddr) {
        coordinates = await geocodeAddress(jibunAddr);
      }

      const poolData = {
        name: name,
        addressRoad: roadAddr,
        address: jibunAddr,
        tags: Array.from(document.querySelectorAll('input[name="poolOption"]:checked')).map(cb => cb.value),
        transportation: Array.from(document.querySelectorAll('.transit-form')).map(form => {
          const line = form.querySelector('.line-input').value;
          const station = form.querySelector('.station-input').value;
          const exit = form.querySelector('.exit-input').value;
          const distance = form.querySelector('.distance-input').value;
          if (line && station && exit && distance) {
            return `${line}호선 ${station} ${exit}번 출구에서 ${distance}m`;
          }
          return null;
        }).filter(item => item !== null),
        off_day: document.getElementById('closed').value.trim(),
        website: document.getElementById('website').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        parking: document.getElementById('parkingInfo').value.split('\n').filter(line => line.trim()),
        information: document.getElementById('information').value.split('\n').filter(line => line.trim()),
        sessions: getSessionsData(),
        charge: getChargeData(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 위도, 경도가 있으면 추가
      if (coordinates) {
        poolData.lat = coordinates.lat;
        poolData.lng = coordinates.lng;
      }

      // 로컬 JSON 파일로 저장
      const poolId = getPoolIdFromUrl();
      const url = poolId 
        ? `http://localhost:3001/api/pools/${poolId}`
        : 'http://localhost:3001/api/pools';
      
      const response = await fetch(url, {
        method: poolId ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(poolData)
      });

      if (!response.ok) {
        throw new Error('서버 응답 오류');
      }

      const result = await response.json();
      console.log('저장된 데이터:', result);
      
      alert(`${poolId ? '수정' : '저장'}되었습니다! (ID: ${result.id})`);
      console.log('현재 URL:', window.location.href);
      const newUrl = window.location.origin + '/public/admin/list.html';
      console.log('이동할 URL:', newUrl);
      setTimeout(() => {
        window.location.href = newUrl;
        window.location.reload(true);
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      alert(`저장 중 오류가 발생했습니다: ${error.message}`);
    }
  });

  

  // 수영장 데이터 로드 함수
  async function loadPoolData() {
    const poolId = getPoolIdFromUrl();
    console.log('현재 poolId:', poolId);

    if (!poolId) {
      console.error('수영장 ID가 없습니다.');
      return;
    }

    try {
      console.log('데이터 요청 시작...');
      const response = await fetch('http://localhost:3001/api/pools/' + poolId);
      console.log('서버 응답:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const pool = await response.json();
      console.log('받아온 수영장 데이터:', pool);
      
      if (!pool) {
        console.error('해당 ID의 수영장을 찾을 수 없습니다:', poolId);
        return;
      }

      fillPoolForm(pool);
      console.log('폼 데이터 채우기 완료');
      
    } catch (error) {
      console.error('수영장 데이터 로드 중 오류:', error);
      alert('수영장 데이터를 불러오는데 실패했습니다.');
    }
  }

  // 수영장 데이터를 폼에 표시
  function fillPoolForm(pool) {
    // 기본 정보
    document.getElementById('name').value = pool.name || '';
    document.getElementById('roadAddr').value = pool.addressRoad || '';
    document.getElementById('jibunAddr').value = pool.address || '';
    
    // 수영장 옵션 체크박스 설정
    const poolOptions = pool.tags || [];
    document.querySelectorAll('input[name="poolOption"]').forEach(checkbox => {
        checkbox.checked = poolOptions.includes(checkbox.value);
    });
    
    // 대중교통 정보 설정
    const transitContainer = document.querySelector('.transit-container');
    if (transitContainer && pool.transportation) {
        transitContainer.innerHTML = ''; // 기존 입력 필드 제거
        pool.transportation.forEach((transit, index) => {
            const transitForm = document.createElement('div');
            transitForm.className = 'transit-form';
            transitForm.innerHTML = `
                <div class="transit-input-group">
                    <input type="text" class="line-input" placeholder="호선" value="${transit.split('호선')[0] || ''}">
                    <input type="text" class="station-input" placeholder="지하철역명" value="${transit.split(' ')[1] || ''}">
                    <input type="number" class="exit-input" placeholder="번 출구" value="${transit.match(/(\d+)번/)?.[1] || ''}">
                    <input type="number" class="distance-input" placeholder="m" value="${transit.match(/(\d+)m/)?.[1] || ''}">
                </div>
            `;
            transitContainer.appendChild(transitForm);
        });
    }
    
    // 휴관일
    document.getElementById('closed').value = pool.off_day || '';
    
    // 웹사이트
    document.getElementById('website').value = pool.website || '';
    
    // 전화번호
    document.getElementById('phone').value = pool.phone || '';
    
    // 주차정보
    document.getElementById('parkingInfo').value = pool.parking?.join('\n') || '';
    
    // 추가 정보
    document.getElementById('information').value = pool.information?.join('\n') || '';
    
    // 운영 시간표 설정
    if (pool.sessions) {
      // 평일 시간표
      const tablesContainer = document.getElementById('tablesContainer');
      if (tablesContainer) {
        tablesContainer.innerHTML = '';
        
        // 새로운 데이터 구조 (weekdayTables)가 있으면 사용
        if (pool.weekdayTables && pool.weekdayTables.length > 0) {
          pool.weekdayTables.forEach(tableData => {
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'time-table-wrapper';
            
            // 요일 체크박스
            const dayBox = document.createElement('div');
            dayBox.className = 'table-day-checkbox-container';
            dayBox.innerHTML = `
              <label><input type="checkbox" class="table-day-checkbox-all" style="width:22px;height:22px;">전체</label>
              <label><input type="checkbox" class="table-day-checkbox" value="월" ${tableData.days.includes('월') ? 'checked' : ''} style="width:22px;height:22px;">월</label>
              <label><input type="checkbox" class="table-day-checkbox" value="화" ${tableData.days.includes('화') ? 'checked' : ''} style="width:22px;height:22px;">화</label>
              <label><input type="checkbox" class="table-day-checkbox" value="수" ${tableData.days.includes('수') ? 'checked' : ''} style="width:22px;height:22px;">수</label>
              <label><input type="checkbox" class="table-day-checkbox" value="목" ${tableData.days.includes('목') ? 'checked' : ''} style="width:22px;height:22px;">목</label>
              <label><input type="checkbox" class="table-day-checkbox" value="금" ${tableData.days.includes('금') ? 'checked' : ''} style="width:22px;height:22px;">금</label>
            `;
            tableWrapper.appendChild(dayBox);
            
            // 시간표
            const table = document.createElement('table');
            table.className = 'time-table';
            const thead = document.createElement('thead');
            thead.innerHTML = `
              <tr>
                <th>부</th>
                <th>시작시간</th>
                <th>종료시간</th>
                <th>삭제</th>
              </tr>
            `;
            const tbody = document.createElement('tbody');
            
            tableData.times.forEach((time, index) => {
              const [startTime, endTime] = time.split(' - ');
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${index + 1}부</td>
                <td><input type="time" class="start-time" value="${startTime || ''}"></td>
                <td><input type="time" class="end-time" value="${endTime || ''}"></td>
                <td><button type="button" class="delete-row">삭제</button></td>
              `;
              tbody.appendChild(row);
            });
            
            table.appendChild(thead);
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            
            // 행 추가 버튼
            const addRowButton = document.createElement('button');
            addRowButton.type = 'button';
            addRowButton.className = 'add-row';
            addRowButton.textContent = '+ 행 추가';
            tableWrapper.appendChild(addRowButton);
            
            // 테이블 삭제 버튼
            const deleteTableButton = document.createElement('button');
            deleteTableButton.type = 'button';
            deleteTableButton.className = 'delete-table';
            deleteTableButton.textContent = '테이블 삭제';
            tableWrapper.appendChild(deleteTableButton);
            
            tablesContainer.appendChild(tableWrapper);
          });
        } else {
          // 기존 데이터 구조 (sessions)를 사용하여 테이블 생성
          const weekdaySessions = {
            '월': pool.sessions.monday || [],
            '화': pool.sessions.tuesday || [],
            '수': pool.sessions.wednesday || [],
            '목': pool.sessions.thursday || [],
            '금': pool.sessions.friday || []
          };

          // 각 요일별로 테이블 생성
          Object.entries(weekdaySessions).forEach(([day, sessions]) => {
            if (sessions.length > 0) {
              const tableWrapper = document.createElement('div');
              tableWrapper.className = 'time-table-wrapper';
              
              // 요일 체크박스
              const dayBox = document.createElement('div');
              dayBox.className = 'table-day-checkbox-container';
              dayBox.innerHTML = `
                <label><input type="checkbox" class="table-day-checkbox-all" style="width:22px;height:22px;">전체</label>
                <label><input type="checkbox" class="table-day-checkbox" value="월" ${day === '월' ? 'checked' : ''} style="width:22px;height:22px;">월</label>
                <label><input type="checkbox" class="table-day-checkbox" value="화" ${day === '화' ? 'checked' : ''} style="width:22px;height:22px;">화</label>
                <label><input type="checkbox" class="table-day-checkbox" value="수" ${day === '수' ? 'checked' : ''} style="width:22px;height:22px;">수</label>
                <label><input type="checkbox" class="table-day-checkbox" value="목" ${day === '목' ? 'checked' : ''} style="width:22px;height:22px;">목</label>
                <label><input type="checkbox" class="table-day-checkbox" value="금" ${day === '금' ? 'checked' : ''} style="width:22px;height:22px;">금</label>
              `;
              tableWrapper.appendChild(dayBox);
              
              // 시간표
              const table = document.createElement('table');
              table.className = 'time-table';
              const thead = document.createElement('thead');
              thead.innerHTML = `
                <tr>
                  <th>부</th>
                  <th>시작시간</th>
                  <th>종료시간</th>
                  <th>삭제</th>
                </tr>
              `;
              const tbody = document.createElement('tbody');
              
              sessions.forEach((session, index) => {
                const [startTime, endTime] = session.time.split(' - ');
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${index + 1}부</td>
                  <td><input type="time" class="start-time" value="${startTime || ''}"></td>
                  <td><input type="time" class="end-time" value="${endTime || ''}"></td>
                  <td><button type="button" class="delete-row">삭제</button></td>
                `;
                tbody.appendChild(row);
              });
              
              table.appendChild(thead);
              table.appendChild(tbody);
              tableWrapper.appendChild(table);
              
              // 행 추가 버튼
              const addRowButton = document.createElement('button');
              addRowButton.type = 'button';
              addRowButton.className = 'add-row';
              addRowButton.textContent = '+ 행 추가';
              tableWrapper.appendChild(addRowButton);
              
              // 테이블 삭제 버튼
              const deleteTableButton = document.createElement('button');
              deleteTableButton.type = 'button';
              deleteTableButton.className = 'delete-table';
              deleteTableButton.textContent = '테이블 삭제';
              tableWrapper.appendChild(deleteTableButton);
              
              tablesContainer.appendChild(tableWrapper);
            }
          });
        }
      }
      
      // 주말 시간표
      const weekendTablesContainer = document.getElementById('weekendTablesContainer');
      if (weekendTablesContainer) {
        weekendTablesContainer.innerHTML = '';
        
        // 새로운 데이터 구조 (weekendTables)가 있으면 사용
        if (pool.weekendTables && pool.weekendTables.length > 0) {
          pool.weekendTables.forEach(tableData => {
            const tableWrapper = document.createElement('div');
            tableWrapper.className = 'time-table-wrapper';
            
            // 요일 체크박스
            const dayBox = document.createElement('div');
            dayBox.className = 'table-day-checkbox-container';
            dayBox.innerHTML = `
              <label><input type="checkbox" class="table-day-checkbox-all" style="width:22px;height:22px;">전체</label>
              <label><input type="checkbox" class="table-day-checkbox" value="토" ${tableData.days.includes('토') ? 'checked' : ''} style="width:22px;height:22px;">토</label>
              <label><input type="checkbox" class="table-day-checkbox" value="일" ${tableData.days.includes('일') ? 'checked' : ''} style="width:22px;height:22px;">일</label>
            `;
            tableWrapper.appendChild(dayBox);
            
            // 시간표
            const table = document.createElement('table');
            table.className = 'time-table';
            const thead = document.createElement('thead');
            thead.innerHTML = `
              <tr>
                <th>부</th>
                <th>시작시간</th>
                <th>종료시간</th>
                <th>삭제</th>
              </tr>
            `;
            const tbody = document.createElement('tbody');
            
            tableData.times.forEach((time, index) => {
              const [startTime, endTime] = time.split(' - ');
              const row = document.createElement('tr');
              row.innerHTML = `
                <td>${index + 1}부</td>
                <td><input type="time" class="start-time" value="${startTime || ''}"></td>
                <td><input type="time" class="end-time" value="${endTime || ''}"></td>
                <td><button type="button" class="delete-row">삭제</button></td>
              `;
              tbody.appendChild(row);
            });
            
            table.appendChild(thead);
            table.appendChild(tbody);
            tableWrapper.appendChild(table);
            
            // 행 추가 버튼
            const addRowButton = document.createElement('button');
            addRowButton.type = 'button';
            addRowButton.className = 'add-row';
            addRowButton.textContent = '+ 행 추가';
            tableWrapper.appendChild(addRowButton);
            
            // 테이블 삭제 버튼
            const deleteTableButton = document.createElement('button');
            deleteTableButton.type = 'button';
            deleteTableButton.className = 'delete-table';
            deleteTableButton.textContent = '테이블 삭제';
            tableWrapper.appendChild(deleteTableButton);
            
            weekendTablesContainer.appendChild(tableWrapper);
          });
        } else {
          // 기존 데이터 구조 (sessions)를 사용하여 테이블 생성
          const weekendSessions = {
            '토': pool.sessions.saturday || [],
            '일': pool.sessions.sunday || []
          };

          // 각 요일별로 테이블 생성
          Object.entries(weekendSessions).forEach(([day, sessions]) => {
            if (sessions.length > 0) {
              const tableWrapper = document.createElement('div');
              tableWrapper.className = 'time-table-wrapper';
              
              // 요일 체크박스
              const dayBox = document.createElement('div');
              dayBox.className = 'table-day-checkbox-container';
              dayBox.innerHTML = `
                <label><input type="checkbox" class="table-day-checkbox-all" style="width:22px;height:22px;">전체</label>
                <label><input type="checkbox" class="table-day-checkbox" value="토" ${day === '토' ? 'checked' : ''} style="width:22px;height:22px;">토</label>
                <label><input type="checkbox" class="table-day-checkbox" value="일" ${day === '일' ? 'checked' : ''} style="width:22px;height:22px;">일</label>
              `;
              tableWrapper.appendChild(dayBox);
              
              // 시간표
              const table = document.createElement('table');
              table.className = 'time-table';
              const thead = document.createElement('thead');
              thead.innerHTML = `
                <tr>
                  <th>부</th>
                  <th>시작시간</th>
                  <th>종료시간</th>
                  <th>삭제</th>
                </tr>
              `;
              const tbody = document.createElement('tbody');
              
              sessions.forEach((session, index) => {
                const [startTime, endTime] = session.time.split(' - ');
                const row = document.createElement('tr');
                row.innerHTML = `
                  <td>${index + 1}부</td>
                  <td><input type="time" class="start-time" value="${startTime || ''}"></td>
                  <td><input type="time" class="end-time" value="${endTime || ''}"></td>
                  <td><button type="button" class="delete-row">삭제</button></td>
                `;
                tbody.appendChild(row);
              });
              
              table.appendChild(thead);
              table.appendChild(tbody);
              tableWrapper.appendChild(table);
              
              // 행 추가 버튼
              const addRowButton = document.createElement('button');
              addRowButton.type = 'button';
              addRowButton.className = 'add-row';
              addRowButton.textContent = '+ 행 추가';
              tableWrapper.appendChild(addRowButton);
              
              // 테이블 삭제 버튼
              const deleteTableButton = document.createElement('button');
              deleteTableButton.type = 'button';
              deleteTableButton.className = 'delete-table';
              deleteTableButton.textContent = '테이블 삭제';
              tableWrapper.appendChild(deleteTableButton);
              
              weekendTablesContainer.appendChild(tableWrapper);
            }
          });
        }
      }
    }
    
    // 요금 정보 설정
    if (pool.charge) {
        // 평일 요금
        if (pool.charge.weekday) {
            pool.charge.weekday.forEach(price => {
                const [type, amount] = price.split(': ');
                const inputId = `weekday${type === '성인' ? 'Adult' : type === '청소년' ? 'Youth' : 'Child'}Price`;
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = amount.replace('원', '');
                }
            });
        }
        
        // 주말 요금
        if (pool.charge.weekend) {
            pool.charge.weekend.forEach(price => {
                const [type, amount] = price.split(': ');
                const inputId = `weekend${type === '성인' ? 'Adult' : type === '청소년' ? 'Youth' : 'Child'}Price`;
                const input = document.getElementById(inputId);
                if (input) {
                    input.value = amount.replace('원', '');
                }
            });
        }
    }
  }

  function groupSessionsByTime(sessions) {
    const weekdayGroups = [];
    const weekendGroups = [];
    
    // 평일 시간 그룹화
    const weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    const weekends = ['saturday', 'sunday'];
    
    // 모든 시간대를 수집
    const allTimes = new Set();
    [...weekdays, ...weekends].forEach(day => {
      sessions[day]?.forEach(session => {
        allTimes.add(session.time);
      });
    });
    
    // 각 시간대별로 그룹 생성
    allTimes.forEach(time => {
      const weekdayDays = weekdays.filter(day => 
        sessions[day]?.some(session => session.time === time)
      );
      
      const weekendDays = weekends.filter(day => 
        sessions[day]?.some(session => session.time === time)
      );
      
      if (weekdayDays.length > 0) {
        weekdayGroups.push({
          time,
          days: weekdayDays,
          admission: sessions[weekdayDays[0]]?.find(s => s.time === time)?.admission || ''
        });
      }
      
      if (weekendDays.length > 0) {
        weekendGroups.push({
          time,
          days: weekendDays,
          admission: sessions[weekendDays[0]]?.find(s => s.time === time)?.admission || ''
        });
      }
    });
    
    return {
      weekday: weekdayGroups,
      weekend: weekendGroups
    };
  }

  function createSessionTable(sessions, isWeekend = false) {
    const container = document.createElement('div');
    container.className = 'session-table-container';
    
    const groupedSessions = groupSessionsByTime(sessions);
    const targetSessions = isWeekend ? groupedSessions.weekend : groupedSessions.weekday;
    
    if (targetSessions.length === 0) return container;

    // 평일의 경우, 화목 공통 시간을 별도로 분리
    if (!isWeekend) {
      // 화목 공통 시간 찾기
      const tueThuSessions = targetSessions.filter(session => {
        const hasTue = session.days.includes('tuesday');
        const hasThu = session.days.includes('thursday');
        return hasTue && hasThu && session.days.length === 2;
      });

      // 나머지 시간 찾기
      const otherSessions = targetSessions.filter(session => !tueThuSessions.includes(session));

      // 화목 공통 시간 테이블 생성
      if (tueThuSessions.length > 0) {
        const tueThuTable = createTable(tueThuSessions, '화목');
        container.appendChild(tueThuTable);
      }

      // 나머지 시간 테이블 생성
      if (otherSessions.length > 0) {
        const otherTable = createTable(otherSessions, '평일');
        container.appendChild(otherTable);
      }
    } else {
      // 주말 시간 테이블 생성
      const weekendTable = createTable(targetSessions, '주말');
      container.appendChild(weekendTable);
    }

    return container;
  }

  function createTable(sessions, title) {
    const wrapper = document.createElement('div');
    wrapper.className = 'time-table-wrapper';
    
    // 제목과 체크박스 컨테이너를 포함하는 헤더 div 생성
    const headerDiv = document.createElement('div');
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.marginBottom = '15px';
    
    // 제목 추가
    const titleElement = document.createElement('div');
    titleElement.className = 'title-label';
    titleElement.textContent = title;
    headerDiv.appendChild(titleElement);
    
    // 요일 체크박스는 평일(월~금) 또는 주말(토/일)에 맞게 표시
    const weekdayTitles = ['월', '화', '수', '목', '금'];
    const weekendTitles = ['토', '일'];
    if (weekdayTitles.includes(title)) {
      // 기존 평일 체크박스 코드 유지
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'table-day-checkbox-container';
      const allCheckboxLabel = document.createElement('label');
      const allCheckbox = document.createElement('input');
      allCheckbox.type = 'checkbox';
      allCheckbox.className = 'table-day-checkbox-all';
      allCheckbox.style.width = '22px';
      allCheckbox.style.height = '22px';
      allCheckboxLabel.appendChild(allCheckbox);
      allCheckboxLabel.appendChild(document.createTextNode('전체'));
      checkboxContainer.appendChild(allCheckboxLabel);
      const days = ['월', '화', '수', '목', '금'];
      days.forEach(day => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'table-day-checkbox';
        checkbox.value = day;
        checkbox.style.width = '22px';
        checkbox.style.height = '22px';
        const dayMap = {
          '월': 'monday',
          '화': 'tuesday',
          '수': 'wednesday',
          '목': 'thursday',
          '금': 'friday'
        };
        const isChecked = Array.isArray(sessions) && sessions.some(session => session.days && session.days.includes(dayMap[day]));
        checkbox.checked = isChecked;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(day));
        checkboxContainer.appendChild(label);
      });
      headerDiv.appendChild(checkboxContainer);
    } else if (weekendTitles.includes(title)) {
      // 주말 체크박스: 전체, 토, 일만 표시
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'table-day-checkbox-container';
      // 전체 체크박스
      const allCheckboxLabel = document.createElement('label');
      const allCheckbox = document.createElement('input');
      allCheckbox.type = 'checkbox';
      allCheckbox.className = 'table-day-checkbox-all';
      allCheckbox.style.width = '22px';
      allCheckbox.style.height = '22px';
      allCheckboxLabel.appendChild(allCheckbox);
      allCheckboxLabel.appendChild(document.createTextNode('전체'));
      checkboxContainer.appendChild(allCheckboxLabel);
      // 토, 일 체크박스
      const days = ['토', '일'];
      days.forEach(day => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'table-day-checkbox';
        checkbox.value = day;
        checkbox.style.width = '22px';
        checkbox.style.height = '22px';
        const dayMap = {
          '토': 'saturday',
          '일': 'sunday'
        };
        const isChecked = Array.isArray(sessions) && sessions.some(session => session.days && session.days.includes(dayMap[day]));
        checkbox.checked = isChecked;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(day));
        checkboxContainer.appendChild(label);
      });
      headerDiv.appendChild(checkboxContainer);
      // 전체 체크박스가 토/일을 제어하도록 이벤트 바인딩
      setTimeout(() => {
        const dayCheckboxes = checkboxContainer.querySelectorAll('.table-day-checkbox');
        allCheckbox.addEventListener('change', function() {
          dayCheckboxes.forEach(cb => { cb.checked = allCheckbox.checked; });
        });
        dayCheckboxes.forEach(cb => {
          cb.addEventListener('change', function() {
            allCheckbox.checked = Array.from(dayCheckboxes).every(c => c.checked);
          });
        });
      }, 0);
    }
    wrapper.appendChild(headerDiv);
    
    // 테이블 생성
    const table = document.createElement('table');
    table.className = 'time-table';
    
    // 테이블 헤더
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['부', '시작시간', '종료시간', '삭제'].forEach(text => {
      const th = document.createElement('th');
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 테이블 본문
    const tbody = document.createElement('tbody');
    if (Array.isArray(sessions)) {
      sessions.forEach((session, index) => {
        const row = document.createElement('tr');
        
        // 부
        const partCell = document.createElement('td');
        partCell.textContent = `${index + 1}부`;
        row.appendChild(partCell);
        
        // 시작시간
        const startTimeCell = document.createElement('td');
        const startTimeInput = document.createElement('input');
        startTimeInput.type = 'time';
        startTimeInput.className = 'start-time';
        if (session.time) {
          startTimeInput.value = session.time.split(' - ')[0];
        }
        startTimeCell.appendChild(startTimeInput);
        row.appendChild(startTimeCell);
        
        // 종료시간
        const endTimeCell = document.createElement('td');
        const endTimeInput = document.createElement('input');
        endTimeInput.type = 'time';
        endTimeInput.className = 'end-time';
        if (session.time) {
          endTimeInput.value = session.time.split(' - ')[1];
        }
        endTimeCell.appendChild(endTimeInput);
        row.appendChild(endTimeCell);
        
        // 삭제 버튼
        const deleteCell = document.createElement('td');
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'delete-row';
        deleteButton.textContent = '삭제';
        deleteCell.appendChild(deleteButton);
        row.appendChild(deleteCell);
        
        tbody.appendChild(row);
      });
    }
    table.appendChild(tbody);
    wrapper.appendChild(table);
    
    // 행 추가 버튼
    const addRowButton = document.createElement('button');
    addRowButton.type = 'button';
    addRowButton.className = 'add-row';
    addRowButton.textContent = '+ 행 추가';
    wrapper.appendChild(addRowButton);
    
    // 이벤트 바인딩
    bindTableDayCheckboxEvents(wrapper);
    
    return wrapper;
  }

  // 새로 추가 모드인 경우 폼은 비어있는 상태로 시작

  // 페이지 최초 로드시 기존 테이블에도 이벤트 바인딩 (여기서 바로!)
  document.querySelectorAll('.time-table-wrapper').forEach(wrapper => {
    bindTableDayCheckboxEvents(wrapper);
  });
});