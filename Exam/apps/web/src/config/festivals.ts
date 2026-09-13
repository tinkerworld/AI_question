import { FestivalKey } from '@repo/types';

export interface FestivalThemeConfig {
  key: FestivalKey;
  name: string;
  badge: string;
  title: string;
  signature: string;
  description: string;
  primaryColor: string;
  accentRgb: string;
  secondaryColor: string;
  palette: string[];
  gradient: string;
  headerBackground: string;
  headerBorder: string;
  tabEmoji: string;
  dateWindow: {
    startMonth: number; // 1-12
    startDay: number;   // 1-31
    endMonth: number;   // 1-12
    endDay: number;     // 1-31
  };
}

export const FESTIVALS: FestivalThemeConfig[] = [
  {
    key: 'HOLI',
    name: 'Holi',
    badge: '🎨',
    title: 'Festival of Colors',
    signature: 'Color-splash & Gulal powder aura with soft multi-hue splashes',
    description: 'Vibrant overlapping gulal powder splashes blending azure, yellow, crimson, pink, and emerald.',
    primaryColor: '#FF69B4',
    secondaryColor: '#1E90FF',
    accentRgb: '255, 105, 180',
    palette: ['#1E90FF', '#FFD700', '#E63946', '#FF69B4', '#4CAF50'],
    gradient: 'linear-gradient(135deg, #FF69B4 0%, #1E90FF 50%, #FFD700 100%)',
    headerBackground: 'radial-gradient(circle at 15% 50%, rgba(255,105,180,0.22) 0%, transparent 45%), radial-gradient(circle at 50% 30%, rgba(30,144,255,0.20) 0%, transparent 50%), radial-gradient(circle at 85% 60%, rgba(255,215,0,0.18) 0%, transparent 45%)',
    headerBorder: '1px solid rgba(255, 105, 180, 0.35)',
    tabEmoji: '🎨',
    dateWindow: {
      startMonth: 3,
      startDay: 1,
      endMonth: 3,
      endDay: 31,
    },
  },
  {
    key: 'DIWALI',
    name: 'Diwali',
    badge: '🪔',
    title: 'Festival of Lights',
    signature: 'Warm oil lamps (diyas), deep maroon ambience, and golden sparkle light',
    description: 'Golden radiance and warm diya silhouettes against dark maroon darkness with gentle flicker glow.',
    primaryColor: '#D4AF37',
    secondaryColor: '#7B1F1F',
    accentRgb: '212, 175, 55',
    palette: ['#7B1F1F', '#D4AF37', '#E8A33D', '#F97316', '#2A0808'],
    gradient: 'linear-gradient(135deg, #7B1F1F 0%, #D4AF37 50%, #E8A33D 100%)',
    headerBackground: 'linear-gradient(135deg, #3d0c0c 0%, #1a0505 50%, #2e1202 100%)',
    headerBorder: '1px solid rgba(212, 175, 55, 0.4)',
    tabEmoji: '🪔',
    dateWindow: {
      startMonth: 10,
      startDay: 15,
      endMonth: 11,
      endDay: 15,
    },
  },
  {
    key: 'NEW_YEAR',
    name: 'New Year',
    badge: '🎆',
    title: 'New Year Sparkle',
    signature: 'Midnight countdown, gold & black elegance, and celebratory constellation stars',
    description: 'Midnight navy minimalism adorned with gleaming gold typography and subtle celebratory sparkle motifs.',
    primaryColor: '#F3C623',
    secondaryColor: '#0B132B',
    accentRgb: '243, 198, 35',
    palette: ['#0B132B', '#1C2541', '#D4AF37', '#F3C623', '#48CAE4'],
    gradient: 'linear-gradient(135deg, #0B132B 0%, #1C2541 60%, #D4AF37 100%)',
    headerBackground: 'linear-gradient(135deg, #070d1e 0%, #0d1b38 50%, #141b2d 100%)',
    headerBorder: '1px solid rgba(243, 198, 35, 0.35)',
    tabEmoji: '🎆',
    dateWindow: {
      startMonth: 12,
      startDay: 28,
      endMonth: 1,
      endDay: 6,
    },
  },
  {
    key: 'GUDI_PADWA',
    name: 'Gudi Padwa',
    badge: '🚩',
    title: 'Spring Renewal',
    signature: 'The sacred Gudi banner with kalash silhouette, saffron silk, and geometric rangoli border',
    description: 'Saffron prosperity, silver kalash insignia, and geometric rangoli diamond trim celebrating the new year.',
    primaryColor: '#FF9933',
    secondaryColor: '#DC2626',
    accentRgb: '255, 153, 51',
    palette: ['#FF9933', '#FFC107', '#DC2626', '#15803D', '#7C2D12'],
    gradient: 'linear-gradient(135deg, #FF9933 0%, #FFC107 50%, #DC2626 100%)',
    headerBackground: 'linear-gradient(135deg, #381500 0%, #1a0800 60%, #2b0b00 100%)',
    headerBorder: '1px solid rgba(255, 153, 51, 0.4)',
    tabEmoji: '🚩',
    dateWindow: {
      startMonth: 3,
      startDay: 20,
      endMonth: 4,
      endDay: 15,
    },
  },
  {
    key: 'CHRISTMAS',
    name: 'Christmas',
    badge: '🎄',
    title: 'Holiday Cheer',
    signature: 'Evergreen pine, holly berry crimson, golden highlights, and delicate snowflakes',
    description: 'Deep pine forest greens paired with warm holiday crimson, gold highlights, and delicate crystalline snowflakes.',
    primaryColor: '#BB2528',
    secondaryColor: '#165B33',
    accentRgb: '187, 37, 40',
    palette: ['#165B33', '#BB2528', '#D4AF37', '#107C41', '#E5E7EB'],
    gradient: 'linear-gradient(135deg, #165B33 0%, #BB2528 70%, #D4AF37 100%)',
    headerBackground: 'linear-gradient(135deg, #0a2414 0%, #163622 55%, #2a1114 100%)',
    headerBorder: '1px solid rgba(187, 37, 40, 0.4)',
    tabEmoji: '🎄',
    dateWindow: {
      startMonth: 12,
      startDay: 15,
      endMonth: 12,
      endDay: 27,
    },
  },
  {
    key: 'EID',
    name: 'Eid',
    badge: '🌙',
    title: 'Crescent Peace',
    signature: 'Crescent moon, authentic fanous lanterns, and 8-pointed star lattice geometry',
    description: 'Deep emerald and teal tranquility illuminated with gold crescent moons, lanterns, and Islamic star motifs.',
    primaryColor: '#0F5C4A',
    secondaryColor: '#D4AF37',
    accentRgb: '15, 92, 74',
    palette: ['#0F5C4A', '#1B4D3E', '#D4AF37', '#4A154B', '#10B981'],
    gradient: 'linear-gradient(135deg, #0F5C4A 0%, #1B4D3E 50%, #D4AF37 100%)',
    headerBackground: 'linear-gradient(135deg, #05261e 0%, #0d3b30 55%, #18221b 100%)',
    headerBorder: '1px solid rgba(212, 175, 55, 0.35)',
    tabEmoji: '🌙',
    dateWindow: {
      startMonth: 3,
      startDay: 25,
      endMonth: 4,
      endDay: 20,
    },
  },
  {
    key: 'INDEPENDENCE_DAY',
    name: 'Independence Day',
    badge: '🇮🇳',
    title: 'Tiranga Pride',
    signature: 'National horizontal tricolor flag stripe with stylized 24-spoke Ashok Chakra wheel motif',
    description: 'Patriotic horizontal saffron, white, and green band with a navy blue stylized Ashoka Chakra wheel.',
    primaryColor: '#FF9933',
    secondaryColor: '#138808',
    accentRgb: '255, 153, 51',
    palette: ['#FF9933', '#FFFFFF', '#138808', '#000080'],
    gradient: 'linear-gradient(90deg, #FF9933 0%, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%, #138808 100%)',
    headerBackground: 'linear-gradient(180deg, rgba(255, 153, 51, 0.12) 0%, rgba(19, 136, 8, 0.08) 100%)',
    headerBorder: '1px solid rgba(255, 153, 51, 0.5)',
    tabEmoji: '🇮🇳',
    dateWindow: {
      startMonth: 8,
      startDay: 10,
      endMonth: 8,
      endDay: 18,
    },
  },
  {
    key: 'REPUBLIC_DAY',
    name: 'Republic Day',
    badge: '🇮🇳',
    title: 'Constitution Honor',
    signature: 'Formal constitutional structured framing with stepped tricolor chevron borders and formal chakra roundels',
    description: 'Structured formal sovereignty composition with navy chrome, formal tricolor chevron borders, and framed chakra emblems.',
    primaryColor: '#000080',
    secondaryColor: '#FF9933',
    accentRgb: '0, 0, 128',
    palette: ['#000080', '#FF9933', '#FFFFFF', '#138808', '#2563EB'],
    gradient: 'linear-gradient(135deg, #000080 0%, #1e3a8a 50%, #FF9933 100%)',
    headerBackground: 'linear-gradient(135deg, #040d21 0%, #0c1a3b 60%, #172554 100%)',
    headerBorder: '2px solid #000080',
    tabEmoji: '🇮🇳',
    dateWindow: {
      startMonth: 1,
      startDay: 20,
      endMonth: 1,
      endDay: 28,
    },
  },
];

export const getFestivalConfig = (key: FestivalKey | string | null | undefined): FestivalThemeConfig | undefined => {
  if (!key) return undefined;
  const upper = key.toUpperCase();
  return FESTIVALS.find((f) => f.key === upper);
};

export const getCurrentFestivalSuggestion = (now: Date = new Date()): FestivalThemeConfig | null => {
  const currentMonth = now.getMonth() + 1; // 1-12
  const currentDay = now.getDate();        // 1-31

  for (const fest of FESTIVALS) {
    const { startMonth, startDay, endMonth, endDay } = fest.dateWindow;

    // Standard single-year window
    if (startMonth <= endMonth) {
      const isAfterStart = currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay);
      const isBeforeEnd = currentMonth < endMonth || (currentMonth === endMonth && currentDay <= endDay);
      if (isAfterStart && isBeforeEnd) {
        return fest;
      }
    } else {
      // Year-wrapping window (e.g., Dec 28 - Jan 6)
      const inYearEnd = currentMonth > startMonth || (currentMonth === startMonth && currentDay >= startDay);
      const inYearStart = currentMonth < endMonth || (currentMonth === endMonth && currentDay <= endDay);
      if (inYearEnd || inYearStart) {
        return fest;
      }
    }
  }

  return null;
};
