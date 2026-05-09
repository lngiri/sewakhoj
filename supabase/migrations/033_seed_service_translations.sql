-- Update existing services with Nepali translations
UPDATE public.services SET name_ne = 'प्लम्बिङ', description_ne = 'चुहावट मर्मत, पाइप जडान र वाटर हिटर मर्मत' WHERE name ILIKE 'Plumbing';
UPDATE public.services SET name_ne = 'सफाइ', description_ne = 'गहिरो घर सफाइ, कार्यालय सेनिटाइजेशन र झ्याल धुने' WHERE name ILIKE 'Cleaning';
UPDATE public.services SET name_ne = 'इलेक्ट्रिकल', description_ne = 'सुरक्षित वायरिङ, फिक्स्चर जडान र फ्युज बक्स मर्मत' WHERE name ILIKE 'Electrical';
UPDATE public.services SET name_ne = 'ट्युशन', description_ne = 'गणित, विज्ञान र भाषाहरूमा व्यक्तिगत सहयोग' WHERE name ILIKE 'Tutoring';
UPDATE public.services SET name_ne = 'काठको काम', description_ne = 'फर्निचर मर्मत, कस्टम काठको काम' WHERE name ILIKE 'Carpentry';
UPDATE public.services SET name_ne = 'रङ लगाउने', description_ne = 'आन्तरिक पर्खाल पेन्टिङ, बाहिरी फिनिसिङ र ट्रिम कार्य' WHERE name ILIKE 'Painting';
UPDATE public.services SET name_ne = 'उपकरण मर्मत', description_ne = 'फ्रिज, वाशिङ मेसिन, एसी मर्मत' WHERE name ILIKE 'Appliance Repair';
UPDATE public.services SET name_ne = 'बगैंचा', description_ne = 'घाँस काट्ने, बिरुवाको हेरचाह, ल्याण्डस्केपिङ' WHERE name ILIKE 'Gardening';
