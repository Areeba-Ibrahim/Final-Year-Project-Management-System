import { useState, useEffect } from 'react'
import AddStudent from '../../components/add-student/AddStudent'
import AddTeacher from '../../components/add-teacher/AddTeacher'
import StatCard from '../../components/stat-card/StatCard'
import Graph from '../../components/graph/Graph'
import RecentActivity from '../../components/recent-activity/RecentActivity'
import {
  FaUserGraduate, FaChalkboardTeacher, FaClock,
  FaFolderOpen, FaExclamationTriangle, FaPlus
} from 'react-icons/fa'
import { MdFileOpen } from 'react-icons/md'
import ViewReport from '../../components/view-reports/ViewReport'

const TOAST_DURATION = 3000

export default function AdminDashboard() {
  const [showAddStudent, setShowAddStudent] = useState(false)
  const [showAddTeacher, setShowAddTeacher] = useState(false)
  const [toast, setToast] = useState(null)
  const [showFiles, setShowFiles] = useState(false)

  // Real database stats, chart distribution, and activity feed
  const [stats, setStats] = useState({
    users: { students: 0, teachers: 0 },
    projects: { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
    supervisorDistribution: [],
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)

  const showToast = (msg, success = true) => {
    setToast({ msg, success })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  // Re-fetch stats after adding a student or teacher
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/stats', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setStats({
          users: data.users || { students: 0, teachers: 0 },
          projects: data.projects || { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
          supervisorDistribution: Array.isArray(data.supervisorDistribution) ? data.supervisorDistribution : [],
          recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : []
        })
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch scoped directly inside useEffect (satisfies ESLint)
  useEffect(() => {
    let isMounted = true

    const loadInitialStats = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/admin/stats', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        const data = await res.json()
        if (isMounted && res.ok) {
          setStats({
            users: data.users || { students: 0, teachers: 0 },
            projects: data.projects || { total: 0, pending: 0, approved: 0, rejected: 0, completed: 0 },
            supervisorDistribution: Array.isArray(data.supervisorDistribution) ? data.supervisorDistribution : [],
            recentActivity: Array.isArray(data.recentActivity) ? data.recentActivity : []
          })
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInitialStats()

    return () => {
      isMounted = false
    }
  }, [])

  // Format recentActivity from backend to match RecentActivity component props
  const formattedActivities = stats.recentActivity.map((item) => ({
    message: item.message,
    tag: item.type || 'Request',
    priority: item.priority || 'Medium'
  }))

  return (
    <>
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[9999] flex items-center gap-2 px-4 py-2.5
          rounded-xl shadow-lg text-white text-sm font-medium
          ${toast.success ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
          {toast.success ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* ── Header banner ── */}
      <div
        className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl
                   px-5 sm:px-7 py-4 text-white"
      >
        <h1 className="text-lg sm:text-xl font-bold">Admin Dashboard</h1>
        <p className="text-xs sm:text-sm mt-0.5 opacity-80">
          Manage the entire project management system and oversee all activities.
        </p>
      </div>

      {/* ── Stat Cards — 5 columns on lg, 3 on sm, 2 on xs ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
        <StatCard
          icon={<FaUserGraduate />}
          label="Total Students"
          value={loading ? '...' : String(stats.users?.students ?? 0)}
          color="bg-blue-50"
          iconColor="text-blue-500"
          bg="#e0f2fe"
        />
        <StatCard
          icon={<FaChalkboardTeacher />}
          label="Total Teachers"
          value={loading ? '...' : String(stats.users?.teachers ?? 0)}
          color="bg-emerald-50"
          iconColor="text-emerald-500"
          bg="#dcfce7"
        />
        <StatCard
          icon={<FaClock />}
          label="Pending Requests"
          value={loading ? '...' : String(stats.projects?.pending ?? 0)}
          color="bg-amber-50"
          iconColor="text-amber-500"
          bg="#fef3c7"
        />
        <StatCard
          icon={<FaFolderOpen />}
          label="Active Projects"
          value={loading ? '...' : String(stats.projects?.approved ?? 0)}
          color="bg-yellow-50"
          iconColor="text-yellow-500"
          bg="#ffe4e6"
        />
        <StatCard
          icon={<FaExclamationTriangle />}
          label="Completed Projects"
          value={loading ? '...' : String(stats.projects?.completed ?? 0)}
          color="bg-red-50"
          iconColor="text-red-400"
          bg="#fef0f0"
        />
      </div>

      {/* ── Graph + Recent Activity (side by side on lg) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4 mt-4">
        <Graph data={stats.supervisorDistribution} />
        <RecentActivity activities={formattedActivities} />
      </div>

      {/* ── Quick Actions — 3 full-width equal buttons ── */}
      <div className="mt-4">
        <h3 className="font-semibold text-gray-700 text-sm mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => setShowAddStudent(true)}
            className="flex items-center justify-center gap-2 w-full py-3
                       bg-blue-500 hover:bg-blue-600 text-white rounded-xl
                       font-medium text-sm transition cursor-pointer"
          >
            <FaPlus size={11} /> Add Student
          </button>
          <button
            onClick={() => setShowAddTeacher(true)}
            className="flex items-center justify-center gap-2 w-full py-3
                       bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl
                       font-medium text-sm transition cursor-pointer"
          >
            <FaPlus size={11} /> Add Teacher
          </button>
          <button
            onClick={() => setShowFiles(true)}
            className="flex items-center justify-center gap-2 w-full py-3
                       bg-white border border-gray-200 hover:bg-gray-50
                       text-gray-600 rounded-xl font-medium text-sm transition cursor-pointer"
          >
            <MdFileOpen size={14} /> View Reports
          </button>
        </div>
      </div>

      {/* Modals */}
      {showAddStudent && (
        <AddStudent
          onClose={() => setShowAddStudent(false)}
          onSuccess={(msg) => {
            showToast(msg, true)
            fetchStats()
          }}
        />
      )}
      {showAddTeacher && (
        <AddTeacher
          onClose={() => setShowAddTeacher(false)}
          onSuccess={(msg) => {
            showToast(msg, true)
            fetchStats()
          }}
        />
      )}
      {showFiles && (
        <ViewReport onClose={() => setShowFiles(false)} />
      )}
    </>
  )
}