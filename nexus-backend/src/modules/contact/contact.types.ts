// Contact/Support inbox message types. Deliberately standalone: submissions
// never auto-create Leads or Clients, keeping the existing Lead -> Client ->
// Project flow untouched.
export interface CreateContactMessageInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject: string;
  message: string;
}

// Filters accepted by the admin inbox list.
export interface ContactMessageListFilters {
  status?: 'ALL' | 'NEW' | 'READ' | 'REPLIED' | 'ARCHIVED';
  search?: string;
}

// Reply payload - the admin's answer is stored on the message so the inbox
// shows the full exchange, and emailed to the visitor.
export interface ReplyContactMessageInput {
  body: string;
}
