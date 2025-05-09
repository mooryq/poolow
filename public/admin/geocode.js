// 주소를 위도, 경도로 변환하는 함수
export async function geocodeAddress(address) {
  if (!address) return null;
  try {
    const response = await fetch(`http://localhost:3001/api/geocode?address=${encodeURIComponent(address)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.addresses && data.addresses.length > 0) {
      const location = data.addresses[0];
      return {
        lat: parseFloat(location.y),
        lng: parseFloat(location.x)
      };
    } else {
      alert('주소를 찾을 수 없습니다.');
      return null;
    }
  } catch (error) {
    alert('주소 변환 중 오류가 발생했습니다. API 키 설정을 확인해주세요.');
    return null;
  }
} 