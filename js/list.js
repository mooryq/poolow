
   document.addEventListener("DOMContentLoaded", () => {
    fetch("data/pools.json") // JSON 데이터 불러오기
        .then(response => response.json())
        .then(data => {
            poolData = data;  // 데이터 저장
            displayPools(poolData);  // 초기 리스트 표시
        })
        .catch(error => console.error("데이터 불러오기 오류:", error));
});

// 리스트 출력 함수
function displayPools(data) {
    const listContainer = document.getElementById("list-container");
    listContainer.innerHTML = "";  // 기존 내용 초기화

    data.forEach(pool => {
        const poolDiv = document.createElement("div");
        poolDiv.classList.add("list-pool");

        poolDiv.innerHTML = `
            <h3>${pool.name}</h3>
            <p>주소: ${pool.address}</p>
            <p>태그: ${pool.tags.join(", ")}</p>
            <p>휴관일: ${pool.off_day}</p>
            <div class="time-table">
                ${pool.sessions.map(session => `
                    <div class="session">
                        <span class="session-num">${session.num}</span>
                        <span class="session-time">${session.time}</span>
                    </div>
                `).join('')}
            </div>
        `;

        listContainer.appendChild(poolDiv);
    });
}

// 검색 기능 함수
function searchPools() {
    const searchInput = document.getElementById("searchInput").value.toLowerCase(); // 입력값 소문자로 변환
    const filteredPools = poolData.filter(pool =>
        pool.name.toLowerCase().includes(searchInput) // 이름에서 검색어 포함 여부 확인
    );

    displayPools(filteredPools); // 검색된 결과만 표시
}

//
document.addEventListener("DOMContentLoaded", () => {
    console.log("HTML 로드 완료");  // 디버깅 로그

    const listContainer = document.getElementById("list-container");
    console.log("list-container 확인:", listContainer); // 요소 확인

    if (!listContainer) {
        console.error("list-container 요소를 찾을 수 없음!");
        return;
    }

    fetch("data/pools.json")
        .then(response => response.json())
        .then(data => {
            poolData = data;
            displayPools(poolData);
        })
        .catch(error => console.error("데이터 불러오기 오류:", error));
});
