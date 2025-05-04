const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const app = express();
const fetch = require('node-fetch');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const POOLS_FILE = path.join(__dirname, 'public', 'data', 'pools.json');

// 모든 수영장 데이터 가져오기
app.get('/api/pools', async (req, res) => {
    try {
        const data = await fs.readFile(POOLS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.status(500).json({ error: '데이터를 불러오는데 실패했습니다.' });
    }
});

// 특정 수영장 데이터 가져오기
app.get('/api/pools/:id', async (req, res) => {
    try {
        const data = await fs.readFile(POOLS_FILE, 'utf8');
        const pools = JSON.parse(data);
        const pool = pools.find(p => p.id === parseInt(req.params.id));
        
        if (!pool) {
            return res.status(404).json({ error: '수영장을 찾을 수 없습니다.' });
        }
        
        res.json(pool);
    } catch (error) {
        res.status(500).json({ error: '데이터를 불러오는데 실패했습니다.' });
    }
});

// 수영장 데이터 업데이트
app.put('/api/pools/:id', async (req, res) => {
    try {
        const data = await fs.readFile(POOLS_FILE, 'utf8');
        const pools = JSON.parse(data);
        const index = pools.findIndex(p => p.id === parseInt(req.params.id));
        
        if (index === -1) {
            return res.status(404).json({ error: '수영장을 찾을 수 없습니다.' });
        }
        
        // 업데이트 시간 추가
        const updatedPool = {
            ...pools[index],
            ...req.body,
            updatedAt: new Date().toISOString()
        };
        
        pools[index] = updatedPool;
        await fs.writeFile(POOLS_FILE, JSON.stringify(pools, null, 2));
        
        res.json(updatedPool);
    } catch (error) {
        res.status(500).json({ error: '데이터를 업데이트하는데 실패했습니다.' });
    }
});

// 새 수영장 추가
app.post('/api/pools', async (req, res) => {
    try {
        const data = await fs.readFile(POOLS_FILE, 'utf8');
        const pools = JSON.parse(data);
        
        // 새 ID 생성
        const newId = Math.max(...pools.map(p => p.id), 0) + 1;
        
        const newPool = {
            ...req.body,
            id: newId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        pools.push(newPool);
        await fs.writeFile(POOLS_FILE, JSON.stringify(pools, null, 2));
        
        res.status(201).json(newPool);
    } catch (error) {
        res.status(500).json({ error: '데이터를 추가하는데 실패했습니다.' });
    }
});

// 네이버 지오코딩 API 엔드포인트
app.get('/api/geocode', async (req, res) => {
  const { address } = req.query;
  if (!address) {
    return res.status(400).json({ error: '주소가 필요합니다.' });
  }

  const clientId = '2c569m0l5t';
  const clientSecret = 'HRaGggMRrchFAo61argn48Mg00BJC2WH14lKNb1l';
  const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(address)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-NCP-APIGW-API-KEY-ID': clientId,
        'X-NCP-APIGW-API-KEY': clientSecret
      }
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Geocoding 에러:', error);
    res.status(500).json({ error: '주소 변환 중 오류가 발생했습니다.' });
  }
});

const PORT = 3001; // 3000번 포트가 사용 중이므로 3001번으로 변경
app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
}); 