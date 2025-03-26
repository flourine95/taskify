"use client";
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import { Column } from './Column';
import { useState } from 'react';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import { CreateTaskDialog } from './CreateTaskDialog';

const initialData = {
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
  const [board, setBoard] = useState(initialData);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const onDragEnd = (result: any) => {
    // Xử lý logic kéo thả ở đây
  };

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
            <Column key={column.id} column={column} />
          ))}
        </div>
      </DragDropContext>

      <CreateTaskDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
} 