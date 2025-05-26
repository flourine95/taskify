"use client"

import { useState, useEffect } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Plus, Database, RefreshCcw, Trash } from "lucide-react"
import Column from "./column"
import TaskDetailSidebar from "./task-detail-sidebar"
import AutomationRules from "./automation-rules"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import type { Task, Column as ColumnType, Rule } from "@/types/kanban"
import { generateId } from "@/lib/utils"
import { updateColumns, updateTasks, updateRules, seedData, clearData } from "@/lib/actions"

interface KanbanBoardProps {
  initialColumns: ColumnType[]
  initialRules: Rule[]
}

export default function KanbanBoard({ initialColumns = [], initialRules = [] }: KanbanBoardProps) {
  const { toast } = useToast()
  const [columns, setColumns] = useState<ColumnType[]>(initialColumns)
// 4.2.2 KanbanBoard thực thi setSelectedTask() để lưu thông tin task được chọn.
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [activeTab, setActiveTab] = useState("board")

  // Process automation rules
  useEffect(() => {
    if (rules.length === 0) return

    // Only process enabled rules
    const enabledRules = rules.filter((rule) => rule.enabled)
    if (enabledRules.length === 0) return

    const tasksToMove: { taskId: string; sourceColumnId: string; targetColumnId: string }[] = []

    // Check each task against each rule
    columns.forEach((column) => {
      column.tasks.forEach((task) => {
        enabledRules.forEach((rule) => {
          const { condition, action } = rule
          let conditionMet = false

          // Check if condition is met
          if (condition.type === "due-date" && condition.operator === "is-overdue") {
            conditionMet = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && task.status !== "Completed")
          } else if (condition.type === "subtasks-completed" && condition.operator === "all-completed") {
            conditionMet = task.subtasks.length > 0 && task.subtasks.every((subtask) => subtask.completed)
          } else if (condition.type === "custom-field" && condition.field) {
            const field = task.customFields.find((f) => f.name === condition.field)
            if (field) {
              if (condition.operator === "equals") {
                conditionMet = field.value === condition.value
              } else if (condition.operator === "not-equals") {
                conditionMet = field.value !== condition.value
              } else if (condition.operator === "contains") {
                conditionMet = field.value.includes(condition.value || "")
              }
            }
          }

          // If condition is met and task is not already in the target column
          if (conditionMet && action.type === "move-to-column") {
            const targetColumn = columns.find((col) => col.id === action.targetColumnId)
            if (targetColumn && task.status !== targetColumn.title) {
              tasksToMove.push({
                taskId: task.id,
                sourceColumnId: column.id,
                targetColumnId: action.targetColumnId,
              })
            }
          }
        })
      })
    })

    // Apply the moves
    if (tasksToMove.length > 0) {
      const newColumns = [...columns]

      tasksToMove.forEach(({ taskId, sourceColumnId, targetColumnId }) => {
        const sourceColIndex = newColumns.findIndex((col) => col.id === sourceColumnId)
        const targetColIndex = newColumns.findIndex((col) => col.id === targetColumnId)

        if (sourceColIndex !== -1 && targetColIndex !== -1) {
          const sourceCol = newColumns[sourceColIndex]
          const taskIndex = sourceCol.tasks.findIndex((t) => t.id === taskId)

          if (taskIndex !== -1) {
            const task = { ...sourceCol.tasks[taskIndex], status: newColumns[targetColIndex].title }

            // Remove from source
            newColumns[sourceColIndex] = {
              ...sourceCol,
              tasks: sourceCol.tasks.filter((t) => t.id !== taskId),
            }

            // Add to target
            newColumns[targetColIndex] = {
              ...newColumns[targetColIndex],
              tasks: [...newColumns[targetColIndex].tasks, task],
            }

            // Update selected task if it's being moved
            if (selectedTask && selectedTask.id === taskId) {
              setSelectedTask(task)
            }

            toast({
              title: "Task moved automatically",
              description: `"${task.title}" moved to ${newColumns[targetColIndex].title} by rule: ${rules.find((r) => r.action.targetColumnId === targetColumnId)?.name}`,
            })
          }
        }
      })

      setColumns(newColumns)
      // 4.2.13 Lưu thay đổi vào database
      saveData()
    }
  }, [columns, rules, selectedTask, toast])

  // 6.1.1 Người dùng kéo thả task từ cột này sang cột khác <handleDragEnd()>
  const handleDragEnd = (result: DropResult) => {
    const {destination, source, draggableId} = result

    // 6.2.1 Người dùng kéo task đi nhưng ko qua cột khác trở về vị trí cũ
    // 6.2.2 Hệ thống kiểm tra (droppableId) và (index) của column nguồn và đích
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      // 6.2.3 Column nguồn và đích bằng nhau ko trả về trạng thái khác
      return
    }

    //6.1.2 Hệ thống tìm column(droppableId) nguồn và column đích
    const sourceColumn = columns.find((col) => col.id === source.droppableId)
    const destColumn = columns.find((col) => col.id === destination.droppableId)
    if (!sourceColumn || !destColumn) return

    // 6.1.3 Hệ thống tìm task <sourceColumn.task.find(t)> được kéo vào column
    const task = sourceColumn.tasks.find((t) => t.id === draggableId)
    if (!task) return

    // 6.1.4 Hệ thống cập nhật lại columns xóa task khỏi cột nguồn gọi <sourceColumn.task.filter>
    const newColumns = [...columns]
    const sourceColIndex = newColumns.findIndex((col) => col.id === source.droppableId)
    const destColIndex = newColumns.findIndex((col) => col.id === destination.droppableId)

    newColumns[sourceColIndex] = {
      ...sourceColumn,
      tasks: sourceColumn.tasks.filter((t) => t.id !== draggableId),
    }

    //6.1.5 Hệ thống cập nhật trạng thái <updateTask> bằng tên cột mới <newColumn[destColIndex]> và thêm vào cột đích
    const updatedTask = {...task, status: destColumn.title}
    newColumns[destColIndex] = {
      ...destColumn,
      tasks: [
        ...destColumn.tasks.slice(0, destination.index),
        updatedTask,
        ...destColumn.tasks.slice(destination.index),
      ],
    }
    // 6.1.6 cập nhật status database
    setTimeout(() => saveData(), 0)

    // 6.1.7 Hệ thống cập nhật UI status tên cột mớicd
    setColumns(newColumns)

    // Hành động kéo task nào cũng sẽ đóng taskDetail
    setSelectedTask(null)

    toast({
      title: "Task moved",
      description: `"${task.title}" moved to ${destColumn.title}`,
    })
  }

  // Update addTask to save data after adding a task
  const addTask = (columnId: string, task: Task) => {
    const newColumns = columns.map((column) => {
      if (column.id === columnId) {
        return {
          ...column,
          tasks: [...column.tasks, task],
        }
      }
      return column
    })
    setColumns(newColumns)
    toast({
      title: "Task created",
      description: `"${task.title}" added to ${columns.find((col) => col.id === columnId)?.title}`,
    })

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  // Update updateTask to save data after updating a task
  // Sequence: Cập nhật task trong KanbanBoard
  const updateTask = (updatedTask: Task) => {
  // Tìm và cập nhật task trong columns
    const newColumns = columns.map((column) => {
      return {
        ...column,
        tasks: column.tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
      }
    })
    setColumns(newColumns)
    setSelectedTask(updatedTask)

      // Hiển thị thông báo thành công
    toast({
      title: "Task updated",
      description: `"${updatedTask.title}" has been updated`,
    })

  // Lưu dữ liệu vào database
    setTimeout(() => saveData(), 0)
  }

  // 4.2.12 Hàm deleteTask(taskId) được thực thi
  const deleteTask = (taskId: string) => {
    const newColumns = columns.map((column) => {
      return {
        ...column,
        tasks: column.tasks.filter((task) => task.id !== taskId),
      }
    })
    setColumns(newColumns)
    // 4.2.14 Xoá task được chọn: setSelectedTask(null).
    setSelectedTask(null)
    // 4.2.15 Hiển thị thông báo (toast)
    toast({
      title: "Task deleted",
      description: "The task has been deleted",
    })

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  const duplicateTask = (task: Task, columnId?: string) => {
    // Create a deep copy of the task with a new ID
    const duplicatedTask: Task = {
      ...JSON.parse(JSON.stringify(task)),
      id: `task-${generateId()}`,
      title: `${task.title} (Copy)`,
      createdAt: new Date().toISOString(),
    }

    // If columnId is provided, add to that column, otherwise add to the same column as the original
    const targetColumnId = columnId || columns.find((col) => col.tasks.some((t) => t.id === task.id))?.id

    if (targetColumnId) {
      addTask(targetColumnId, duplicatedTask)
      toast({
        title: "Task duplicated",
        description: `"${duplicatedTask.title}" created`,
      })
    }
  }

  // Update addColumn to save data after adding a column
  const addColumn = () => {
    if (!newColumnTitle.trim()) {
      toast({
        title: "Error",
        description: "Column title cannot be empty",
        variant: "destructive",
      })
      return
    }

    const newColumn: ColumnType = {
      id: `column-${generateId()}`,
      title: newColumnTitle,
      tasks: [],
    }

    setColumns([...columns, newColumn])
    setNewColumnTitle("")
    setIsAddingColumn(false)
    toast({
      title: "Column added",
      description: `"${newColumnTitle}" column has been added`,
    })

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  // Update updateColumn to save data after updating a column
  const updateColumn = (columnId: string, updates: Partial<ColumnType>) => {
    const newColumns = columns.map((column) => (column.id === columnId ? { ...column, ...updates } : column))
    setColumns(newColumns)

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  // Update deleteColumn to save data after deleting a column
  const deleteColumn = (columnId: string) => {
    // Check if column has tasks
    const column = columns.find((col) => col.id === columnId)
    if (column && column.tasks.length > 0) {
      toast({
        title: "Cannot delete column",
        description: "Please move or delete all tasks in this column first",
        variant: "destructive",
      })
      return
    }

    setColumns(columns.filter((col) => col.id !== columnId))
    toast({
      title: "Column deleted",
      description: `"${column?.title}" column has been deleted`,
    })

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  // Update addRule to save data after adding a rule
  const addRule = (rule: Rule) => {
    setRules([...rules, rule])
    toast({
      title: "Rule created",
      description: `"${rule.name}" has been added`,
    })

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  const handleUpdateRule = (ruleId: string, updates: Partial<Rule>) => {
    const newRules = rules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule))
    setRules(newRules)
    updateRules(newRules)
  }

  const handleDeleteRule = (ruleId: string) => {
    const newRules = rules.filter((rule) => rule.id !== ruleId)
    setRules(newRules)
    updateRules(newRules)
  }

  // Update deleteRule to save data after deleting a rule
  const deleteRule = (ruleId: string) => {
    setRules(rules.filter((rule) => rule.id !== ruleId))
    toast({
      title: "Rule deleted",
      description: "The automation rule has been deleted",
    })

    // Save changes to KV
    setTimeout(() => saveData(), 0)
  }

  // New functions for handling data persistence
  const handleSeedData = async () => {
    try {
      await seedData()
      toast({
        title: "Data seeded",
        description: "Sample data has been loaded into the board",
      })
      // Reload the page to refresh the data
      window.location.reload()
    } catch (error) {
      console.error("Error seeding data:", error)
      toast({
        title: "Error",
        description: "Failed to seed data",
        variant: "destructive",
      })
    }
  }

  const handleClearData = async () => {
    try {
      await clearData()
      toast({
        title: "Data cleared",
        description: "All board data has been cleared",
      })
      // Reset state
      setColumns([])
      setRules([])
    } catch (error) {
      console.error("Error clearing data:", error)
      toast({
        title: "Error",
        description: "Failed to clear data",
        variant: "destructive",
      })
    }
  }

  // Update the saveData function to persist changes
  const saveData = async () => {
    try {
      // Separate columns and tasks
      const columnsWithoutTasks = columns.map((column) => ({
        ...column,
        tasks: [], // Remove tasks from column objects
      }))

      // Create tasks object
      const tasksObject: Record<string, Task[]> = {}
      columns.forEach((column) => {
        tasksObject[column.id] = column.tasks
      })

      // Save to KV
      await updateColumns(columnsWithoutTasks)
      await updateTasks(tasksObject)
      await updateRules(rules)
    } catch (error) {
      console.error("Error saving data:", error)
      toast({
        title: "Error",
        description: "Failed to save board data",
        variant: "destructive",
      })
    }
  }
  // 4.2.1 Người dùng click vào một TaskCard trên giao diện Kanban.
  const handleTaskClick = (task: Task) => {
    setSelectedTask((current) => {
      if (current?.id === task.id) {
        return null // toggle: đóng nếu đang mở task đó
      }
      return task // mở task mới
    })
  }

  // Board content for the "board" tab
  const renderBoardContent = () => (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 h-full">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onAddTask={addTask}
            onTaskClick={handleTaskClick}
            onDeleteColumn={() => deleteColumn(column.id)}
            onUpdateColumn={updateColumn}
            onDuplicateTask={duplicateTask}
          />
        ))}

        <div className="shrink-0 w-72">
          {isAddingColumn ? (
            <div className="bg-white dark:bg-gray-800 p-3 rounded-md shadow-sm border dark:border-gray-700">
              <Label htmlFor="column-title" className="dark:text-gray-200">
                Column Title
              </Label>
              <Input
                id="column-title"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                placeholder="Enter column title"
                className="mb-2 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={addColumn}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsAddingColumn(false)}
                  className="dark:border-gray-600 dark:text-gray-200"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="outline"
              className="border-dashed border-2 w-full h-12 dark:border-gray-700 dark:text-gray-300"
              onClick={() => setIsAddingColumn(true)}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Column
            </Button>
          )}
        </div>
      </div>
    </DragDropContext>
  )

  // Automation content for the "automation" tab
  const renderAutomationContent = () => (
    <div className="max-w-4xl mx-auto">
      <AutomationRules
        rules={rules}
        columns={columns}
        onAddRule={addRule}
        onUpdateRule={handleUpdateRule}
        onDeleteRule={deleteRule}
      />
    </div>
  )

  // Update the header section to include the seed data button
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 p-4 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Kanban Board</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSeedData} className="flex items-center gap-1">
              <Database className="h-4 w-4" />
              <span>Seed Data</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleClearData} className="flex items-center gap-1">
              <Trash className="h-4 w-4" />
              <span>Clear Data</span>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          <TabsContent value="board" className="mt-4">
            {renderBoardContent()}
          </TabsContent>

          <TabsContent value="automation" className="mt-4">
            {renderAutomationContent()}
          </TabsContent>
        </Tabs>
      </header>

      // 4.2.3 Thành phần TaskDetailSidebar được hiển thị, render các thông tin chi tiết của task.
      // 4.2.16 Giao diện TaskDetailSidebar đóng lại và giao diện được cập nhật.
      {selectedTask && (
        <TaskDetailSidebar
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={updateTask}
          // 4.2.11 Gửi sự kiện onDelete(taskId) lên KanbanBoard.
          onDelete={deleteTask}
          onDuplicate={duplicateTask}
          columns={columns}
        />
      )}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={() => handleSeedData()}>
            <Database className="mr-2 h-4 w-4" />
            Seed Data
          </Button>
          <Button variant="destructive" onClick={() => handleClearData()}>
            <Trash className="mr-2 h-4 w-4" />
            Clear Data
          </Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </footer>
    </div>
  )
}
