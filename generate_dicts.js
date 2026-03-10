const fs = require('fs');
const path = require('path');

const dicts = {
  en: {
    coach: {
      "hello": "HELLO",
      "subtitle": "I AM YOUR AI PARENTING COACH",
      "people_asking": "People are also asking",
      "ongoing_teams": "Ongoing Teams",
      "k_parenting_news": "K-Parenting News",
      "no_news": "No news available.",
      "todays_tips": "Today’s Parenting Tips",
      "chat_thinking": "Thinking",
      "chat_placeholder": "Anything on your mind?",
      "chat_send": "Send",
      "chat_error_delayed": "The response is delayed. Please try again.",
      "chat_error_empty": "Empty answer from server"
    },
    news: {
      "title": "News",
      "subtitle": "Curated parenting research & book notes.",
      "no_news": "No news available.",
      "read_more": "Read more"
    },
    team: {
      "title": "Team",
      "subtitle": "Trending K-Parenting goods parents love. Join together, unlock better prices. Beta now.",
      "no_teams": "No teams available.",
      "joined": "Joined {count}",
      "untitled": "Untitled"
    },
    common: {
      "language": "Language",
      "select": "Select"
    },
    kyk: {
      "title": "KYK",
      "subtitle": "Know Your Kid · Understand your child’s personality and parenting context",
      "intro_title": "A simple way to better understand your child’s personality",
      "intro_desc": "KYK helps you explore your child’s temperament and response patterns through a short set of questions. Once your result is saved, the AI Coach can provide more relevant and personalized guidance based on your child’s unique personality.",
      "point_1": "• It only takes about 1–2 minutes to complete.",
      "point_2": "• You can begin without logging in, but sign-in may be required to save your result.",
      "point_3": "• You can retake KYK anytime as your child grows and changes.",
      "btn_start": "Start KYK Now",
      "btn_coach": "Go to AI Coach",
      "latest_result": "YOUR LATEST KYK RESULT",
      "default_title": "Your child’s personality result",
      "btn_view": "View Result",
      "btn_retake": "Retake KYK"
    }
  },
  ko: {
    coach: {
      "hello": "안녕하세요",
      "subtitle": "당신의 AI 육아 코치입니다",
      "people_asking": "다른 사람들은 이런 질문을 했어요",
      "ongoing_teams": "진행 중인 팀",
      "k_parenting_news": "K-육아 뉴스",
      "no_news": "뉴스가 없습니다.",
      "todays_tips": "오늘의 육아 팁",
      "chat_thinking": "생각 중",
      "chat_placeholder": "어떤 고민이 있으신가요?",
      "chat_send": "전송",
      "chat_error_delayed": "응답이 지연되고 있습니다. 다시 시도해 주세요.",
      "chat_error_empty": "서버로부터 빈 응답을 받았습니다"
    },
    news: {
      "title": "뉴스",
      "subtitle": "엄선된 육아 연구 및 도서 요약.",
      "no_news": "뉴스가 없습니다.",
      "read_more": "더 읽어보기"
    },
    team: {
      "title": "팀",
      "subtitle": "부모들이 사랑하는 필수 K-육아템. 함께 모여 더 나은 가격에 만나보세요. (베타)",
      "no_teams": "진행 중인 팀이 없습니다.",
      "joined": "{count}명 참여",
      "untitled": "제목 없음"
    },
    common: {
      "language": "언어 (Language)",
      "select": "선택"
    },
    kyk: {
      "title": "KYK",
      "subtitle": "Know Your Kid · 아이의 기질과 상황을 이해하는 시간",
      "intro_title": "아이의 성향을 이해하는 가장 간단한 방법",
      "intro_desc": "KYK는 짧은 질문들을 통해 아이의 기질과 반응 패턴을 탐색합니다. 결과가 저장되면 AI 코치가 아이의 고유한 성향을 바탕으로 더 맞춤화된 가이드를 제공할 수 있습니다.",
      "point_1": "• 완료하는 데 1~2분 정도만 소요됩니다.",
      "point_2": "• 로그인 없이 시작할 수 있지만 결과를 저장하려면 로그인이 필요합니다.",
      "point_3": "• 아이가 성장함에 따라 언제든지 다시 검사할 수 있습니다.",
      "btn_start": "지금 KYK 시작하기",
      "btn_coach": "AI 코치로 가기",
      "latest_result": "최근 KYK 결과",
      "default_title": "아이의 성향 검사 결과",
      "btn_view": "결과 보기",
      "btn_retake": "KYK 다시 하기"
    }
  },
  th: {
    coach: {
      "hello": "สวัสดี",
      "subtitle": "ฉันคือโค้ชการเลี้ยงลูกด้วย AI ของคุณ",
      "people_asking": "ผู้คนกำลังถามถึงเรื่องนี้",
      "ongoing_teams": "ทีมที่กำลังดำเนินการ",
      "k_parenting_news": "ข่าวสารการเลี้ยงลูกสไตล์เกาหลี",
      "no_news": "ไม่มีข่าวสาร",
      "todays_tips": "เคล็ดลับการเลี้ยงลูกวันนี้",
      "chat_thinking": "กำลังคิด",
      "chat_placeholder": "คุณกำลังคิดอะไรอยู่?",
      "chat_send": "ส่ง",
      "chat_error_delayed": "การตอบสนองล่าช้า โปรดลองอีกครั้ง",
      "chat_error_empty": "ได้รับคำตอบว่างเปล่าจากเซิร์ฟเวอร์"
    },
    news: {
      "title": "ข่าวสาร",
      "subtitle": "งานวิจัยการเลี้ยงลูกที่คัดสรรและบันทึกจากหนังสือ",
      "no_news": "ไม่มีข่าวสาร",
      "read_more": "อ่านเพิ่มเติม"
    },
    team: {
      "title": "ทีม",
      "subtitle": "สินค้า K-Parenting ยอดฮิตที่พ่อแม่รัก เข้าร่วมด้วยกัน รับราคาที่ดีกว่า เปิดให้ทดลองใช้แล้ว",
      "no_teams": "ไม่มีทีม",
      "joined": "เข้าร่วม {count} คน",
      "untitled": "ไม่มีชื่อเรื่อง"
    },
    common: {
      "language": "ภาษา (Language)",
      "select": "เลือก"
    },
    kyk: {
      "title": "KYK",
      "subtitle": "Know Your Kid · เข้าใจบุคลิกภาพและบริบทการเลี้ยงลูกของคุณ",
      "intro_title": "วิธีง่ายๆ ในการเข้าใจบุคลิกภาพของลูกคุณได้ดีขึ้น",
      "intro_desc": "KYK ช่วยให้คุณสำรวจอารมณ์และรูปแบบการตอบสนองของลูกผ่านชุดคำถามสั้นๆ เมื่อบันทึกผลลัพธ์แล้ว โค้ช AI จะสามารถให้คำแนะนำที่เหมาะกับบุคลิกภาพที่เป็นเอกลักษณ์ของลูกคุณได้ดียิ่งขึ้น",
      "point_1": "• ใช้เวลาเพียง 1-2 นาที",
      "point_2": "• เริ่มต้นได้โดยไม่ต้องเข้าสู่ระบบ แต่ต้องเข้าสู่ระบบเพื่อบันทึกผล",
      "point_3": "• คุณสามารถทำ KYK ใหม่ได้ตลอดเวลาเมื่อลูกโตขึ้น",
      "btn_start": "เริ่ม KYK เลย",
      "btn_coach": "ไปที่ AI Coach",
      "latest_result": "ผลลัพธ์ KYK ล่าสุดของคุณ",
      "default_title": "ผลการวิเคราะห์บุคลิกภาพของลูกคุณ",
      "btn_view": "ดูผลลัพธ์",
      "btn_retake": "ทำ KYK ใหม่"
    }
  },
  ms: {
    coach: {
      "hello": "HELLO",
      "subtitle": "SAYA IALAH JURULATIH KEIBUBAPAAN AI ANDA",
      "people_asking": "Orang ramai juga bertanya",
      "ongoing_teams": "Pasukan Sedang Berjalan",
      "k_parenting_news": "Berita Keibubapaan-K",
      "no_news": "Tiada berita tersedia.",
      "todays_tips": "Petua Keibubapaan Hari Ini",
      "chat_thinking": "Sedang berfikir",
      "chat_placeholder": "Ada apa-apa di fikiran anda?",
      "chat_send": "Hantar",
      "chat_error_delayed": "Respons lambat. Sila cuba lagi.",
      "chat_error_empty": "Jawapan kosong dari pelayan"
    },
    news: {
      "title": "Berita",
      "subtitle": "Penyelidikan keibubapaan yang disusun & nota buku.",
      "no_news": "Tiada berita tersedia.",
      "read_more": "Baca lebih lanjut"
    },
    team: {
      "title": "Pasukan",
      "subtitle": "Barangan K-Parenting trending yang ibu bapa suka. Sertai bersama, nikmati harga yang lebih baik. Beta sekarang.",
      "no_teams": "Tiada pasukan tersedia.",
      "joined": "Sertai {count}",
      "untitled": "Tiada Tajuk"
    },
    common: {
      "language": "Bahasa (Language)",
      "select": "Pilih"
    },
    kyk: {
      "title": "KYK",
      "subtitle": "Know Your Kid · Fahami personaliti dan konteks keibubapaan anak anda",
      "intro_title": "Cara mudah untuk lebih memahami personaliti anak anda",
      "intro_desc": "KYK membantu anda meneroka temperamen dan corak tindak balas anak anda melalui set soalan ringkas. Setelah keputusan anda disimpan, Jurulatih AI boleh memberikan panduan yang lebih relevan dan diperibadikan berdasarkan personaliti unik anak anda.",
      "point_1": "• Ia hanya mengambil masa kira-kira 1–2 minit untuk disiapkan.",
      "point_2": "• Anda boleh mula tanpa log masuk, tetapi log masuk diperlukan untuk menyimpan keputusan.",
      "point_3": "• Anda boleh mengambil semula KYK bila-bila masa apabila anak anda membesar.",
      "btn_start": "Mula KYK Sekarang",
      "btn_coach": "Pergi ke Jurulatih AI",
      "latest_result": "KEPUTUSAN KYK TERKINI ANDA",
      "default_title": "Keputusan personaliti anak anda",
      "btn_view": "Lihat Keputusan",
      "btn_retake": "Ambil Semula KYK"
    }
  },
  id: {
    coach: {
      "hello": "HALO",
      "subtitle": "SAYA ADALAH PELATIH PENGASUHAN AI ANDA",
      "people_asking": "Orang-orang juga bertanya",
      "ongoing_teams": "Tim yang Sedang Berjalan",
      "k_parenting_news": "Berita Pengasuhan K",
      "no_news": "Tidak ada berita yang tersedia.",
      "todays_tips": "Tips Pengasuhan Hari Hari",
      "chat_thinking": "Sedang berpikir",
      "chat_placeholder": "Ada yang sedang Anda pikirkan?",
      "chat_send": "Kirim",
      "chat_error_delayed": "Respons tertunda. Silakan coba lagi.",
      "chat_error_empty": "Jawaban kosong dari server"
    },
    news: {
      "title": "Berita",
      "subtitle": "Penelitian pengasuhan anak yang dikuratori & catatan buku.",
      "no_news": "Tidak ada berita yang tersedia.",
      "read_more": "Baca lebih lanjut"
    },
    team: {
      "title": "Tim",
      "subtitle": "Barang-barang K-Parenting tren yang disukai orang tua. Bergabung bersama, dapatkan harga yang lebih baik. Beta sekarang.",
      "no_teams": "Tidak ada tim yang tersedia.",
      "joined": "Bergabung {count}",
      "untitled": "Tanpa Judul"
    },
    common: {
      "language": "Bahasa (Language)",
      "select": "Pilih"
    },
    kyk: {
      "title": "KYK",
      "subtitle": "Know Your Kid · Pahami kepribadian dan konteks pengasuhan anak Anda",
      "intro_title": "Cara sederhana untuk lebih memahami kepribadian anak Anda",
      "intro_desc": "KYK membantu Anda menjelajahi temperamen dan pola reaksi anak Anda melalui serangkaian pertanyaan singkat. Setelah hasil Anda disimpan, Pelatih AI dapat memberikan panduan yang lebih relevan dan dipersonalisasi berdasarkan kepribadian unik anak Anda.",
      "point_1": "• Hanya membutuhkan waktu sekitar 1–2 menit untuk menyelesaikannya.",
      "point_2": "• Anda dapat memulai tanpa masuk, tetapi masuk mungkin diperlukan untuk menyimpan hasil Anda.",
      "point_3": "• Anda dapat mengulang KYK kapan saja seiring pertumbuhan anak Anda.",
      "btn_start": "Mulai KYK Sekarang",
      "btn_coach": "Pergi ke Pelatih AI",
      "latest_result": "HASIL KYK TERAKHIR ANDA",
      "default_title": "Hasil kepribadian anak Anda",
      "btn_view": "Lihat Hasil",
      "btn_retake": "Ulangi KYK"
    }
  }
};

const langs = ['en', 'ko', 'th', 'ms', 'id'];
const namespaces = ['coach', 'news', 'team', 'common', 'kyk'];

langs.forEach(lang => {
  const dir = path.join('src', 'i18n', 'messages', lang);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  
  namespaces.forEach(ns => {
    fs.writeFileSync(path.join(dir, `${ns}.json`), JSON.stringify(dicts[lang][ns], null, 2));
  });
  
  const indexContent = `export { default as navbar } from './navbar.json'\nexport { default as about } from './about.json'\nexport { default as coach } from './coach.json'\nexport { default as news } from './news.json'\nexport { default as team } from './team.json'\nexport { default as common } from './common.json'\nexport { default as kyk } from './kyk.json'\n`;
  fs.writeFileSync(path.join(dir, 'index.ts'), indexContent);
});

console.log("Dictionaries generated successfully");
