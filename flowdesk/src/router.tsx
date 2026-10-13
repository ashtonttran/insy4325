import { createBrowserRouter } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Notes } from './pages/Notes'
import { Tasks } from './pages/Tasks'
import { Calendar } from './pages/Calendar'
import { Profile } from './pages/Profile'

export const router = createBrowserRouter([
  { path: '/', element: <Dashboard /> },
  {
    path: '/notes',
    element: <Notes />,
  },
  {
    path: '/tasks',
    element: <Tasks />,
  },
  {
    path: '/calendar',
    element: <Calendar />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
])
