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
      landing: {
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
      },
      step1: {
        "title": "KYK",
        "step_indicator": "Child Personality Analysis (1/3)",
        "question": "Q1. Please select 5 adjectives that best describe your child.",
        "selected_count": "{count}/5 selected",
        "btn_back": "Back",
        "btn_next": "Next"
      },
      step2: {
        "title": "KYK",
        "step_indicator": "Child Personality Analysis (2/3)",
        "btn_back": "Back",
        "btn_next": "Next"
      },
      step3: {
        "title": "KYK",
        "step_indicator": "Child Personality Analysis (3/3)",
        "btn_back": "Back",
        "btn_see_result": "See Result",
        "loading": "Loading...",
        "modal_title": "Google login required",
        "modal_body": "To save and view your results, please log in with Google. Click OK to proceed to the account selection screen.",
        "modal_cancel": "Cancel",
        "modal_ok": "OK"
      },
      adjectives: {
        "adj_1": "Calm",
        "adj_2": "Smart",
        "adj_3": "Flexible",
        "adj_4": "Imaginative",
        "adj_5": "Meticulous",
        "adj_6": "Attentive",
        "adj_7": "Sharp",
        "adj_8": "Resourceful",
        "adj_9": "Articulate",
        "adj_10": "Mature",
        "adj_11": "Friendly",
        "adj_12": "Energetic",
        "adj_13": "Fearless",
        "adj_14": "Bright",
        "adj_15": "Positive",
        "adj_16": "Curious",
        "adj_17": "Kind-hearted",
        "adj_18": "Reliable",
        "adj_19": "Opinionated",
        "adj_20": "Active learner",
        "adj_21": "Trustworthy",
        "adj_22": "Persistent",
        "adj_23": "Distinctive",
        "adj_24": "Immersive",
        "adj_25": "Thoughtful"
      },
      likert: {
        "1": "Strongly Disagree",
        "2": "Disagree",
        "3": "Agree",
        "4": "Strongly Agree"
      },
      questions: {
        "q2": "My child finds it easy to make new friends.",
        "q3": "My child plays quietly by themselves well.",
        "q4": "My child naturally speaks to people they meet for the first time.",
        "q5": "When listening to a story, my child is curious about the background or reasons.",
        "q6": "My child likes to draw things realistically.",
        "q7": "My child tends to create imaginary worlds or rules during play.",
        "q8": "When a friend cries, my child tries to empathize with them.",
        "q9": "My child tries to explain situations logically.",
        "q10": "My child considers it important to know what is right and wrong.",
        "q11": "My child tends to plan ahead for what they need to do.",
        "q12": "My child gets flustered or dislikes it when the schedule changes.",
        "q13": "My child tends to do what they want first and put off what they dislike."
      },
      gate: {
        "title": "KYK",
        "loading_msg": "Fetching results...",
        "loading": "Loading...",
        "modal_title": "Google login required",
        "modal_desc": "You need to log in to save your KYK results and allow the AI Coach to personalize responses for your child.",
        "btn_back": "Back",
        "btn_ok": "OK",
        "btn_opening": "Opening..."
      },
      result: {
        "title": "KYK",
        "subtitle": "Our Child’s Primary Personality",
        "login_required": "You need to log in to view the results.",
        "failed_load": "Could not load the results.",
        "no_result": "No result found.",
        "unable_to_display": "Unable to display personality test result.",
        "keyword_title": "Keywords related to this personality profile",
        "btn_login": "Go to Login",
        "btn_retake": "Take KYK Test Again",
        "btn_coach": "Go to AI Coach",
        "btn_retry": "Try again"
      },
      login_modal: {
        "title": "Google login required to view results",
        "desc": "Save your KYK results to your account and the AI Coach will reflect this personality trait in future sessions.",
        "btn_cancel": "Cancel",
        "btn_ok": "OK",
        "btn_opening": "Opening...",
        "btn_continue": "I’m already logged in -> Continue"
      },
      computed: {
        "animal_fish": "Fish",
        "title_fish_honest": "Honest Fish",
        "summary_fish": "A thinker type who enjoys deep exploration and analysis.",
        "keyword_learning_routine": "Learning routine",
        "keyword_focus": "Focus",
        "keyword_friends": "Friendships"
      }
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
      landing: {
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
      },
      step1: {
        "title": "KYK",
        "step_indicator": "아이 성향 분석 (1/3)",
        "question": "Q1. 우리 아이를 잘 나타내는 형용사를 5개 선택해주세요.",
        "selected_count": "{count}/5 선택됨",
        "btn_back": "이전",
        "btn_next": "다음"
      },
      step2: {
        "title": "KYK",
        "step_indicator": "아이 성향 분석 (2/3)",
        "btn_back": "이전",
        "btn_next": "다음"
      },
      step3: {
        "title": "KYK",
        "step_indicator": "아이 성향 분석 (3/3)",
        "btn_back": "이전",
        "btn_see_result": "결과 보기",
        "loading": "로딩 중...",
        "modal_title": "Google 로그인 필요",
        "modal_body": "결과를 저장하고 보여주려면 구글 로그인이 필요해요. OK를 누르면 계정 선택창으로 이동합니다.",
        "modal_cancel": "취소",
        "modal_ok": "확인"
      },
      adjectives: {
        "adj_1": "차분한",
        "adj_2": "똑똑한",
        "adj_3": "유연한",
        "adj_4": "상상력이 풍부한",
        "adj_5": "꼼꼼한",
        "adj_6": "세심한",
        "adj_7": "똑 부러진",
        "adj_8": "요령있는",
        "adj_9": "말재주 있는",
        "adj_10": "의젓한",
        "adj_11": "친구 많은",
        "adj_12": "에너지넘치는",
        "adj_13": "겁 없는",
        "adj_14": "밝은",
        "adj_15": "긍정 뿜뿜",
        "adj_16": "호기심 많은",
        "adj_17": "착한마음씨",
        "adj_18": "듬직한",
        "adj_19": "내 의견 확실한",
        "adj_20": "몸으로 배우는",
        "adj_21": "믿음직한",
        "adj_22": "포기 안 하는",
        "adj_23": "자기 색 뚜렷한",
        "adj_24": "몰입 잘 하는",
        "adj_25": "조용히 생각하는"
      },
      likert: {
        "1": "매우 아니다",
        "2": "아니다",
        "3": "그렇다",
        "4": "매우 그렇다"
      },
      questions: {
        "q2": "우리 아이는 새로운 친구를 사귀는 것이 어렵지 않다.",
        "q3": "우리 아이는 혼자서도 조용히 잘 논다.",
        "q4": "처음 보는 사람 앞에서도 자연스럽게 말한다.",
        "q5": "우리 아이는 이야기를 들을 때 그 배경이나 이유를 궁금해한다.",
        "q6": "우리 아이는 그림을 사실적으로 그리는 걸 좋아한다.",
        "q7": "놀이 중 상상 속 세계나 규칙을 만들어내는 편이다.",
        "q8": "친구가 울면 함께 공감하려고 한다.",
        "q9": "우리 아이는 상황을 논리적으로 설명하려 한다.",
        "q10": "어떤 것이 옳고 그른지를 중요하게 생각한다.",
        "q11": "우리 아이는 해야 할 일을 미리 계획해서 처리하는 편이다.",
        "q12": "일정이 바뀌면 당황하거나 싫어한다.",
        "q13": "하고 싶은 것을 먼저 하고, 싫은 건 나중에 미루는 편이다."
      },
      gate: {
        "title": "KYK",
        "loading_msg": "결과를 불러오는 중이야.",
        "loading": "Loading...",
        "modal_title": "구글 로그인이 필요해",
        "modal_desc": "KYK 결과를 계정에 저장하고, 다음 로그인 때 코치가 이 성향을 반영해서 답할 수 있게 돼.",
        "btn_back": "Back",
        "btn_ok": "OK",
        "btn_opening": "Opening..."
      },
      result: {
        "title": "KYK",
        "subtitle": "우리 아이 성향 결과(1위)",
        "login_required": "결과를 보려면 로그인이 필요해.",
        "failed_load": "결과를 불러오지 못했어.",
        "no_result": "No result found.",
        "unable_to_display": "성향 결과를 표시할 수 없어",
        "keyword_title": "이 성향 부모님이 자주 궁금해하는 키워드",
        "btn_login": "Go to Login",
        "btn_retake": "Take KYK Test Again",
        "btn_coach": "Go to AI Coach",
        "btn_retry": "다시 해보기"
      },
      login_modal: {
        "title": "결과를 보려면 구글 로그인이 필요해요",
        "desc": "KYK 결과를 계정에 저장하고, 다음 로그인 때 코치가 이 성향을 반영해서 답해요.",
        "btn_cancel": "Cancel",
        "btn_ok": "OK",
        "btn_opening": "Opening...",
        "btn_continue": "I’m already logged in -> Continue"
      },
      computed: {
        "animal_fish": "물고기",
        "title_fish_honest": "솔직한 물고기",
        "summary_fish": "깊이 있는 탐구와 분석을 즐기는 사색가형.",
        "keyword_learning_routine": "학습 루틴",
        "keyword_focus": "집중력",
        "keyword_friends": "친구관계"
      }
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
      landing: {
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
      },
      step1: {
        "title": "KYK",
        "step_indicator": "การวิเคราะห์บุคลิกภาพของเด็ก (1/3)",
        "question": "Q1. โปรดเลือกคำคุณศัพท์ 5 คำที่อธิบายลูกของคุณได้ดีที่สุด",
        "selected_count": "เลือกแล้ว {count}/5",
        "btn_back": "กลับ",
        "btn_next": "ถัดไป"
      },
      step2: {
        "title": "KYK",
        "step_indicator": "การวิเคราะห์บุคลิกภาพของเด็ก (2/3)",
        "btn_back": "กลับ",
        "btn_next": "ถัดไป"
      },
      step3: {
        "title": "KYK",
        "step_indicator": "การวิเคราะห์บุคลิกภาพของเด็ก (3/3)",
        "btn_back": "กลับ",
        "btn_see_result": "ดูผลลัพธ์",
        "loading": "กำลังโหลด...",
        "modal_title": "จำเป็นต้องเข้าสู่ระบบ Google",
        "modal_body": "เพื่อบันทึกและดูผลลัพธ์ของคุณ โปรดเข้าสู่ระบบด้วย Google คลิกตกลงเพื่อไปยังหน้าจอเลือกบัญชี",
        "modal_cancel": "ยกเลิก",
        "modal_ok": "ตกลง"
      },
      adjectives: {
        "adj_1": "ใจเย็น",
        "adj_2": "ฉลาด",
        "adj_3": "ยืดหยุ่น",
        "adj_4": "มีจินตนาการ",
        "adj_5": "พิถีพิถัน",
        "adj_6": "เอาใจใส่",
        "adj_7": "เฉียบแหลม",
        "adj_8": "มีไหวพริบ",
        "adj_9": "พูดเก่ง",
        "adj_10": "เป็นผู้ใหญ่",
        "adj_11": "เป็นมิตร",
        "adj_12": "กระตือรือร้น",
        "adj_13": "ไม่กลัว",
        "adj_14": "ร่าเริง",
        "adj_15": "คิดบวก",
        "adj_16": "อยากรู้อยากเห็น",
        "adj_17": "ใจดี",
        "adj_18": "พึ่งพาได้",
        "adj_19": "มีความคิดเป็นของตัวเอง",
        "adj_20": "เรียนรู้จากการปฏิบัติ",
        "adj_21": "น่าเชื่อถือ",
        "adj_22": "ไม่ยอมแพ้",
        "adj_23": "เป็นตัวของตัวเอง",
        "adj_24": "มีสมาธิ",
        "adj_25": "ครุ่นคิด"
      },
      likert: {
        "1": "ไม่เห็นด้วยอย่างยิ่ง",
        "2": "ไม่เห็นด้วย",
        "3": "เห็นด้วย",
        "4": "เห็นด้วยอย่างยิ่ง"
      },
      questions: {
        "q2": "ลูกของฉันหาเพื่อนใหม่ได้ง่าย",
        "q3": "ลูกของฉันเล่นคนเดียวอย่างเงียบๆ ได้ดี",
        "q4": "ลูกของฉันพูดคุยกับคนที่เพิ่งเจอได้อย่างเป็นธรรมชาติ",
        "q5": "เวลาฟังเรื่องราว ลูกของฉันมักจะสงสัยเกี่ยวกับเบื้องหลังหรือเหตุผล",
        "q6": "ลูกของฉันชอบวาดภาพให้สมจริง",
        "q7": "ลูกของฉันมักจะสร้างโลกหรือกฎเกณฑ์ในจินตนาการระหว่างเล่น",
        "q8": "เมื่อเพื่อนร้องไห้ ลูกของฉันจะพยายามเข้าใจความรู้สึกของเพื่อน",
        "q9": "ลูกของฉันพยายามอธิบายสถานการณ์อย่างมีเหตุผล",
        "q10": "ลูกของฉันถือว่าการรู้ว่าอะไรถูกอะไรผิดเป็นสิ่งสำคัญ",
        "q11": "ลูกของฉันมักจะวางแผนล่วงหน้าสำหรับสิ่งที่ต้องทำ",
        "q12": "ลูกของฉันจะลนลานหรือไม่ชอบเมื่อตารางเวลาเปลี่ยน",
        "q13": "ลูกของฉันมักจะทำสิ่งที่อยากทำก่อน และผลัดสิ่งที่ไม่อยากทำออกไป"
      },
      gate: {
        "title": "KYK",
        "loading_msg": "กำลังดึงผลลัพธ์...",
        "loading": "กำลังโหลด...",
        "modal_title": "จำเป็นต้องเข้าสู่ระบบ Google",
        "modal_desc": "คุณต้องเข้าสู่ระบบเพื่อบันทึกผลลัพธ์ KYK ของคุณและอนุญาตให้ AI Coach ปรับแต่งการตอบสนองสำหรับบุตรหลานของคุณ",
        "btn_back": "ถอยกลับ",
        "btn_ok": "ตกลง",
        "btn_opening": "กำลังเปิด..."
      },
      result: {
        "title": "KYK",
        "subtitle": "บุคลิกภาพหลักของลูกเรา",
        "login_required": "คุณต้องเข้าสู่ระบบเพื่อดูผลลัพธ์",
        "failed_load": "ไม่สามารถโหลดผลลัพธ์ได้",
        "no_result": "ไม่พบผลลัพธ์",
        "unable_to_display": "ไม่สามารถแสดงผลลัพธ์แบบทดสอบบุคลิกภาพได้",
        "keyword_title": "คำสำคัญที่เป็นที่นิยมในหมู่ผู้ปกครองของโปรไฟล์บุคลิกภาพนี้",
        "btn_login": "ไปที่เข้าสู่ระบบ",
        "btn_retake": "ทำแบบทดสอบ KYK อีกครั้ง",
        "btn_coach": "ไปที่ AI Coach",
        "btn_retry": "ลองอีกครั้ง"
      },
      login_modal: {
        "title": "จำเป็นต้องเข้าสู่ระบบ Google เพื่อดูผลลัพธ์",
        "desc": "บันทึกผลลัพธ์ KYK ของคุณลงในบัญชีและ AI Coach จะสะท้อนถึงลักษณะบุคลิกภาพนี้ในเซสชันถัดไป",
        "btn_cancel": "ยกเลิก",
        "btn_ok": "ตกลง",
        "btn_opening": "กำลังเปิด...",
        "btn_continue": "ฉันเข้าสู่ระบบแล้ว -> ดำเนินการต่อ"
      },
      computed: {
        "animal_fish": "ปลา",
        "title_fish_honest": "ปลาที่ซื่อสัตย์",
        "summary_fish": "ประเภทนักคิดที่ชอบการสำรวจและวิเคราะห์เชิงลึก",
        "keyword_learning_routine": "กิจวัตรการเรียน",
        "keyword_focus": "สมาธิ",
        "keyword_friends": "มิตรภาพ"
      }
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
      landing: {
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
      },
      step1: {
        "title": "KYK",
        "step_indicator": "Analisis Personaliti Kanak-kanak (1/3)",
        "question": "S1. Sila pilih 5 kata sifat yang paling menggambarkan anak anda.",
        "selected_count": "{count}/5 dipilih",
        "btn_back": "Kembali",
        "btn_next": "Seterusnya"
      },
      step2: {
        "title": "KYK",
        "step_indicator": "Analisis Personaliti Kanak-kanak (2/3)",
        "btn_back": "Kembali",
        "btn_next": "Seterusnya"
      },
      step3: {
        "title": "KYK",
        "step_indicator": "Analisis Personaliti Kanak-kanak (3/3)",
        "btn_back": "Kembali",
        "btn_see_result": "Lihat Keputusan",
        "loading": "Memuatkan...",
        "modal_title": "Log masuk Google diperlukan",
        "modal_body": "Untuk menyimpan dan melihat keputusan anda, sila log masuk dengan Google. Klik OK untuk meneruskan ke skrin pemilihan akaun.",
        "modal_cancel": "Batal",
        "modal_ok": "OK"
      },
      adjectives: {
        "adj_1": "Tenang",
        "adj_2": "Pintar",
        "adj_3": "Fleksibel",
        "adj_4": "Berimaginasi",
        "adj_5": "Teliti",
        "adj_6": "Peka",
        "adj_7": "Tajam",
        "adj_8": "Cerdik",
        "adj_9": "Petah",
        "adj_10": "Matang",
        "adj_11": "Mesra",
        "adj_12": "Bertenaga",
        "adj_13": "Berani",
        "adj_14": "Ceria",
        "adj_15": "Positif",
        "adj_16": "Ingin Tahu",
        "adj_17": "Baik Hati",
        "adj_18": "Boleh Dipercayai",
        "adj_19": "Berpendirian",
        "adj_20": "Aktif Belajar",
        "adj_21": "Dipercayai",
        "adj_22": "Cekal",
        "adj_23": "Unik",
        "adj_24": "Fokus",
        "adj_25": "Pemikir"
      },
      likert: {
        "1": "Sangat Tidak Bersetuju",
        "2": "Tidak Bersetuju",
        "3": "Bersetuju",
        "4": "Sangat Bersetuju"
      },
      questions: {
        "q2": "Anak saya mudah mencari kawan baharu.",
        "q3": "Anak saya boleh bermain bersendirian dengan senyap.",
        "q4": "Anak saya berbual secara semula jadi dengan orang yang baru dikenali.",
        "q5": "Apabila mendengar cerita, anak saya ingin tahu tentang latar belakang atau alasannya.",
        "q6": "Anak saya suka melukis sesuatu secara realistik.",
        "q7": "Anak saya cenderung membina dunia rekaan atau peraturan semasa bermain.",
        "q8": "Apabila rakan menangis, anak saya cuba berempati dengan mereka.",
        "q9": "Anak saya cuba menerangkan situasi secara logik.",
        "q10": "Anak saya menganggap penting untuk mengetahui apa yang betul dan salah.",
        "q11": "Anak saya cenderung merancang lebih awal untuk perkara yang perlu dilakukan.",
        "q12": "Anak saya menjadi gelisah atau tidak suka jika jadual berubah.",
        "q13": "Anak saya cenderung melakukan apa yang mereka mahu dahulu dan menangguhkan apa yang mereka tidak suka."
      },
      gate: {
        "title": "KYK",
        "loading_msg": "Mendapat keputusan...",
        "loading": "Memuatkan...",
        "modal_title": "Dikehendaki log masuk Google",
        "modal_desc": "Anda perlu log masuk untuk menyimpan keputusan KYK anda dan membenarkan Jurulatih AI menyesuaikan respons untuk anak anda.",
        "btn_back": "Kembali",
        "btn_ok": "OK",
        "btn_opening": "Membuka..."
      },
      result: {
        "title": "KYK",
        "subtitle": "Personaliti Utama Anak Kita",
        "login_required": "Anda perlu log masuk untuk melihat keputusan.",
        "failed_load": "Tidak dapat memuatkan keputusan.",
        "no_result": "Tiada keputusan dijumpai.",
        "unable_to_display": "Tidak dapat memaparkan keputusan ujian personaliti.",
        "keyword_title": "Kata kunci berkaitan profil personaliti ini",
        "btn_login": "Log Masuk",
        "btn_retake": "Ambil Semula Ujian KYK",
        "btn_coach": "Pergi ke AI Coach",
        "btn_retry": "Cuba lagi"
      },
      login_modal: {
        "title": "Log masuk Google diperlukan untuk melihat keputusan",
        "desc": "Simpan keputusan KYK anda ke akaun anda dan AI Coach akan menggambarkan sifat personaliti ini dalam sesi akan datang.",
        "btn_cancel": "Batal",
        "btn_ok": "OK",
        "btn_opening": "Membuka...",
        "btn_continue": "Saya sudah log masuk -> Teruskan"
      },
      computed: {
        "animal_fish": "Ikan",
        "title_fish_honest": "Ikan Jujur",
        "summary_fish": "Jenis pemikir yang suka penerokaan dan analisis yang mendalam.",
        "keyword_learning_routine": "Rutin pembelajaran",
        "keyword_focus": "Tumpuan",
        "keyword_friends": "Persahabatan"
      }
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
      landing: {
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
      },
      step1: {
        "title": "KYK",
        "step_indicator": "Analisis Kepribadian Anak (1/3)",
        "question": "Q1. Silakan pilih 5 kata sifat yang paling menggambarkan anak Anda.",
        "selected_count": "{count}/5 dipilih",
        "btn_back": "Kembali",
        "btn_next": "Berikutnya"
      },
      step2: {
        "title": "KYK",
        "step_indicator": "Analisis Kepribadian Anak (2/3)",
        "btn_back": "Kembali",
        "btn_next": "Berikutnya"
      },
      step3: {
        "title": "KYK",
        "step_indicator": "Analisis Kepribadian Anak (3/3)",
        "btn_back": "Kembali",
        "btn_see_result": "Lihat Hasil",
        "loading": "Memuat...",
        "modal_title": "Diperlukan masuk Google",
        "modal_body": "Untuk menyimpan dan melihat hasil Anda, silakan masuk dengan Google. Klik OK untuk melanjutkan ke layar pemilihan akun.",
        "modal_cancel": "Batal",
        "modal_ok": "OK"
      },
      adjectives: {
        "adj_1": "Tenang",
        "adj_2": "Pintar",
        "adj_3": "Fleksibel",
        "adj_4": "Imajinatif",
        "adj_5": "Teliti",
        "adj_6": "Perhatian",
        "adj_7": "Tajam",
        "adj_8": "Cerdik",
        "adj_9": "Fasih",
        "adj_10": "Dewasa",
        "adj_11": "Ramah",
        "adj_12": "Energik",
        "adj_13": "Pemberani",
        "adj_14": "Ceria",
        "adj_15": "Positif",
        "adj_16": "Keingintahuan",
        "adj_17": "Baik hati",
        "adj_18": "Bisa diandalkan",
        "adj_19": "Berpendirian kokoh",
        "adj_20": "Aktif belajar",
        "adj_21": "Dapat dipercaya",
        "adj_22": "Gigih",
        "adj_23": "Khas",
        "adj_24": "Fokus",
        "adj_25": "Pemikir"
      },
      likert: {
        "1": "Sangat Tidak Setuju",
        "2": "Tidak Setuju",
        "3": "Setuju",
        "4": "Sangat Setuju"
      },
      questions: {
        "q2": "Anak saya mudah berteman.",
        "q3": "Anak saya bisa bermain sendiri dengan tenang.",
        "q4": "Anak saya berbicara secara alami dengan orang yang baru ditemui.",
        "q5": "Saat mendengarkan cerita, anak saya penasaran dengan latar belakang atau alasannya.",
        "q6": "Anak saya suka menggambar sesuatu secara realistis.",
        "q7": "Anak saya cenderung menciptakan dunia imajiner atau aturan saat bermain.",
        "q8": "Saat teman menangis, anak saya mencoba berempati dengan mereka.",
        "q9": "Anak saya mencoba menjelaskan situasi secara logis.",
        "q10": "Anak saya menganggap penting untuk mengetahui apa yang benar dan salah.",
        "q11": "Anak saya cenderung merencanakan ke depan untuk apa yang harus dilakukan.",
        "q12": "Anak saya menjadi gelisah atau tidak suka saat jadwal berubah.",
        "q13": "Anak saya cenderung melakukan apa yang mereka inginkan terlebih dahulu dan menunda apa yang tidak mereka sukai."
      },
      gate: {
        "title": "KYK",
        "loading_msg": "Mengambil hasil...",
        "loading": "Memuat...",
        "modal_title": "Diperlukan login Google",
        "modal_desc": "Anda harus masuk untuk menyimpan hasil KYK Anda dan memungkinkan Pelatih AI mempersonalisasi respons untuk anak Anda.",
        "btn_back": "Kembali",
        "btn_ok": "OK",
        "btn_opening": "Membuka..."
      },
      result: {
        "title": "KYK",
        "subtitle": "Kepribadian Utama Anak Kita",
        "login_required": "Anda harus masuk untuk melihat hasil.",
        "failed_load": "Tidak dapat memuat hasil.",
        "no_result": "Tidak ada hasil ditemukan.",
        "unable_to_display": "Tidak dapat menampilkan hasil tes kepribadian.",
        "keyword_title": "Kata kunci terkait profil kepribadian ini",
        "btn_login": "Ke Login",
        "btn_retake": "Ikuti Tes KYK Lagi",
        "btn_coach": "Pergi ke Pelatih AI",
        "btn_retry": "Coba lagi"
      },
      login_modal: {
        "title": "Login Google diperlukan untuk melihat hasil",
        "desc": "Simpan hasil KYK Anda ke akun Anda dan Pelatih AI akan mencerminkan ciri kepribadian ini di sesi berikutnya.",
        "btn_cancel": "Batal",
        "btn_ok": "OK",
        "btn_opening": "Membuka...",
        "btn_continue": "Saya sudah masuk -> Lanjutkan"
      },
      computed: {
        "animal_fish": "Ikan",
        "title_fish_honest": "Ikan Jujur",
        "summary_fish": "Tipe pemikir yang menyukai eksplorasi dan analisis mendalam.",
        "keyword_learning_routine": "Rutinitas belajar",
        "keyword_focus": "Fokus",
        "keyword_friends": "Pertemanan"
      }
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
