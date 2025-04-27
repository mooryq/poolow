const currentHost = window.location.origin;
const isProduction = currentHost.includes('vercel.app') || currentHost.includes('poolow.net');

export const naverConfig = {
    clientId: "Fhq__Qo4pzeZka3tYTHt",
    callbackUrl: isProduction 
    ? `https://poolow.net/naver-callback.html` 
    : `${currentHost}/public/naver-callback.html`,
    isPopup: true,
    // loginButton: { color: "green", type: 3, height: 40 },
};