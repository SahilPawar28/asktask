export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  payment: number;
  location: string;
  distance: string;
  timeNeeded: string;
  deadline: string;
  urgent: boolean;
  status: "open" | "in_progress" | "completed" | "verified" | "paid";
  creator: User;
  createdAt: string;
  imageUrl?: string;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  completedTasks: number;
  city: string;
  bio: string;
  verified: boolean;
}

export const categories = [
  { label: "All", icon: "🔥", value: "all" },
  { label: "Delivery", icon: "📦", value: "delivery" },
  { label: "Shopping", icon: "🛒", value: "shopping" },
  { label: "Food & Drinks", icon: "🍔", value: "food" },
  { label: "Tutoring", icon: "📚", value: "tutoring" },
  { label: "Tech Help", icon: "💻", value: "tech" },
  { label: "Cleaning", icon: "🧹", value: "cleaning" },
  { label: "Repairs", icon: "🔧", value: "repairs" },
  { label: "Moving", icon: "🚛", value: "moving" },
  { label: "Pet Care", icon: "🐾", value: "pet" },
  { label: "Errands", icon: "🏃", value: "errands" },
  { label: "Other", icon: "✨", value: "other" },
];

export const mockUsers: User[] = [
  { id: "1", name: "Priya Sharma", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya", rating: 4.8, completedTasks: 34, city: "Mumbai", bio: "Always happy to help! College student looking for side gigs.", verified: true },
  { id: "2", name: "Rahul Verma", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul", rating: 4.6, completedTasks: 21, city: "Delhi", bio: "Freelance photographer & part-time task doer.", verified: true },
  { id: "3", name: "Ananya Patel", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ananya", rating: 4.9, completedTasks: 56, city: "Bangalore", bio: "Super organized. I get things done fast!", verified: true },
  { id: "4", name: "Vikram Singh", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram", rating: 4.5, completedTasks: 12, city: "Pune", bio: "Engineering student, strong and reliable.", verified: false },
];

export const mockTasks: Task[] = [
  {
    id: "1", title: "Deliver a parcel to Andheri West", description: "Need someone to pick up a small package from my office in Bandra and deliver it to Andheri West. It's a document envelope, very light.", category: "delivery", payment: 150, location: "Bandra, Mumbai", distance: "3.2 km", timeNeeded: "45 min", deadline: "Today, 5 PM", urgent: true, status: "open", creator: mockUsers[0], createdAt: "10 min ago",
  },
  {
    id: "2", title: "Buy groceries from DMart", description: "Need someone to pick up groceries from DMart Koramangala. List will be shared. Around 15 items.", category: "shopping", payment: 200, location: "Koramangala, Bangalore", distance: "1.5 km", timeNeeded: "1 hour", deadline: "Today, 7 PM", urgent: false, status: "open", creator: mockUsers[2], createdAt: "25 min ago",
  },
  {
    id: "3", title: "Click product photos for my Etsy shop", description: "I need someone with a good phone camera to take photos of 10 handmade jewelry pieces. Natural lighting preferred. I'll provide styling props.", category: "photography", payment: 500, location: "Hauz Khas, Delhi", distance: "5 km", timeNeeded: "2 hours", deadline: "Tomorrow", urgent: false, status: "open", creator: mockUsers[1], createdAt: "1 hour ago",
  },
  {
    id: "4", title: "Help set up my new MacBook", description: "Just got a new MacBook. Need help transferring data from old laptop, installing apps, and setting up development environment (VS Code, Node.js, etc).", category: "tech", payment: 400, location: "Viman Nagar, Pune", distance: "2 km", timeNeeded: "2 hours", deadline: "This week", urgent: false, status: "open", creator: mockUsers[3], createdAt: "2 hours ago",
  },
  {
    id: "5", title: "Help move furniture to 2nd floor", description: "Moving to a new apartment. Need 2 people to help carry a sofa, table, and a few boxes up to the 2nd floor. Building has no elevator.", category: "moving", payment: 800, location: "Wakad, Pune", distance: "4 km", timeNeeded: "3 hours", deadline: "Saturday", urgent: false, status: "open", creator: mockUsers[3], createdAt: "3 hours ago",
  },
  {
    id: "6", title: "Pick up food from Biryani Blues", description: "Please pick up my order from Biryani Blues, Indiranagar and deliver to my address. Order will be prepaid.", category: "delivery", payment: 100, location: "Indiranagar, Bangalore", distance: "2.8 km", timeNeeded: "30 min", deadline: "Today, 1 PM", urgent: true, status: "open", creator: mockUsers[2], createdAt: "5 min ago",
  },
  {
    id: "7", title: "Deep clean a 1BHK apartment", description: "Need thorough cleaning of a 1BHK apartment. Kitchen, bathroom, bedroom, and living room. Cleaning supplies will be provided.", category: "cleaning", payment: 600, location: "Andheri East, Mumbai", distance: "1.2 km", timeNeeded: "4 hours", deadline: "Sunday", urgent: false, status: "open", creator: mockUsers[0], createdAt: "5 hours ago",
  },
  {
    id: "8", title: "Stand in line at passport office", description: "Need someone to stand in line at the passport office and hold my spot. I'll arrive 30 min before my appointment.", category: "errands", payment: 300, location: "Lajpat Nagar, Delhi", distance: "6 km", timeNeeded: "2 hours", deadline: "Monday 9 AM", urgent: false, status: "open", creator: mockUsers[1], createdAt: "6 hours ago",
  },
];
