// api/gemini-counseling.js
// 보안 점검용 주석:
// 1. 프론트엔드에 API 키를 넣으면 개발자 도구에서 노출될 수 있다.
// 2. Gemini API 호출은 Vercel Serverless Function에서 처리한다.
// 3. .env 파일은 GitHub에 올리지 않는다.
// 4. Vercel 배포 시에는 Project Settings의 Environment Variables에 GEMINI_API_KEY를 등록해야 한다.
// 5. Gemini로 전송하는 데이터는 이름, 학번, 사진 경로를 제외한 최소 정보로 제한한다.

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { studentAlias, gradeSummary, learningTraits, teacherConcern } = req.body;

  if (!studentAlias || !gradeSummary || !learningTraits || !teacherConcern) {
    return res.status(400).json({ success: false, error: '필수 요청 본문 필드가 누락되었습니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다.' });
  }

  const prompt = `
이 학생은 ${studentAlias}입니다.
이 학생의 성적 정보는 다음과 같습니다:
${gradeSummary}

이 학생의 학습 특성 정보는 다음과 같습니다:
${learningTraits}

교사의 상담 고민:
${teacherConcern}

위 정보를 바탕으로 교사를 돕기 위한 상담 전략을 제안해 주세요.
상담 전략은 반드시 다음 형식을 갖춘 마크다운 또는 텍스트 형태로 제공해 주세요:

1. 현재 상황 요약
2. 학생 데이터 기반 해석
3. 상담 접근 전략
4. 교사가 던질 수 있는 질문 3개
5. 피해야 할 말 또는 주의점
6. 다음 수업에서 해볼 수 있는 작은 지원

※ 중요 원칙:
- 학생을 단정적으로 판단하거나 진단하지 마세요. ("의지가 부족하다", "주의력 문제가 있다", "심리적 문제가 있다"와 같은 단정 지표나 표현 금지)
- 교사가 학생을 따뜻하게 이해하고 긍정적인 대화를 시작할 수 있게 돕는 방향으로 서술하세요.
- 이 분석 및 제안은 참고용이며, 최종 판단과 판단의 주체는 교사 본인이라는 뉘앙스를 명시해주세요.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ success: false, error: `Gemini API 호출 실패: ${errorText}` });
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '답변을 생성하지 못했습니다.';
    return res.status(200).json({ success: true, result: resultText });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
