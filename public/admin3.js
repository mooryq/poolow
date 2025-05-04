import { db } from './js/config.js';

// 인증 상태 모니터링
let isAuthenticated = true; // 임시로 true로 설정

// 관리자 권한 확인 함수
async function checkAdminAuth() {
  return true; // 임시로 true 반환
}

// 사용자 권한 확인 함수
async function checkUserPermission() {
  try {
    // 관리자 권한 확인
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

document.addEventListener('DOMContentLoaded', async function() {
  const tablesContainer = document.getElementById('tablesContainer');
  const weekendTablesContainer = document.getElementById('weekendTablesContainer');
  const addTableButton = document.getElementById('addTable');
  const addWeekendTableButton = document.getElementById('addWeekendTable');
  const form = document.getElementById('poolForm');
  const saveButton = document.querySelector('.save-button');
  
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

  // 주소를 위도, 경도로 변환하는 함수
  async function geocodeAddress(address) {
    if (!address) return null;

    try {
      const response = await fetch(`http://localhost:3001/api/geocode?address=${encodeURIComponent(address)}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.addresses && data.addresses.length > 0) {
        const location = data.addresses[0];
        console.log('Geocoding 성공:', location);
        return {
          lat: parseFloat(location.y),
          lng: parseFloat(location.x)
        };
      } else {
        console.error('Geocoding 실패:', data);
        alert('주소를 찾을 수 없습니다.');
        return null;
      }
    } catch (error) {
      console.error('Geocoding 에러:', error);
      alert('주소 변환 중 오류가 발생했습니다. API 키 설정을 확인해주세요.');
      return null;
    }
  }

  // 저장 버튼 클릭 이벤트
  saveButton.addEventListener('click', async function(e) {
    e.preventDefault();
    
    try {
      // 인증 상태 확인
      if (!isAuthenticated) {
        alert('로그인이 필요합니다. 먼저 로그인해주세요.');
        return;
      }

      // 사용자 권한 확인
      const hasPermission = await checkUserPermission();
      if (!hasPermission) {
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

      const sessionsData = getSessionsData();
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
        sessions: sessionsData.sessions,
        weekdayTables: sessionsData.weekdayTables,
        weekendTables: sessionsData.weekendTables,
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
      const newUrl = window.location.origin + '/public/list.html';
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

  // getSessionsData 함수 수정: 각 테이블별로 체크된 요일과 시간 정보를 저장
  function getSessionsData() {
    const sessions = {};
    const weekdayTables = [];
    const weekendTables = [];
    
    // 평일 시간표 처리
    const weekdayTableWrappers = document.getElementById('tablesContainer').querySelectorAll('.time-table-wrapper');
    weekdayTableWrappers.forEach(wrapper => {
      const checkedDays = Array.from(wrapper.querySelectorAll('.table-day-checkbox:checked')).map(cb => cb.value);
      const times = Array.from(wrapper.querySelectorAll('tbody tr')).map(row => {
        const startTime = row.querySelector('.start-time').value;
        const endTime = row.querySelector('.end-time').value;
        return startTime && endTime ? { time: `${startTime} - ${endTime}`, admission: "" } : null;
      }).filter(Boolean);

      // 각 체크된 요일에 대해 시간표 데이터 설정
      checkedDays.forEach(day => {
        const dayKey = {
          '월': 'monday', '화': 'tuesday', '수': 'wednesday', '목': 'thursday', '금': 'friday'
        }[day];
        if (dayKey) {
          if (!sessions[dayKey]) {
            sessions[dayKey] = [];
          }
          sessions[dayKey] = [...sessions[dayKey], ...times];
        }
      });

      // 테이블 정보 저장
      if (checkedDays.length > 0 && times.length > 0) {
        weekdayTables.push({
          days: checkedDays,
          times: times.map(t => t.time)
        });
      }
    });

    // 주말 시간표 처리
    const weekendTableWrappers = document.getElementById('weekendTablesContainer').querySelectorAll('.time-table-wrapper');
    weekendTableWrappers.forEach(wrapper => {
      const checkedDays = Array.from(wrapper.querySelectorAll('.table-day-checkbox:checked')).map(cb => cb.value);
      const times = Array.from(wrapper.querySelectorAll('tbody tr')).map(row => {
        const startTime = row.querySelector('.start-time').value;
        const endTime = row.querySelector('.end-time').value;
        return startTime && endTime ? { time: `${startTime} - ${endTime}`, admission: "" } : null;
      }).filter(Boolean);

      // 각 체크된 요일에 대해 시간표 데이터 설정
      checkedDays.forEach(day => {
        const dayKey = {
          '토': 'saturday', '일': 'sunday'
        }[day];
        if (dayKey) {
          if (!sessions[dayKey]) {
            sessions[dayKey] = [];
          }
          sessions[dayKey] = [...sessions[dayKey], ...times];
        }
      });

      // 테이블 정보 저장
      if (checkedDays.length > 0 && times.length > 0) {
        weekendTables.push({
          days: checkedDays,
          times: times.map(t => t.time)
        });
      }
    });

    // 체크 안된 요일은 빈 배열로 초기화
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach(day => {
      if (!sessions[day]) sessions[day] = [];
    });

    return {
      sessions,
      weekdayTables,
      weekendTables
    };
  }

  // 요금 데이터 수집 함수
  function getChargeData() {
    const weekdayPrices = [];
    const weekendPrices = [];
    const memberWeekdayPrices = [];
    const memberWeekendPrices = [];

    // 평일 요금
    const weekdayAdultPrice = document.getElementById('weekdayAdultPrice').value;
    const weekdayYouthPrice = document.getElementById('weekdayYouthPrice').value;
    const weekdayChildPrice = document.getElementById('weekdayChildPrice').value;

    if (weekdayAdultPrice) weekdayPrices.push(`성인: ${weekdayAdultPrice}원`);
    if (weekdayYouthPrice) weekdayPrices.push(`청소년: ${weekdayYouthPrice}원`);
    if (weekdayChildPrice) weekdayPrices.push(`어린이: ${weekdayChildPrice}원`);

    // 주말 요금
    const weekendAdultPrice = document.getElementById('weekendAdultPrice').value;
    const weekendYouthPrice = document.getElementById('weekendYouthPrice').value;
    const weekendChildPrice = document.getElementById('weekendChildPrice').value;

    if (weekendAdultPrice) weekendPrices.push(`성인: ${weekendAdultPrice}원`);
    if (weekendYouthPrice) weekendPrices.push(`청소년: ${weekendYouthPrice}원`);
    if (weekendChildPrice) weekendPrices.push(`어린이: ${weekendChildPrice}원`);

    // 평일 회원 요금
    const memberWeekdayAdultPrice = document.getElementById('memberWeekdayAdultPrice')?.value;
    const memberWeekdayYouthPrice = document.getElementById('memberWeekdayYouthPrice')?.value;
    const memberWeekdayChildPrice = document.getElementById('memberWeekdayChildPrice')?.value;

    if (memberWeekdayAdultPrice) memberWeekdayPrices.push(`성인: ${memberWeekdayAdultPrice}원`);
    if (memberWeekdayYouthPrice) memberWeekdayPrices.push(`청소년: ${memberWeekdayYouthPrice}원`);
    if (memberWeekdayChildPrice) memberWeekdayPrices.push(`어린이: ${memberWeekdayChildPrice}원`);

    // 주말 회원 요금
    const memberWeekendAdultPrice = document.getElementById('memberWeekendAdultPrice')?.value;
    const memberWeekendYouthPrice = document.getElementById('memberWeekendYouthPrice')?.value;
    const memberWeekendChildPrice = document.getElementById('memberWeekendChildPrice')?.value;

    if (memberWeekendAdultPrice) memberWeekendPrices.push(`성인: ${memberWeekendAdultPrice}원`);
    if (memberWeekendYouthPrice) memberWeekendPrices.push(`청소년: ${memberWeekendYouthPrice}원`);
    if (memberWeekendChildPrice) memberWeekendPrices.push(`어린이: ${memberWeekendChildPrice}원`);

    return {
      weekday: weekdayPrices,
      weekend: weekendPrices,
      "member-weekday": memberWeekdayPrices,
      "member-weekend": memberWeekendPrices
    };
  }

  // URL에서 ID 가져오기
    const urlParams = new URLSearchParams(window.location.search);
  const poolId = urlParams.get('id');

  // 수영장 정보 불러오기
  async function loadPoolData() {
    try {
      const response = await fetch('/pools.json');
      const pools = await response.json();
      const poolData = pools.find(pool => pool.id === poolId);

      if (poolData) {
        // 기본 정보 설정
        document.getElementById('poolName').value = poolData.name || '';
        document.getElementById('addressRoad').value = poolData.addressRoad || '';
        document.getElementById('address').value = poolData.address || '';
        document.getElementById('transportation').value = poolData.transportation || '';
        document.getElementById('website').value = poolData.website || '';
        document.getElementById('phone').value = poolData.phone || '';
        document.getElementById('parking').value = poolData.parking || '';
        document.getElementById('information').value = poolData.information || '';
        document.getElementById('closed').value = poolData.closed || '';

        // 수영장 옵션 설정
        const poolOptions = poolData.options || [];
    document.querySelectorAll('input[name="poolOption"]').forEach(checkbox => {
        checkbox.checked = poolOptions.includes(checkbox.value);
    });
    
        // 평일 시간표 설정
        if (poolData.weekdaySchedule) {
          setupTimeTable('tablesContainer', poolData.weekdaySchedule);
        }

        // 주말 시간표 설정
        if (poolData.weekendSchedule) {
          setupTimeTable('weekendTablesContainer', poolData.weekendSchedule);
        }

        // 평일 가격 설정
        if (poolData.weekdayPrices) {
          document.getElementById('weekdayAdultPrice').value = poolData.weekdayPrices.adult || '';
          document.getElementById('weekdayYouthPrice').value = poolData.weekdayPrices.youth || '';
          document.getElementById('weekdayChildPrice').value = poolData.weekdayPrices.child || '';
          document.getElementById('weekdayMemberAdultPrice').value = poolData.weekdayPrices.memberAdult || '';
          document.getElementById('weekdayMemberYouthPrice').value = poolData.weekdayPrices.memberYouth || '';
          document.getElementById('weekdayMemberChildPrice').value = poolData.weekdayPrices.memberChild || '';
        }

        // 주말 가격 설정
        if (poolData.weekendPrices) {
          document.getElementById('weekendAdultPrice').value = poolData.weekendPrices.adult || '';
          document.getElementById('weekendYouthPrice').value = poolData.weekendPrices.youth || '';
          document.getElementById('weekendChildPrice').value = poolData.weekendPrices.child || '';
          document.getElementById('weekendMemberAdultPrice').value = poolData.weekendPrices.memberAdult || '';
          document.getElementById('weekendMemberYouthPrice').value = poolData.weekendPrices.memberYouth || '';
          document.getElementById('weekendMemberChildPrice').value = poolData.weekendPrices.memberChild || '';
        }
      } else {
        console.error('수영장 정보를 찾을 수 없습니다.');
      }
    } catch (error) {
      console.error('수영장 정보를 불러오는 중 오류가 발생했습니다:', error);
    }
  }

  // 시간표 설정 함수
  function setupTimeTable(containerId, scheduleData) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    scheduleData.forEach((schedule, index) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'time-table-wrapper';
      
      // 요일 체크박스 설정
      const checkboxContainer = document.createElement('div');
      checkboxContainer.className = 'table-day-checkbox-container';
      
      const allCheckbox = document.createElement('label');
      allCheckbox.innerHTML = '<input type="checkbox" class="table-day-checkbox-all" style="width:22px;height:22px;">전체';
      checkboxContainer.appendChild(allCheckbox);

      ['월', '화', '수', '목', '금', '토', '일'].forEach(day => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'table-day-checkbox';
        checkbox.value = day;
        checkbox.checked = schedule.days.includes(day);
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(day));
        checkboxContainer.appendChild(label);
      });

      wrapper.appendChild(checkboxContainer);

      // 시간표 설정
              const table = document.createElement('table');
              table.className = 'time-table';
      table.innerHTML = `
        <thead>
                <tr>
                  <th>부</th>
                  <th>시작시간</th>
                  <th>종료시간</th>
                  <th>삭제</th>
                </tr>
        </thead>
        <tbody>
        </tbody>
      `;

      const tbody = table.querySelector('tbody');
      schedule.times.forEach((time, timeIndex) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${timeIndex + 1}부</td>
          <td><input type="time" class="start-time" value="${time.start}"></td>
          <td><input type="time" class="end-time" value="${time.end}"></td>
                  <td><button type="button" class="delete-row">삭제</button></td>
                `;
        tbody.appendChild(tr);
      });

      wrapper.appendChild(table);
      wrapper.appendChild(createAddRowButton());
      container.appendChild(wrapper);
    });
  }

  // 행 추가 버튼 생성 함수
  function createAddRowButton() {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'add-row';
    button.textContent = '+ 행 추가';
    return button;
  }

  // 페이지 로드 시 데이터 불러오기
  document.addEventListener('DOMContentLoaded', () => {
  if (poolId) {
      loadPoolData();
    } else {
      console.error('수영장 ID가 제공되지 않았습니다.');
    }
  });
});