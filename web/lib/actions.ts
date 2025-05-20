"use server"

import { kv } from "@vercel/kv"
import type { Column, Task, Rule } from "@/types/kanban"
import { generateMockTasks } from "@/lib/mock-data"

// KV keys
const COLUMNS_KEY = "kanban:columns"
const TASKS_KEY = "kanban:tasks"
const RULES_KEY = "kanban:rules"

// Get all columns
export async function getColumns(): Promise<Column[]> {
  try {
    const columns = await kv.get<Column[]>(COLUMNS_KEY)
    return columns || []
  } catch (error) {
    console.error("Error fetching columns:", error)
    return []
  }
}

// Get all tasks
export async function getTasks(): Promise<Record<string, Task[]>> {
  try {
    const tasks = await kv.get<Record<string, Task[]>>(TASKS_KEY)
    return tasks || {}
  } catch (error) {
    console.error("Error fetching tasks:", error)
    return {}
  }
}

// Get all rules
export async function getRules(): Promise<Rule[]> {
  try {
    const rules = await kv.get<Rule[]>(RULES_KEY)
    return rules || []
  } catch (error) {
    console.error("Error fetching rules:", error)
    return []
  }
}

// Update columns
export async function updateColumns(columns: Column[]): Promise<void> {
  try {
    await kv.set(COLUMNS_KEY, columns)
  } catch (error) {
    console.error("Error updating columns:", error)
    throw new Error("Failed to update columns")
  }
}

// Update tasks
export async function updateTasks(tasks: Record<string, Task[]>): Promise<void> {
  try {
    await kv.set(TASKS_KEY, tasks)
  } catch (error) {
    console.error("Error updating tasks:", error)
    throw new Error("Failed to update tasks")
  }
}

// Update rules
export async function updateRules(rules: Rule[]): Promise<void> {
  try {
    await kv.set(RULES_KEY, rules)
  } catch (error) {
    console.error("Error updating rules:", error)
    throw new Error("Failed to update rules")
  }
}

// Seed data
export async function seedData(): Promise<void> {
  try {
    // Generate mock data
    const mockTasks = generateMockTasks()

    // Create columns
    const columns: Column[] = [
      {
        id: "column-1",
        title: "To Do",
        tasks: mockTasks["To Do"],
        color: "bg-blue-50 dark:bg-blue-900/30",
      },
      {
        id: "column-2",
        title: "In Progress",
        tasks: mockTasks["In Progress"],
        color: "bg-yellow-50 dark:bg-yellow-900/30",
      },
      {
        id: "column-3",
        title: "Blocked",
        tasks: mockTasks["Blocked"],
        color: "bg-red-50 dark:bg-red-900/30",
      },
      {
        id: "column-4",
        title: "Completed",
        tasks: mockTasks["Completed"],
        color: "bg-green-50 dark:bg-green-900/30",
      },
    ]

    // Create tasks object
    const tasks: Record<string, Task[]> = {}
    columns.forEach((column) => {
      tasks[column.id] = column.tasks
      // Remove tasks from column object to avoid duplication
      column.tasks = []
    })

    // Create rules
    const rules: Rule[] = [
      {
        id: `rule-1`,
        name: "Move overdue tasks to Blocked",
        condition: {
          type: "due-date",
          operator: "is-overdue",
        },
        action: {
          type: "move-to-column",
          targetColumnId: "column-3", // Blocked column
        },
        enabled: true,
      },
      {
        id: `rule-2`,
        name: "Move completed tasks when all subtasks done",
        condition: {
          type: "subtasks-completed",
          operator: "all-completed",
        },
        action: {
          type: "move-to-column",
          targetColumnId: "column-4", // Completed column
        },
        enabled: true,
      },
    ]

    // Save to KV
    await kv.set(COLUMNS_KEY, columns)
    await kv.set(TASKS_KEY, tasks)
    await kv.set(RULES_KEY, rules)

    return
  } catch (error) {
    console.error("Error seeding data:", error)
    throw new Error("Failed to seed data")
  }
}

// Clear all data
export async function clearData(): Promise<void> {
  try {
    await kv.del(COLUMNS_KEY)
    await kv.del(TASKS_KEY)
    await kv.del(RULES_KEY)
  } catch (error) {
    console.error("Error clearing data:", error)
    throw new Error("Failed to clear data")
  }
}
