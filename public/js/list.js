let poolData = []; // 전체 데이터를 저장할 변수
let selectedSchedule ="weekend"; //초기값: 주말/공휴일

document.addEventListener("DOMContentLoaded", () => {
    fetch("data/pools.json")  // JSON 데이터 불러오기
        .then(response => response.json())
        .then(data => {
            poolData = data;  // 데이터를 전역 변수에 저장
            displayPools(poolData);  // 초기 리스트 표시
        })
        .catch(error => console.error("데이터 불러오기 오류:", error));
});

// 리스트 출력 함수
function displayPools(data) {
    const listContainer = document.getElementById("list-container");
    listContainer.innerHTML = "";  // 기존 리스트 초기화

    data.forEach(pool => {
        const poolDiv = document.createElement("div");
        poolDiv.classList.add("list-pool");

        poolDiv.innerHTML = `
            <div class="short-address">${pool.address}</div>
            <div class="title-group">
                <div class="pool-title">${pool.name}</div>
                ${pool.tags.map(tag => `<div class="tag-mini">${tag}</div>`).join('')}
                <div class="fav-icon"><i class="fa-regular fa-heart"></i></div>
            </div>
            <div class="off-noti">${pool.off_day}</div>
            <div class="time-table">
                ${pool.sessions[selectedSchedule].map(session => `
                    <div class="session">
                        <span class="session-num">${session.num}</span>
                        <span class="session-time">${session.time}</span>
                    </div>
                `).join('')}
            </div>
        `;

        listContainer.appendChild(poolDiv);
    });

    console.log(`리스트 출력 완료 ✅ (${selectedSchedule})`);

}

// 🔍 검색 기능 추가
function searchPools() {
    const searchInput = document.getElementById("searchInput").value.toLowerCase(); // 입력값 소문자로 변환
    const filteredPools = poolData.filter(pool =>
        pool.name.toLowerCase().includes(searchInput) || // 수영장 이름 검색
        pool.address.toLowerCase().includes(searchInput) || // 주소 검색
        pool.tags.some(tag => tag.toLowerCase().includes(searchInput)) // 태그 검색
    );

    displayPools(filteredPools); // 검색된 결과만 표시
}
// 🔄 주말/공휴일 & 평일 필터 버튼 클릭 이벤트 추가 + CSS 변경
document.querySelectorAll(".schedule-filter").forEach(button => {
    button.addEventListener("click", (event) => {
        const newSchedule = event.target.dataset.schedule;
        
        if (!["weekend", "weekday"].includes(newSchedule)) {
            console.error(`❌ 잘못된 schedule 값: ${newSchedule}`);
            return;
        }

        selectedSchedule = newSchedule;
        displayPools(poolData);

        // ✅ 모든 버튼에서 `.active` 클래스 제거 후, 클릭된 버튼에 추가
        document.querySelectorAll(".schedule-filter").forEach(btn => btn.classList.remove("active"));
        event.target.classList.add("active");
    });
});
