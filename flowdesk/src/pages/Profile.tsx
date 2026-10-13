import { useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import { useUserStore, type UserProfileEdit } from '@/store/userStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** My Profile — view and edit personal information (session state). */
export function Profile() {
  const profile = useUserStore((s) => s.profile)
  const updateProfile = useUserStore((s) => s.updateProfile)
  const fullName = useUserStore((s) => s.fullName)()

  const [editing, setEditing] = useState(false)

  return (
    <AppLayout title="My Profile" subtitle="Manage your personal information and public profile.">
      <Card className="mx-auto max-w-2xl p-6">
        <div className="flex items-center gap-4 border-b border-line pb-5">
          <Avatar src={profile.avatar} name={fullName} size="md" className="h-16 w-16" />
          <div>
            <h2 className="text-xl font-bold text-ink">{fullName}</h2>
            <p className="text-sm text-ink-muted">{profile.email}</p>
            <p className="text-xs text-ink-subtle">Joined {profile.joined}</p>
          </div>
        </div>

        {editing ? (
          <ProfileForm
            initial={{
              firstName: profile.firstName,
              lastName: profile.lastName,
              email: profile.email,
              bio: profile.bio,
            }}
            onCancel={() => setEditing(false)}
            onSave={(edit) => {
              updateProfile(edit)
              setEditing(false)
            }}
          />
        ) : (
          <ProfileView
            firstName={profile.firstName}
            lastName={profile.lastName}
            email={profile.email}
            bio={profile.bio}
            onEdit={() => setEditing(true)}
          />
        )}
      </Card>
    </AppLayout>
  )
}

interface ViewProps {
  firstName: string
  lastName: string
  email: string
  bio: string
  onEdit: () => void
}

function ProfileView({ firstName, lastName, email, bio, onEdit }: ViewProps) {
  return (
    <div className="space-y-5 pt-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="First Name">{firstName || '—'}</Field>
        <Field label="Last Name">{lastName || '—'}</Field>
      </div>
      <Field label="Email Address">{email || '—'}</Field>
      <Field label="Bio">{bio || '—'}</Field>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button onClick={onEdit}>Edit Profile</Button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-subtle">{label}</p>
      <p className="text-sm text-ink">{children}</p>
    </div>
  )
}

interface FormProps {
  initial: UserProfileEdit
  onCancel: () => void
  onSave: (edit: UserProfileEdit) => void
}

function ProfileForm({ initial, onCancel, onSave }: FormProps) {
  const [firstName, setFirstName] = useState(initial.firstName)
  const [lastName, setLastName] = useState(initial.lastName)
  const [email, setEmail] = useState(initial.email)
  const [bio, setBio] = useState(initial.bio)
  const [error, setError] = useState<string | null>(null)

  const submit = () => {
    if (!firstName.trim()) {
      setError('First name is required.')
      return
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError('Please enter a valid email address.')
      return
    }
    setError(null)
    onSave({ firstName, lastName, email, bio })
  }

  return (
    <div className="space-y-5 pt-5">
      {error && (
        <div className="rounded-btn border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextInput label="First Name" value={firstName} onChange={setFirstName} />
        <TextInput label="Last Name" value={lastName} onChange={setLastName} />
      </div>

      <TextInput label="Email Address" type="email" value={email} onChange={setEmail} />

      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
          Bio
        </label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-btn border border-line bg-white p-3 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={submit}>Save Profile</Button>
      </div>
    </div>
  )
}

function TextInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-subtle">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-btn border border-line bg-white px-3 text-sm text-ink focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      />
    </div>
  )
}
