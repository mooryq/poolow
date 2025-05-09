// 폼 제출 및 데이터 수집 관련 함수 모듈
import { geocodeAddress } from './geocode.js';

export async function handleFormSubmit(e, isAuthenticated) {
  e.preventDefault();
  // 인증 상태 확인 (isAuthenticated는 외부에서 전달)
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
  // geocodeAddress 함수를 이용해 주소를 위경도로 변환
  const roadAddr = document.getElementById('roadAddr').value.trim();
  const jibunAddr = document.getElementById('jibunAddr').value.trim();
  let coordinates = null;
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
  alert(`${poolId ? '수정' : '저장'}되었습니다! (ID: ${result.id})`);
  setTimeout(() => {
    window.location.href = window.location.origin + '/public/list.html';
    window.location.reload(true);
  }, 100);
}

export function getSessionsData() {
  const sessions = {
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  };
  // 평일 시간표 처리
  const weekdayTableWrappers = document.getElementById('tablesContainer').querySelectorAll('.time-table-wrapper');
  weekdayTableWrappers.forEach(wrapper => {
    const checkedDays = Array.from(wrapper.querySelectorAll('.table-day-checkbox:checked')).map(cb => cb.value);
    const times = Array.from(wrapper.querySelectorAll('tbody tr')).map(row => {
      const startTime = row.querySelector('.start-time').value;
      const endTime = row.querySelector('.end-time').value;
      return startTime && endTime ? { time: `${startTime} - ${endTime}`, admission: "" } : null;
    }).filter(Boolean);
    checkedDays.forEach(day => {
      const dayKey = {
        '월': 'monday',
        '화': 'tuesday',
        '수': 'wednesday',
        '목': 'thursday',
        '금': 'friday'
      }[day];
      if (dayKey) {
        sessions[dayKey] = [...times].sort((a, b) => {
          const aStart = a.time.split(' - ')[0];
          const bStart = b.time.split(' - ')[0];
          return aStart.localeCompare(bStart);
        });
      }
    });
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
    checkedDays.forEach(day => {
      const dayKey = {
        '토': 'saturday',
        '일': 'sunday'
      }[day];
      if (dayKey) {
        sessions[dayKey] = [...times].sort((a, b) => {
          const aStart = a.time.split(' - ')[0];
          const bStart = b.time.split(' - ')[0];
          return aStart.localeCompare(bStart);
        });
      }
    });
  });
  return sessions;
}

export function getChargeData() {
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

export function getPoolIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
} 