"use client";
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Column } from './Column';
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { CreateTaskDialog } from './CreateTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { Board as BoardType, Task } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

const initialData: BoardType = {
  columns: [
    {
      id: 'todo',
      title: 'Cần làm',
      tasks: []
    },
    {
      id: 'in-progress',
      title: 'Đang thực hiện',
      tasks: []
    },
    {
      id: 'done',
      title: 'Hoàn thành',
      tasks: []
    }
  ]
};

export function Board() {
  const [board, setBoard] = useLocalStorage<BoardType>('trello-board', initialData);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const sourceColumn = board.columns.find(col => col.id === source.droppableId);
    const destColumn = board.columns.find(col => col.id === destination.droppableId);

    if (!sourceColumn || !destColumn) return;

    const task = sourceColumn.tasks[source.index];

    const newBoard = {
      columns: board.columns.map(col => {
        if (col.id === source.droppableId) {
          const newTasks = Array.from(col.tasks);
          newTasks.splice(source.index, 1);
          return { ...col, tasks: newTasks };
        }
        if (col.id === destination.droppableId) {
          const newTasks = Array.from(col.tasks);
          newTasks.splice(destination.index, 0, {
            ...task,
            status: destination.droppableId as 'todo' | 'in-progress' | 'done'
          });
          return { ...col, tasks: newTasks };
        }
        return col;
      })
    };

    setBoard(newBoard);
  };

  const handleTaskCreate = (newTask: Task) => {
    const todoColumn = board.columns.find(col => col.id === 'todo');
    if (!todoColumn) return;

    const newBoard = {
      columns: board.columns.map(col => {
        if (col.id === 'todo') {
          return { ...col, tasks: [...col.tasks, newTask] };
        }
        return col;
      })
    };

    setBoard(newBoard);
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
  };

  const handleTaskUpdate = (updatedTask: Task) => {
    const newBoard = {
      columns: board.columns.map(col => ({
        ...col,
        tasks: col.tasks.map(t => 
          t.id === updatedTask.id ? updatedTask : t
        )
      }))
    };
    setBoard(newBoard);
  };

  const handleTaskDelete = (taskId: string) => {
    const newBoard = {
      columns: board.columns.map(col => ({
        ...col,
        tasks: col.tasks.filter(t => t.id !== taskId)
      }))
    };
    setBoard(newBoard);
  };

  if (!isClient) {
    return null;
  }

  return (
    <div className="h-full p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Quản lý công việc</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Thêm công việc
        </Button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {board.columns.map((column) => (
            <Column 
              key={column.id} 
              column={column}
              onTaskEdit={setEditingTask}
            />
          ))}
        </div>
      </DragDropContext>

      <CreateTaskDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
        onTaskCreate={handleTaskCreate}
      />
      <EditTaskDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
        onTaskUpdate={handleTaskUpdate}
        onTaskDelete={handleTaskDelete}
      />
    </div>
  );
} 