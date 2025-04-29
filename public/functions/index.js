const functions = require('firebase-functions');
const admin = require('firebase-admin');
const axios = require('axios');
const cors = require('cors')({ origin: true });

admin.initializeApp();

exports.createNaverToken = functions.https.onRequest((req, res) => {
  cors(req, res, async () => { // CORS 미들웨어 안에서 실행
    try {
      console.log('▶ HTTP 요청 수신:', JSON.stringify(req.body));
      const accessToken = req.body.accessToken;

      if (!accessToken) {
        console.error('❌ accessToken이 없습니다.');
        return res.status(400).send({ error: 'accessToken이 필요합니다.' });
      }

      const resp = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const naverUid = resp.data.response.id;
      if (!naverUid) {
        console.error('❌ 네이버 UID를 가져오지 못했습니다.');
        return res.status(500).send({ error: '네이버 UID를 가져오지 못했습니다.' });
      }

      const customToken = await admin.auth().createCustomToken(naverUid);
      res.status(200).send({ customToken });
    } catch (error) {
      console.error('❌ 함수 전체 오류:', error);
      res.status(500).send({ error: error.message });
    }
  });
});
