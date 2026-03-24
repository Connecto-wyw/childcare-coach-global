const fs = require('fs');
const path = require('path');

const koreanSummaries = {
  estj: "리더십이 강하고, 해야 할 일은 척척 해내는 편이에요.",
  estp: "에너지가 넘치고, 몸으로 부딪치며 배우는 걸 좋아해요.",
  esfj: "다정하고 사교적이며, 주변 분위기를 잘 살펴요.",
  esfp: "활발하고 긍정적이며, 모두를 즐겁게 만드는 아이예요.",
  entj: "스스로 목표를 세우고 성취하려는 추진력이 강해요.",
  entp: "아이디어가 넘치고, 궁금한 건 꼭 직접 해봐야 직성이 풀려요.",
  enfj: "사람을 잘 챙기고, 모두가 잘 지내길 바라는 아이예요.",
  enfp: "마음이 따뜻하고, 새로운 것에 대한 호기심이 넘쳐요.",
  istj: "책임감이 강하고, 규칙과 질서를 잘 지키는 아이예요.",
  istp: "겉으론 조용하지만 속으로는 논리적인 생각이 많아요.",
  isfj: "말보다 행동으로 따뜻함을 전하는 배려심 깊은 아이예요.",
  isfp: "감각이 예민하고, 조용히 자신만의 아름다움을 표현해요.",
  intj: "또래보다 생각이 깊고, 인정받기보단 스스로 만족하려 해요.",
  intp: "호기심이 많고, 자기만의 방식으로 세상을 탐구해요.",
  infj: "상상력이 풍부하고, 타인의 감정에 예민하게 반응해요.",
  infp: "감정이 풍부하면서도 조용히 주변을 깊이 살펴봐요."
};

const filePath = path.join('src', 'i18n', 'messages', 'ko', 'kyk.json');
if (fs.existsSync(filePath)) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  Object.keys(koreanSummaries).forEach(mbti => {
    const newSummaryLine1 = koreanSummaries[mbti];
    const oldSummary = data.computed[`summary_${mbti}`];
    
    if (oldSummary) {
      const parts = oldSummary.split('\n');
      parts[0] = newSummaryLine1;
      data.computed[`summary_${mbti}`] = parts.join('\n');
    } else {
      data.computed[`summary_${mbti}`] = newSummaryLine1;
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log("Updated ko/kyk.json successfully.");
} else {
  console.log("ko/kyk.json not found.");
}
