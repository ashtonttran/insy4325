import { create } from 'zustand'
import { currentUser } from '@/data/mock'

export interface UserProfile {
  firstName: string
  lastName: string
  email: string
  bio: string
  avatar: string
  joined: string
}

/** Editable fields the Profile form can change. */
export type UserProfileEdit = Pick<UserProfile, 'firstName' | 'lastName' | 'email' | 'bio'>

interface UserState {
  profile: UserProfile
  /** Apply edits to the in-memory profile (session only; resets on reload). */
  updateProfile: (edit: UserProfileEdit) => void
  /** Convenience selector for the display name. */
  fullName: () => string
}

// Seed the store from the existing mock user, splitting the single name field.
const [seedFirst, ...seedRest] = currentUser.name.split(' ')

export const useUserStore = create<UserState>((set, get) => ({
  profile: {
    firstName: seedFirst ?? '',
    lastName: seedRest.join(' '),
    email: currentUser.email,
    bio: currentUser.bio,
    // No profile photo: an empty avatar makes Avatar render the silhouette placeholder.
    avatar: '',
    joined: currentUser.joined,
  },

  updateProfile: (edit) =>
    set((state) => ({
      profile: {
        ...state.profile,
        firstName: edit.firstName.trim(),
        lastName: edit.lastName.trim(),
        email: edit.email.trim(),
        bio: edit.bio.trim(),
      },
    })),

  fullName: () => {
    const { firstName, lastName } = get().profile
    return [firstName, lastName].filter(Boolean).join(' ')
  },
}))
