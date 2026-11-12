import { useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import API from '../../api/axios'

const inputClass =
  'w-full border-b border-gray-200 py-2 text-sm outline-none mb-4 bg-transparent focus:border-blue-400 transition'

export default function AddStudent({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value })

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password || !form.department) {
      setError('All fields are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      // Map 'student' -> 'Student' and 'department' -> 'dept' for Mongoose validation
      await API.post('/auth/register', { 
        name: form.name,
        email: form.email,
        password: form.password,
        dept: form.department, // Send as 'dept' to satisfy path 'dept' is required
        role: 'Student'         // Send capitalized 'Student' for enum validation
      })

      onSuccess?.('Student created successfully')
      onClose()
    } catch (err) {
      console.error('Error adding student:', err)
      const msg = err.response?.data?.message || err.message || 'Failed to add student.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-sm relative shadow-xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer">
          <FaTimes size={15} />
        </button>
        <h2 className="text-lg font-semibold mb-1">Add Student</h2>
        <p className="text-xs text-gray-400 mb-5">Register a new student account</p>

        {error && (
          <p className="text-red-500 text-xs mb-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <input className={inputClass} name="student-name" placeholder="Full Name"
          value={form.name} onChange={set('name')} autoComplete="off" />

        <input className={inputClass} name="student-email" placeholder="Email" type="email"
          value={form.email} onChange={set('email')} autoComplete="off" />

        <input className={inputClass} name="student-password" placeholder="Password" type="password"
          value={form.password} onChange={set('password')} autoComplete="new-password" />

        <select className={inputClass} value={form.department} onChange={set('department')} autoComplete='off'>
          <option value="">Select Department</option>
          <option>Software Engineering</option>
          <option>Computer Science</option>
          <option>Electrical Engineering</option>
        </select>

        <div className="flex gap-3 justify-end mt-2">
          <button onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-200 text-red-500 font-medium hover:bg-gray-50 transition text-sm cursor-pointer">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 transition text-sm disabled:opacity-60 cursor-pointer">
            {loading ? 'Adding…' : 'Add Student'}
          </button>
        </div>
      </div>
    </div>
  )
}