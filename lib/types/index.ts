export type AccountType = 'CARE_RECEIVER' | 'CAREGIVER' | 'FIRM_ADMIN';

export interface User {
  id: string;
  fullName: string;
  email: string;
  accountType: AccountType;
  linkedAccountTypes?: AccountType[];
  phone?: string;
  profileImageKey?: string;
  isEmailVerified: boolean;
  passwordSet: boolean;
  dateOfBirth?: string;
  gender?: string;
  relationship?: string;
  country?: string;
  state?: string;
  city?: string;
  homeAddress?: string;
  timezone?: string;
  isProfileComplete?: boolean;
  createdAt: string;
  careReceiverProfile?: CareReceiverProfile | null;
  caregiverProfile?: CaregiverProfile | null;
  firmAdminProfile?: FirmProfile | null;
}

export interface CareReceiverProfile {
  id: string;
  userId: string;
  caregiverProfileId?: string;
  isSelfManaged?: boolean;
  dateOfBirth?: string;
  medicalNotes?: string;
  address?: string;
  emergencyContact?: string;
  primaryCaregiverId?: string;
}

export interface CaregiverProfile {
  id: string;
  userId: string;
  selfCareReceiverId?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  certifications?: string;
  hourlyRate?: number;
  bio?: string;
}

export interface FirmProfile {
  id: string;
  userId: string;
  firmName: string;
  registrationNo?: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
}

export interface FirmAffiliation {
  id: string;
  caregiverId: string;
  firmId: string;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  isActiveContext: boolean;
}

export interface CaregiverInvite {
  id: string;
  careReceiverId: string;
  caregiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  isFirstInvite: boolean;
  createdAt: string;
}

export interface FirmInvite {
  id: string;
  firmId: string;
  caregiverId: string;
  inviteType: 'EXISTING_USER' | 'NEW_VIA_EMAIL';
  inviteeEmail?: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface PhoneLoginData {
  phone: string;
  code: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ConversationParticipant {
  userId: string;
  user: { id: string; fullName: string; profileImageKey?: string };
}

export interface BackendMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; fullName: string; profileImageKey?: string };
}

export interface BackendConversation {
  id: string;
  participants: ConversationParticipant[];
  messages: BackendMessage[];
  unreadCount: number;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt: string;
}

export type AlertType =
  | 'SOS_TRIGGERED'
  | 'FALL_DETECTED'
  | 'MISSED_MEDICATION'
  | 'LOW_ACTIVITY'
  | 'UPCOMING_MEDICATION'
  | 'DEVICE_OFFLINE';

export type AlertSeverity = 'CRITICAL' | 'ATTENTION_NEEDED';
export type AlertStatus = 'ACTIVE' | 'CHECKED_IN' | 'RESOLVED';

export interface Alert {
  id: string;
  careReceiverId: string;
  caregiverProfileId: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
  careReceiver?: {
    id: string;
    userId: string;
    user: { id: string; fullName: string; profileImageKey?: string } | null;
  } | null;
}
