import { useState, useEffect, useMemo } from 'react'
import { FaCheckCircle, FaExclamationTriangle, FaUsers } from 'react-icons/fa'
import { getStudents, getTeachers } from '../../api/adminApi'
import StatCard from '../../components/stat-card/StatCard'
import Toast from '../../components/toast/ToastMsg'
import DataList from '../../components/data-list/DataList'
import StatusBadge from '../../components/status-badge/StatusBadge'

const TOAST_DURATION = 3000

export default function AdminAssignments() {
  const [students, setStudents] = useState([])
  const [teachers, setTeachers] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | assigned | unassigned
  const [selected, setSelected] = useState({}) // { [studentId]: teacherId }
  const [savingId, setSavingId] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, success = true) => {
    setToast({ msg, success })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  // Helper to fetch projects list from backend
  const fetchProjectsList = async () => {
    const token = localStorage.getItem('token')
    const headers = { Authorization: `Bearer ${token}` }

    // Try standard projects endpoint first, fallback to admin projects endpoint
    let res = await fetch('http://localhost:5000/api/projects', { headers })
    if (!res.ok) {
      res = await fetch('http://localhost:5000/api/admin/projects', { headers })
    }
    if (!res.ok) return []

    const data = await res.json()
    return Array.isArray(data) ? data : data.projects || []
  }

  // Re-fetch students, teachers, and projects after assignment updates
  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [sRes, tRes, pList] = await Promise.all([
        getStudents(),
        getTeachers(),
        fetchProjectsList(),
      ])

      const sData = sRes.data
      const tData = tRes.data

      setStudents(Array.isArray(sData) ? sData : sData.students || sData.users || [])
      setTeachers(Array.isArray(tData) ? tData : tData.teachers || tData.users || [])
      setProjects(pList)
    } catch (err) {
      console.error('Fetch assignments error:', err)
      showToast('Failed to load assignments data', false)
    } finally {
      setLoading(false)
    }
  }

  // Initial load scoped cleanly inside useEffect
  useEffect(() => {
    let isMounted = true

    const loadInitialData = async () => {
      setLoading(true)
      try {
        const [sRes, tRes, pList] = await Promise.all([
          getStudents(),
          getTeachers(),
          fetchProjectsList(),
        ])

        if (isMounted) {
          const sData = sRes.data
          const tData = tRes.data
          setStudents(Array.isArray(sData) ? sData : sData.students || sData.users || [])
          setTeachers(Array.isArray(tData) ? tData : tData.teachers || tData.users || [])
          setProjects(pList)
        }
      } catch (err) {
        console.error('Fetch assignments error:', err)
        if (isMounted) showToast('Failed to load assignments data', false)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  // Merge each student with their corresponding Project document from MongoDB
  const enrichedStudents = useMemo(() => {
    return students.map((s) => {
      const sId = String(s._id || s.id)
      const matchedProject = projects.find((p) => {
        const pStudentId =
          typeof p.studentId === 'object' ? p.studentId?._id || p.studentId?.id : p.studentId
        return String(pStudentId) === sId
      })

      const status = (
        matchedProject?.status ||
        s.projectStatus ||
        (s.isApproved ? 'approved' : '')
      ).toLowerCase()

      const supervisorRef =
        matchedProject?.supervisorId || s.supervisorId || s.supervisor || null

      return {
        ...s,
        project: matchedProject || null,
        projectId: matchedProject?._id || matchedProject?.id || null,
        projectTitle: matchedProject?.title || s.projectTitle || '',
        projectStatus: status,
        resolvedSupervisor: supervisorRef,
      }
    })
  }, [students, projects])

  // Check if student's project is eligible for supervisor assignment (approved or pending request)
  const canAssignSupervisor = (s) => {
    return ['approved', 'pending', 'completed'].includes(s.projectStatus) || Boolean(s.isApproved)
  }

  // Resolve full supervisor object (name, email, dept)
  const supervisorOf = (s) => {
    const sup = s.resolvedSupervisor
    if (!sup) return null
    if (typeof sup === 'object' && sup.name) return sup
    const supId = typeof sup === 'object' ? sup._id || sup.id : sup
    return teachers.find((t) => String(t._id || t.id) === String(supId)) || null
  }

  // ── Stat cards ──
  const assignedCount = useMemo(
    () => enrichedStudents.filter((s) => Boolean(supervisorOf(s) || s.resolvedSupervisor)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enrichedStudents, teachers]
  )
  const unassignedCount = enrichedStudents.length - assignedCount

  // ── Search + filter ──
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return enrichedStudents.filter((s) => {
      const isAssigned = Boolean(supervisorOf(s) || s.resolvedSupervisor)
      const matchesSearch =
        !q ||
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.projectTitle?.toLowerCase().includes(q)
      const matchesFilter =
        filter === 'all' ||
        (filter === 'assigned' && isAssigned) ||
        (filter === 'unassigned' && !isAssigned)
      return matchesSearch && matchesFilter
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrichedStudents, teachers, search, filter])

  // Assign / Reassign Supervisor across both Project and User collections
  const handleAssign = async (student) => {
    if (!canAssignSupervisor(student)) {
      showToast('Cannot assign supervisor until the student submits a project proposal.', false)
      return
    }

    const studentId = student._id || student.id
    const teacherId = selected[studentId]
    if (!teacherId) return

    setSavingId(studentId)
    try {
      const token = localStorage.getItem('token')
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }

      // 1. Update Student's User record
      const userReq = fetch(`http://localhost:5000/api/admin/users/${studentId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          supervisorId: teacherId,
          supervisor: teacherId,
        }),
      })

      // 2. Update Project record if one exists (sets supervisorId & approves pending requests)
      const requests = [userReq]
      if (student.projectId) {
        requests.push(
          fetch(`http://localhost:5000/api/projects/${student.projectId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              supervisorId: teacherId,
              status: 'approved',
            }),
          })
        )
      }

      const [userRes] = await Promise.all(requests)

      if (userRes.ok) {
        showToast('Supervisor assigned successfully', true)
        await fetchAllData()
        setSelected((prev) => {
          const next = { ...prev }
          delete next[studentId]
          return next
        })
      } else {
        const errData = await userRes.json().catch(() => ({}))
        showToast(errData.message || 'Failed to assign supervisor', false)
      }
    } catch (err) {
      console.error('Assign supervisor error:', err)
      showToast('Server error during assignment', false)
    } finally {
      setSavingId(null)
    }
  }

  // ── DataList columns ──
  const columns = [
    {
      header: 'Student',
      render: (s) => (
        <>
          <div className="font-semibold text-gray-800 text-sm">{s.name}</div>
          <div className="text-xs text-gray-500">{s.email}</div>
        </>
      ),
    },
    {
      header: 'Project Title',
      render: (s) => (
        <div>
          <div className="text-gray-800 text-sm">{s.projectTitle || '—'}</div>
          {s.projectStatus === 'pending' && (
            <span className="text-[11px] text-amber-600 font-medium">Pending Approval</span>
          )}
        </div>
      ),
    },
    {
      header: 'Supervisor',
      render: (s) => {
        const sup = supervisorOf(s)
        return sup ? (
          <StatusBadge tone="green">{sup.name}</StatusBadge>
        ) : (
          <StatusBadge tone="red">Unassigned</StatusBadge>
        )
      },
    },
    {
      header: 'Assign Supervisor',
      render: (s) => {
        const studentId = s._id || s.id
        const eligible = canAssignSupervisor(s)

        return (
          <select
            value={selected[studentId] || ''}
            disabled={!eligible}
            onChange={(e) =>
              setSelected((prev) => ({ ...prev, [studentId]: e.target.value }))
            }
            className="w-full text-sm text-gray-600 outline-none border-b border-gray-200 py-1 bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {eligible ? 'Select Supervisor' : 'No Approved Project'}
            </option>
            {teachers.map((t) => {
              const tId = t._id || t.id
              return (
                <option key={tId} value={tId}>
                  {t.name} {t.dept ? `(${t.dept})` : ''}
                </option>
              )
            })}
          </select>
        )
      },
    },
  ]

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <h1 className="text-lg font-semibold text-gray-800">Assign Supervisor</h1>
        <p className="text-sm text-gray-500">
          Manage supervisor assignments for students with submitted or approved projects
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        <StatCard
          icon={<FaCheckCircle />}
          label="Assigned Students"
          value={assignedCount}
          color="bg-emerald-50"
          iconColor="text-emerald-500"
          bg="#dcfce7"
        />
        <StatCard
          icon={<FaExclamationTriangle />}
          label="Unassigned Students"
          value={unassignedCount}
          color="bg-red-50"
          iconColor="text-red-400"
          bg="#fee2e2"
        />
        <StatCard
          icon={<FaUsers />}
          label="Available Teachers"
          value={teachers.length}
          color="bg-blue-50"
          iconColor="text-blue-500"
          bg="#e0f2fe"
        />
      </div>

      {/* Search + Filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 sm:items-end mt-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Search Students</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, email, or project title..."
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
            <option value="all">All Students</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>
      </div>

      {/* Student List */}
      <div className="mt-4">
        <DataList
          title="Student Assignments"
          columns={columns}
          rows={filtered}
          loading={loading}
          emptyText="No students found"
          actions={(s) => {
            const studentId = s._id || s.id
            const eligible = canAssignSupervisor(s)
            const sup = supervisorOf(s)
            const picked = selected[studentId]

            // 1. No Project Submitted / Rejected
            if (!eligible) {
              return (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-600 inline-block">
                  {s.projectStatus === 'rejected' ? 'Rejected' : 'Not Approved'}
                </span>
              )
            }

            // 2. Supervisor selected from dropdown -> Show Assign / Reassign Button
            if (picked) {
              return (
                <button
                  onClick={() => handleAssign(s)}
                  disabled={savingId === studentId}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white transition
                             bg-blue-500 hover:bg-blue-600 cursor-pointer
                             disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {savingId === studentId ? 'Saving...' : sup ? 'Reassign' : 'Assign'}
                </button>
              )
            }

            // 3. Supervisor Already Assigned
            if (sup) {
              return (
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 inline-block">
                  Assigned
                </span>
              )
            }

            // 4. Eligible + Supervisor Not Assigned
            return (
              <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 text-amber-700 inline-block">
                Not Assigned
              </span>
            )
          }}
        />
      </div>

      <Toast toast={toast} />
    </>
  )
}