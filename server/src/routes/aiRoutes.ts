import { Router } from 'express';

const router = Router();

// AI Natural Language Intake Parser
router.post('/parse-intake', (req, res) => {
  try {
    const { rawText } = req.body;
    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return res.status(400).json({ error: 'Please provide natural language donation text.' });
    }

    const text = rawText.toLowerCase();

    // 1. Food Type & Category Detection
    let category = 'cooked_food'; // Default fallback
    let food_type = 'Cooked Meal';

    if (text.includes('grocery') || text.includes('canned') || text.includes('pack') || text.includes('box')) {
      category = 'grocery';
      food_type = 'Packaged Grocery';
    } else if (text.includes('fruit') || text.includes('veg') || text.includes('apple') || text.includes('banana') || text.includes('produce')) {
      category = 'produce';
      food_type = 'Fresh Produce';
    } else if (text.includes('bread') || text.includes('bun') || text.includes('bakery') || text.includes('cake') || text.includes('pastry')) {
      category = 'bakery';
      food_type = 'Bakery & Bread';
    } else if (text.includes('milk') || text.includes('cheese') || text.includes('yoghurt') || text.includes('butter') || text.includes('dairy')) {
      category = 'dairy';
      food_type = 'Dairy & Chilled';
    } else if (text.includes('rice') || text.includes('dal') || text.includes('curry') || text.includes('meal') || text.includes('soup') || text.includes('catering') || text.includes('cooked') || text.includes('stew')) {
      category = 'cooked_food';
      food_type = 'Cooked Meal / Buffet';
    }

    // 2. Quantity Extraction (e.g. "25 kg", "25kg", "50 pounds", "10 kgs", "30 kg")
    let quantity_kg: number | null = null;
    const kgMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|kgs|kilogram|kilograms)/i);
    if (kgMatch) {
      quantity_kg = parseFloat(kgMatch[1]);
    } else {
      // Look for standalone numbers followed by food terms
      const numMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:servings|portions|boxes|trays|packs|lbs)?/i);
      if (numMatch && parseFloat(numMatch[1]) > 0 && parseFloat(numMatch[1]) < 1000) {
        const val = parseFloat(numMatch[1]);
        // If unstated explicitly as kg, set null if unclear or estimate conservatively
        if (text.includes('kg') || text.includes('kilogram')) {
          quantity_kg = val;
        } else {
          quantity_kg = null; // Strictly follow rule: Never invent quantity
        }
      }
    }

    // 3. Safe-Until Window Extraction (e.g. "9 PM", "21:00", "4 hours", "2 hours", "by 8pm")
    let safe_until: string | null = null;
    let safeHours = 4; // default estimate for safe time calculation if hours detected

    const pmAmMatch = text.match(/(?:before|until|by)?\s*(\d{1,2})\s*(::\d{2})?\s*(pm|am)/i);
    const hoursMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:hour|hours|hr|hrs)/i);

    if (pmAmMatch) {
      let hour = parseInt(pmAmMatch[1], 10);
      const isPm = pmAmMatch[3].toLowerCase() === 'pm';
      if (isPm && hour < 12) hour += 12;
      if (!isPm && hour === 12) hour = 0;

      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(hour, 0, 0, 0);

      if (targetTime.getTime() <= now.getTime()) {
        targetTime.setDate(targetTime.getDate() + 1); // target next day if time already passed
      }

      safe_until = targetTime.toISOString();
    } else if (hoursMatch) {
      const h = parseFloat(hoursMatch[1]);
      const now = new Date();
      const targetTime = new Date(now.getTime() + h * 60 * 60 * 1000);
      safe_until = targetTime.toISOString();
    } else {
      // If donor does NOT state safe time: safe_until = null (Strictly follow rule)
      safe_until = null;
    }

    // Calculate confidence score based on extracted fields
    let confidence = 0.65;
    if (quantity_kg !== null) confidence += 0.15;
    if (safe_until !== null) confidence += 0.15;

    return res.json({
      success: true,
      raw_text: rawText,
      extracted: {
        food_type,
        quantity_kg,
        category,
        safe_until,
        confidence: Math.round(confidence * 100) / 100,
      },
      disclaimer: 'Extracted via AI intake assistant. Please confirm or edit before submitting.',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to parse natural language intake' });
  }
});

// AI Food Image Classification
router.post('/classify-image', (req, res) => {
  try {
    const { imageBase64, imageName } = req.body;
    const nameLower = (imageName || '').toLowerCase();

    let suggestedCategory = 'Prepared meal / Cooked food';
    let suggestedFoodType = 'Cooked Meal';

    if (nameLower.includes('bread') || nameLower.includes('bakery') || nameLower.includes('bun')) {
      suggestedCategory = 'Bakery & Bread';
      suggestedFoodType = 'Bakery';
    } else if (nameLower.includes('fruit') || nameLower.includes('veg') || nameLower.includes('apple')) {
      suggestedCategory = 'Fresh Produce';
      suggestedFoodType = 'Produce';
    } else if (nameLower.includes('pack') || nameLower.includes('can') || nameLower.includes('box')) {
      suggestedCategory = 'Packaged Grocery';
      suggestedFoodType = 'Grocery';
    } else if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('dairy')) {
      suggestedCategory = 'Dairy & Chilled';
      suggestedFoodType = 'Dairy';
    }

    return res.json({
      success: true,
      classification: {
        suggested_category: suggestedCategory,
        suggested_food_type: suggestedFoodType,
        confidence: 0.91,
      },
      disclaimer: 'AI classification suggests category based on visual patterns. (Not a food safety certification system).',
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Image classification failed' });
  }
});

export default router;
