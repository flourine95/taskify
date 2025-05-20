// src/components/Board.tsx
"use client";
import {DragDropContext, DropResult} from '@hello-pangea/dnd';
import {Column} from './Column';
import {useState, useEffect} from 'react';
import {Button} from './ui/button';
import {Plus} from 'lucide-react';
import {CreateTaskDialog} from './CreateTaskDialog';
import {EditTaskDialog} from './EditTaskDialog';
import {Board as BoardType, Task} from '@/types';
import {useLocalStorage} from '@/hooks/useLocalStorage';

const initialData: BoardType = {
    columns: [
        {id: 'todo', title: 'Cần làm', tasks: []},
        {id: 'in-progress', title: 'Đang thực hiện', tasks: []},
        {id: 'done', title: 'Hoàn thành', tasks: []}
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
        const {destination, source} = result;
        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const task = board.columns
            .find(col => col.id === source.droppableId)
            ?.tasks[source.index];
        if (!task) return;

        const newBoard = {
            columns: board.columns.map(col => {
                if (col.id === source.droppableId) {
                    const newTasks = col.tasks.filter((_, i) => i !== source.index);
                    return {...col, tasks: newTasks};
                }
                if (col.id === destination.droppableId) {
                    const newTasks = [...col.tasks];
                    newTasks.splice(destination.index, 0, {...task, status: destination.droppableId as any});
                    return {...col, tasks: newTasks};
                }
                return col;
            })
        };

        setBoard(newBoard);
    };

    const handleTaskCreate = (newTask: Task) => {
        const taskWithTimestamp = {
            ...newTask,
            createdAt: new Date().toISOString(),
            startedAt: null,
            completedAt: null,
        };

        setBoard({
            columns: board.columns.map(col =>
                col.id === 'todo' ? {...col, tasks: [...col.tasks, taskWithTimestamp]} : col
            )
        });
    };

    const handleTaskEdit = (task: Task) => {
        setEditingTask(task);
    };

    const handleTaskUpdate = (updatedTask: Task) => {
        setBoard({
            columns: board.columns.map(col => ({
                ...col,
                tasks: col.tasks.map(t => t.id === updatedTask.id ? updatedTask : t)
            }))
        });
    };

    const handleTaskDelete = (taskId: string) => {
        setBoard({
            columns: board.columns.map(col => ({
                ...col,
                tasks: col.tasks.filter(t => t.id !== taskId)
            }))
        });
    };


    /*6.5 Xử lý đánh dấu công việc hoàn thành*/
    const handleMarkTaskComplete = (taskId: string) => {
        /* 6.5.1 Tìm task theo ID taskToMove(taskId*/
        const taskToMove = board.columns.flatMap(col => col.tasks).find(t => t.id === taskId);
        if (!taskToMove) return;

        /*6.5.2 Chỉ xử lý nếu task đang ở cột 'in-progress'*/
        if (taskToMove.status !== 'in-progress') return;

        /* 6.5.3 Tạo bản sao mới của board với task được cập nhật*/
        const newBoard = {
            columns: board.columns.map(col => {
                /* 6.5.3.1 Xoá task khỏi cột hiện tại*/
                if (col.tasks.some(t => t.id === taskId)) {
                    return {...col, tasks: col.tasks.filter(t => t.id !== taskId)};
                }

                /* 6.5.3.2 Nếu là cột 'done' → thêm task vào và đổi trạng thái*/
                if (col.id === 'done') {
                    return {
                        ...col,
                        tasks: [...col.tasks, {
                            ...taskToMove,
                            status: 'done',
                            completedAt: new Date().toISOString()
                        }]
                    };
                }

                return col;
            })
        };

        /* 6.5.4 Cập nhật lại dữ liệu UI*/
        setBoard(newBoard);
    };

    function handleMarkInProgress(taskId: string) {
        const taskToMove = board.columns.flatMap(col => col.tasks).find(t => t.id === taskId);
        if (!taskToMove || taskToMove.status !== 'todo') return;

        const newBoard = {
            columns: board.columns.map(col => {
                if (col.tasks.some(t => t.id === taskId)) {
                    return {...col, tasks: col.tasks.filter(t => t.id !== taskId)};
                }
                if (col.id === 'in-progress') {
                    return {
                        ...col,
                        tasks: [...col.tasks, {
                            ...taskToMove,
                            status: 'in-progress',
                            startedAt: new Date().toISOString()
                        }]
                    };
                }
                return col;
            })
        };

        setBoard(newBoard);
    }


    if (!isClient) return null;

    return (
        <div className="h-full p-4">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">Quản lý công việc</h1>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2"/>
                    Thêm công việc
                </Button>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {board.columns.map((column) => (
                        // 6.6 Truyền hàm xử lý xuống Column
                        <Column
                            key={column.id}
                            column={column}
                            onTaskEdit={setEditingTask}
                            onTaskMarkComplete={handleMarkTaskComplete}
                            onTaskMarkInProgress={handleMarkInProgress}
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
