const currentHost = window.location.origin;

export const naverConfig = {
    clientId: "Fhq__Qo4pzeZka3tYTHt",
    callbackUrl: isProduction 
    ? `${currentHost}/naver-callback.html` 
    : `${currentHost}/public/naver-callback.html`,
    isPopup: false,
    // loginButton: { color: "green", type: 3, height: 40 },
};