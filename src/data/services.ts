export interface Service {
  id: string;
  /** Maps to the DB services.slug column for cross-referencing static ↔ DB data */
  dbId?: string;
  nameEn: string;
  nameNp: string;
  emoji: string;
  descriptionEn: string;
  descriptionNp: string;
}

export const services: Service[] = [
  {
    id: "plumbing",
    nameEn: "Plumbing",
    nameNp: "प्लम्बिङ",
    emoji: "🔧",
    descriptionEn: "Leak fixes, pipe installation, water heater repair – certified plumbers near you",
    descriptionNp: "चुहावट मर्मत, पाइप जडान र वाटर हिटर मर्मत - तपाईंको नजिकै प्रमाणित प्लम्बरहरू",
  },
  {
    id: "cleaning",
    nameEn: "Cleaning",
    nameNp: "सफाइ",
    emoji: "🧹",
    descriptionEn: "Deep home cleaning, office sanitization, and window washing – sparkling results every time",
    descriptionNp: "गहिरो घर सफाइ, कार्यालय सेनिटाइजेशन र झ्याल धुने - हरेक पटक चम्किलो नतिजा",
  },
  {
    id: "electrical",
    nameEn: "Electrical",
    nameNp: "इलेक्ट्रिकल",
    emoji: "⚡",
    descriptionEn: "Safe wiring, fixture installation, and fuse box repair – licensed electricians at your door",
    descriptionNp: "सुरक्षित वायरिङ, फिक्स्चर जडान र फ्युज बक्स मर्मत - तपाईंको ढोकामा लाइसेन्स प्राप्त इलेक्ट्रिसियनहरू",
  },
  {
    id: "moving",
    nameEn: "Moving",
    nameNp: "सामान सार्ने",
    emoji: "📦",
    descriptionEn: "Stress-free packing, heavy lifting, and furniture assembly – reliable movers for your transition",
    descriptionNp: "तनावमुक्त प्याकिङ, भारी सामान बोक्ने र फर्निचर एसेम्ब्ली - तपाईंको स्थानान्तरणका लागि भरपर्दो मुभर्स",
  },
  {
    id: "tutoring",
    nameEn: "Tutoring",
    nameNp: "ट्युशन",
    emoji: "📚",
    descriptionEn: "One-on-one help with Math, Science, and Languages – expert tutors for all grade levels",
    descriptionNp: "गणित, विज्ञान र भाषाहरूमा व्यक्तिगत सहयोग - सबै कक्षाका लागि विशेषज्ञ शिक्षकहरू",
  },
  {
    id: "cooking",
    nameEn: "Cooking",
    nameNp: "खाना पकाउने",
    emoji: "🍳",
    descriptionEn: "Personal chefs, meal prep, and event catering – authentic flavors cooked in your kitchen",
    descriptionNp: "व्यक्तिगत भान्से, खानाको तयारी र क्याटरिङ - तपाईंको भान्सामा पकाइएको वास्तविक स्वाद",
  },
  {
    id: "painting",
    nameEn: "Painting",
    nameNp: "रङ लगाउने",
    emoji: "🎨",
    descriptionEn: "Interior wall painting, exterior finishing, and trim work – premium colors and expert strokes",
    descriptionNp: "आन्तरिक पर्खाल पेन्टिङ, बाहिरी फिनिसिङ र ट्रिम कार्य - प्रिमियम रङ र विशेषज्ञ स्ट्रोकहरू",
  },
  {
    id: "gardening",
    nameEn: "Gardening",
    nameNp: "बगैंचा हेरचाह",
    emoji: "🌱",
    descriptionEn: "Lawn mowing, hedge trimming, and seasonal planting – keep your outdoor space thriving",
    descriptionNp: "घाँस काट्ने, हेज ट्रिमिङ र मौसमी वृक्षारोपण - तपाईंको बाहिरी ठाउँलाई हराभरा राख्नुहोस्",
  },
  {
    id: "tech-help",
    nameEn: "Tech Help",
    nameNp: "टेक सहायता",
    emoji: "💻",
    descriptionEn: "PC repair, Wi-Fi setup, and software troubleshooting – fast tech support for home and office",
    descriptionNp: "पिसी मर्मत, वाइफाइ सेटअप र सफ्टवेयर समस्या निवारण - घर र कार्यालयको लागि छिटो टेक सपोर्ट",
  },
  {
    id: "driver",
    nameEn: "Driver",
    nameNp: "ड्राइभर",
    emoji: "🚗",
    descriptionEn: "Professional city driving, outstation trips, and airport transfers – safe and punctual rides",
    descriptionNp: "व्यावसायिक सहर ड्राइभिङ, बाहिरी यात्रा र विमानस्थल स्थानान्तरण - सुरक्षित र समयनिष्ठ सवारी",
  },
  {
    id: "caretaking",
    nameEn: "Caretaking",
    nameNp: "हेरचाह",
    emoji: "👨‍⚕️",
    descriptionEn: "Compassionate elderly care, property management, and house sitting – trusted hands when you're away",
    descriptionNp: "वृद्धवृद्धाको हेरचाह, सम्पत्ति व्यवस्थापन र घर कुरुवा - तपाईं टाढा हुँदा भरपर्दो हातहरू",
  },
  {
    id: "pet-care",
    nameEn: "Pet Care",
    nameNp: "पालतू जनावर हेरचाह",
    emoji: "🐕",
    descriptionEn: "Dog walking, grooming, and pet sitting – loving care for your furry family members",
    descriptionNp: "कुकुर डुलाउने, ग्रुमिङ र पेट सिटिङ - तपाईंको घरपालुवा जनावरहरूको लागि मायालु हेरचाह",
  },
];
