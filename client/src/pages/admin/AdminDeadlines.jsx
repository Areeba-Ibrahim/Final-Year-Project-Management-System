import { useState, useEffect, useMemo } from 'react'
import { FaCalendarAlt, FaClock, FaExclamationTriangle, FaCheckCircle, FaPlus } from 'react-icons/fa'
import StatCard from '../../components/stat-card/StatCard'
import Toast from '../../components/toast/ToastMsg'
import DataList, { EditModal } from '../../components/data-list/DataList'
import StatusBadge from '../../components/status-badge/StatusBadge'

const TOAST_DURATION = 3000
const tones = { upcoming: 'blue', overdue: 'red', completed: 'green' }

const columns = [
  {
    header: 'Title',
    render: (d) => (
      <>
        <div className="font-semibold text-gray-800">{d.title}</div>
        <div className="text-xs text-gray-500">{d.description || '—'}</div>
      </>
    ),
  },
  { header: 'Assigned To', render: (d) => d.audience || 'All Students' },
  { header: 'Due Date', render: (d) => (d.dueDate ? String(d.dueDate).slice(0, 10) : '—') },
  {
    header: 'Status',
    render: (d) => <StatusBadge tone={tones[d.status] || 'blue'}>{d.status || 'upcoming'}</StatusBadge>,
  },
  {
    header: 'Updated',
    render: (d) => (d.updatedAt ? new Date(d.updatedAt).toLocaleString() : '—'),
  },
]

const formFields = [
  { name: 'title', label: 'Title' },
  { name: 'description', label: 'Description', type: 'textarea' },
  { name: 'audience', label: 'Assigned To' },
  { name: 'dueDate', label: 'Due Date', type: 'date' },
  { name: 'status', label: 'Status', type: 'select', options: ['upcoming', 'overdue', 'completed'] },
]

export default function AdminDeadlines() {
  const [deadlines, setDeadlines] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, success = true) => {
    setToast({ msg, success })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  // Reusable standalone function for manual re-fetching after actions
  const loadDeadlinesData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/deadlines', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setDeadlines(Array.isArray(data) ? data : [])
      } else {
        showToast(data.message || 'Failed to load deadlines', false)
      }
    } catch (err) {
      console.error('Fetch deadlines error:', err)
      showToast('Server connection error', false)
    } finally {
      setLoading(false)
    }
  }

  // Initial load on component mount - scoped inside useEffect to avoid ESLint warnings
  useEffect(() => {
    let isMounted = true

    const fetchOnMount = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/admin/deadlines', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (isMounted) {
          if (res.ok) {
            setDeadlines(Array.isArray(data) ? data : [])
          } else {
            showToast(data.message || 'Failed to load deadlines', false)
          }
        }
      } catch (err) {
        console.error('Fetch deadlines error:', err)
        if (isMounted) showToast('Server connection error', false)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchOnMount()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const countBy = (status) => deadlines.filter((d) => d.status === status).length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return deadlines.filter((d) => {
      const matchesSearch =
        !q ||
        d.title?.toLowerCase().includes(q) ||
        d.audience?.toLowerCase().includes(q)
      const matchesFilter = filter === 'all' || d.status === filter
      return matchesSearch && matchesFilter
    })
  }, [deadlines, search, filter])

  const handleAdd = async (form) => {
    if (!form.title || !form.dueDate) {
      showToast('Title and Due Date are required', false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/admin/deadlines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || '',
          audience: form.audience || 'All Students',
          dueDate: form.dueDate,
          status: form.status || 'upcoming',
        }),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Deadline added successfully', true)
        setAdding(false)
        await loadDeadlinesData()
      } else {
        showToast(data.message || 'Failed to add deadline', false)
      }
    } catch (err) {
      console.error('Add error:', err)
      showToast('Server error during request', false)
    }
  }

  const handleSave = async (form) => {
    const id = form._id || form.id
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/deadlines/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      })

      const data = await res.json()
      if (res.ok) {
        showToast('Deadline updated successfully', true)
        await loadDeadlinesData()
      } else {
        showToast(data.message || 'Failed to update deadline', false)
      }
    } catch (err) {
      console.error('Update error:', err)
      showToast('Server error during update', false)
    }
  }

  const handleDelete = async (row) => {
    const id = row._id || row.id
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/admin/deadlines/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('Deadline deleted successfully', true)
        await loadDeadlinesData()
      } else {
        showToast('Failed to delete deadline', false)
      }
    } catch (err) {
      console.error('Delete error:', err)
      showToast('Server error during deletion', false)
    }
  }

  const todayISO = new Date().toISOString().split('T')[0]

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Deadlines</h1>
          <p className="text-sm text-gray-500">Create and track submission deadlines</p>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition bg-blue-500 hover:bg-blue-600 cursor-pointer"
        >
          <FaPlus /> Add Deadline
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <StatCard
          icon={<FaCalendarAlt />}
          label="Total Deadlines"
          value={deadlines.length}
          color="bg-blue-50"
          iconColor="text-blue-500"
          bg="#e0f2fe"
        />
        <StatCard
          icon={<FaClock />}
          label="Upcoming"
          value={countBy('upcoming')}
          color="bg-amber-50"
          iconColor="text-amber-500"
          bg="#fef3c7"
        />
        <StatCard
          icon={<FaExclamationTriangle />}
          label="Overdue"
          value={countBy('overdue')}
          color="bg-red-50"
          iconColor="text-red-400"
          bg="#fee2e2"
        />
        <StatCard
          icon={<FaCheckCircle />}
          label="Completed"
          value={countBy('completed')}
          color="bg-emerald-50"
          iconColor="text-emerald-500"
          bg="#dcfce7"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 sm:items-end mt-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Search Deadlines</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or assigned group..."
            className="w-full mt-1 text-sm outline-none border-b border-gray-200 py-1.5 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Filter Status</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-1 text-sm outline-none border-b border-gray-200 py-1.5 bg-transparent cursor-pointer"
          >
            <option value="all">All Deadlines</option>
            <option value="upcoming">Upcoming</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <DataList
          title="All Deadlines"
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyText="No deadlines found"
          editFields={formFields}
          onSave={handleSave}
          onDelete={handleDelete}
          deleteMessage={(d) => `Delete "${d.title}"? This cannot be undone.`}
        />
      </div>

      {adding && (
        <EditModal
          title="Add Deadline"
          saveLabel="Add Deadline"
          row={{
            title: '',
            description: '',
            audience: 'All Students',
            dueDate: todayISO,
            status: 'upcoming',
          }}
          fields={formFields}
          onSave={handleAdd}
          onClose={() => setAdding(false)}
        />
      )}

      <Toast toast={toast} />
    </>
  )
}