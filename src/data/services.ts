export interface Service {
  id: string;
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
    descriptionEn: "Fix leaks, install pipes, and repair plumbing systems",
    descriptionNp: "चुहावट मर्मत, पाइप स्थापना र प्लम्बिङ प्रणाली मर्मत",
  },
  {
    id: "cleaning",
    nameEn: "Cleaning",
    nameNp: "सफाइ",
    emoji: "🧹",
    descriptionEn: "Home, office, and deep cleaning services",
    descriptionNp: "घर, कार्यालय र गहिरो सफाइ सेवाहरू",
  },
  {
    id: "electrical",
    nameEn: "Electrical",
    nameNp: "इलेक्ट्रिकल",
    emoji: "⚡",
    descriptionEn: "Wiring, repairs, and electrical installations",
    descriptionNp: "तारिङ, मर्मत र इलेक्ट्रिकल स्थापना",
  },
  {
    id: "moving",
    nameEn: "Moving",
    nameNp: "सामान सार्ने",
    emoji: "📦",
    descriptionEn: "Packing, moving, and unpacking services",
    descriptionNp: "प्याकिङ, सामान सार्ने र अनप्याकिङ सेवाहरू",
  },
  {
    id: "tutoring",
    nameEn: "Tutoring",
    nameNp: "ट्युशन",
    emoji: "📚",
    descriptionEn: "Academic tutoring for all grade levels",
    descriptionNp: "सबै कक्षा स्तरका लागि एकेडेमिक ट्युशन",
  },
  {
    id: "cooking",
    nameEn: "Cooking",
    nameNp: "खाना पकाउने",
    emoji: "🍳",
    descriptionEn: "Home-cooked meals and catering services",
    descriptionNp: "घरेलु खाना र क्याटरिङ सेवाहरू",
  },
  {
    id: "painting",
    nameEn: "Painting",
    nameNp: "रङ लगाउने",
    emoji: "🎨",
    descriptionEn: "Interior and exterior painting services",
    descriptionNp: "आन्तरिक र बाहिरी रङ लगाउने सेवाहरू",
  },
  {
    id: "gardening",
    nameEn: "Gardening",
    nameNp: "बगैंचा हेरचाह",
    emoji: "🌱",
    descriptionEn: "Garden maintenance and landscaping",
    descriptionNp: "बगैंचा मर्मत र ल्यान्डस्केपिङ",
  },
  {
    id: "tech-help",
    nameEn: "Tech Help",
    nameNp: "टेक सहायता",
    emoji: "💻",
    descriptionEn: "Computer, phone, and tech support",
    descriptionNp: "कम्प्युटर, फोन र टेक सपोर्ट",
  },
  {
    id: "driver",
    nameEn: "Driver",
    nameNp: "ड्राइभर",
    emoji: "🚗",
    descriptionEn: "Personal and commercial driving services",
    descriptionNp: "व्यक्तिगत र व्यावसायिक ड्राइभिङ सेवाहरू",
  },
  {
    id: "caretaking",
    nameEn: "Caretaking",
    nameNp: "हेरचाह",
    emoji: "👨‍⚕️",
    descriptionEn: "Elderly, pet, and property caretaking",
    descriptionNp: "वृद्ध, पालतू जनावर र सम्पत्ति हेरचाह",
  },
  {
    id: "pet-care",
    nameEn: "Pet Care",
    nameNp: "पालतू जनावर हेरचाह",
    emoji: "🐕",
    descriptionEn: "Pet sitting, walking, and grooming",
    descriptionNp: "पालतू जनावर बसाउने, हिँड्ने र ग्रुमिङ",
  },
];
