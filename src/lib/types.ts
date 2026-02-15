

export type UserRole = 'student' | 'owner' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  profile?: RoommateProfile;
}

export interface RoommateProfile {
  skills: string;
  interests: string;
  age: number;
  occupation: string;
  preferences: string;
  bio?: string;
  avatarUrl?: string;
  city: string;
  preferredCity: string;
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  contactNumber?: string;
}


export interface UserProfile extends Partial<RoommateProfile> {
    id: string;
    email?: string;
    name?: string;
    role?: UserRole;
    avatarUrl?: string;
}

export interface Hostel {
  id: string;
  name: string;
  location: string;
  description: string;
  amenities: string[];
  price: number;
  imageUrls: string[];
  imageHint?: string;
  ownerId: string;
  googleMapUrl?: string;
  createdAt: string;
  updatedAt?: string;
  rules?: string;
  deposit?: number;
  hostelFor: 'girls' | 'boys' | 'both';
  rating: number;
  reviewsCount: number;
  checkInTime: string;
  checkOutTime: string;
  isHidden?: boolean;
  isAcceptingStudents?: boolean;
}

export interface QuotationItem {
  id: string;
  name: string;
  amount: number;
}

export interface Quotation {
  items: QuotationItem[];
  total: number;
  status: 'pending' | 'paid' | 'declined';
  createdAt: string;
  platformFee?: number;
}


export interface Inquiry {
  id: string;
  hostelId: string;
  hostelName: string;
  ownerId: string;
  userId: string;
  userName: string;
  userEmail: string;
  userContact: string;
  createdAt: string;
  message?: string;
  demandedAmount?: number | null;
  quotation?: Quotation;
}

export interface InquiryWithUser extends Inquiry {
  user?: UserProfile;
}

export interface Chat {
  id: string;
  participantIds: string[];
  participants: { [key: string]: { name: string; avatarUrl: string | null } };
  lastMessage: Message | null;
  createdAt: any; // Can be Date or Firestore Timestamp
  updatedAt: any; // Can be Date or Firestore Timestamp
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: any; // Can be Date or Firestore Timestamp
}
