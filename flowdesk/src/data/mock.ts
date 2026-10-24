export const currentUser = {
  name: 'Ashton Tran',
  email: 'ashton@flowdesk.com',
  avatar:
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces',
  bio: 'Developer of this product! Connect with me on LinkedIn :)',
  joined: 'January 2026',
}

export type Priority = 'red' | 'orange' | 'green' | 'gray'

export interface TodayTask {
  id: string
  title: string
  time: string
  priority: Priority
  done: boolean
}

export const todayTasks: TodayTask[] = [
  { id: 't1', title: 'Read Chapter 5 - Biology', time: '09:00 AM', priority: 'red', done: false },
  { id: 't2', title: 'Math problem set #7', time: '11:00 AM', priority: 'orange', done: false },
  {
    id: 't3',
    title: 'Review lecture notes - Psychology',
    time: '02:00 PM',
    priority: 'green',
    done: false,
  },
  { id: 't4', title: 'History essay draft', time: '04:00 PM', priority: 'green', done: false },
  {
    id: 't5',
    title: 'Study for Chemistry midterm',
    time: '07:00 PM',
    priority: 'gray',
    done: false,
  },
]

export interface AgendaEvent {
  id: string
  range: string
  title: string
  tone: 'purple' | 'amber' | 'green'
}

export const agenda: AgendaEvent[] = [
  { id: 'e1', range: '09:30 - 10:30 AM', title: 'Biology 101 Lecture', tone: 'purple' },
  { id: 'e2', range: '12:00 - 01:00 PM', title: 'Study Group - Math', tone: 'amber' },
  { id: 'e3', range: '03:00 - 04:15 PM', title: 'History 201 Seminar', tone: 'green' },
]

export interface RecentNote {
  id: string
  title: string
  course: string
  updated: string
}

export const recentNotes: RecentNote[] = [
  { id: 'n1', title: 'WWII Lecture Notes - Week 4', course: 'History 201', updated: '2 hrs ago' },
  { id: 'n2', title: 'Cell Division Summary', course: 'Biology 101', updated: 'Yesterday' },
  {
    id: 'n3',
    title: 'Statistical Methods Overview',
    course: 'Math 301',
    updated: '3 days ago',
  },
  { id: 'n4', title: 'Cognitive Psychology Ch. 8', course: 'Psychology', updated: '1 week ago' },
]

export const dashboardStats = [
  { label: 'TASKS DUE TODAY', value: '5', hint: '2 completed' },
  { label: 'NOTES UPDATED THIS WEEK', value: '12', hint: '+4 new drafts', hintTone: 'green' },
  { label: 'UPCOMING EVENTS', value: '3', hint: 'Next at 10:00 AM' },
] as const
