

/**
 * URL 쿼리에서 poolId를 가져오고, JSON에서 해당 pool 데이터를 반환
 * @returns {Promise<Object|null>} poolData 또는 null
 */


let _rawPool = null;

export async function fetchPoolData() {
    const params = new URLSearchParams(window.location.search);
    const poolId = params.get("poolId");
  
    if (!poolId) {
      console.error("❌ Pool ID가 URL에 없음");
      return null;
    }
  
    try {
      const res = await fetch("/public/data/pools.json");
      const pools = await res.json();
      const pool = pools.find((p) => String(p.id) === poolId);
  
      if (!pool) {
        console.error("❌ 해당 Pool ID에 맞는 수영장 정보 없음");
        return null;
      }
  
      _rawPool = pool;
      
      
      
    return {
        id: String(pool.id),
        name: pool.name,
        address: pool.address,
        tags: pool.tags,
        lat: pool.lat,
        lng: pool.lng,
    };

    } catch (e) {
        console.error("🔥 poolData 로딩 실패:", e);
        return null;
    }
    }

    export function getRawPool() {
    return _rawPool;
    }
