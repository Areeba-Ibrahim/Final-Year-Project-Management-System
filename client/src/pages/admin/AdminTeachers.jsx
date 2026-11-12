import { useState, useEffect, useMemo } from 'react'
import { FaUserTie, FaBuilding, FaBook, FaPlus } from 'react-icons/fa'
import StatCard from '../../components/stat-card/StatCard'
import Toast from '../../components/toast/ToastMsg'
import DataList, { EditModal } from '../../components/data-list/DataList'

const TOAST_DURATION = 3000

const DEPARTMENTS = [
  'Computer Science',
  'Software Engineering',
  'Electrical Engineering',
  'Artificial Intelligence',
  'Information Technology',
]

const EXPERTISE_LIST = [
  'Web Development',
  'Mobile App Development',
  'Machine Learning',
  'Networking',
  'Database Systems',
  'Cyber Security',
  'Cloud Computing',
]

const columns = [
  {
    header: 'Teacher Info',
    render: (t) => (
      <>
        <div className="font-semibold text-gray-800">{t.name}</div>
        <div className="text-xs text-gray-500">{t.email}</div>
      </>
    ),
  },
  { header: 'Department', render: (t) => t.dept || t.department || '—' },
  { header: 'Expertise', render: (t) => t.expertise || '—' },
  { header: 'Max Students', render: (t) => t.maxStudents ?? '—' },
  {
    header: 'Join Date',
    render: (t) => (t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'),
  },
]

// Field definitions for adding/editing teachers
const teacherFormFields = [
  { name: 'name', label: 'Full Name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'password', label: 'Password', type: 'password' },
  {
    name: 'dept',
    label: 'Department',
    type: 'select',
    options: DEPARTMENTS,
  },
  {
    name: 'expertise',
    label: 'Expertise',
    type: 'select',
    options: EXPERTISE_LIST,
  },
  { name: 'maxStudents', label: 'Max Students', type: 'number' },
]

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, success = true) => {
    setToast({ msg, success })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  // Fetch teachers from backend API
  const fetchTeachers = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/users?role=Teacher', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setTeachers(Array.isArray(data) ? data : data.users || [])
      } else {
        showToast(data.message || 'Failed to load teachers', false)
      }
    } catch (err) {
      console.error('Fetch teachers error:', err)
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
        const res = await fetch('http://localhost:5000/api/admin/users?role=Teacher', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (isMounted) {
          if (res.ok) {
            setTeachers(Array.isArray(data) ? data : data.users || [])
          } else {
            showToast(data.message || 'Failed to load teachers', false)
          }
        }
      } catch (err) {
        console.error('Fetch teachers error:', err)
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

  // Stat calculations
  const totalTeachers = teachers.length
  const uniqueDepts = useMemo(
    () => new Set(teachers.map((t) => t.dept || t.department).filter(Boolean)).size,
    [teachers]
  )
  const totalMaxCapacity = useMemo(
    () => teachers.reduce((sum, t) => sum + (Number(t.maxStudents) || 0), 0),
    [teachers]
  )

  // Filter logic
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return teachers.filter((t) => {
      const teacherDept = t.dept || t.department || ''
      const matchesSearch =
        !q ||
        t.name?.toLowerCase().includes(q) ||
        t.email?.toLowerCase().includes(q) ||
        t.expertise?.toLowerCase().includes(q)
      const matchesDept = deptFilter === 'all' || teacherDept === deptFilter
      return matchesSearch && matchesDept
    })
  }, [teachers, search, deptFilter])

  // Handle Add Teacher
  const handleAddTeacher = async (form) => {
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
          role: 'Teacher',
          dept: form.dept || DEPARTMENTS[0],
          expertise: form.expertise || EXPERTISE_LIST[0],
          maxStudents: Number(form.maxStudents) || 5,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Teacher account created successfully', true)
        setAdding(false)
        fetchTeachers()
      } else {
        showToast(data.message || 'Failed to add teacher', false)
      }
    } catch (err) {
      console.error('Add teacher error:', err)
      showToast('Server error during account creation', false)
    }
  }

  // Handle Edit/Update Teacher
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
          expertise: form.expertise,
          maxStudents: Number(form.maxStudents) || 0,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Teacher updated successfully', true)
        fetchTeachers()
      } else {
        showToast(data.message || 'Failed to update teacher', false)
      }
    } catch (err) {
      console.error('Update teacher error:', err)
      showToast('Server error during update', false)
    }
  }

  // Handle Delete Teacher
  const handleDelete = async (row) => {
    const id = row._id || row.id
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('Teacher removed successfully', true)
        fetchTeachers()
      } else {
        showToast('Failed to delete teacher', false)
      }
    } catch (err) {
      console.error('Delete teacher error:', err)
      showToast('Server error during deletion', false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Teacher Management</h1>
          <p className="text-sm text-gray-500">Manage instructor accounts, departments, and capacity</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition bg-emerald-500 hover:bg-emerald-600 cursor-pointer"
        >
          <FaPlus /> Add Teacher
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <StatCard
          icon={<FaUserTie />}
          label="Total Teachers"
          value={totalTeachers}
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
          icon={<FaBook />}
          label="Total Student Capacity"
          value={totalMaxCapacity}
          color="bg-emerald-50"
          iconColor="text-emerald-500"
          bg="#dcfce7"
        />
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 sm:items-end mt-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Search Teachers</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or expertise..."
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

      {/* Table List */}
      <div className="mt-4">
        <DataList
          title="Teachers List"
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyText="No teachers found"
          editFields={teacherFormFields.filter((f) => f.name !== 'password')}
          onSave={handleSave}
          onDelete={handleDelete}
          deleteMessage={(t) => `Delete instructor "${t.name}"? This action cannot be undone.`}
        />
      </div>

      {/* Add Teacher Modal */}
      {adding && (
        <EditModal
          title="Add Teacher"
          saveLabel="Add Teacher"
          row={{
            name: '',
            email: '',
            password: '',
            dept: DEPARTMENTS[0],
            expertise: EXPERTISE_LIST[0],
            maxStudents: 5,
          }}
          fields={teacherFormFields}
          onSave={handleAddTeacher}
          onClose={() => setAdding(false)}
        />
      )}

      <Toast toast={toast} />
    </>
  )
}