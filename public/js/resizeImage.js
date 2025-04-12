import { ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-storage.js";
import { storage } from './firebase.js';

// 이미지 리사이징 함수
export async function resizeImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // 이미지가 너무 큰 경우 리사이징
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1080;
                
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
                if (height > MAX_HEIGHT) {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // 품질 조정을 통한 파일 크기 최적화
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, file.type, 0.7); // 0.7은 품질 설정 (0-1 사이 값)
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

// 리뷰 이미지 업로드 함수
export async function uploadReviewImages(files, poolId, userId) {
    if (!files || files.length === 0) return [];
    
    const imageUrls = [];
    const maxSize = 5 * 1024 * 1024; // 5MB
    const totalMaxSize = 25 * 1024 * 1024; // 25MB
    
    // 전체 파일 크기 계산
    let totalSize = 0;
    for (const file of files) {
        totalSize += file.size;
    }
    
    // 전체 크기가 25MB를 초과하는 경우
    if (totalSize > totalMaxSize) {
        throw new Error("전체 이미지 크기가 25MB를 초과합니다.");
    }
    
    for (const file of files) {
        try {
            let fileToUpload = file;
            
            // 개별 파일 크기가 5MB를 초과하는 경우 리사이징
            if (file.size > maxSize) {
                fileToUpload = await resizeImage(file);
                
                // 리사이징 후에도 5MB를 초과하는 경우
                if (fileToUpload.size > maxSize) {
                    throw new Error(`이미지 ${file.name}의 크기를 5MB 이하로 줄일 수 없습니다.`);
                }
            }
            
            const storageRef = ref(storage, `pools/${poolId}/reviews/${userId}/${Date.now()}_${file.name}`);
            await uploadBytes(storageRef, fileToUpload);
            const url = await getDownloadURL(storageRef);
            imageUrls.push(url);
        } catch (error) {
            console.error("이미지 업로드 실패:", error);
            throw error; // 에러를 상위로 전파하여 사용자에게 알림
        }
    }
    
    return imageUrls;
}