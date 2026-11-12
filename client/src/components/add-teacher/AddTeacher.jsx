import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'

const inputClass =
  'w-full border-b border-gray-200 py-2 text-sm outline-none mb-4 bg-transparent focus:border-emerald-400 transition'

export default function AddTeacher({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
    expertise: '',
    maxStudents: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async () => {
    if (
      !form.name ||
      !form.email ||
      !form.password ||
      !form.department ||
      !form.expertise ||
      !form.maxStudents
    ) {
      setError('All fields are required.')
      return
    }

    if (Number(form.maxStudents) < 1) {
      setError('Max students must be at least 1.')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Direct POST to /api/auth/register
      const res = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: 'Teacher', // Capital 'T' required by Mongoose schema
          dept: form.department, // Schema requires 'dept'
          expertise: form.expertise,
          maxStudents: Number(form.maxStudents),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (res.ok) {
        onSuccess?.('Teacher added successfully')
        onClose()
      } else {
        setError(data?.message || `Server error (${res.status})`)
      }
    } catch (err) {
      console.error('Add Teacher Error:', err)
      setError('Cannot connect to backend server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-sm relative shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer"
        >
          <FaTimes size={15} />
        </button>

        <h2 className="text-lg font-semibold mb-1">Add Teacher</h2>
        <p className="text-xs text-gray-400 mb-5">Register a new teacher account</p>

        {error && (
          <p className="text-red-500 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <input
          className={inputClass}
          name="teacher-name"
          placeholder="Full Name"
          value={form.name}
          onChange={set('name')}
          autoComplete="off"
        />

        <input
          className={inputClass}
          name="teacher-email"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={set('email')}
          autoComplete="off"
        />

        <input
          className={inputClass}
          name="teacher-password"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={set('password')}
          autoComplete="new-password"
        />

        <select className={inputClass} value={form.department} onChange={set('department')}>
          <option value="">Select Department</option>
          <option value="Computer Science">Computer Science</option>
          <option value="Software Engineering">Software Engineering</option>
          <option value="Electrical Engineering">Electrical Engineering</option>
          <option value="Artificial Intelligence">Artificial Intelligence</option>
        </select>

        <select className={inputClass} value={form.expertise} onChange={set('expertise')}>
          <option value="">Select Expertise</option>
          <option value="Database Systems">Database Systems</option>
          <option value="Machine Learning">Machine Learning</option>
          <option value="Web Development">Web Development</option>
          <option value="Networking">Networking</option>
        </select>

        <input
          className={inputClass}
          name="max-student"
          type="number"
          placeholder="Max Students"
          min="1"
          value={form.maxStudents}
          onChange={set('maxStudents')}
          autoComplete="off"
        />

        <div className="flex gap-3 justify-end mt-2">
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 rounded-lg border border-gray-200 text-red-500 font-medium hover:bg-gray-50 transition text-sm cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            type="button"
            className="px-5 py-2 rounded-lg bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition text-sm disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Adding…' : 'Add Teacher'}
          </button>
        </div>
      </div>
    </div>
  )
}