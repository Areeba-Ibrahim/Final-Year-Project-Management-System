import { useState, useEffect, useMemo } from 'react'
import { FaUserGraduate, FaBuilding, FaExclamationTriangle, FaPlus } from 'react-icons/fa'
import StatCard from '../../components/stat-card/StatCard'
import Toast from '../../components/toast/ToastMsg'
import DataList, { EditModal } from '../../components/data-list/DataList'
import StatusBadge from '../../components/status-badge/StatusBadge'

const TOAST_DURATION = 3000

const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Electrical Engineering',
  'Artificial Intelligence',
  'Information Technology',
]

const columns = [
  {
    header: 'Student Info',
    render: (s) => (
      <>
        <div className="font-semibold text-gray-800">{s.name}</div>
        <div className="text-xs text-gray-500">{s.email}</div>
      </>
    ),
  },
  { header: 'Department', render: (s) => s.dept || s.department || '—' },
  {
    header: 'Supervisor Status',
    render: (s) => (
      <StatusBadge tone={s.supervisorId ? 'green' : 'red'}>
        {s.supervisorId ? 'Assigned' : 'Not Assigned'}
      </StatusBadge>
    ),
  },
  { header: 'Project Title', render: (s) => s.projectTitle || s.project?.title || '—' },
  {
    header: 'Join Date',
    render: (s) => (s.createdAt ? new Date(s.createdAt).toLocaleString() : '—'),
  },
]

// Form fields with proper select types and department options
const studentFormFields = [
  { name: 'name', label: 'Full Name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Password', type: 'password' },
  {
    name: 'dept',
    label: 'Department',
    type: 'select',
    options: DEPARTMENTS,
  },
]

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, success = true) => {
    setToast({ msg, success })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  // Fetch all students from MongoDB backend
  const fetchStudents = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/users?role=Student', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setStudents(Array.isArray(data) ? data : data.users || [])
      } else {
        showToast(data.message || 'Failed to load students', false)
      }
    } catch (err) {
      console.error('Fetch students error:', err)
      showToast('Server connection error', false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadInitial = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/admin/users?role=Student', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (isMounted) {
          if (res.ok) {
            setStudents(Array.isArray(data) ? data : data.users || [])
          } else {
            showToast(data.message || 'Failed to load students', false)
          }
        }
      } catch (err) {
        console.error('Fetch students error:', err)
        if (isMounted) showToast('Server connection error', false)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInitial()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Dashboard Stats
  const totalStudents = students.length
  const uniqueDepts = useMemo(
    () => new Set(students.map((s) => s.dept || s.department).filter(Boolean)).size,
    [students]
  )
  const unassignedCount = useMemo(
    () => students.filter((s) => !s.supervisorId).length,
    [students]
  )

  // Filter & Search Logic
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return students.filter((s) => {
      const studentDept = s.dept || s.department || ''
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      const matchesDept = deptFilter === 'all' || studentDept === deptFilter
      return matchesSearch && matchesDept
    })
  }, [students, search, deptFilter])

  // Create Student Account
  const handleAddStudent = async (form) => {
    if (!form.name || !form.email || !form.password) {
      showToast('Name, Email, and Password are required', false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'Student',
          dept: form.dept || DEPARTMENTS[0],
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Student account created successfully', true)
        setAdding(false)
        fetchStudents()
      } else {
        showToast(data.message || 'Failed to create student', false)
      }
    } catch (err) {
      console.error('Add student error:', err)
      showToast('Server error during account creation', false)
    }
  }

  // Update Existing Student
  const handleSave = async (form) => {
    const id = form._id || form.id
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          dept: form.dept || form.department,
          department: form.dept || form.department,
          role: 'Student',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Student updated successfully', true)
        fetchStudents()
      } else {
        showToast(data.message || 'Failed to update student', false)
      }
    } catch (err) {
      console.error('Update student error:', err)
      showToast('Server error during update', false)
    }
  }

  // Delete Student
  const handleDelete = async (row) => {
    const id = row._id || row.id
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('Student removed successfully', true)
        fetchStudents()
      } else {
        showToast('Failed to delete student', false)
      }
    } catch (err) {
      console.error('Delete student error:', err)
      showToast('Server error during deletion', false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Student Management</h1>
          <p className="text-sm text-gray-500">Manage student accounts and department assignments</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition bg-blue-500 hover:bg-blue-600 cursor-pointer"
        >
          <FaPlus /> Add Student
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <StatCard
          icon={<FaUserGraduate />}
          label="Total Students"
          value={totalStudents}
          color="bg-blue-50"
          iconColor="text-blue-500"
          bg="#e0f2fe"
        />
        <StatCard
          icon={<FaBuilding />}
          label="Departments"
          value={uniqueDepts}
          color="bg-purple-50"
          iconColor="text-purple-500"
          bg="#f3e8ff"
        />
        <StatCard
          icon={<FaExclamationTriangle />}
          label="Unassigned"
          value={unassignedCount}
          color="bg-amber-50"
          iconColor="text-amber-500"
          bg="#fef3c7"
        />
      </div>

      {/* Search & Filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 sm:items-end mt-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Search Students</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full mt-1 text-sm outline-none border-b border-gray-200 py-1.5 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Filter by Department</label>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="mt-1 text-sm outline-none border-b border-gray-200 py-1.5 bg-transparent cursor-pointer"
          >
            <option value="all">All Departments</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="mt-4">
        <DataList
          title="Students List"
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyText="No students found"
          editFields={studentFormFields.filter((f) => f.name !== 'password')}
          onSave={handleSave}
          onDelete={handleDelete}
          deleteMessage={(s) => `Delete student account for "${s.name}"? This action cannot be undone.`}
        />
      </div>

      {/* Add Modal */}
      {adding && (
        <EditModal
          title="Add Student"
          saveLabel="Add Student"
          row={{
            name: '',
            email: '',
            password: '',
            dept: DEPARTMENTS[0],
          }}
          fields={studentFormFields}
          onSave={handleAddStudent}
          onClose={() => setAdding(false)}
        />
      )}

      <Toast toast={toast} />
    </>
  )
}