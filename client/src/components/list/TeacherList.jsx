import DataList from '../data-list/DataList'

const columns = [
  {
    header: 'Teacher Info',
    render: (t) => (
      <>
        <div className="font-semibold text-gray-800 text-sm">{t.name}</div>
        <div className="text-xs text-gray-500">{t.email}</div>
      </>
    ),
  },
  {
    header: 'Department',
    render: (t) => t.dept || t.department || '—',
  },
  {
    header: 'Expertise',
    render: (t) => t.expertise || '—',
  },
  {
    header: 'Join Date',
    render: (t) => (t.createdAt ? new Date(t.createdAt).toLocaleString() : '—'),
  },
]

// Fields shown in the built-in edit modal
const editFields = [
  { name: 'name', label: 'Name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'department', label: 'Department' },
  { name: 'expertise', label: 'Expertise' },
]

// Edit   -> DataList's built-in EditModal (onSave)
// Delete -> the page's own ConfirmDialog (confirmDelete={false})
export default function TeacherList({ teachers, loading, onSave, onDelete }) {
  // Map row objects to ensure DataList's edit modal receives both 'dept' and 'department'
  const formattedRows = teachers.map((t) => ({
    ...t,
    department: t.dept || t.department || '',
  }))

  return (
    <DataList
      title="Teachers List"
      columns={columns}
      rows={formattedRows}
      loading={loading}
      emptyText="No teachers found"
      editFields={editFields}
      onSave={onSave}
      onDelete={onDelete}
      confirmDelete={false}
    />
  )
}