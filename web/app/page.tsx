import { getColumns, getTasks, getRules } from "@/lib/actions"
import KanbanBoard from "@/components/kanban-board"

export default async function Home() {
  // Fetch initial data on the server
  const initialColumns = await getColumns()
  const initialTasks = await getTasks()
  const initialRules = await getRules()

  // Combine columns with their tasks for the initial state
  const columnsWithTasks = initialColumns.map((column) => ({
    ...column,
    tasks: initialTasks[column.id] || [],
  }))
  //6.1.0 Hệ thống đang ở màn hình chính
  return (
    <main className="min-h-screen bg-slate-50">
      <KanbanBoard initialColumns={columnsWithTasks} initialRules={initialRules} />
    </main>
  )
}
