import type { Entry, Folder, UserSettings } from '../types';
import { CONFIG } from '../config';

export function getInitialDemoFolders(): Folder[] {
  const now = Date.now();
  return [
    {
      id: CONFIG.defaultFolderId,
      name: CONFIG.defaultFolderName,
      color: '#6B74F5',
      icon: 'book-open',
      parentId: null,
      order: 0,
      isDefault: true,
      createdAt: now - 90 * 86400000,
      updatedAt: now - 90 * 86400000,
      deletedAt: null,
    },
    {
      id: 'folder-reflections',
      name: 'Reflections',
      color: '#B5609A',
      icon: 'sparkles',
      parentId: null,
      order: 1,
      isDefault: false,
      createdAt: now - 80 * 86400000,
      updatedAt: now - 80 * 86400000,
      deletedAt: null,
    },
    {
      id: 'folder-work',
      name: 'Ideas & Work',
      color: '#00C896',
      icon: 'lightbulb',
      parentId: null,
      order: 2,
      isDefault: false,
      createdAt: now - 60 * 86400000,
      updatedAt: now - 60 * 86400000,
      deletedAt: null,
    },
  ];
}

export function getInitialDemoSettings(): UserSettings {
  return {
    theme: 'system',
    sortBy: 'entryDate',
    sortDir: 'desc',
    streakSchedule: 'weekly',
    pinnedOrder: [],
    lastBackupAt: Date.now() - 5 * 86400000,
    moodPrompt: false,
  };
}

function makeTiptapJson(paragraphs: string[]): string {
  const content = paragraphs.map((p) => ({
    type: 'paragraph',
    content: [{ type: 'text', text: p }],
  }));
  return JSON.stringify({
    type: 'doc',
    content,
  });
}

export function generateDemoEntries(): Entry[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  const entries: Entry[] = [];

  const rawTemplates: Array<{
    title: string;
    daysAgo: number;
    paragraphs: string[];
    folderIds: string[];
    tags: string[];
    bookmarked?: boolean;
    pinned?: boolean;
    mood?: { valence: number; labels: string[]; impacts: string[] };
    songs?: Array<{ url: string; provider: 'spotify' | 'youtube' | 'apple-music'; title: string; artist: string }>;
    location?: { name: string; lat?: number; lng?: number };
  }> = [
    // Today
    {
      title: 'Morning chai aur barish ki khushboo',
      daysAgo: 0,
      paragraphs: [
        'Aaj subah balcony me baith kar garam chai pi. Halki halki barish ho rahi thi aur mitti ki saundhi khushboo poore ghar me phail gayi.',
        'Sometimes it feels like life is running so fast, but moments like these bring complete stillness. Mann ekdum shant ho gaya.',
        'Aaj ka plan: complete the pending tasks without rushing, listen to some acoustic music, and stay present in the conversation.'
      ],
      folderIds: [CONFIG.defaultFolderId, 'folder-reflections'],
      tags: ['peace', 'chai', 'morning'],
      bookmarked: true,
      pinned: true,
      mood: { valence: 5, labels: ['Calm', 'Content', 'Grateful'], impacts: ['Self', 'Weather'] },
      songs: [{ url: 'https://open.spotify.com/track/sample1', provider: 'spotify', title: 'Iktara', artist: 'Amit Trivedi, Kavita Seth' }],
      location: { name: 'Balcony, home', lat: 28.6139, lng: 77.209 },
    },
    // Yesterday
    {
      title: 'Late night problem solved after hours',
      daysAgo: 1,
      paragraphs: [
        'Last night was intense. I was stuck on an architecture issue for almost four hours.',
        'Then I took a 15-minute walk, came back, drank a glass of cold water, and the solution was staring right at me. Simple clean code beats clever hacks every single time.',
        'Bohot sukoon mila jab saare unit tests pass ho gaye. Slept like a baby.'
      ],
      folderIds: ['folder-work'],
      tags: ['coding', 'focus', 'breakthrough'],
      bookmarked: false,
      pinned: true,
      mood: { valence: 5, labels: ['Excited', 'Happy'], impacts: ['Work', 'Self'] }
    },
    // 2 days ago
    {
      title: 'Dost ke sath purani yaadein',
      daysAgo: 2,
      paragraphs: [
        'Met Rahul after almost eight months. Hum dono college ke paas wale dhaba gaye jaha pehle ghanto baithte the.',
        'It was funny how within 5 minutes we were laughing at the exact same jokes from 6 years ago. Waqt kitna bhi aage nikal jaye, true friendship stays untouched.',
        'Grateful to have people in life who know you without any filters.'
      ],
      folderIds: [CONFIG.defaultFolderId],
      tags: ['friends', 'nostalgia', 'gratitude'],
      bookmarked: true,
      mood: { valence: 6, labels: ['Happy', 'Grateful'], impacts: ['Friends'] }
    },
    // 4 days ago
    {
      title: 'Designing a calmer digital routine',
      daysAgo: 4,
      paragraphs: [
        'Noticed that checking social media right after waking up raises cortisol levels for no reason.',
        'Decided to put phone in another room overnight. No screen for the first 45 minutes of the morning. Reading physical books instead.',
        'Small habits compound over months into a completely different mental health baseline.'
      ],
      folderIds: ['folder-reflections'],
      tags: ['mindfulness', 'habits', 'digital-detox'],
      mood: { valence: 4, labels: ['Calm', 'Hopeful'], impacts: ['Health', 'Self'] }
    },
    // 6 days ago
    {
      title: 'Sunday evening walk and a quiet sunset',
      daysAgo: 6,
      paragraphs: [
        'Walked through the neighborhood botanical garden. Golden hour sunlight filtering through tall banyan trees.',
        'Saw kids playing cricket, elder folks talking about politics on the stone benches, and dogs chasing tennis balls.',
        'Zindagi ki asli sundarta inhi choti cheezon me chhipi hoti hai.'
      ],
      folderIds: [CONFIG.defaultFolderId],
      tags: ['walk', 'sunset', 'delight'],
      bookmarked: false,
      mood: { valence: 5, labels: ['Calm', 'Content'], impacts: ['Weather', 'Self'] }
    },
    // 8 days ago
    {
      title: 'Overwhelmed with multiple deadlines',
      daysAgo: 8,
      paragraphs: [
        'Work has been chaotic this week. Too many context switches and unexpected urgent requests.',
        'Felt stressed and anxious around 3 PM. Heart beating fast.',
        'Wrote down everything on a single sheet of paper and crossed off what does not truly matter today. Deep breathing for 10 minutes helped regain control.'
      ],
      folderIds: ['folder-work'],
      tags: ['stress', 'work', 'grounding'],
      mood: { valence: 1, labels: ['Stressed', 'Anxious', 'Tired'], impacts: ['Work'] }
    },
    // 11 days ago
    {
      title: 'Ghar ki yaad aur maa ke haath ka khana',
      daysAgo: 11,
      paragraphs: [
        'Called mummy today in the afternoon. She was making aloo parathe and gajar ka halwa.',
        'Hostel aur flat life me kitna bhi accha khana bana lo, maa ke haath ke swad ka koi comparison nahi hai.',
        'Planning to visit home next month for Diwali for at least 10 days.'
      ],
      folderIds: [CONFIG.defaultFolderId, 'folder-reflections'],
      tags: ['family', 'home', 'love'],
      bookmarked: true,
      mood: { valence: 4, labels: ['Grateful', 'Hopeful'], impacts: ['Family'] }
    },
    // 14 days ago
    {
      title: 'Notes on building resilient software',
      daysAgo: 14,
      paragraphs: [
        '1. Expect network failure at any moment.\n2. Keep local cache authoritative for the user experience.\n3. Write idempotent operations with predictable retries.\n4. Design UI that never blocks typing.',
        'Simplicity in systems architecture is the hardest thing to achieve, but pays lifelong dividends.'
      ],
      folderIds: ['folder-work'],
      tags: ['architecture', 'learning', 'tech'],
      bookmarked: false
    },
    // 18 days ago
    {
      title: 'Coffee tasting and finding a new dark roast',
      daysAgo: 18,
      paragraphs: [
        'Visited the artisan roastery downtown. Tried an Ethiopian Yirgacheffe with distinct floral and berry notes, and a Chikmagalur dark roast.',
        'The manual pour-over technique really changes the acidity balance.',
        'A good cup of black coffee is one of life\'s most accessible luxuries.'
      ],
      folderIds: [CONFIG.defaultFolderId],
      tags: ['coffee', 'taste', 'rituals'],
      mood: { valence: 4, labels: ['Content'], impacts: ['Self'] }
    },
    // 22 days ago
    {
      title: 'Learning to say no gracefully',
      daysAgo: 22,
      paragraphs: [
        'When you say yes to something unimportant, you are implicitly saying no to your sleep, your peace of mind, or your creative deep work.',
        'Polite rejection is an essential skill. "Thank you for thinking of me, but I have committed my focus elsewhere right now."'
      ],
      folderIds: ['folder-reflections'],
      tags: ['boundaries', 'wisdom', 'focus'],
      bookmarked: true,
      pinned: true,
      mood: { valence: 4, labels: ['Calm'], impacts: ['Self'] }
    },
    // 26 days ago
    {
      title: 'Rainy afternoon reading session',
      daysAgo: 26,
      paragraphs: [
        'Read two chapters of Marcus Aurelius Meditations while rain lashed against the glass windows.',
        '"You have power over your mind - not outside events. Realize this, and you will find strength."',
        'Timeless insights written two thousand years ago still feeling like a personal letter.'
      ],
      folderIds: [CONFIG.defaultFolderId, 'folder-reflections'],
      tags: ['books', 'stoicism', 'philosophy'],
      mood: { valence: 5, labels: ['Calm', 'Content'], impacts: ['Self'] }
    },
  ];

  // Also create an entry from exactly 1 year ago today for "On This Day" feature!
  const pastYearEntryDate = new Date(currentYear - 1, currentMonth, currentDate, 10, 15, 0).getTime();
  const pastYearEntry: Entry = {
    id: 'demo-on-this-day-1',
    title: 'On this day last year — Beginning of a new journey',
    bodyJson: makeTiptapJson([
      'Ek saal pehle aaj hi ke din maine nayi shuruat ki thi. Bohot saare darr the aur future uncertain lag raha tha.',
      'Looking back today, so many things I worried about never came to pass, and the challenges I did face ended up teaching me resilience.',
      'Grateful for where I am today and curious about what the next 365 days will bring.'
    ]),
    plainText: 'Ek saal pehle aaj hi ke din maine nayi shuruat ki thi. Bohot saare darr the aur future uncertain lag raha tha. Looking back today, so many things I worried about never came to pass...',
    snippet: 'Ek saal pehle aaj hi ke din maine nayi shuruat ki thi. Bohot saare darr the aur future uncertain lag raha tha. Looking back today...',
    wordCount: 84,
    entryDate: pastYearEntryDate,
    createdAt: pastYearEntryDate,
    updatedAt: pastYearEntryDate,
    folderIds: [CONFIG.defaultFolderId, 'folder-reflections'],
    tags: ['anniversary', 'reflection', 'gratitude'],
    bookmarked: true,
    pinned: false,
    pinnedAt: null,
    mood: { valence: 5, labels: ['Grateful', 'Hopeful'], impacts: ['Self'] },
    media: [],
    coverThumb: null,
    songs: [],
    deletedAt: null,
    source: 'app',
    importKey: null,
    schemaVersion: 1,
  };
  entries.push(pastYearEntry);

  // Generate 60 entries covering various dates across the current year
  const topics = [
    { title: 'Subah ki running aur taaza hawa', tag: 'health', folder: CONFIG.defaultFolderId, val: 5 },
    { title: 'Designing user interfaces that feel native', tag: 'design', folder: 'folder-work', val: 4 },
    { title: 'Chhoti chhoti khushiyan', tag: 'happiness', folder: 'folder-reflections', val: 6 },
    { title: 'Weekly grocery shopping and cooking dal makhani', tag: 'cooking', folder: CONFIG.defaultFolderId, val: 4 },
    { title: 'Reflections on career direction and purpose', tag: 'career', folder: 'folder-work', val: 3 },
    { title: 'Kavita aur purani ghazalein sunte hue', tag: 'music', folder: 'folder-reflections', val: 5 },
    { title: 'Meditation practice: 20 days streak', tag: 'meditation', folder: 'folder-reflections', val: 5 },
    { title: 'A quiet evening with green tea and notebook', tag: 'writing', folder: CONFIG.defaultFolderId, val: 4 },
    { title: 'Managing burnout before it manages you', tag: 'wellness', folder: 'folder-work', val: 2 },
    { title: 'Weekend road trip into the green hills', tag: 'travel', folder: CONFIG.defaultFolderId, val: 6 },
    { title: 'Clean desk, clean mind experiment', tag: 'productivity', folder: 'folder-work', val: 4 },
    { title: 'Purane dosto se phone par lambi baat', tag: 'friends', folder: CONFIG.defaultFolderId, val: 5 },
  ];

  rawTemplates.forEach((t, i) => {
    const entryDate = now.getTime() - t.daysAgo * 86400000 - (i * 3600000);
    const plainText = t.paragraphs.join('\n\n');
    entries.push({
      id: `demo-entry-${i + 1}`,
      title: t.title,
      bodyJson: makeTiptapJson(t.paragraphs),
      plainText,
      snippet: plainText.slice(0, 160).replace(/\n/g, ' '),
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      entryDate,
      createdAt: entryDate,
      updatedAt: entryDate,
      folderIds: t.folderIds,
      tags: t.tags,
      bookmarked: !!t.bookmarked,
      pinned: !!t.pinned,
      pinnedAt: t.pinned ? entryDate : null,
      mood: t.mood || null,
      media: [],
      coverThumb: null,
      songs: t.songs || [],
      location: t.location || null,
      deletedAt: null,
      source: 'app',
      importKey: null,
      schemaVersion: 1,
    });
  });

  // Now create remaining up to ~60 entries spread over past 250 days
  let count = entries.length;
  for (let d = 30; count < 60; d += 4) {
    const topic = topics[count % topics.length];
    const entryDate = now.getTime() - d * 86400000 + ((count % 7) * 3600000);
    const paras = [
      `Journal note for entry ${count + 1}: ${topic.title}. Thoughtful notes exploring thoughts on ${topic.tag}.`,
      'Har din ek naya sabak leke aata hai. Focus on continuous improvement and staying grounded.',
      'Taking time to write things down makes complex situations feel manageable and light.'
    ];
    const plainText = paras.join('\n\n');

    entries.push({
      id: `demo-entry-${count + 1}`,
      title: `${topic.title} (#${count + 1})`,
      bodyJson: makeTiptapJson(paras),
      plainText,
      snippet: plainText.slice(0, 160).replace(/\n/g, ' '),
      wordCount: plainText.split(/\s+/).filter(Boolean).length,
      entryDate,
      createdAt: entryDate,
      updatedAt: entryDate,
      folderIds: [topic.folder],
      tags: [topic.tag, 'daily'],
      bookmarked: count % 5 === 0,
      pinned: false,
      pinnedAt: null,
      mood: { valence: topic.val, labels: ['Content'], impacts: ['Self'] },
      media: [],
      coverThumb: null,
      songs: [],
      location: null,
      deletedAt: null,
      source: 'app',
      importKey: null,
      schemaVersion: 1,
    });
    count++;
  }

  return entries;
}
