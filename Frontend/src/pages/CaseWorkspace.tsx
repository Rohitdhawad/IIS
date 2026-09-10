import { Navigate, useParams } from 'react-router-dom'

export default function CaseWorkspace() {
  const { caseId } = useParams()

  return (
    <Navigate
      to={`/cases/${caseId}/dashboard`}
      replace
    />
  )
}