// ✅ 핸드폰에서 확대 방지
document.addEventListener("gesturestart", function (event) {
    event.preventDefault();
});

