const discussions = [
  {
    id: 1,
    author: "Minh Anh",
    university: "University of Da Nang",
    avatar: "M",
    title: "Anyone joining AI Hackathon 2026?",
    preview: "Looking for teammates interested in NLP and computer vision. Let's form a team and build something amazing together!",
    category: "event",
    tags: ["AI", "Hackathon", "Team Building"],
    replies: 12,
    views: 234,
    lastActivity: "2h ago",
  },
  {
    id: 2,
    author: "Thanh Trung",
    university: "Duy Tan University",
    avatar: "T",
    title: "How can I prepare for a startup competition?",
    preview: "First time joining a startup pitch competition. Any tips on building a business model canvas and pitching?",
    category: "skills",
    tags: ["Startup", "Pitching", "Business"],
    replies: 8,
    views: 156,
    lastActivity: "5h ago",
  },
  {
    id: 3,
    author: "Huy Nguyen",
    university: "University of Education",
    avatar: "H",
    title: "Best opportunities for first-year students?",
    preview: "Just started uni and want to make the most of my time. What activities should I look into?",
    category: "skills",
    tags: ["First Year", "Guidance", "Opportunities"],
    replies: 24,
    views: 412,
    lastActivity: "1d ago",
  },
  {
    id: 4,
    author: "Linh Chi",
    university: "University of Economics",
    avatar: "L",
    title: "Volunteer Program at Green City Project",
    preview: "Anyone participated in the Green City volunteering program? Would love to hear about your experience!",
    category: "event",
    tags: ["Volunteer", "Environment", "Community"],
    replies: 6,
    views: 89,
    lastActivity: "3h ago",
  },
  {
    id: 5,
    author: "Khoa Nguyen",
    university: "University of Science and Technology",
    avatar: "K",
    title: "Recommendations for UI/UX workshops this semester",
    preview: "Looking for good UI/UX design workshops in Da Nang. Any recommendations from seniors?",
    category: "skills",
    tags: ["UI/UX", "Design", "Workshops"],
    replies: 15,
    views: 198,
    lastActivity: "6h ago",
  },
  {
    id: 6,
    author: "Phuong Anh",
    university: "University of Foreign Languages",
    avatar: "P",
    title: "Networking tips for international students",
    preview: "Being an international student, I find it hard to connect. Any advice on making friends and finding opportunities?",
    category: "skills",
    tags: ["Networking", "International", "Tips"],
    replies: 19,
    views: 276,
    lastActivity: "4h ago",
  },
];

const universityCommunities = [
  {
    id: 1,
    name: "University of Da Nang",
    memberCount: 2840,
    activeDiscussions: 156,
    color: "#3B6FD4",
  },
  {
    id: 2,
    name: "Duy Tan University",
    memberCount: 1950,
    activeDiscussions: 98,
    color: "#10B981",
  },
  {
    id: 3,
    name: "FPT University",
    memberCount: 1680,
    activeDiscussions: 87,
    color: "#F59E0B",
  },
  {
    id: 4,
    name: "University of Education",
    memberCount: 920,
    activeDiscussions: 45,
    color: "#8B5CF6",
  },
];

const skillTopics = [
  {
    id: 1,
    name: "Communication",
    icon: "forum",
    discussionCount: 156,
    color: "#3B82F6",
    description: "Public speaking, writing, presentation & more",
  },
  {
    id: 2,
    name: "Technical",
    icon: "code",
    discussionCount: 234,
    color: "#8B5CF6",
    description: "Coding, engineering, problem-solving & more",
  },
  {
    id: 3,
    name: "Creativity",
    icon: "palette",
    discussionCount: 112,
    color: "#F59E0B",
    description: "Design, innovation, artistic thinking & more",
  },
  {
    id: 4,
    name: "Social Impact",
    icon: "volunteer_activism",
    discussionCount: 89,
    color: "#10B981",
    description: "Leadership, community, volunteering & more",
  },
];

const upcomingEvents = [
  { id: 1, title: "AI Innovation Workshop", date: "15 Jun 2026", attendees: 48 },
  { id: 2, title: "Startup Pitch Night", date: "22 Jun 2026", attendees: 32 },
  { id: 3, title: "Green City Volunteer Day", date: "28 Jun 2026", attendees: 74 },
];

const popularDiscussions = [
  { id: 1, title: "Best opportunities for first-year students?", replies: 24 },
  { id: 2, title: "Networking tips for international students", replies: 19 },
  { id: 3, title: "UI/UX workshop recommendations", replies: 15 },
];

const aiSuggestions = [
  { id: 1, title: "AI Workshop — Build your first ML model", reason: "Matches your interest in AI" },
  { id: 2, title: "Startup 101: From idea to MVP", reason: "Based on your career goal" },
  { id: 3, title: "Design Thinking Workshop", reason: "Skill gap identified: UX Research" },
];

export function getTrendingDiscussions() {
  return [...discussions];
}

export function getUniversityCommunities() {
  return [...universityCommunities];
}

export function getSkillTopics() {
  return [...skillTopics];
}

export function getUpcomingEvents() {
  return [...upcomingEvents];
}

export function getPopularDiscussions() {
  return [...popularDiscussions];
}

export function getAISuggestions() {
  return [...aiSuggestions];
}

export function getDiscussionsByCategory(category) {
  if (category === "all") return [...discussions];
  return discussions.filter((d) => d.category === category);
}
