export const DISCUSSIONS_MOCK = [
  {
    id: "mock-1",
    author: "Minh Anh",
    university: "University of Da Nang",
    avatar: "M",
    title: "Anyone joining AI Hackathon 2026?",
    preview: "I am looking for teammates interested in NLP and computer vision for the upcoming AI Hackathon. Let's form a team and win this!",
    category: "general",
    tags: ["AI", "Hackathon", "Networking"],
    replies: 12,
    views: 234,
    lastActivity: "2h ago"
  },
  {
    id: "mock-2",
    author: "Thanh Trung",
    university: "Duy Tan University",
    avatar: "T",
    title: "How can I prepare for a startup competition?",
    preview: "First time joining a startup pitch competition. What are the key things judges look for in a pitch deck?",
    category: "skills",
    tags: ["Startup", "Pitching", "Business"],
    replies: 8,
    views: 156,
    lastActivity: "5h ago"
  },
  {
    id: "mock-3",
    author: "Huy Nguyen",
    university: "University of Education",
    avatar: "H",
    title: "Best opportunities for first-year students?",
    preview: "Just started uni and want to make the most of my time. What clubs or activities should I prioritize?",
    category: "skills",
    tags: ["First Year", "Advice"],
    replies: 24,
    views: 412,
    lastActivity: "1d ago"
  },
  {
    id: "mock-4",
    author: "Linh Chi",
    university: "University of Economics",
    avatar: "L",
    title: "Volunteer Program at Green City Project",
    preview: "Anyone participated in the Green City volunteering program? I'd love to hear about your experience.",
    category: "general",
    tags: ["Volunteer", "Environment"],
    replies: 6,
    views: 89,
    lastActivity: "3h ago"
  },
  {
    id: "mock-5",
    author: "Khoa Nguyen",
    university: "University of Science and Technology",
    avatar: "K",
    title: "Recommendations for UI/UX workshops",
    preview: "Looking for good UI/UX design workshops to level up my Figma skills. Any suggestions?",
    category: "skills",
    tags: ["UI/UX", "Design", "Workshop"],
    replies: 15,
    views: 198,
    lastActivity: "6h ago"
  },
  {
    id: "mock-6",
    author: "Phuong Anh",
    university: "University of Foreign Languages",
    avatar: "P",
    title: "Networking tips for international students",
    preview: "Being an international student, I find it hard to connect. Does anyone have tips on networking and overcoming the language barrier?",
    category: "skills",
    tags: ["Networking", "International", "Tips"],
    replies: 19,
    views: 276,
    lastActivity: "4h ago"
  },
  {
    id: "mock-7",
    author: "Gia Bao",
    university: "FPT University",
    avatar: "G",
    title: "Looking for a mentor in Web Development",
    preview: "I've learned React and Node.js but struggle with architecture. Looking for a mentor who can guide me on best practices.",
    category: "skills",
    tags: ["Mentorship", "Web Dev", "React"],
    replies: 5,
    views: 120,
    lastActivity: "1h ago"
  },
  {
    id: "mock-8",
    author: "Hoang Lan",
    university: "University of Medicine and Pharmacy",
    avatar: "H",
    title: "Balancing studies and extracurriculars",
    preview: "Medical school is tough, but I want to join some clubs. How do you guys manage your time effectively?",
    category: "general",
    tags: ["Time Management", "Study"],
    replies: 30,
    views: 540,
    lastActivity: "2d ago"
  },
  {
    id: "mock-9",
    author: "Duc Anh",
    university: "FPT University",
    avatar: "D",
    title: "Need help with algorithms",
    preview: "Does anyone have good resources for learning dynamic programming? I am struggling with it.",
    category: "skills",
    tags: ["Algorithms", "Programming"],
    replies: 15,
    views: 200,
    lastActivity: "10m ago"
  },
  {
    id: "mock-10",
    author: "Ngoc Bich",
    university: "University of Education",
    avatar: "N",
    title: "Looking for study buddies",
    preview: "Anyone studying IELTS? Let's practice speaking together every weekend.",
    category: "general",
    tags: ["Study Buddy", "IELTS"],
    replies: 4,
    views: 88,
    lastActivity: "45m ago"
  },
  {
    id: "mock-11",
    author: "Tuan Minh",
    university: "Duy Tan University",
    avatar: "T",
    title: "Feedback on my portfolio?",
    preview: "I just finished my frontend developer portfolio. Would love some constructive criticism.",
    category: "skills",
    tags: ["Portfolio", "Frontend", "Review"],
    replies: 10,
    views: 310,
    lastActivity: "1h ago"
  },
  {
    id: "mock-12",
    author: "Quynh Nhu",
    university: "University of Economics",
    avatar: "Q",
    title: "Marketing case study competition team",
    preview: "Looking for 2 more members for the upcoming marketing case challenge.",
    category: "general",
    tags: ["Marketing", "Competition"],
    replies: 7,
    views: 145,
    lastActivity: "3h ago"
  }
];

export const UNIVERSITIES_MOCK = [
  { id: 1, name: "University of Da Nang", memberCount: 2840, activeDiscussions: 156, color: "#3B6FD4" },
  { id: 2, name: "Duy Tan University", memberCount: 1950, activeDiscussions: 98, color: "#10B981" },
  { id: 3, name: "FPT University", memberCount: 1680, activeDiscussions: 87, color: "#F59E0B" },
  { id: 4, name: "University of Education", memberCount: 920, activeDiscussions: 45, color: "#8B5CF6" },
];

export const SKILLS_MOCK = [
  { id: 1, name: "Communication", icon: "forum", discussionCount: 156, color: "#3B82F6", description: "Public speaking, writing, presentation & more" },
  { id: 2, name: "Technical", icon: "code", discussionCount: 234, color: "#8B5CF6", description: "Coding, engineering, problem-solving & more" },
  { id: 3, name: "Creativity", icon: "palette", discussionCount: 112, color: "#F59E0B", description: "Design, innovation, artistic thinking & more" },
  { id: 4, name: "Social Impact", icon: "volunteer_activism", discussionCount: 89, color: "#10B981", description: "Leadership, community, volunteering & more" },
];

export const COMMENTS_MOCK = [
  { id: 1, discussionId: "mock-1", author: "Quang Huy", avatar: "Q", content: "Count me in! I have experience with PyTorch.", date: "1h ago", likes: 5 },
  { id: 2, discussionId: "mock-1", author: "Mai Lan", avatar: "M", content: "Great initiative! We need a front-end dev?", date: "45m ago", likes: 3, replyToId: 1, replyTo: { userId: 1, userName: "Quang Huy" } },
  { id: 12, discussionId: "mock-1", author: "Hoa Nguyen", avatar: "H", content: "I'm interested! What's the timeline?", date: "30m ago", likes: 2 },
  { id: 3, discussionId: "mock-2", author: "Bao Tran", avatar: "B", content: "Focus on your MVP first. Judges love seeing a working prototype.", date: "4h ago", likes: 8 },
  { id: 4, discussionId: "mock-3", author: "Thao Vy", avatar: "T", content: "First year is the best time to explore! Join 2-3 clubs of different types.", date: "12h ago", likes: 10 },
  { id: 8, discussionId: "mock-3", author: "Anh Khoa", avatar: "A", content: "Totally agree! Join clubs and talk to seniors.", date: "10h ago", likes: 6, replyToId: 4, replyTo: { userId: 4, userName: "Thao Vy" } },
  { id: 9, discussionId: "mock-3", author: "Bich Ngoc", avatar: "B", content: "What clubs would you recommend for a freshman?", date: "9h ago", likes: 3 },
  { id: 10, discussionId: "mock-3", author: "Thao Vy", avatar: "T", content: "The English club and the coding club are great starters!", date: "8h ago", likes: 7, replyToId: 9, replyTo: { userId: 9, userName: "Bich Ngoc" } },
  { id: 11, discussionId: "mock-3", author: "Cong Minh", avatar: "C", content: "Don't forget about volunteer groups too!", date: "6h ago", likes: 4, replyToId: 9, replyTo: { userId: 9, userName: "Bich Ngoc" } },
  { id: 5, discussionId: "mock-4", author: "Kim Ngan", avatar: "K", content: "Amazing experience! You get to plant trees and meet awesome people.", date: "2h ago", likes: 4 },
  { id: 6, discussionId: "mock-5", author: "Tuan Anh", avatar: "T", content: "Check Coursera for free courses, or local UX meetups.", date: "5h ago", likes: 6 },
  { id: 7, discussionId: "mock-6", author: "Minh Thu", avatar: "M", content: "Join the International Student Club! It helped me a lot.", date: "3h ago", likes: 5 },
  { id: 13, discussionId: "mock-7", author: "Hoang", avatar: "H", content: "I can help you review your code! Send me a DM.", date: "30m ago", likes: 1 },
  { id: 14, discussionId: "mock-8", author: "Chi", avatar: "C", content: "Google Calendar is your best friend.", date: "1d ago", likes: 15 }
];

const REALISTIC_ORGS = [
  { name: "GDSC DUT", slug: "gdsc-dut", followers: 1250, desc: "Google Developer Student Clubs tại ĐH Bách Khoa Đà Nẵng", eventTitle: "Tech Talk: AI & Cloud", color: "4285F4" },
  { name: "Media Club UFLs", slug: "media-ufls", followers: 890, desc: "CLB Truyền thông & Sự kiện ĐH Ngoại ngữ Đà Nẵng", eventTitle: "Workshop: Kỹ năng chụp ảnh sự kiện", color: "E11D48" },
  { name: "CTXH DUE", slug: "ctxh-due", followers: 2300, desc: "Đội Công tác Xã hội - Đại học Kinh tế Đà Nẵng", eventTitle: "Chiến dịch Mùa hè Xanh 2026", color: "10B981" },
  { name: "FPTU English Club", slug: "fptu-english", followers: 640, desc: "CLB Tiếng Anh sinh viên Đại học FPT Đà Nẵng", eventTitle: "English Speaking Contest", color: "F59E0B" },
  { name: "Soft Skills DTU", slug: "softskills-dtu", followers: 1100, desc: "CLB Kỹ Năng Mềm - Đại học Duy Tân", eventTitle: "Training: Kỹ năng thuyết trình", color: "8B5CF6" },
  { name: "Danang Student Guitar", slug: "dn-guitar", followers: 3200, desc: "Cộng đồng những người yêu Guitar tại Đà Nẵng", eventTitle: "Acoustic Night: Giai điệu mùa hạ", color: "D97706" },
  { name: "Eco Club UED", slug: "eco-ued", followers: 580, desc: "CLB Môi Trường - Đại học Sư Phạm Đà Nẵng", eventTitle: "Ngày hội Đổi rác lấy cây", color: "059669" },
  { name: "GDG Da Nang", slug: "gdg-danang", followers: 4500, desc: "Google Developer Groups Da Nang", eventTitle: "DevFest Da Nang 2026", color: "DB4437" },
  { name: "Startup Bách Khoa", slug: "startup-dut", followers: 750, desc: "CLB Sinh viên Khởi nghiệp Bách Khoa Đà Nẵng", eventTitle: "Cuộc thi Ý tưởng Khởi nghiệp", color: "2563EB" },
  { name: "Đoàn trường VKU", slug: "doan-vku", followers: 5600, desc: "Đoàn TNCS Hồ Chí Minh - Trường ĐH CNTT & TT Việt Hàn", eventTitle: "Lễ hội Chào Tân Sinh Viên VKU", color: "DC2626" },
  { name: "Tình nguyện Y Dược", slug: "volunteer-med", followers: 1400, desc: "CLB Tình Nguyện Sinh viên Y Dược Đà Nẵng", eventTitle: "Hiến máu nhân đạo: Giọt hồng 2026", color: "BE123C" },
  { name: "Nhiếp Ảnh Trẻ ĐN", slug: "photo-dn", followers: 2100, desc: "Cộng đồng Nhiếp Ảnh Trẻ Đà Nẵng", eventTitle: "Triển lãm ảnh: Đà Nẵng qua góc nhìn trẻ", color: "0F766E" },
];

export const ORGANIZATIONS_MOCK = REALISTIC_ORGS.map((org, i) => {
  const isPast = i % 2 !== 0;
  const dateStr = new Date(Date.now() + (isPast ? -86400000 : 86400000) * (i + 1) * 3).toISOString();
  return {
    _id: `org-mock-${i + 1}`,
    name: org.name,
    slug: org.slug,
    description: org.desc,
    followersCount: org.followers,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(org.name)}&background=${org.color}&color=fff&size=100`,
    mockEvents: [
      { 
        title: org.eventTitle, 
        heldDate: dateStr, 
        createdAt: dateStr,
        type: isPast ? "Workshop" : "Event" 
      }
    ]
  };
});
