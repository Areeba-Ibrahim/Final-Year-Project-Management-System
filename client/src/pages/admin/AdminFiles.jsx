import { useState, useEffect, useMemo } from 'react'
import {
  FaFolder,
  FaBook,
  FaFileAlt,
  FaCloudUploadAlt,
  FaPlus,
  FaDownload,
  FaTrash,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileCode,
} from 'react-icons/fa'
import StatCard from '../../components/stat-card/StatCard'
import Toast from '../../components/toast/ToastMsg'
import StatusBadge from '../../components/status-badge/StatusBadge'

const TOAST_DURATION = 3000
const categoryTones = { Guidelines: 'purple', Templates: 'yellow', Submissions: 'green' }

export default function AdminFiles() {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [toast, setToast] = useState(null)
  const [uploading, setUploading] = useState(false)

  // Upload modal form state
  const [selectedFile, setSelectedFile] = useState(null)
  const [category, setCategory] = useState('Guidelines')

  const showToast = (msg, success = true) => {
    setToast({ msg, success })
    setTimeout(() => setToast(null), TOAST_DURATION)
  }

  // Re-fetch files after upload or delete
  const loadFilesData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/files', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setFiles(Array.isArray(data) ? data : [])
      } else {
        showToast(data.message || 'Failed to load files', false)
      }
    } catch (err) {
      console.error('Fetch files error:', err)
      showToast('Server connection error', false)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch on component mount
  useEffect(() => {
    let isMounted = true

    const fetchInitialFiles = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch('http://localhost:5000/api/files', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (isMounted) {
          if (res.ok) {
            setFiles(Array.isArray(data) ? data : [])
          } else {
            setToast({ msg: data.message || 'Failed to load files', success: false })
            setTimeout(() => setToast(null), TOAST_DURATION)
          }
        }
      } catch (err) {
        console.error('Fetch files error:', err)
        if (isMounted) {
          setToast({ msg: 'Server connection error', success: false })
          setTimeout(() => setToast(null), TOAST_DURATION)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchInitialFiles()

    return () => {
      isMounted = false
    }
  }, [])

  // Dynamic stat card counts calculated directly from MongoDB records
  const totalFiles = files.length
  const countByCategory = (cat) =>
    files.filter((f) => (f.category || 'Guidelines').toLowerCase() === cat.toLowerCase()).length

  // Helper for formatting file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Helper for rendering file type icon based on filename extension
  const renderFileIcon = (filename = '') => {
    const ext = filename.split('.').pop().toLowerCase()
    if (ext === 'pdf') return <FaFilePdf className="text-red-500 text-xl" />
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-blue-500 text-xl" />
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel className="text-emerald-500 text-xl" />
    return <FaFileCode className="text-gray-500 text-xl" />
  }

  // Search & Category Filter
  const filteredFiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    return files.filter((f) => {
      const uploaderName = typeof f.uploadedBy === 'object' ? f.uploadedBy?.name : f.uploadedBy || ''
      const matchesSearch =
        !q ||
        f.filename?.toLowerCase().includes(q) ||
        uploaderName?.toLowerCase().includes(q)
      const matchesCategory =
        categoryFilter === 'all' ||
        (f.category || 'Guidelines').toLowerCase() === categoryFilter.toLowerCase()
      return matchesSearch && matchesCategory
    })
  }, [files, search, categoryFilter])

  // Handle File Upload to MongoDB / Express Server
  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      showToast('Please select a file to upload', false)
      return
    }

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('category', category)

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:5000/api/files/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      const data = await res.json()
      if (res.ok) {
        showToast('File uploaded successfully', true)
        setUploading(false)
        setSelectedFile(null)
        loadFilesData()
      } else {
        showToast(data.message || 'File upload failed', false)
      }
    } catch (err) {
      console.error('Upload error:', err)
      showToast('Server error during file upload', false)
    }
  }

  // Download File Handler (Uses Auth Token + Blob for secured endpoints)
  const handleDownload = async (file) => {
    const fileId = file._id || file.id
    if (!fileId) {
      showToast('File ID not found', false)
      return
    }

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/files/download/${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        showToast(errorData.message || 'Download failed', false)
        return
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.filename || 'downloaded_file'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      showToast('Server error during file download', false)
    }
  }

  // Delete File Handler
  const handleDelete = async (file) => {
    const id = file._id || file.id
    if (!id) {
      showToast('File ID not found', false)
      return
    }

    if (!window.confirm(`Delete "${file.filename}"? This action cannot be undone.`)) return

    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`http://localhost:5000/api/files/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        showToast('File deleted successfully', true)
        loadFilesData()
      } else {
        const data = await res.json().catch(() => ({}))
        showToast(data.message || 'Failed to delete file', false)
      }
    } catch (err) {
      console.error('Delete file error:', err)
      showToast('Server error during deletion', false)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Files</h1>
          <p className="text-sm text-gray-500">Manage guidelines, templates, and student submissions</p>
        </div>
        <button
          onClick={() => setUploading(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition bg-blue-500 hover:bg-blue-600 cursor-pointer"
        >
          <FaPlus /> Upload File
        </button>
      </div>

      {/* Dynamic Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <StatCard
          icon={<FaFolder />}
          label="Total Files"
          value={totalFiles}
          color="bg-blue-50"
          iconColor="text-blue-500"
          bg="#e0f2fe"
        />
        <StatCard
          icon={<FaBook />}
          label="Guidelines"
          value={countByCategory('Guidelines')}
          color="bg-purple-50"
          iconColor="text-purple-500"
          bg="#f3e8ff"
        />
        <StatCard
          icon={<FaFileAlt />}
          label="Templates"
          value={countByCategory('Templates')}
          color="bg-amber-50"
          iconColor="text-amber-500"
          bg="#fef3c7"
        />
        <StatCard
          icon={<FaCloudUploadAlt />}
          label="Submissions"
          value={countByCategory('Submissions')}
          color="bg-emerald-50"
          iconColor="text-emerald-500"
          bg="#dcfce7"
        />
      </div>

      {/* Search + Category Filter */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 flex flex-col sm:flex-row gap-4 sm:items-end mt-4">
        <div className="flex-1">
          <label className="text-sm font-medium text-gray-700">Search Files</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name or uploader..."
            className="w-full mt-1 text-sm outline-none border-b border-gray-200 py-1.5 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700 block">Filter by Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="mt-1 text-sm outline-none border-b border-gray-200 py-1.5 bg-transparent cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="Guidelines">Guidelines</option>
            <option value="Templates">Templates</option>
            <option value="Submissions">Submissions</option>
          </select>
        </div>
      </div>

      {/* Files List Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mt-4">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">All Files</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading files...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No files found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">File</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Uploaded By</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredFiles.map((file) => {
                  const uploader = typeof file.uploadedBy === 'object' ? file.uploadedBy?.name : 'Admin'
                  const catName = file.category || 'Guidelines'
                  return (
                    <tr key={file._id || file.id} className="hover:bg-gray-50/50 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {renderFileIcon(file.filename)}
                          <div>
                            <div className="font-medium text-gray-800">{file.filename}</div>
                            <div className="text-xs text-gray-400">{formatFileSize(file.size)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge tone={categoryTones[catName] || 'blue'}>{catName}</StatusBadge>
                      </td>
                      <td className="px-5 py-4 text-gray-600">{uploader || 'Admin'}</td>
                      <td className="px-5 py-4 text-gray-500 text-xs">
                        {file.createdAt ? new Date(file.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition cursor-pointer"
                            title="Download"
                          >
                            <FaDownload />
                          </button>
                          <button
                            onClick={() => handleDelete(file)}
                            className="p-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition cursor-pointer"
                            title="Delete"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {uploading && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload File</h3>
            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select File</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg p-2 outline-none focus:border-blue-500 bg-white"
                >
                  <option value="Guidelines">Guidelines</option>
                  <option value="Templates">Templates</option>
                  <option value="Submissions">Submissions</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setUploading(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600"
                >
                  Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast toast={toast} />
    </>
  )
}