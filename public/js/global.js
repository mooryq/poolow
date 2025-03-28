
// ✅ 핸드폰에서 확대 방지
document.addEventListener("gesturestart", function (event) {
    event.preventDefault();
});


function updateHeaderHeight() {
    const header = document.querySelector('header');
    document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
}
window.addEventListener('resize', updateHeaderHeight);
updateHeaderHeight();

// 토스트 ~.~
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.textContent = message;
  
    document.body.appendChild(toast);
  
    // 잠깐 있다가 사라짐
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);
  
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 900);
  }
