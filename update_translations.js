const fs = require('fs');
const path = require('path');

const mbtiMap = {
  estj: {
    ko: { title: "솔직한 늑대", keywords: ["#TrustedCaptain", "#HonestRuleKeeper", "#MasterOrganizer", "#BornLeader", "#PromisesAreSacred"], summaryPart1: "리더십이 강하고, 해야 할 일은 척척 해내는 편이에요." },
    en: { title: "Straight-Shooting Wolf", keywords: ["#TrustedCaptain", "#HonestRuleKeeper", "#MasterOrganizer", "#BornLeader", "#PromisesAreSacred"], summaryPart1: "A natural leader who gets things done efficiently." },
    id: { title: "Serigala Blak-blakan", keywords: ["#KaptenTerpercaya", "#PenjagaAturan", "#AhliOrganisasi", "#PemimpinBawaan", "#JanjiAdalahSuci"], summaryPart1: "Pemimpin alami yang menyelesaikan sesuatu dengan efisien." },
    ms: { title: "Serigala Berterus-terang", keywords: ["#KaptenDipercayai", "#PenjagaPeraturan", "#PakarOrganisasi", "#PemimpinSemulaJadi", "#JanjiItuSuci"], summaryPart1: "Pemimpin semula jadi yang melaksanakan tugasan dengan cekap." },
    th: { title: "หมาป่าตรงไปตรงมา", keywords: ["#กัปตันที่เชื่อถือได้", "#ผู้พิทักษ์กฎ", "#นักจัดระเบียบ", "#ผู้นำโดยกำเนิด", "#รักษาสัญญาเสมอ"], summaryPart1: "ผู้นำโดยธรรมชาติที่รับจัดการสิ่งต่างๆ ได้อย่างมีประสิทธิภาพ" }
  },
  estp: {
    ko: { title: "활동적인 호랑이", keywords: ["#FullyCharged", "#EnergizerBunny", "#ThrillSeeker", "#HypeMaker", "#ActionHero"], summaryPart1: "에너지가 넘치고, 몸으로 부딪히며 배우는 걸 좋아해요." },
    en: { title: "Action-Packed Tiger", keywords: ["#FullyCharged", "#EnergizerBunny", "#ThrillSeeker", "#HypeMaker", "#ActionHero"], summaryPart1: "Full of energy and loves to learn hands-on." },
    id: { title: "Harimau Penuh Aksi", keywords: ["#SangatBersemangat", "#KelinciEnergizer", "#PetualangSejati", "#PembuatHype", "#PahlawanAksi"], summaryPart1: "Penuh energi dan suka belajar langsung." },
    ms: { title: "Harimau Penuh Aksi", keywords: ["#PenuhTenaga", "#ArnabEnergizer", "#PencariKeterujaan", "#PembuatHype", "#WiraAksi"], summaryPart1: "Penuh dengan tenaga dan suka belajar secara hands-on." },
    th: { title: "เสือจอมแอ็คชั่น", keywords: ["#พลังล้นเหลือ", "#กระต่ายมีพลัง", "#สายลุย", "#นักสร้างกระแส", "#ฮีโร่สายแอ็คชั่น"], summaryPart1: "เปี่ยมไปด้วยพลังและรักการลงมือทำ" }
  },
  esfj: {
    ko: { title: "따뜻한 말", keywords: ["#HeartCollector", "#KindnessPass", "#HighTension", "#DoubleTheFun", "#HumanSunshine"], summaryPart1: "다정하고 사교적이며, 주변 분위기를 잘 살펴요." },
    en: { title: "Warm-hearted Horse", keywords: ["#HeartCollector", "#KindnessPass", "#HighTension", "#DoubleTheFun", "#HumanSunshine"], summaryPart1: "Sweet and sociable; they are great at reading the room." },
    id: { title: "Kuda Berhati Hangat", keywords: ["#PengumpulHati", "#EstafetKebaikan", "#SemangatTinggi", "#SeruGanda", "#MentariManusia"], summaryPart1: "Manis dan supel; mereka pandai membaca suasana." },
    ms: { title: "Kuda Berhati Hangat", keywords: ["#PengumpulHati", "#PenyebarKebaikan", "#SemangatTinggi", "#SeronokGanda", "#CahayaManusia"], summaryPart1: "Manis dan sosial; mereka mahir membaca suasana bilik." },
    th: { title: "ม้าใจดี", keywords: ["#นักสะสมหัวใจ", "#ส่งต่อความใจดี", "#พลังความสนุก", "#สนุกคูณสอง", "#แสงสว่างของคนรอบข้าง"], summaryPart1: "น่ารักและเข้าสังคมเก่ง พวกเขาเก่งในการอ่านบรรยากาศรอบๆ" }
  },
  esfp: {
    ko: { title: "긍정적인 돌고래", keywords: ["#HappinessBringer", "#SmileMaker", "#SpontaneousPro", "#AlwaysReadyForFun", "#TensionUp"], summaryPart1: "활발하고 긍정적이며, 모두를 즐겁게 만드는 아이예요." },
    en: { title: "Positive Dolphin", keywords: ["#HappinessBringer", "#SmileMaker", "#SpontaneousPro", "#AlwaysReadyForFun", "#TensionUp"], summaryPart1: "Energetic, positive, and the life of the party who makes everyone smile." },
    id: { title: "Lumba-lumba Positif", keywords: ["#PembawaBahagia", "#PembuatSenyum", "#JagoSpontanitas", "#SelaluSiapSeru", "#TensionUp"], summaryPart1: "Energik, positif, dan pusat pesta yang membuat semua orang tersenyum." },
    ms: { title: "Lumba-lumba Positif", keywords: ["#PembawaHarapan", "#PembuatSenyum", "#PakarSpontan", "#SentiasaBersedia", "#TensionUp"], summaryPart1: "Bertenaga, positif, dan memeriahkan suasana yang membuatkan semua tersenyum." },
    th: { title: "โลมาพลังบวก", keywords: ["#ผู้นำความสุข", "#นักสร้างรอยยิ้ม", "#มือโปรสายฉับไว", "#พร้อมสนุกเสมอ", "#อัพเทนชั่น"], summaryPart1: "ร่าเริง แจ่มใส และเป็นสีสันของงานที่ทำให้ทุกคนยิ้ม" }
  },
  entj: {
    ko: { title: "야망있는 호랑이", keywords: ["#GoalSniper", "#ProAchiever", "#LovesToWin", "#QuickExecution", "#LeaderInstinctON"], summaryPart1: "스스로 목표를 세우고 성취하려는 추진력이 강해요." },
    en: { title: "Ambitious Tiger", keywords: ["#GoalSniper", "#ProAchiever", "#LovesToWin", "#QuickExecution", "#LeaderInstinctON"], summaryPart1: "Highly driven to set their own goals and achieve them." },
    id: { title: "Harimau Ambisius", keywords: ["#PenembakTujuan", "#AhliPencapai", "#SukaMenang", "#EksekusiCepat", "#NaluriPemimpin"], summaryPart1: "Sangat terdorong untuk menetapkan dan mencapai tujuan mereka sendiri." },
    ms: { title: "Harimau Bercita-cita Tinggi", keywords: ["#PenembakMatlamat", "#PakarPencapai", "#SukaMenang", "#PelaksanaanCepat", "#NaluriPemimpin"], summaryPart1: "Sangat bersemangat untuk menetapkan matlamat mereka sendiri dan mencapainya." },
    th: { title: "เสือจอมทะเยอทะยาน", keywords: ["#เล็งเป้าหมาย", "#มือโปรบรรลุผล", "#ชอบเอาชนะ", "#จัดเจงเร็ว", "#โหมดผู้นำเปิดทำงาน"], summaryPart1: "มีความมุ่งมั่นตั้งเป้าหมายและขับเคลื่อนสูง" }
  },
  entp: {
    ko: { title: "참견쟁이 늑대", keywords: ["#IdeaBomb", "#SmoothTalker", "#TrendHunter", "#CreativeNomad", "#AlwaysTryingNewThings"], summaryPart1: "아이디어가 넘치고, 궁금한 건 꼭 직접 해봐야 직성이 풀려요." },
    en: { title: "Curious Wolf", keywords: ["#IdeaBomb", "#SmoothTalker", "#TrendHunter", "#CreativeNomad", "#AlwaysTryingNewThings"], summaryPart1: "Overflowing with ideas, they have to try things out themselves to be satisfied." },
    id: { title: "Serigala Penasaran", keywords: ["#BomIde", "#PembicaraLihai", "#PemburuTren", "#PengembaraKreatif", "#SelaluCobaHalBaru"], summaryPart1: "Melimpah dengan ide, harus mencobanya sendiri agar puas." },
    ms: { title: "Serigala Ingin Tahu", keywords: ["#BomIdea", "#PandaiBerbicara", "#PemburuTrend", "#NomadKreatif", "#MencubaPerkaraBaru"], summaryPart1: "Berlimpah dengan idea, mereka perlu mencuba sendiri." },
    th: { title: "หมาป่าขี้สงสัย", keywords: ["#ไอเดียระเบิด", "#นักพูดที่คล่องแคล่ว", "#นักล่าเทรนด์", "#นักเดินทางผู้สร้างสรรค์", "#ลองอะไรใหม่ๆเสมอ"], summaryPart1: "เต็มไปด้วยไอเดียและต้องลองทำเองถึงจะพึงพอใจ" }
  },
  enfj: {
    ko: { title: "조화로운 돌고래", keywords: ["#MasterHugger", "#PeopleRadar", "#CheerBot", "#WarmHeart", "#ProEncourager"], summaryPart1: "사람을 잘 챙기고, 모두가 잘 지내길 바라는 아이예요." },
    en: { title: "Harmonious Dolphin", keywords: ["#MasterHugger", "#PeopleRadar", "#CheerBot", "#WarmHeart", "#ProEncourager"], summaryPart1: "Caring and always wants everyone to get along and be happy." },
    id: { title: "Lumba-lumba Harmonis", keywords: ["#TukangPeluk", "#RadarManusia", "#Penyemangat", "#HatiHangat", "#PendorongPro"], summaryPart1: "Peduli dan selalu ingin semua orang akur dan bahagia." },
    ms: { title: "Lumba-lumba Harmoni", keywords: ["#PakarPeluk", "#RadarManusia", "#PenyokongTegar", "#HatiHangat", "#ProPendorong"], summaryPart1: "Penyayang dan sentiasa mahukan semua orang harmoni dan gembira." },
    th: { title: "โลมาที่ปรองดอง", keywords: ["#สุดยอดนักกอด", "#เรดาร์มนุษย์", "#สายเชียร์", "#หัวใจอบอุ่น", "#นักให้กำลังใจมือโปร"], summaryPart1: "ห่วงใยและอยากให้ทุกคนเข้ากันได้และมีความสุขเสมอ" }
  },
  enfp: {
    ko: { title: "열정적인 말", keywords: ["#FreeSpirit", "#CuriosityExplorer", "#StoryTreasureBox", "#JoySpreader", "#DailyTensionUp"], summaryPart1: "마음이 따뜻하고, 새로운 것에 대한 호기심이 넘쳐요." },
    en: { title: "Passionate Horse", keywords: ["#FreeSpirit", "#CuriosityExplorer", "#StoryTreasureBox", "#JoySpreader", "#DailyTensionUp"], summaryPart1: "Warm-hearted and bursting with curiosity for new things." },
    id: { title: "Kuda Penuh Semangat", keywords: ["#JiwaBebas", "#EksploratorKeingintahuan", "#KotakHartaCerita", "#PenyebarKeceriaan", "#TensiTinggiHarian"], summaryPart1: "Berhati hangat dan penuh rasa ingin tahu terhadap hal-hal baru." },
    ms: { title: "Kuda Bersemangat", keywords: ["#JiwaBebas", "#PenerokaKeingintahuan", "#KotakHartaCerita", "#PenyebarKeriangan", "#TensionTinggi"], summaryPart1: "Baik hati dan penuh dengan rasa ingin tahu terhadap perkara baharu." },
    th: { title: "ม้าสุดแสนกระตือรือร้น", keywords: ["#วิญญาณเสรี", "#นักสำรวจขี้สงสัย", "#กล่องสมบัติแห่งเรื่องราว", "#ตัวแทนส่งมอบความสุข", "#เบิกบานทุกวัน"], summaryPart1: "มีจิตใจที่อบอุ่นและเต็มไปด้วยความอยากรู้อยากเห็นในสิ่งใหม่ๆ" }
  },
  istj: {
    ko: { title: "조용한 물고기", keywords: ["#ConsistencyIsKey", "#StepByStep", "#PromiseKeeper", "#SilentSuccess", "#Reliable100%"], summaryPart1: "책임감이 강하고, 규칙과 질서를 잘 지키는 아이예요." },
    en: { title: "Quiet Fish", keywords: ["#ConsistencyIsKey", "#StepByStep", "#PromiseKeeper", "#SilentSuccess", "#Reliable100%"], summaryPart1: "Highly responsible and strictly follows rules and order." },
    id: { title: "Ikan Pendiam", keywords: ["#KonsistensiItuKunci", "#TahapDemiTahap", "#PenjagaJanji", "#SuksesDalamDiam", "#DapatDiandalkan100%"], summaryPart1: "Sangat bertanggung jawab dan sangat patuh pada aturan dan ketertiban." },
    ms: { title: "Ikan Pendiam", keywords: ["#KonsistensiPenting", "#SelangkahHarmoni", "#PenepatiJanji", "#KejayaanHening", "#Dipercayai100%"], summaryPart1: "Amanah dan mengikuti peraturan serta ketertiban dengan teliti." },
    th: { title: "ปลาที่เงียบสงบ", keywords: ["#ความสม่ำเสมอเป็นกุญแจสำคัญ", "#ไปทีละขั้น", "#คนที่รักษาสัญญา", "#ความสำเร็จอย่างเงียบๆ", "#เชื่อถือได้100%"], summaryPart1: "มีความรับผิดชอบสูงและปฏิบัติตามกฎเกณฑ์ความเป็นระเบียบเรียบร้อย" }
  },
  istp: {
    ko: { title: "관대한 부엉이", keywords: ["#CrisisEscapeMaster", "#ObservationGuru", "#GadgetGeek", "#ActionTaker", "#SpontaneousGenius"], summaryPart1: "겉으론 조용하지만 속으로는 논리적인 생각이 많아요." },
    en: { title: "Generous Owl", keywords: ["#CrisisEscapeMaster", "#ObservationGuru", "#GadgetGeek", "#ActionTaker", "#SpontaneousGenius"], summaryPart1: "Quiet on the outside, but highly logical and analytical on the inside." },
    id: { title: "Burung Hantu Dermawan", keywords: ["#AhliKrisis", "#GuruObservasi", "#KutuGadget", "#BertindakCepat", "#JeniusSpontan"], summaryPart1: "Tenang di luar, tetapi sangat logis dan analitis di dalam." },
    ms: { title: "Burung Hantu Berderma", keywords: ["#PakarKrisis", "#GuruPemerhati", "#GilaGadjet", "#AmbilTindakan", "#GeniusSpontan"], summaryPart1: "Pendiam dari luar, tetapi sangat logik dan analitikal di dalam." },
    th: { title: "นกฮูกผู้ใจกว้าง", keywords: ["#เจ้านายแก้ปัญหาวิกฤต", "#กูรูนกสังเกตการณ์", "#กูรูด้านแก็ดเจ็ต", "#ผู้ที่ลงมือทำ", "#อัจฉริยะแบบฉับพลัน"], summaryPart1: "เงียบขรึมภายนอก แต่มีตรรกะและการวิเคราะห์สูงภายในอยู่" }
  },
  isfj: {
    ko: { title: "온화한 나비", keywords: ["#EmbodimentOfCare", "#QuietStrength", "#DelicateTouch", "#MyProtector", "#SweetnessOverload"], summaryPart1: "말보다 행동으로 따뜻함을 전하는 배려심 깊은 아이예요." },
    en: { title: "Gentle Butterfly", keywords: ["#EmbodimentOfCare", "#QuietStrength", "#DelicateTouch", "#MyProtector", "#SweetnessOverload"], summaryPart1: "A deeply considerate child who shows warmth through actions rather than words." },
    id: { title: "Kupu-kupu Lembut", keywords: ["#LambangKepedulian", "#KekuatanTenang", "#SentuhanLembut", "#Pelindungku", "#TerlaluManis"], summaryPart1: "Anak yang sangat penuh pertimbangan yang menunjukkan kehangatan melalui tindakan." },
    ms: { title: "Rama-rama Lembut", keywords: ["#SimbolJagaan", "#KekuatanHening", "#SentuhanHalus", "#Pelindungku", "#SangatManis"], summaryPart1: "Kanak-kanak yang prihatin yang menunjukkan kemesraan melalui tindakan." },
    th: { title: "ผีเสื้อผู้แสนอ่อนโยน", keywords: ["#ความใส่ใจโดยแท้จริง", "#ความเข้มแข็งที่เงียบงัน", "#สัมผัสอันอ่อนโยน", "#ผู้พิทักษ์ของฉัน", "#หวานเกินพิกัด"], summaryPart1: "เป็นเด็กที่มีความเห็นอกเห็นใจผู้อื่นอย่างลึกซึ้ง แสดงความอบอุ่นผ่านการกระทำมากกว่าคำพูด" }
  },
  isfp: {
    ko: { title: "감성적인 풍뎅이", keywords: ["#RechargingEmotions", "#PeaceLover", "#BurningArtisticSoul", "#QuietInspiration", "#WarmHeartON"], summaryPart1: "감각이 예민하고, 조용히 자신만의 아름다움을 표현해요." },
    en: { title: "Sensitive Beetle", keywords: ["#RechargingEmotions", "#PeaceLover", "#BurningArtisticSoul", "#QuietInspiration", "#WarmHeartON"], summaryPart1: "Highly perceptive and quietly expresses their own unique sense of beauty." },
    id: { title: "Kumbang Sensitif", keywords: ["#IsiUlangEmosi", "#PecintaDamai", "#JiwaSeniMenyala", "#InspirasiTenang", "#HatiHangatMenyala"], summaryPart1: "Sangat tanggap dan secara diam-diam mengekspresikan rasa keindahan yang unik." },
    ms: { title: "Kumbang Sensitif", keywords: ["#CasSemulaEmosi", "#PencintaKedamaian", "#JiwaSeniMembara", "#InspirasiHening", "#HatiMesraMenyala"], summaryPart1: "Perseptif tinggi dan menyatakan rasa kecantikannya yang unik dengan tenang." },
    th: { title: "ด้วงผู้มีความรู้สึกลึกซึ้ง", keywords: ["#ชาร์จพลังอารมณ์", "#คนรักความสงบ", "#วิญญาณศิลปินศิลปะแผดเผา", "#แรงบันดาลใจอันเงียบงัน", "#เปิดหัวใจอันอบอุ่น"], summaryPart1: "มีความสามารถในการรับรู้สูงและมักแสดงออกถึงความรู้สึกทางความงามที่เป็นเอกลักษณ์ของตนเอง" }
  },
  intj: {
    ko: { title: "냉철한 부엉이", keywords: ["#StrategyMaster", "#FuturePredictor", "#PlanningGenius", "#LaserFocus", "#EfficiencyLover"], summaryPart1: "또래보다 생각이 깊고, 인정받기보단 스스로 만족하려 해요." },
    en: { title: "Cool-headed Owl", keywords: ["#StrategyMaster", "#FuturePredictor", "#PlanningGenius", "#LaserFocus", "#EfficiencyLover"], summaryPart1: "A deep thinker who values self-satisfaction over external validation." },
    id: { title: "Burung Hantu Berkepala Dingin", keywords: ["#MasterStrategi", "#PeramalMasaDepan", "#JeniusPerencanaan", "#FokusLaser", "#PencintaEfisiensi"], summaryPart1: "Pemikir mendalam yang menghargai kepuasan diri di atas pengakuan eksternal." },
    ms: { title: "Burung Hantu Tenang", keywords: ["#PakarStrategi", "#PeramalMasaHadapan", "#GeniusRancangan", "#FokusLaser", "#PencintaKecekapan"], summaryPart1: "Pemikir yang sangat menimbangkan kepuasan diri mengatasi pengiktirafan luaran." },
    th: { title: "นกฮูกยอดสุขุม", keywords: ["#ปรมาจารย์ด้านกลยุทธ์", "#ผู้พยากรณ์อนาคต", "#อัจฉริยะด้านการวางแผน", "#โฟกัสระดับเลเซอร์", "#ผู้รักความมีประสิทธิภาพ"], summaryPart1: "นักคิดลึกซึ้งผู้ที่ให้คุณค่ากับความพึงพอใจในตนเองมากกว่าการยกย่องจากภายนอก" }
  },
  intp: {
    ko: { title: "솔직한 물고기", keywords: ["#KnowledgeExplorer", "#CuriosityExplosion", "#AnalysisInstinct", "#ThoughtLab", "#IdeaBank"], summaryPart1: "호기심이 많고, 자기만의 방식으로 세상을 탐구해요." },
    en: { title: "Honest Fish", keywords: ["#KnowledgeExplorer", "#CuriosityExplosion", "#AnalysisInstinct", "#ThoughtLab", "#IdeaBank"], summaryPart1: "Full of curiosity, they explore the world in their own unique way." },
    id: { title: "Ikan Jujur", keywords: ["#EksploratorIlmu", "#LedakanKeingintahuan", "#NaluriAnalisis", "#LabPemikiran", "#BankIde"], summaryPart1: "Penuh rasa ingin tahu, mereka menjelajahi dunia dengan cara yang menarik." },
    ms: { title: "Ikan Jujur", keywords: ["#PengkajiIlmu", "#LetupanInginTahu", "#NaluriAnalisis", "#MakmalPemikiran", "#BankIdea"], summaryPart1: "Penuh rasa ingin tahu, mereka meneroka dunia dengan cara yang unik." },
    th: { title: "ปลาที่ชอบความซื่อสัตย์", keywords: ["#นักสำรวจความรู้", "#ระเบิดความสงสัย", "#สัญชาตญาณด้านการวิเคราะห์", "#ห้องแล็บความคิด", "#คลังเก็บไอเดีย"], summaryPart1: "เต็มไปด้วยความอยากรู้อยากเห็นในแบบของตนเอง" }
  },
  infj: {
    ko: { title: "상상력 넘치는 풍뎅이", keywords: ["#HeartTranslator", "#DeepThinker", "#InspirationCollector", "#WarmInsight", "#QuietLeader"], summaryPart1: "상상력이 풍부하고, 타인에 예민하게 반응해요." },
    en: { title: "Imaginative Beetle", keywords: ["#HeartTranslator", "#DeepThinker", "#InspirationCollector", "#WarmInsight", "#QuietLeader"], summaryPart1: "Highly imaginative and deeply sensitive to the emotions of others." },
    id: { title: "Kumbang Imajinatif", keywords: ["#PenerjemahHati", "#PemikirMendalam", "#PengumpulInspirasi", "#WawasanHangat", "#PemimpinTenang"], summaryPart1: "Sangat imajinatif dan sangat peka terhadap emosi orang lain." },
    ms: { title: "Kumbang Berimaginasi", keywords: ["#PenterjemahHati", "#PemikirDalam", "#PengumpulInspirasi", "#WawasanMesra", "#PemimpinHening"], summaryPart1: "Sangat berimaginasi dan sungguh peka terhadap emosi orang lain." },
    th: { title: "ด้วงเจ้าจินตนาการ", keywords: ["#นักแปลหัวใจ", "#นักคิดเชิงลึก", "#นักสะสมแรงบันดาลใจ", "#ความรู้สึกลึกซึ้งและอบอุ่น", "#ผู้นำเงียบสงบ"], summaryPart1: "จินตนาการสูงล้ำและค่อนข้างอ่อนไหวกับอารมณ์ของผู้อื่น" }
  },
  infp: {
    ko: { title: "이상적인 나비", keywords: ["#DreamingRomantic", "#EmotionallyRich", "#TrueIdealist", "#ImmersionGenius", "#HeartProtector"], summaryPart1: "감정이 풍부하면서도 조용히 주변을 깊이 살펴봐요." },
    en: { title: "Idealistic Butterfly", keywords: ["#DreamingRomantic", "#EmotionallyRich", "#TrueIdealist", "#ImmersionGenius", "#HeartProtector"], summaryPart1: "Emotionally rich, they quietly and deeply observe their surroundings." },
    id: { title: "Kupu-kupu Idealis", keywords: ["#RomantisBermimpi", "#KayaEmosi", "#IdealisSejati", "#JeniusTenggelam", "#PelindungHati"], summaryPart1: "Kaya secara emosional, mereka dengan tenang mengamati sekeliling mereka." },
    ms: { title: "Rama-rama Idealis", keywords: ["#PemimpiRomantik", "#KayaEmosi", "#IdealisSejati", "#GeniusMenyelami", "#PelindungHati"], summaryPart1: "Kaya emosinya, mereka senyap memerhatikan persekitaran mereka dengan mendalam." },
    th: { title: "ผีเสื้อในอุดมคติ", keywords: ["#คนโรแมนติกที่ใฝ่ฝัน", "#ห้วงอารมณ์ที่ลึกซึ้ง", "#ไอเดียลิสต์ตัวจริง", "#อัจฉริยะแห่งการข้ามผ่าน", "#ผู้พิทักษ์หัวใจ"], summaryPart1: "พวกเขามีอารมณ์ที่มากมาย รับรู้และสังเกตสิ่งต่างๆ เงียบๆ ได้อย่างดี" }
  }
};

const langs = ['en', 'id', 'ms', 'th', 'ko']; // We also want to update 'ko' to have equivalent structure if titles changed? The user said "한글 표기에 해당되는 것을 영어버전에는 영문표기로". This means I don't need to change `ko` title since it's already there, but for consistency I will update EN, ID, MS, TH based on EN.

langs.forEach(lang => {
  if (lang === 'ko') return; // Do not modify Korean keys unless asked, we just add the English parts. Wait, user said "영문 기준으로 다국어 적용해줘" so ID, MS, TH must map to EN.
  
  const filePath = path.join('src', 'i18n', 'messages', lang, 'kyk.json');
  if (!fs.existsSync(filePath)) return;
  
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  Object.keys(mbtiMap).forEach(mbti => {
    const d = mbtiMap[mbti][lang];
    if (d) {
      data.computed[`title_${mbti}`] = d.title;
      // Add keyword_1 to keyword_5
      for (let i = 0; i < d.keywords.length; i++) {
        data.computed[`keyword_${mbti}_${i + 1}`] = d.keywords[i];
      }
      
      // Update summary using split by newline
      const oldSummary = data.computed[`summary_${mbti}`];
      if (oldSummary) {
        const parts = oldSummary.split('\n');
        parts[0] = d.summaryPart1;
        data.computed[`summary_${mbti}`] = parts.join('\n');
      } else {
        data.computed[`summary_${mbti}`] = d.summaryPart1;
      }
    }
  });

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
});
