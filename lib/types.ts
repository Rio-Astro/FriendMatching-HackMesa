export type RouteName =
  | 'landing'
  | 'auth'
  | 'quiz'
  | 'results'
  | 'selection'
  | 'me'
  | 'posts'
  | 'network'
  | 'profile';

export type NavItem = {
  id: RouteName;
  label: string;
};

export type QuizQuestionId = 'q1' | 'q2' | 'q3' | 'q4' | 'q5' | 'q6' | 'q7' | 'q8' | 'q9';

export type QuizAnswerValue = string;

export type QuizAnswers = Partial<Record<QuizQuestionId, QuizAnswerValue>>;

export type SchoolBand = 'low' | 'mid' | 'high';

export type School = {
  id: string;
  name: string;
  state: string;
  size: string;
  tuition: string;
  band: string;
  tags: string[];
  imageUrl: string | null;
  bio: string;
};

export type MatchedSchool = School & {
  score: number;
  why: string;
};

export type QuizOption = {
  key: string;
  label: string;
  desc?: string;
};

export type QuizQuestion = {
  id: QuizQuestionId;
  eyebrow: string;
  title: string;
  hint: string;
  type?: 'select' | 'search-select';
  options: QuizOption[];
};

export type FriendCard = {
  id: string;
  name: string;
  age?: number;
  graduationYear?: number | null;
  major?: string;
  initials: string;
  avatarEmoji?: string;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  isDemo?: boolean;
  demoLabel?: 'Demo' | 'AI' | null;
  school: string;
  origin: string;
  bio: string;
  interests: string[];
  goals: string[];
  compat: number;
  shared: string[];
  reason: string;
  selectedSchools?: string[];
  tone: 'sage' | 'sand' | 'clay';
};

export type FriendFeedResult = {
  items: FriendCard[];
  savedProfileIds: string[];
};

export type FriendActionType = 'save' | 'hide' | 'block' | 'report';

export type PostItem = {
  id: string;
  author: string;
  initials: string;
  avatarEmoji?: string;
  school: string;
  title: string;
  body: string;
  tags: string[];
  when: string;
  saves: number;
  replies: number;
};

export type MatchProfile = {
  id: string;
  clerkUserId?: string | null;
  displayName: string;
  graduationYear: number | null;
  major: string;
  bio: string;
  homeState: string;
  avatarType: 'initials' | 'uploaded' | 'demo';
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  isDemo: boolean;
  demoLabel?: 'Demo' | 'AI' | null;
  profileStatus: 'active' | 'paused' | 'hidden';
  interests: string[];
  goals: string[];
  selectedSchoolIds: string[];
  selectedSchools: string[];
};

export type MatchProfileDraft = {
  displayName: string;
  graduationYear: number | null;
  major: string;
  bio: string;
  homeState: string;
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
  profileStatus: 'active' | 'paused';
  interests: string[];
  goals: string[];
  selectedSchoolIds: string[];
};

export type CompatibilityEdge = {
  viewerProfileId: string;
  candidateProfileId: string;
  score: number;
  sharedColleges: string[];
  sharedSignals: string[];
  whyMatchCached?: string | null;
  whyMatchGeneratedAt?: string | null;
};

export type MessageThread = {
  id: string;
  profileAId: string;
  profileBId: string;
  createdAt: string;
  updatedAt: string;
};

export type DirectMessage = {
  id: string;
  threadId: string;
  senderProfileId: string;
  body: string;
  createdAt: string;
  readAt?: string | null;
};
