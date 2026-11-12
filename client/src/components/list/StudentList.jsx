import DataList from '../data-list/DataList'
import StatusBadge from '../status-badge/StatusBadge'

const columns = [
  { header: 'Student Info', render: (s) => (
      <>
        <div className="font-semibold text-gray-800">{s.name}</div>
        <div className="text-xs text-gray-500">{s.email}</div>
      </>
  )},
  { header: 'Department & Year', render: (s) => {
      const dept = s.dept || s.department || 'N/A'
      return (
        <>
          <div>{dept}</div>
          {s.year && <div className="text-xs text-gray-400">{s.year}</div>}
        </>
      )
  }},
  { header: 'Supervisor', render: (s) => {
      const name = s.supervisor?.name || s.supervisor
      return name
        ? <StatusBadge tone="green">{name}</StatusBadge>
        : <StatusBadge tone="red">Not Assigned</StatusBadge>
  }},
  { header: 'Project Title', render: (s) => s.projectTitle || '—' },
]

const editFields = [
  { name: 'name', label: 'Name' },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'dept', label: 'Department' },
  { name: 'year', label: 'Year' },
  { name: 'projectTitle', label: 'Project Title' },
]

export default function StudentList({ students, loading, onSave, onDelete }) {
  return (
    <DataList
      title="Students List"
      columns={columns}
      rows={students}
      loading={loading}
      emptyText="No students match your search."
      editFields={editFields}
      onSave={onSave}
      onDelete={onDelete}
      deleteMessage={(s) => `Delete ${s.name}? This cannot be undone.`}
    />
  )
}