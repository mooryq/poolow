const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.createNaverToken = functions
  .region('asia-northeast3')
  .https.onRequest((req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === "OPTIONS") {
    return res.status(204).send('');
  }

  cors(req, res, async () => {
    try {
      console.log('▶ HTTP 요청 수신:', JSON.stringify(req.body));
      const accessToken = req.body.accessToken;

      // accessToken이 "토큰.만료시간" 형태라면, 앞부분만 사용
      const pureToken = accessToken.includes('.') ? accessToken.split('.')[0] : accessToken;

      if (!pureToken) {
        console.error('❌ accessToken이 없습니다.');
        return res.status(400).send({ error: 'accessToken이 필요합니다.' });
      }

      const resp = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${pureToken}` }
      });

      const naverUid = resp.data.response.id;
      if (!naverUid) {
        console.error('❌ 네이버 UID를 가져오지 못했습니다.');
        return res.status(500).send({ error: '네이버 UID를 가져오지 못했습니다.' });
      }

      res.set('Access-Control-Allow-Origin', '*'); // 본 응답에도 다시 설정
      const customToken = await admin.auth().createCustomToken(naverUid);
      return res.status(200).send({ customToken });
    } catch (error) {
      console.error('❌ 함수 전체 오류:', error);
      return res.status(500).send({ error: error.message });
    }
  });
});
