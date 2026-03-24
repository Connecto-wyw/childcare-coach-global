const fs = require('fs');
const path = require('path');

const q1Map = {
  1: { en: "Calm", id: "Tenang", ms: "Tenang", th: "ใจเย็น" },
  2: { en: "Clever", id: "Cerdas", ms: "Pintar", th: "ฉลาด" },
  3: { en: "Adaptable", id: "Mudah beradaptasi", ms: "Mudah menyesuaikan diri", th: "ปรับตัวเก่ง" },
  4: { en: "Imaginative", id: "Imajinatif", ms: "Berimaginasi", th: "ช่างจินตนาการ" },
  5: { en: "Detail-oriented", id: "Berorientasi detail", ms: "Berorientasikan butiran", th: "ใส่ใจรายละเอียด" },
  6: { en: "Observant", id: "Jeli", ms: "Peka", th: "ช่างสังเกต" },
  7: { en: "Articulate", id: "Pandai bicara", ms: "Pandai berkata-kata", th: "พูดจาฉะฉาน" },
  8: { en: "Resourceful", id: "Cerdik", ms: "Panjang akal", th: "มีไหวพริบ" },
  9: { en: "Well-spoken", id: "Fasih", ms: "Fasih berbicara", th: "พูดจาดี" },
  10: { en: "Mature", id: "Dewasa", ms: "Matang", th: "เป็นผู้ใหญ่" },
  11: { en: "Sociable", id: "Mudah bergaul", ms: "Peramah", th: "เข้าสังคมเก่ง" },
  12: { en: "Energetic", id: "Penuh energi", ms: "Bertenaga", th: "กระตือรือร้น" },
  13: { en: "Fearless", id: "Pemberani", ms: "Berani", th: "ไม่เกรงกลัว" },
  14: { en: "Cheerful", id: "Ceria", ms: "Ceria", th: "ร่าเริง" },
  15: { en: "Super Positive", id: "Sangat Positif", ms: "Sangat Positif", th: "คิดบวกสุดๆ" },
  16: { en: "Curious", id: "Penuh rasa ingin tahu", ms: "Penuh sifat ingin tahu", th: "ขี้สงสัยอยากรู้" },
  17: { en: "Kind-hearted", id: "Baik hati", ms: "Baik hati", th: "จิตใจดี" },
  18: { en: "Dependable", id: "Dapat diandalkan", ms: "Boleh diharapkan", th: "พึ่งพาได้" },
  19: { en: "Assertive", id: "Tegas", ms: "Tegas", th: "กล้าแสดงออก" },
  20: { en: "Hands-on learner", id: "Pembelajar praktik", ms: "Pelajar praktikal", th: "เรียนรู้จากการลงมือทำ" },
  21: { en: "Trustworthy", id: "Dapat dipercaya", ms: "Boleh dipercayai", th: "น่าเชื่อถือ" },
  22: { en: "Persistent", id: "Gigih", ms: "Gigih", th: "มุ่งมั่นตั้งใจ" },
  23: { en: "Distinctive", id: "Khas", ms: "Tersendiri", th: "มีเอกลักษณ์" },
  24: { en: "Highly Focused", id: "Sangat Fokus", ms: "Sangat Fokus", th: "มีสมาธิสูง" },
  25: { en: "Thoughtful", id: "Penuh pertimbangan", ms: "Bertimbang rasa", th: "ช่างคิดช่างตริตรอง" }
};

const langs = ['en', 'id', 'ms', 'th']; // we don't change ko as it is correct in the codebase already. Let me verify later if needed, but it should be correct as it maps exactly right.

langs.forEach(lang => {
  const filePath = path.join('src', 'i18n', 'messages', lang, 'kyk.json');
  if (!fs.existsSync(filePath)) return;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  if (!data.adjectives) {
    data.adjectives = {};
  }

  Object.keys(q1Map).forEach(keyNum => {
    const d = q1Map[keyNum][lang];
    if (d) {
      data.adjectives[`adj_${keyNum}`] = d;
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});
