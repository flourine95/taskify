"use client"

import { useState, useEffect, useCallback } from "react"
import { DragDropContext, type DropResult } from "@hello-pangea/dnd"
import { Plus, Database, RefreshCcw, Trash, Search, FilterX, Loader2 } from "lucide-react"
import Column from "./column"
import TaskDetailSidebar from "./task-detail-sidebar"
import AutomationRules from "./automation-rules"
import { ThemeToggle } from "./theme-toggle"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import {Task, Column as ColumnType, Rule, TaskPriority, CustomField} from "@/types/kanban"
import { generateId } from "@/lib/utils"
import { updateColumns, updateTasks, updateRules, seedData, clearData } from "@/lib/actions"
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from "@/components/ui/select";


interface KanbanBoardProps {
  initialColumns: ColumnType[]
  initialRules: Rule[]
}

const ASSIGNED_TO_FIELD_NAME = "Assigned To";

export default function KanbanBoard({ initialColumns = [], initialRules = [] }: KanbanBoardProps) {
  const { toast } = useToast()
  const [columns, setColumns] = useState<ColumnType[]>(initialColumns)
  // 4.2.2 KanbanBoard thực thi setSelectedTask() để lưu thông tin task được chọn.
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newColumnTitle, setNewColumnTitle] = useState("")
  const [isAddingColumn, setIsAddingColumn] = useState(false)
  const [rules, setRules] = useState<Rule[]>(initialRules)
  const [activeTab, setActiveTab] = useState("board")

  // UC-003 3.6 Hệ thống nhân các component KanbanBoard
  // State cho các giá trị bộ lọc và từ khóa tìm kiếm
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedPriority, setSelectedPriority] = useState<string>("all_priorities")
  const [selectedAssignee, setSelectedAssignee] = useState<string>("all_assignees");
  const [selectedStatus, setSelectedStatus] = useState<string>("all_statuses")
  const [selectedDueDateRange, setSelectedDueDateRange] = useState<string>("all_due_dates")

  const [availableAssignees, setAvailableAssignees] = useState<string[]>([]);
  const [filteredColumns, setFilteredColumns] = useState<ColumnType[]>(initialColumns)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)

  useEffect(() => {
    setColumns(initialColumns);
    setFilteredColumns(
        applyFilters(
            initialColumns,
            searchTerm,
            selectedPriority,
            selectedStatus,
            selectedDueDateRange,
            selectedAssignee
        )
    );
  }, [initialColumns]);

  useEffect(() => {
    const assignees = new Set<string>();
    columns.forEach(column => {
      column.tasks.forEach(task => {
        const assignedToField = task.customFields.find(
            (field: CustomField) => field.name.toLowerCase() === ASSIGNED_TO_FIELD_NAME.toLowerCase()
        );
        if (assignedToField && assignedToField.value) {
          assignees.add(assignedToField.value);
        }
      });
    });
    setAvailableAssignees(Array.from(assignees).sort());
  }, [columns]);


  // UC-003 3.7 Hàm applyFilters thực hiện việc lọc
  const applyFilters = useCallback((
      colsToFilter: ColumnType[],
      term: string,
      priorityFilter: string,
      statusFilterValue: string,
      dueDateRangeFilterValue: string,
      assigneeFilter: string
  ): ColumnType[] => {
    setIsLoadingFilters(true);
    // UC-003 3.8.a: Tạo một bản sao của danh sách các cột và công việc
    const tempFilteredColumns = JSON.parse(JSON.stringify(colsToFilter)) as ColumnType[];

    const processedColumns = tempFilteredColumns.map(column => {
      let tasks = [...column.tasks];

      // UC-003 3.8.b (Kiểm tra từ khóa): Lọc theo searchTerm
      if (term.trim()) {
        const lowerSearchTerm = term.toLowerCase();
        tasks = tasks.filter(task =>
            task.title.toLowerCase().includes(lowerSearchTerm) ||
            (task.description && task.description.toLowerCase().includes(lowerSearchTerm))
        );
      }

      // UC-003 3.8.b (Kiểm tra Priority): Lọc theo Priority (sử dụng customFields)
      if (priorityFilter !== "all_priorities") {
        const currentPriorityToFilter = priorityFilter as TaskPriority;
        tasks = tasks.filter((task: Task) => {
          const priorityCustomField = task.customFields.find(
              (field: CustomField) => field.name.toLowerCase() === "priority"
          );
          let taskMatchesFilter = false;
          if (currentPriorityToFilter === 'none') {
            if (!priorityCustomField || !priorityCustomField.value) {
              taskMatchesFilter = true;
            } else {
              const fieldValueNormalized = typeof priorityCustomField.value === 'string'
                  ? priorityCustomField.value.toLowerCase()
                  : String(priorityCustomField.value).toLowerCase();
              if (fieldValueNormalized === 'none') {
                taskMatchesFilter = true;
              }
            }
          } else if (priorityCustomField && priorityCustomField.value) {
            const fieldValueNormalized = typeof priorityCustomField.value === 'string'
                ? priorityCustomField.value.toLowerCase()
                : String(priorityCustomField.value).toLowerCase();
            if (fieldValueNormalized === currentPriorityToFilter) {
              taskMatchesFilter = true;
            }
          }
          return taskMatchesFilter;
        });
      }

      // UC-003 3.8.b (Kiểm tra Assigned To): Lọc theo Assigned To (sử dụng customFields)
      if (assigneeFilter !== "all_assignees") {
        tasks = tasks.filter((task: Task) => {
          const assignedToCustomField = task.customFields.find(
              (field: CustomField) => field.name.toLowerCase() === ASSIGNED_TO_FIELD_NAME.toLowerCase()
          );
          if (assigneeFilter === "unassigned") {
            return !assignedToCustomField || !assignedToCustomField.value;
          }
          if (assignedToCustomField && assignedToCustomField.value) {
            return String(assignedToCustomField.value).toLowerCase() === String(assigneeFilter).toLowerCase();
          }
          return false;
        });
      }

      // UC-003 3.8.b (Kiểm tra Ngày hết hạn): Lọc theo DueDateRange
      if (dueDateRangeFilterValue !== "all_due_dates") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedColumn = colsToFilter.find(c => c.title.toLowerCase() === "completed");
        const completedColumnTitleForFilter = completedColumn ? completedColumn.title : undefined;

        tasks = tasks.filter(task => {
          if (dueDateRangeFilterValue === "no_due_date") {
            return !task.dueDate;
          }
          if (!task.dueDate) {
            return false;
          }
          const taskDueDate = new Date(task.dueDate);
          taskDueDate.setHours(0, 0, 0, 0);

          switch (dueDateRangeFilterValue) {
            case "today":
              return taskDueDate.getTime() === today.getTime();
            case "tomorrow":
              const tomorrow = new Date(today);
              tomorrow.setDate(today.getDate() + 1);
              return taskDueDate.getTime() === tomorrow.getTime();
            case "this_week":
              const startOfWeek = new Date(today);
              startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1));
              const endOfWeek = new Date(startOfWeek);
              endOfWeek.setDate(startOfWeek.getDate() + 6);
              return taskDueDate >= startOfWeek && taskDueDate <= endOfWeek;
            case "next_week":
              const startOfNextWeek = new Date(today);
              startOfNextWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? 1 : 8));
              const endOfNextWeek = new Date(startOfNextWeek);
              endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
              return taskDueDate >= startOfNextWeek && taskDueDate <= endOfNextWeek;
            case "overdue":
              return taskDueDate < today && (!completedColumnTitleForFilter || task.status !== completedColumnTitleForFilter);
            default:
              return false;
          }
        });
      }
      return { ...column, tasks };
    });

    let finalFilteredColumns = processedColumns;

    // UC-003 3.8.b (Lọc danh sách cột theo Trạng thái)
    if (statusFilterValue !== "all_statuses") {
      finalFilteredColumns = finalFilteredColumns.filter(column => column.id === statusFilterValue); // UC-3 NF.7: Chỉ hiển thị cột đó
    }
    // UC-003 3.8.c ii): Nếu "Tất cả các cột" được chọn, giữ lại tất cả các cột (đã xử lý bằng cách không lọc thêm ở đây)
    // Việc không ẩn cột rỗng khi "all_statuses" đã được xử lý ở phiên trước để cột mới luôn hiển thị.

    setIsLoadingFilters(false);
    // UC-003 3.8.b: Trả về danh sách các cột đã được lọc
    return finalFilteredColumns;
  }, []);

  // UC-003 3.9: Hệ thống (KanbanBoard) nhận diện sự thay đổi và gọi applyFilters
  useEffect(() => {
    const newFilteredColumns = applyFilters(
        columns,
        searchTerm,
        selectedPriority,
        selectedStatus,
        selectedDueDateRange,
        selectedAssignee
    );
    //  UC-003 3.9:Hệ thống cập nhật trạng thái filteredColumns
    setFilteredColumns(newFilteredColumns);
  }, [searchTerm, selectedPriority, selectedAssignee, selectedStatus, selectedDueDateRange, columns, applyFilters]);


  useEffect(() => {
    if (rules.length === 0) return;
    const enabledRules = rules.filter((rule) => rule.enabled);
    if (enabledRules.length === 0) return;

    const tasksToMove: { taskId: string; sourceColumnId: string; targetColumnId: string }[] = [];
    const currentColumnsStateForAutomation = JSON.parse(JSON.stringify(columns)) as ColumnType[];

    currentColumnsStateForAutomation.forEach((column) => {
      column.tasks.forEach((task) => {
        enabledRules.forEach((rule) => {
          const { condition, action } = rule;
          let conditionMet = false;
          const completedColumn = currentColumnsStateForAutomation.find(c => c.title.toLowerCase() === "completed");

          if (condition.type === "due-date" && condition.operator === "is-overdue") {
            conditionMet = Boolean(task.dueDate && new Date(task.dueDate) < new Date() && (!completedColumn || task.status !== completedColumn.title));
          } else if (condition.type === "subtasks-completed" && condition.operator === "all-completed") {
            conditionMet = task.subtasks.length > 0 && task.subtasks.every((subtask) => subtask.completed);
          } else if (condition.type === "custom-field" && condition.field) {
            const field = task.customFields.find((f) => f.name === condition.field);
            if (field) {
              if (condition.operator === "equals") conditionMet = field.value === condition.value;
              else if (condition.operator === "not-equals") conditionMet = field.value !== condition.value;
              else if (condition.operator === "contains") conditionMet = field.value.includes(condition.value || "");
            }
          }

          if (conditionMet && action.type === "move-to-column") {
            const targetColumn = currentColumnsStateForAutomation.find((col) => col.id === action.targetColumnId);
            if (targetColumn && task.status !== targetColumn.title) {
              tasksToMove.push({
                taskId: task.id,
                sourceColumnId: column.id,
                targetColumnId: action.targetColumnId,
              });
            }
          }
        });
      });
    });

    if (tasksToMove.length > 0) {
      let newColumnsAfterAutomation = [...currentColumnsStateForAutomation];
      tasksToMove.forEach(({ taskId, sourceColumnId, targetColumnId }) => {
        const sourceColIndex = newColumnsAfterAutomation.findIndex((col) => col.id === sourceColumnId);
        const targetColIndex = newColumnsAfterAutomation.findIndex((col) => col.id === targetColumnId);

        if (sourceColIndex !== -1 && targetColIndex !== -1) {
          const sourceCol = newColumnsAfterAutomation[sourceColIndex];
          const taskIndex = sourceCol.tasks.findIndex((t) => t.id === taskId);

          if (taskIndex !== -1) {
            const taskToMove = { ...sourceCol.tasks[taskIndex], status: newColumnsAfterAutomation[targetColIndex].title };
            newColumnsAfterAutomation[sourceColIndex] = {
              ...sourceCol,
              tasks: sourceCol.tasks.filter((t) => t.id !== taskId),
            };
            newColumnsAfterAutomation[targetColIndex] = {
              ...newColumnsAfterAutomation[targetColIndex],
              tasks: [...newColumnsAfterAutomation[targetColIndex].tasks, taskToMove],
            };
            if (selectedTask && selectedTask.id === taskId) {
              setSelectedTask(taskToMove);
            }
            const ruleResponsible = rules.find((r) => r.action.targetColumnId === targetColumnId && r.enabled);
            if (ruleResponsible) {
              toast({
                title: "Task moved automatically",
                description: `"${taskToMove.title}" moved to ${newColumnsAfterAutomation[targetColIndex].title} by rule: ${ruleResponsible.name}`,
              });
            }
          }
        }
      });
      setColumns(newColumnsAfterAutomation);
      // 4.2.13 Lưu thay đổi vào database
      saveData(newColumnsAfterAutomation, rules);
    }
  }, [columns, rules, selectedTask, toast]);


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


  const addTask = (columnId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'status'> & { priorityValue?: TaskPriority | 'none_explicit', assigneeValue?: string }) => {
    const { priorityValue, assigneeValue, ...restTaskData } = taskData;
    const customFields: CustomField[] = restTaskData.customFields || [];

    if (priorityValue && priorityValue !== 'none_explicit') {
      customFields.push({
        id: `cf-${generateId()}`,
        name: "Priority",
        value: priorityValue
      });
    } else if (priorityValue === 'none_explicit') {
      customFields.push({
        id: `cf-${generateId()}`,
        name: "Priority",
        value: "none"
      });
    }
    if (assigneeValue) {
      const existingAssigneeFieldIdx = customFields.findIndex(f => f.name.toLowerCase() === ASSIGNED_TO_FIELD_NAME.toLowerCase());
      if (existingAssigneeFieldIdx !== -1) {
        customFields[existingAssigneeFieldIdx].value = assigneeValue;
      } else {
        customFields.push({ id: `cf-${generateId()}`, name: ASSIGNED_TO_FIELD_NAME, value: assigneeValue });
      }
    }

    const targetColumn = columns.find(col => col.id === columnId);
    if (!targetColumn) return;

    const newTask: Task = {
      id: `task-${generateId()}`,
      ...restTaskData,
      status: targetColumn.title,
      customFields,
      createdAt: new Date().toISOString(),
    };

    const newColumnsState = columns.map((column) => {
      if (column.id === columnId) {
        return { ...column, tasks: [...column.tasks, newTask] };
      }
      return column;
    });
    setColumns(newColumnsState);
    toast({
      title: "Task created",
      description: `"${newTask.title}" added to ${targetColumn.title}`,
    });
    setTimeout(() => saveData(newColumnsState, rules), 0);
  };

  // Update updateTask to save data after updating a task
  // Sequence: Cập nhật task trong KanbanBoard
  const updateTask = (updatedTask: Task) => {
    // Tìm và cập nhật task trong columns
    const newColumnsState = columns.map((column) => ({
      ...column,
      tasks: column.tasks.map((task: Task) => (task.id === updatedTask.id ? updatedTask : task)),
    }));
    setColumns(newColumnsState);
    setSelectedTask(updatedTask);
    // Hiển thị thông báo thành công
    toast({
      title: "Task updated",
      description: `"${updatedTask.title}" has been updated`,
    });
    // Lưu dữ liệu vào database
    setTimeout(() => saveData(newColumnsState, rules), 0);
  };
  // 4.2.12 Hàm deleteTask(taskId) được thực thi
  const deleteTask = (taskId: string) => {
    const newColumnsState = columns.map((column) => ({
      ...column,
      tasks: column.tasks.filter((task: Task) => task.id !== taskId),
    }));
    setColumns(newColumnsState);
    // 4.2.14 Xoá task được chọn: setSelectedTask(null).
    setSelectedTask(null);
    // 4.2.15 Hiển thị thông báo (toast)
    toast({ title: "Task deleted", description: "The task has been deleted" });
    setTimeout(() => saveData(newColumnsState, rules), 0);
  };

  const duplicateTask = (taskToDuplicate: Task, columnId?: string) => {
    const duplicatedTaskData: Omit<Task, 'id' | 'createdAt'> = {
      ...JSON.parse(JSON.stringify(taskToDuplicate)),
      title: `${taskToDuplicate.title} (Copy)`,
    };
    delete (duplicatedTaskData as any).id;
    delete (duplicatedTaskData as any).createdAt;

    const targetColumnId = columnId || columns.find((col) => col.tasks.some((t) => t.id === taskToDuplicate.id))?.id;
    if (targetColumnId) {
      addTask(targetColumnId, {
        ...duplicatedTaskData,
      });
      toast({
        title: "Task duplicated",
        description: `"${duplicatedTaskData.title}" created`,
      });
    }
  };


  const addColumn = () => {
    if (!newColumnTitle.trim()) {
      toast({ title: "Error", description: "Column title cannot be empty", variant: "destructive" });
      return;
    }
    const newColumnData: ColumnType = { id: `column-${generateId()}`, title: newColumnTitle, tasks: [] };
    const newColumnsState = [...columns, newColumnData];
    setColumns(newColumnsState);
    setNewColumnTitle("");
    setIsAddingColumn(false);
    toast({ title: "Column added", description: `"${newColumnTitle}" column has been added` });
    setTimeout(() => saveData(newColumnsState, rules), 0);
  };


  const updateColumn = (columnId: string, updates: Partial<ColumnType>) => {
    const newColumnsState = columns.map((column) => (column.id === columnId ? { ...column, ...updates } : column));
    setColumns(newColumnsState);
    setTimeout(() => saveData(newColumnsState, rules), 0);
  };

  const deleteColumn = (columnId: string) => {
    const columnToDelete = columns.find((col) => col.id === columnId);
    if (columnToDelete && columnToDelete.tasks.length > 0) {
      toast({ title: "Cannot delete column", description: "Please move or delete all tasks in this column first", variant: "destructive"});
      return;
    }
    const newColumnsState = columns.filter((col) => col.id !== columnId);
    setColumns(newColumnsState);
    toast({ title: "Column deleted", description: `"${columnToDelete?.title}" column has been deleted`});
    setTimeout(() => saveData(newColumnsState, rules), 0);
  };

  const addRule = (rule: Rule) => {
    const newRules = [...rules, rule];
    setRules(newRules);
    toast({ title: "Rule created", description: `"${rule.name}" has been added` });
    setTimeout(() => updateRules(newRules), 0);
  };

  const handleUpdateRule = (ruleId: string, updates: Partial<Rule>) => {
    const newRules = rules.map((rule) => (rule.id === ruleId ? { ...rule, ...updates } : rule));
    setRules(newRules);
    updateRules(newRules);
  };

  const deleteRule = (ruleId: string) => {
    const newRules = rules.filter((rule) => rule.id !== ruleId);
    setRules(newRules);
    toast({ title: "Rule deleted", description: "The automation rule has been deleted" });
    setTimeout(() => updateRules(newRules), 0);
  };

  const handleSeedData = async () => {
    try {
      await seedData();
      toast({ title: "Data seeded", description: "Sample data has been loaded" });
      window.location.reload();
    } catch (error) {
      console.error("Error seeding data:", error);
      toast({ title: "Error", description: "Failed to seed data", variant: "destructive" });
    }
  };

  const handleClearData = async () => {
    try {
      await clearData();
      toast({ title: "Data cleared", description: "All board data has been cleared" });
      setColumns([]);
      setRules([]);
    } catch (error) {
      console.error("Error clearing data:", error);
      toast({ title: "Error", description: "Failed to clear data", variant: "destructive" });
    }
  };

  const saveData = async (currentColumnsToSave?: ColumnType[], currentRulesToSave?: Rule[]) => {
    const colsToSave = currentColumnsToSave || columns;
    const rulesToPersist = currentRulesToSave || rules;
    try {
      const columnsWithoutTasks = colsToSave.map((column) => ({ ...column, tasks: [] }));
      const tasksObject: Record<string, Task[]> = {};
      colsToSave.forEach((column) => { tasksObject[column.id] = column.tasks; });

      await updateColumns(columnsWithoutTasks);
      await updateTasks(tasksObject);
      await updateRules(rulesToPersist);
    } catch (error) {
      console.error("Error saving data:", error);
      toast({ title: "Error", description: "Failed to save board data", variant: "destructive" });
    }
  };
  // 4.2.1 Người dùng click vào một TaskCard trên giao diện Kanban.
  const handleTaskClick = (task: Task) => {
    setSelectedTask((current) => {
      if (current?.id === task.id) {
        return null // toggle: đóng nếu đang mở task đó
      }
      return task // mở task mới
    })
  }

  // UC-3 AF.A2.a: Người dùng nhấp vào nút "Xóa tất cả bộ lọc"
  const handleClearFilters = () => {
    // UC-3 AF.A2.b: Hệ thống đặt lại các trạng thái filter về mặc định
    setSearchTerm("");
    setSelectedPriority("all_priorities");
    setSelectedStatus("all_statuses");
    setSelectedDueDateRange("all_due_dates");
    setSelectedAssignee("all_assignees");
    // UC-3 AF.A2.c: Kích hoạt useEffect và applyFilters được gọi lại, hiển thị lại tất cả công việc
  };

  const renderBoardContent = () => (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 h-full overflow-x-auto py-2">
          {/* UC-003 3.10: Giao diện người dùng được render lại, chỉ hiển thị các cột và công việc đã được lọc */}
          {filteredColumns.map((column) => (
              <Column
                  key={column.id}
                  column={column}
                  onAddTask={(colId, taskData) => addTask(colId, taskData as Omit<Task, 'id' | 'createdAt' | 'status'> & { priorityValue?: TaskPriority | 'none_explicit', assigneeValue?: string })}
                  onTaskClick={handleTaskClick}
                  onDeleteColumn={() => deleteColumn(column.id)}
                  onUpdateColumn={updateColumn}
                  onDuplicateTask={duplicateTask}
              />
          ))}
          {isLoadingFilters && (
              <div className="flex-1 flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
          )}
          {/* UC-3 AF.A1.b & AF.A1.c: Hiển thị thông báo khi không tìm thấy công việc */}
          {!isLoadingFilters && filteredColumns.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <FilterX className="h-12 w-12 mb-4" />
                <p className="text-lg font-semibold">Không tìm thấy công việc nào</p>
                <p>Hãy thử thay đổi điều kiện tìm kiếm hoặc bộ lọc của bạn.</p>
                <Button onClick={handleClearFilters} className="mt-4">Xóa tất cả bộ lọc</Button>
              </div>
          )}
          {(selectedStatus === "all_statuses" || (!isLoadingFilters && filteredColumns.length === 0)) && (
              <div className="shrink-0 w-72">
                {isAddingColumn ? (
                    <div className="bg-card p-3 rounded-md shadow-sm border dark:border-neutral-700">
                      <Label htmlFor="column-title" className="text-foreground">Column Title</Label>
                      <Input
                          id="column-title"
                          value={newColumnTitle}
                          onChange={(e) => setNewColumnTitle(e.target.value)}
                          placeholder="Enter column title"
                          className="mb-2 bg-input border-border text-foreground"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={addColumn}>Add</Button>
                        <Button size="sm" variant="outline" onClick={() => setIsAddingColumn(false)} className="border-border text-foreground">Cancel</Button>
                      </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        className="border-dashed border-2 w-full h-12 border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary"
                        onClick={() => setIsAddingColumn(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Column
                    </Button>
                )}
              </div>
          )}
        </div>
      </DragDropContext>
  );

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
      <div className="flex flex-col h-full min-h-screen p-4 md:p-6 space-y-4 md:space-y-6 bg-background">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
          <div className="flex-grow w-full">
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
            <Tabs defaultValue="board" className="w-full h-full flex flex-col" value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-2 sm:mb-4">
                <TabsList className="grid w-full sm:w-auto grid-cols-2">
                  <TabsTrigger value="board">Board</TabsTrigger>
                  <TabsTrigger value="automation">Automation</TabsTrigger>
                </TabsList>
              </div>
              {/* UC-003 3.1: Người dùng nhập từ khóa*/}
              {activeTab === 'board' && (
                  <div className="p-3 md:p-4 my-2 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-center bg-card border dark:border-neutral-700 rounded-lg shadow-sm">
                    Search Keyword
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-auto md:min-w-[200px]">
                      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                          type="text"
                          placeholder="Search Keyword..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)} // UC-3 NF.2: Hệ thống cập nhật dựa trên từ khóa
                          className="h-9 pl-9 text-sm rounded-md w-full"
                      />
                    </div>

                    {/* UC-003 3.2: Người dùng chọn lọc */}
                    <div className="w-full sm:w-auto md:min-w-[140px]">
                      <Select
                          value={selectedPriority}
                          onValueChange={(value: string) => setSelectedPriority(value)} //UC-003 3.2 Người dùng chọn lọc priority
                      >
                        <SelectTrigger className="h-9 text-sm rounded-md">
                          <SelectValue placeholder="Ưu tiên" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_priorities">Priority</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* UC-003 3.3 Người dùng chọn "Người được giao" */}
                    <div className="w-full sm:w-auto md:min-w-[140px]">
                      <Select
                          value={selectedAssignee}
                          onValueChange={(value: string) => setSelectedAssignee(value)} //UC-003 3.3 Người dùng chọn lọc Assign
                      >
                        <SelectTrigger className="h-9 text-sm rounded-md">
                          <SelectValue placeholder="Người được giao" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_assignees">Assign</SelectItem>
                          <SelectItem value="unassigned">none</SelectItem>
                          {availableAssignees.map(assignee => (
                              <SelectItem key={assignee} value={assignee}>
                                {assignee}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* UC-3 3.4: Người dùng chọn "Cột" (Trạng thái) */}
                    <div className="w-full sm:w-auto md:min-w-[140px]">
                      <Select
                          value={selectedStatus}
                          onValueChange={setSelectedStatus} //UC-003 3.4 Người dùng chọn lọc status
                      >
                        <SelectTrigger className="h-9 text-sm rounded-md">
                          <SelectValue placeholder="Trạng thái" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_statuses">Column</SelectItem>
                          {(columns || []).map(column => (
                              <SelectItem key={column.id} value={column.id}>{column.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* UC-003 3.5 (phần đầu, trigger chung cho bộ lọc ngày): Người dùng chọn "Ngày hết hạn" */}
                    <div className="w-full sm:w-auto md:min-w-[140px]">
                      <Select
                          value={selectedDueDateRange}
                          onValueChange={setSelectedDueDateRange} // Hệ thống cập nhật dựa trên ngày hết hạn
                      >
                        <SelectTrigger className="h-9 text-sm rounded-md">
                          <SelectValue placeholder="Hạn chót" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_due_dates">DateLine</SelectItem>
                          <SelectItem value="today">Today</SelectItem>
                          <SelectItem value="tomorrow">Tomorrow</SelectItem>
                          <SelectItem value="this_week">This week</SelectItem>
                          <SelectItem value="next_week">Next Week</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                          <SelectItem value="no_due_date">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={handleClearFilters} // UC-3 AF.A2.a
                        className="h-9 text-sm w-full sm:w-auto text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md"
                        disabled={isLoadingFilters}
                    >
                      <FilterX className="mr-1.5 h-4 w-4"/> Clear Data
                    </Button>
                  </div>
              )}


              <div className="mt-0 flex-grow overflow-hidden">
                <TabsContent value="board" className="h-full flex flex-col">
                  {renderBoardContent()}
                </TabsContent>
                <TabsContent value="automation" className="h-full">
                  {renderAutomationContent()}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </header>

        {/*4.2.3 Thành phần TaskDetailSidebar được hiển thị, render các thông tin chi tiết của task.*/}
        {/*4.2.16 Giao diện TaskDetailSidebar đóng lại và giao diện được cập nhật.*/}
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
        <footer className="bg-card border-t dark:border-neutral-700 p-3 md:p-4 shadow-sm mt-auto">
          <div className="flex flex-wrap gap-2 justify-center sm:justify-between items-center">
            <Button variant="outline" onClick={() => handleSeedData()}>
              <Database className="mr-2 h-4 w-4" />
              Seed Data
            </Button>
            <Button variant="destructive" onClick={() => handleClearData()}>
              <Trash className="mr-2 h-4 w-4" />
              Clear Data
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh Data
            </Button>
          </div>
        </footer>
      </div>
  );
}



