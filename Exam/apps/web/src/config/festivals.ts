import { FestivalKey } from '@repo/types';

export interface FestivalThemeConfig {
  key: FestivalKey;
  name: string;
  badge: string;
  title: string;
  description: string;
  primaryColor: string;
  accentRgb: string;
  gradient: string;
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
    description: 'Vibrant gulal magenta and joyful warm celebrations',
    primaryColor: '#ec4899',
    accentRgb: '236, 72, 153',
    gradient: 'linear-gradient(135deg, #ec4899, #f97316)',
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
    description: 'Golden radiance, diya brilliance, and warm celebrations',
    primaryColor: '#eab308',
    accentRgb: '234, 179, 8',
    gradient: 'linear-gradient(135deg, #eab308, #ea580c)',
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
    badge: '✨',
    title: 'New Year Sparkle',
    description: 'Electric violet and midnight frost celebration',
    primaryColor: '#8b5cf6',
    accentRgb: '139, 92, 246',
    gradient: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
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
    description: 'Marigold saffron and spring renewal prosperity',
    primaryColor: '#f97316',
    accentRgb: '249, 115, 22',
    gradient: 'linear-gradient(135deg, #f97316, #10b981)',
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
    description: 'Holly crimson and evergreen festive spirit',
    primaryColor: '#ef4444',
    accentRgb: '239, 68, 68',
    gradient: 'linear-gradient(135deg, #ef4444, #10b981)',
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
    description: 'Crescent emerald tranquility and shared harmony',
    primaryColor: '#059669',
    accentRgb: '5, 150, 105',
    gradient: 'linear-gradient(135deg, #059669, #34d399)',
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
    description: 'Patriotic saffron, white, and green unity',
    primaryColor: '#ea580c',
    accentRgb: '234, 88, 12',
    gradient: 'linear-gradient(135deg, #ea580c, #16a34a)',
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
    title: 'Ashok Chakra Azure',
    description: 'Constitution Day royal chakra blue and tricolor honor',
    primaryColor: '#2563eb',
    accentRgb: '37, 99, 235',
    gradient: 'linear-gradient(135deg, #2563eb, #ea580c)',
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

    // Standard single-year window (e.g., Oct 15 - Nov 15 or Aug 10 - Aug 18)
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
