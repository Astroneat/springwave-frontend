const discussions = [
  {
    id: 1,
    author: "Minh Anh",
    university: "University of Da Nang",
    avatar: "M",
    title: "Anyone joining AI Hackathon 2026?",
    preview: "Looking for teammates interested in NLP and computer vision. Let's form a team and build something amazing together!",
    category: "general",
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
    category: "general",
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
  if (category === "event" || category === "uni" || category === "mine" || category === "saved") return [];
  return discussions.filter((d) => d.category === category);
}

export function getEventById(id) {
  return upcomingEvents.find((e) => String(e.id) === String(id)) || null;
}

export function getEvents() {
  return [...upcomingEvents];
}

const comments = [
  { id: 1, discussionId: 1, author: "Quang Huy", avatar: "Q", content: "Count me in! I have experience with NLP from my university projects. Let me know if you need any help.", date: "1h ago", likes: 5 },
  { id: 2, discussionId: 1, author: "Mai Lan", avatar: "M", content: "Great initiative! I'm also looking for a team. My strength is computer vision and image processing.", date: "45m ago", likes: 3 },
  { id: 3, discussionId: 1, author: "Anh Khoa", avatar: "A", content: "I'd love to join too! I can handle the backend and API integration part.", date: "30m ago", likes: 2 },
  { id: 4, discussionId: 2, author: "Bao Tran", avatar: "B", content: "Startup competitions are all about execution. Focus on your MVP and customer validation first.", date: "4h ago", likes: 8 },
  { id: 5, discussionId: 2, author: "Duc Minh", avatar: "D", content: "I recommend using the Business Model Canvas — it really helps structure your pitch.", date: "3h ago", likes: 6 },
  { id: 6, discussionId: 2, author: "Hoang Nguyen", avatar: "H", content: "Practice your pitch in front of friends first. Get feedback and iterate quickly!", date: "2h ago", likes: 4 },
  { id: 7, discussionId: 3, author: "Thao Vy", avatar: "T", content: "First year is the best time to explore! Try joining clubs, attending workshops, and networking.", date: "12h ago", likes: 10 },
  { id: 8, discussionId: 3, author: "Cong Dat", avatar: "C", content: "Don't stress too much. Focus on your studies first, then look for extracurriculars that interest you.", date: "10h ago", likes: 7 },
  { id: 9, discussionId: 4, author: "Kim Ngan", avatar: "K", content: "I participated last year! It was an amazing experience. The organizing team was very supportive.", date: "2h ago", likes: 4 },
  { id: 10, discussionId: 5, author: "Tuan Anh", avatar: "T", content: "Check out the UI/UX Design course on Coursera — it's free for students!", date: "5h ago", likes: 6 },
  { id: 11, discussionId: 6, author: "Minh Thu", avatar: "M", content: "Join the International Student Club at your university. It's a great way to meet people!", date: "3h ago", likes: 5 },
];

export function getComments(discussionId) {
  return comments.filter((c) => c.discussionId === discussionId);
}

export function getTopComment(discussionId) {
  const discComments = comments.filter((c) => c.discussionId === discussionId);
  if (discComments.length === 0) return null;
  return discComments.reduce((best, c) => (c.likes > best.likes ? c : best));
}

export function addComment(discussionId, content) {
  const user = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  })();
  const newComment = {
    id: comments.length + 1,
    discussionId,
    author: user.name || "You",
    avatar: (user.name || "Y")[0],
    content,
    date: "Just now",
    likes: 0,
  };
  comments.push(newComment);
  const disc = discussions.find((d) => d.id === discussionId);
  if (disc) disc.replies++;
  return newComment;
}
